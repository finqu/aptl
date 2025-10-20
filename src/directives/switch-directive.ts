/**
 * Switch Directive (Class-based)
 * Switch-case conditional rendering with default support
 */

import { ConditionalDirective, DirectiveParser } from './base-directive';
import { DirectiveContext } from './types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode, NodeType, ASTNode, TokenType } from '@/core/types';
import { VariableResolver } from '@/data/variable-resolver';

/**
 * Case branch interface
 */
export interface CaseBranch {
  type: 'case' | 'default';
  value?: any;
  children: ASTNode[];
  node?: DirectiveNode;
}

/**
 * SwitchDirective class - handles @switch, @case, and @default
 */
export class SwitchDirective extends ConditionalDirective {
  readonly name = 'switch';
  readonly hasBody = true;
  private variableResolver: VariableResolver;

  constructor() {
    super();
    this.variableResolver = new VariableResolver();
  }

  /**
   * Return the conditional keywords that this directive handles
   */
  getConditionalKeywords(): string[] {
    return ['case', 'default'];
  }

  /**
   * Validate switch directive arguments
   */
  validate(node: DirectiveNode): void {
    const trimmed = node.rawArgs?.trim() || '';
    if (!trimmed) {
      throw new APTLSyntaxError(
        'Switch directive requires a value or variable argument',
        node.line,
        node.column,
      );
    }
  }

  /**
   * Parse arguments (the switch value/variable)
   */
  parseArguments(rawArgs: string): any {
    return { switchExpression: rawArgs.trim() };
  }

  /**
   * Handle case/default child directives during parsing
   * This is called by the parser when it encounters case/default inside a switch body
   */
  handleChildDirective(
    directiveName: string,
    parser: DirectiveParser,
    children: ASTNode[],
  ): boolean {
    const conditionalKeywords = this.getConditionalKeywords();

    // Handle case
    if (directiveName === 'case') {
      const caseNode = this.parseCaseBranch(
        parser,
        'case',
        conditionalKeywords,
      );
      children.push(caseNode);
      return true;
    }

    // Handle default
    if (directiveName === 'default') {
      const defaultNode = this.parseCaseBranch(parser, 'default', []);
      children.push(defaultNode);
      return true;
    }

    return false;
  }

  /**
   * Parse a case or default branch manually
   * This ensures the branch stops at the next case/default keyword or @end
   */
  private parseCaseBranch(
    parser: DirectiveParser,
    branchType: string,
    stopKeywords: string[],
  ): DirectiveNode {
    const startToken = parser.advance(); // consume @case or @default token

    // Read raw arguments
    const rawArgs = this.readUntilNewline(parser);

    // Validate arguments
    if (branchType === 'case') {
      if (!rawArgs || rawArgs.trim() === '') {
        throw new APTLSyntaxError(
          'Case directive requires a value argument',
          startToken.line,
          startToken.column,
        );
      }
    } else if (branchType === 'default') {
      if (rawArgs && rawArgs.trim() !== '') {
        throw new APTLSyntaxError(
          '@default directive does not accept arguments',
          startToken.line,
          startToken.column,
        );
      }
    }

    // Parse the branch body until we hit a stop keyword or @end
    const branchChildren: ASTNode[] = [];
    while (!parser.isAtEnd()) {
      const nextToken = parser.peek();

      // Stop at @end
      if (nextToken.type === TokenType.END) {
        break;
      }

      // Stop at next case/default keyword
      if (nextToken.type === TokenType.DIRECTIVE) {
        const nextDirectiveName = nextToken.value.toLowerCase();
        if (
          stopKeywords.includes(nextDirectiveName) ||
          nextDirectiveName === 'end' ||
          nextDirectiveName === 'case' ||
          nextDirectiveName === 'default'
        ) {
          break;
        }
      }

      const node = parser.parseStatement();
      if (node) {
        branchChildren.push(node);
      }
    }

    return {
      type: NodeType.DIRECTIVE,
      name: branchType,
      rawArgs,
      children: branchChildren,
      line: startToken.line,
      column: startToken.column,
    };
  }

  /**
   * Read tokens until newline
   */
  private readUntilNewline(parser: DirectiveParser): string {
    let text = '';
    while (!parser.isAtEnd() && parser.peek().type !== TokenType.NEWLINE) {
      const token = parser.peek();
      if (token.type === TokenType.STRING) {
        text += `"${token.value}"`;
      } else {
        text += token.value;
      }
      parser.advance();
    }
    if (parser.peek().type === TokenType.NEWLINE) {
      parser.advance();
    }
    return text.trim();
  }

  /**
   * Extract case branches from switch directive
   */
  private extractCaseBranches(switchNode: DirectiveNode): CaseBranch[] {
    const branches: CaseBranch[] = [];

    // Process children to find case/default at the same nesting level
    for (const child of switchNode.children) {
      if (child.type === NodeType.DIRECTIVE) {
        const directiveNode = child as DirectiveNode;

        if (directiveNode.name === 'case') {
          // Add case branch with its own children
          branches.push({
            type: 'case',
            value: directiveNode.rawArgs,
            children: directiveNode.children,
            node: directiveNode,
          });
        } else if (directiveNode.name === 'default') {
          // Add default branch with its own children
          branches.push({
            type: 'default',
            children: directiveNode.children,
            node: directiveNode,
          });
        }
      }
    }

    return branches;
  }

  /**
   * Evaluate a case value (can be a literal or variable)
   */
  private evaluateCaseValue(valueExpr: string, data: Record<string, any>): any {
    const trimmed = valueExpr.trim();

    // Check for special literals BEFORE checking for quoted strings
    // This ensures "null", "true", "false" as unquoted work correctly
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;

    // Check if it's a quoted string literal
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    // Check if it's a number literal
    if (!isNaN(Number(trimmed)) && trimmed !== '') {
      return Number(trimmed);
    }

    // Otherwise, resolve as variable path
    // We need to handle null values properly, so we use a custom resolution
    // that doesn't convert null to undefined/empty string
    return this.resolveValuePreservingNull(trimmed, data);
  }

  /**
   * Resolve a variable path while preserving null values
   * Unlike the standard variable resolver, this keeps null as null
   */
  private resolveValuePreservingNull(
    path: string,
    data: Record<string, any>,
  ): any {
    if (!path || path.trim() === '') {
      return undefined;
    }

    // Simple property access (no dots or brackets)
    if (!path.includes('.') && !path.includes('[')) {
      return data[path];
    }

    // Use variable resolver for complex paths but work around its null handling
    // We'll resolve the path manually to preserve null
    const segments = path.split('.');
    let value: any = data;

    for (const segment of segments) {
      if (value === undefined || value === null) {
        return undefined;
      }

      // Handle array bracket notation
      if (segment.includes('[')) {
        const match = segment.match(/^([^\[]+)\[(\d+)\]$/);
        if (match) {
          const prop = match[1];
          const index = parseInt(match[2], 10);
          value = value[prop];
          if (Array.isArray(value)) {
            value = value[index];
          } else {
            return undefined;
          }
        } else {
          value = value[segment];
        }
      } else {
        value = value[segment];
      }
    }

    return value;
  }

  /**
   * Execute the switch directive
   */
  execute(context: DirectiveContext): string {
    // Extract all case branches
    const branches = this.extractCaseBranches(context.node);

    // Ensure renderTemplate is available
    if (!context.renderTemplate) {
      throw new APTLRuntimeError(
        '@switch directive requires renderTemplate function in context',
      );
    }

    // Get the switch value from the arguments
    const switchExpr =
      context.node.parsedArgs?.switchExpression || context.node.rawArgs;
    const switchValue = this.evaluateCaseValue(switchExpr, context.data);

    // Find the first matching case
    for (const branch of branches) {
      if (branch.type === 'case') {
        // Evaluate the case value
        const caseValue = this.evaluateCaseValue(branch.value!, context.data);

        // Check for match using strict equality
        if (switchValue === caseValue) {
          // Match found - render this branch
          context.metadata.set('childrenToRender', branch.children);
          return context.renderTemplate('', context.data);
        }
      } else if (branch.type === 'default') {
        // We reached default without finding a match
        context.metadata.set('childrenToRender', branch.children);
        return context.renderTemplate('', context.data);
      }
    }

    // No match and no default - render nothing
    return '';
  }
}
