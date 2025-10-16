/**
 * APTL Compiler
 * Transforms AST into executable render functions
 */

import {
  ASTNode,
  TemplateNode,
  SectionNode,
  ConditionalNode,
  IterationNode,
  VariableNode,
  TextNode,
  NodeType,
  CompiledTemplate,
  RenderContext,
  HelperFunction,
  APTLOptions,
  FormatterRegistry,
  Section,
} from './types';
import { APTLRuntimeError } from '../utils/errors';
import { VariableResolver } from '../data/variable-resolver';
import { ConditionalEvaluator } from '../conditionals/conditional-evaluator';
import { DefaultFormatterRegistry } from '../formatters/formatter-registry';

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

  constructor(options: CompilerOptions = {}) {
    this.options = {
      strict: false,
      helpers: {},
      preserveWhitespace: false,
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

  /**
   * Compile an AST into an executable template
   */
  compile(ast: TemplateNode): CompiledTemplate {
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
      case NodeType.SECTION:
        return this.renderSection(node as SectionNode, context);
      case NodeType.CONDITIONAL:
        return this.renderConditional(node as ConditionalNode, context);
      case NodeType.ITERATION:
        return this.renderIteration(node as IterationNode, context);
      case NodeType.VARIABLE:
        return this.renderVariable(node as VariableNode, context);
      case NodeType.TEXT:
        return this.renderText(node as TextNode, context);
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

  private renderSection(node: SectionNode, context: RenderContext): string {
    const content = node.children
      .map((child) => this.renderNode(child, context))
      .join('');

    if (!content.trim()) return '';

    const processedContent = this.options.preserveWhitespace
      ? content
      : content.trim();

    // Get appropriate formatter based on section attributes
    const formatter = this.formatterRegistry.getForAttributes(node.attributes);

    const section: Section = {
      name: node.name,
      attributes: node.attributes,
      content: processedContent,
    };

    return formatter.formatSection(section);
  }

  private renderConditional(
    node: ConditionalNode,
    context: RenderContext,
  ): string {
    const condition = this.conditionalEvaluator.evaluate(
      node.condition,
      context.data,
    );

    if (condition) {
      return node.consequent
        .map((child) => this.renderNode(child, context))
        .join('');
    } else if (node.alternate) {
      if (Array.isArray(node.alternate)) {
        return node.alternate
          .map((child) => this.renderNode(child, context))
          .join('');
      } else {
        return this.renderNode(node.alternate, context);
      }
    }

    return '';
  }

  private renderIteration(node: IterationNode, context: RenderContext): string {
    const array = this.variableResolver.resolve(node.arrayPath, context.data);

    if (!Array.isArray(array)) {
      if (this.options.strict && array !== undefined && array !== null) {
        throw new APTLRuntimeError(
          `Expected array for iteration, got ${typeof array}`,
          { arrayPath: node.arrayPath, value: array },
        );
      }
      return '';
    }

    if (array.length === 0) {
      return '';
    }

    return array
      .map((item, index) => {
        // Create new scope with iteration variables
        const iterationData = {
          ...context.data,
          [node.itemName]: item,
          loop: {
            index,
            first: index === 0,
            last: index === array.length - 1,
            even: index % 2 === 0,
            odd: index % 2 === 1,
            length: array.length,
          },
        };

        const iterationContext: RenderContext = {
          ...context,
          data: iterationData,
          scope: [...context.scope, { [node.itemName]: item }],
        };

        try {
          return node.children
            .map((child) => this.renderNode(child, iterationContext))
            .join('');
        } catch (error) {
          if (this.options.strict) {
            throw new APTLRuntimeError(
              `Error in iteration at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { index, item, arrayPath: node.arrayPath },
            );
          }
          return '';
        }
      })
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
