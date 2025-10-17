/**
 * Examples Directive (Class-based)
 * Structured few-shot learning examples with @case children
 */

import { ConditionalDirective, DirectiveParser } from './base-directive';
import { DirectiveContext } from './types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode, NodeType, ASTNode, TokenType } from '@/core/types';
import { parseAttributes } from './argument-parsers';
import { VariableResolver } from '@/data/variable-resolver';

/**
 * Case interface for individual examples
 */
export interface ExampleCase {
  input: string;
  output: string;
  node?: DirectiveNode;
}

/**
 * ExamplesDirective class - handles @examples with @case children
 */
export class ExamplesDirective extends ConditionalDirective {
  readonly name = 'examples';
  readonly hasBody = true;

  /**
   * Return the conditional keywords that this directive handles
   */
  getConditionalKeywords(): string[] {
    return ['case'];
  }

  /**
   * Validate examples directive arguments
   */
  validate(node: DirectiveNode): void {
    // @examples doesn't require arguments
    // The cases are defined as child directives
  }

  /**
   * Parse arguments (none expected for @examples)
   */
  parseArguments(rawArgs: string): any {
    return {};
  }

  /**
   * Handle @case child directive during parsing
   */
  handleChildDirective(
    directiveName: string,
    parser: DirectiveParser,
    children: ASTNode[],
  ): boolean {
    if (directiveName === 'case') {
      const caseNode = this.parseCaseBranch(parser);
      children.push(caseNode);
      return true;
    }

    return false;
  }

  /**
   * Parse a @case branch manually
   */
  private parseCaseBranch(parser: DirectiveParser): DirectiveNode {
    const startToken = parser.advance(); // consume @case token

    // Read raw arguments
    const rawArgs = this.readUntilNewline(parser);

    // Validate that we have input and output attributes
    if (!rawArgs || rawArgs.trim() === '') {
      throw new APTLSyntaxError(
        '@case directive requires input and output attributes',
        startToken.line,
        startToken.column,
      );
    }

    // Parse attributes
    const attributes = parseAttributes(rawArgs);

    // Check for required attributes
    if (!attributes.input) {
      throw new APTLSyntaxError(
        '@case directive requires an input attribute',
        startToken.line,
        startToken.column,
      );
    }

    if (!attributes.output) {
      throw new APTLSyntaxError(
        '@case directive requires an output attribute',
        startToken.line,
        startToken.column,
      );
    }

    // Parse the case body until we hit @end or another @case
    const caseChildren: ASTNode[] = [];
    while (!parser.isAtEnd()) {
      const nextToken = parser.peek();

      // Stop at @end
      if (nextToken.type === TokenType.END) {
        break;
      }

      // Stop at next @case
      if (nextToken.type === TokenType.DIRECTIVE) {
        const nextDirectiveName = nextToken.value.toLowerCase();
        if (nextDirectiveName === 'case') {
          break;
        }
      }

      const node = parser.parseStatement();
      if (node) {
        caseChildren.push(node);
      }
    }

    return {
      type: NodeType.DIRECTIVE,
      name: 'case',
      rawArgs,
      parsedArgs: attributes,
      children: caseChildren,
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
   * Extract example cases from the directive
   */
  private extractExampleCases(examplesNode: DirectiveNode): ExampleCase[] {
    const cases: ExampleCase[] = [];
    const variableResolver = new VariableResolver({
      allowUndefined: false,
      defaultValue: '',
    });

    // Process children to find @case directives
    for (const child of examplesNode.children) {
      if (child.type === NodeType.DIRECTIVE) {
        const directiveNode = child as DirectiveNode;

        if (directiveNode.name === 'case') {
          // Parse attributes to get input and output
          const attributes =
            directiveNode.parsedArgs || parseAttributes(directiveNode.rawArgs);

          cases.push({
            input: attributes.input,
            output: attributes.output,
            node: directiveNode,
          });
        }
      }
    }

    return cases;
  }

  /**
   * Resolve a value - if it contains {variable}, resolve variables
   * Otherwise, treat as literal string
   */
  private resolveValue(value: string, data: Record<string, any>): string {
    if (!value) {
      return '';
    }

    const trimmed = value.trim();

    // Check if the entire value is a single variable reference like {problem}
    const singleVarMatch = trimmed.match(/^\{([^}]+)\}$/);

    if (singleVarMatch) {
      // It's a single variable reference like {problem}
      const varPath = singleVarMatch[1].trim();
      const variableResolver = new VariableResolver({
        allowUndefined: false,
        defaultValue: '',
      });

      try {
        const resolved = variableResolver.resolve(varPath, data);

        // If it's an object, render as JSON
        if (typeof resolved === 'object' && resolved !== null) {
          return JSON.stringify(resolved, null, 2);
        }

        return String(resolved);
      } catch (error) {
        // If variable not found, return empty string
        return '';
      }
    }

    // It's a literal value - handle escape sequences
    return this.unescapeString(trimmed);
  }

  /**
   * Unescape string literals (handle \n, \t, etc.)
   */
  private unescapeString(str: string): string {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\')
      .replace(/\\"/g, '"');
  }

  /**
   * Execute the examples directive
   */
  execute(context: DirectiveContext): string {
    // Extract all example cases
    const cases = this.extractExampleCases(context.node);

    if (cases.length === 0) {
      // No cases - render nothing
      return '';
    }

    // Render each case
    const results: string[] = [];

    for (const exampleCase of cases) {
      // Resolve input and output (may contain variables)
      const resolvedInput = this.resolveValue(exampleCase.input, context.data);
      const resolvedOutput = this.resolveValue(
        exampleCase.output,
        context.data,
      );

      // Format the example
      const formatted = `Input: ${resolvedInput}\nOutput: ${resolvedOutput}`;
      results.push(formatted);
    }

    // Join cases with blank lines
    return results.join('\n\n');
  }
}
