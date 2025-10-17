/**
 * APTL Compiler
 * Transforms AST into executable render functions
 */

import {
  ASTNode,
  TemplateNode,
  VariableNode,
  TextNode,
  NodeType,
  CompiledTemplate,
  RenderContext,
  HelperFunction,
  FormatterRegistry,
  DirectiveNode,
} from './types';
import { APTLRuntimeError } from '@/utils/errors';
import { VariableResolver } from '@/data/variable-resolver';
import { ConditionalEvaluator } from '@/conditionals/conditional-evaluator';
import { DefaultFormatterRegistry } from '@/formatters/formatter-registry';
import { DirectiveRegistry } from '@/directives/directive-registry';
import { DirectiveContext } from '@/directives/types';
import { Tokenizer } from './tokenizer';
import { Parser } from './parser';

export interface CompilerOptions {
  strict?: boolean;
  helpers?: Record<string, HelperFunction>;
  preserveWhitespace?: boolean;
  formatterRegistry?: FormatterRegistry;
}

export class Compiler {
  private variableResolver: VariableResolver;
  private conditionalEvaluator: ConditionalEvaluator;
  private options: CompilerOptions;
  private formatterRegistry: FormatterRegistry;
  private directiveRegistry?: DirectiveRegistry;

  constructor(
    private readonly tokenizer: Tokenizer,
    private readonly parser: Parser,
    options: CompilerOptions = {},
  ) {
    this.options = {
      strict: false,
      helpers: {},
      preserveWhitespace: true,
      ...options,
    };

    this.formatterRegistry =
      options.formatterRegistry || new DefaultFormatterRegistry();

    this.variableResolver = new VariableResolver({
      allowUndefined: !this.options.strict,
      defaultValue: this.options.strict ? undefined : '',
    });
    this.conditionalEvaluator = new ConditionalEvaluator();
  }

  initialize(directiveRegistry: DirectiveRegistry): void {
    this.directiveRegistry = directiveRegistry;
  }

  /**
   * Compile a string into an executable template
   * This calls the parse method on directives to allow them to
   * load external resources and validate before execution
   */
  async compile(template: string): Promise<CompiledTemplate> {
    // Tokenize
    const tokens = this.tokenizer.tokenize(template);

    // Parse into AST
    const ast = this.parser.parse(tokens);

    // Parse all directives in the AST
    await this.parseDirectives(ast);

    return this.compileAST(ast);
  }

  /**
   * Recursively parse all directives in the AST
   */
  private async parseDirectives(node: ASTNode): Promise<void> {
    if (node.type === NodeType.DIRECTIVE) {
      const directiveNode = node as DirectiveNode;
      if (this.directiveRegistry) {
        const directive = this.directiveRegistry.get(directiveNode.name);
        if (directive?.parse) {
          await directive.parse(directiveNode);
        }
      }
    }

    // Recursively parse children
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        await this.parseDirectives(child);
      }
    }
  }

  /**
   * Compile an AST into an executable template
   */
  compileAST(ast: TemplateNode): CompiledTemplate {
    return {
      render: (data: Record<string, any>) => {
        try {
          const context: RenderContext = {
            data,
            helpers: { ...this.options.helpers },
            scope: [data],
          };

          let result = this.renderNode(ast, context);

          // Post-process the result
          if (!this.options.preserveWhitespace) {
            result = this.cleanWhitespace(result);
          }

          return result;
        } catch (error) {
          if (error instanceof APTLRuntimeError) {
            throw error;
          }
          throw new APTLRuntimeError(
            `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { data },
          );
        }
      },
      source: this.generateSource(ast),
    };
  }

  /**
   * Generate readable source representation of the compiled template
   */
  private generateSource(ast: TemplateNode): string {
    // This would generate a human-readable representation of the template
    // For now, return a simple placeholder
    return `[Compiled Template - ${ast.children.length} nodes]`;
  }

  /**
   * Clean up whitespace in the rendered output
   */
  private cleanWhitespace(text: string): string {
    return text
      .split('\n') // Split into lines
      .map((line) =>
        line.replace(/^[ \t]+|[ \t]+$/g, '').replace(/[ \t]+/g, ' '),
      ) // Clean each line individually
      .join('\n') // Rejoin with newlines
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple empty lines to maximum 2
      .replace(/^\n+/, '') // Remove leading newlines
      .replace(/\n+$/, '\n'); // Single trailing newline
  }

  private renderNode(node: ASTNode, context: RenderContext): string {
    switch (node.type) {
      case NodeType.TEMPLATE:
        return this.renderTemplate(node as TemplateNode, context);
      case NodeType.VARIABLE:
        return this.renderVariable(node as VariableNode, context);
      case NodeType.TEXT:
        return this.renderText(node as TextNode, context);
      case NodeType.DIRECTIVE:
        return this.renderDirective(node as DirectiveNode, context);
      case NodeType.COMMENT:
        return ''; // Comments are stripped
      default:
        throw new APTLRuntimeError(`Unknown node type: ${(node as any).type}`);
    }
  }

  private renderTemplate(node: TemplateNode, context: RenderContext): string {
    return node.children
      .map((child) => this.renderNode(child, context))
      .join('');
  }

  private renderVariable(node: VariableNode, context: RenderContext): string {
    try {
      // Check if it's a helper function call
      if (node.path.includes('(') && node.path.includes(')')) {
        return this.renderHelperCall(node.path, context);
      }

      const value = this.variableResolver.resolve(node.path, context.data);

      if (value == null) {
        return '';
      }

      // Handle different types appropriately
      if (typeof value === 'string') {
        return value;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }

      if (Array.isArray(value)) {
        return value.join(', ');
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    } catch (error) {
      if (this.options.strict) {
        throw new APTLRuntimeError(
          `Failed to render variable '${node.path}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          { path: node.path, context: context.data },
        );
      }
      return '';
    }
  }

  private renderHelperCall(expression: string, context: RenderContext): string {
    // Parse helper function call: helperName(arg1, arg2, ...)
    const match = expression.match(/^(\w+)\((.*)\)$/);
    if (!match) {
      throw new APTLRuntimeError(`Invalid helper syntax: ${expression}`);
    }

    const [, helperName, argsString] = match;
    const helper = context.helpers[helperName];

    if (!helper) {
      if (this.options.strict) {
        throw new APTLRuntimeError(`Unknown helper function: ${helperName}`);
      }
      return '';
    }

    // Parse arguments (simple implementation)
    const args = this.parseHelperArguments(argsString, context);

    try {
      const result = helper(...args);
      return result != null ? String(result) : '';
    } catch (error) {
      if (this.options.strict) {
        throw new APTLRuntimeError(
          `Helper '${helperName}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { helper: helperName, args },
        );
      }
      return '';
    }
  }

  private parseHelperArguments(
    argsString: string,
    context: RenderContext,
  ): any[] {
    if (!argsString.trim()) {
      return [];
    }

    // Simple argument parsing (would need more sophisticated parsing for complex cases)
    const args = argsString.split(',').map((arg) => {
      const trimmed = arg.trim();

      // String literal
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return trimmed.slice(1, -1);
      }

      // Number literal
      if (!isNaN(Number(trimmed))) {
        return Number(trimmed);
      }

      // Boolean literal
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;

      // Variable reference
      return this.variableResolver.resolve(trimmed, context.data);
    });

    return args;
  }

  private renderText(node: TextNode, context: RenderContext): string {
    return node.value;
  }

  private renderDirective(node: DirectiveNode, context: RenderContext): string {
    if (!this.directiveRegistry) {
      throw new APTLRuntimeError(
        `Directive '@${node.name}' found but no directive registry is configured`,
        { directive: node.name },
      );
    }

    // Parse arguments if not already parsed and directive has a parser
    if (!node.parsedArgs) {
      const directive = this.directiveRegistry.get(node.name);
      if (directive?.parseArguments) {
        try {
          node.parsedArgs = directive.parseArguments(node.rawArgs);
        } catch (error) {
          throw new APTLRuntimeError(
            `Failed to parse arguments for directive '@${node.name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
            { directive: node.name, rawArgs: node.rawArgs },
          );
        }
      }
    }

    // Create directive context with metadata
    const metadata = new Map<string, any>();
    const directiveContext: DirectiveContext = {
      ...context,
      node,
      metadata,
      renderTemplate: (template: string, data?: Record<string, any>) => {
        // Check if specific children should be rendered (e.g., from if directive)
        const childrenToRender = metadata.get('childrenToRender');
        const children =
          childrenToRender !== undefined ? childrenToRender : node.children;

        // Use provided data or fall back to context data
        const renderContext = data ? { ...context, data } : context;

        // Render the children
        return children
          .map((child: any) => this.renderNode(child, renderContext))
          .join('');
      },
    };

    // Execute the directive synchronously
    try {
      const result = this.directiveRegistry.execute(node, directiveContext);
      return result;
    } catch (error) {
      if (this.options.strict) {
        throw error;
      }
      // In non-strict mode, return empty string on directive errors
      return '';
    }
  }

  /**
   * Add a helper function
   */
  addHelper(name: string, fn: HelperFunction): void {
    if (!this.options.helpers) {
      this.options.helpers = {};
    }
    this.options.helpers[name] = fn;
  }

  /**
   * Get current compiler options
   */
  getOptions(): CompilerOptions {
    return { ...this.options };
  }

  /**
   * Update compiler options
   */
  updateOptions(options: Partial<CompilerOptions>): void {
    this.options = { ...this.options, ...options };

    // Update variable resolver if strict mode changed
    if ('strict' in options) {
      this.variableResolver = new VariableResolver({
        allowUndefined: !this.options.strict,
        defaultValue: this.options.strict ? undefined : '',
      });
    }
  }
}
