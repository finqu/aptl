/**
 * APTL Parser
 * Parses tokens into an Abstract Syntax Tree (AST)
 */

import {
  Token,
  TokenType,
  ASTNode,
  TemplateNode,
  VariableNode,
  TextNode,
  NodeType,
  DirectiveNode,
} from './types';
import { APTLSyntaxError } from '@/utils/errors';
import { DirectiveRegistry } from '@/directives/directive-registry';
import { DirectiveParser, BaseDirective } from '@/directives/base-directive';

export class Parser implements DirectiveParser {
  private tokens: Token[] = [];
  private current: number = 0;
  private directiveRegistry?: DirectiveRegistry;

  constructor(directiveRegistry?: DirectiveRegistry) {
    this.directiveRegistry = directiveRegistry;
  }

  initialize(directiveRegistry: DirectiveRegistry): void {
    this.directiveRegistry = directiveRegistry;
  }

  /**
   * Parse tokens into an AST
   */
  parse(tokens: Token[]): TemplateNode {
    this.tokens = tokens;
    this.current = 0;

    const children: ASTNode[] = [];

    while (!this.isAtEnd()) {
      const node = this.parseStatement();
      if (node) {
        children.push(node);
      }
    }

    return {
      type: NodeType.TEMPLATE,
      children,
    };
  }

  // Public methods required by DirectiveParser interface
  parseStatement(): ASTNode | null {
    const token = this.peek();

    switch (token.type) {
      case TokenType.TEXT:
        return this.parseText();
      case TokenType.VARIABLE:
        return this.parseVariable();
      case TokenType.DIRECTIVE:
        return this.parseDirective();
      case TokenType.NEWLINE:
        // Handle standalone newlines as text nodes
        return this.parseText();
      case TokenType.COMMENT_LINE:
      case TokenType.COMMENT_BLOCK:
        this.advance();
        return null;
      case TokenType.EOF:
        return null;
      case TokenType.END:
        // END tokens should be handled by directive parsing, not here
        throw new APTLSyntaxError(
          `Unexpected @end token without matching directive`,
          token.line,
          token.column,
        );
      // Treat punctuation, operators, parentheses, etc. as text when they appear in statement context
      case TokenType.PUNCTUATION:
      case TokenType.OPERATOR:
      case TokenType.LPAREN:
      case TokenType.RPAREN:
      case TokenType.ASSIGN:
      case TokenType.COLON:
        return this.parseText();
      default:
        throw new APTLSyntaxError(
          `Unexpected token: ${token.type}`,
          token.line,
          token.column,
        );
    }
  }

  private parseText(): TextNode {
    const startToken = this.peek();
    let value = '';

    // Handle the first token (could be TEXT or NEWLINE or various punctuation or STRING)
    if (startToken.type === TokenType.TEXT) {
      value = this.advance().value;
    } else if (startToken.type === TokenType.NEWLINE) {
      value = '\n';
      this.advance();
    } else if (startToken.type === TokenType.STRING) {
      // Re-add quotes for string literals in text context
      const token = this.advance();
      value = `"${token.value}"`;
    } else if (
      startToken.type === TokenType.PUNCTUATION ||
      startToken.type === TokenType.OPERATOR ||
      startToken.type === TokenType.LPAREN ||
      startToken.type === TokenType.RPAREN ||
      startToken.type === TokenType.ASSIGN ||
      startToken.type === TokenType.COLON
    ) {
      value = this.advance().value;
    }

    // Combine consecutive text, newline, punctuation, and string tokens
    while (!this.isAtEnd()) {
      const nextToken = this.peek();

      if (nextToken.type === TokenType.TEXT) {
        value += this.advance().value;
      } else if (nextToken.type === TokenType.NEWLINE) {
        value += '\n';
        this.advance();
      } else if (nextToken.type === TokenType.STRING) {
        // Re-add quotes for string literals
        const token = this.advance();
        value += `"${token.value}"`;
      } else if (
        nextToken.type === TokenType.PUNCTUATION ||
        nextToken.type === TokenType.OPERATOR ||
        nextToken.type === TokenType.LPAREN ||
        nextToken.type === TokenType.RPAREN ||
        nextToken.type === TokenType.ASSIGN ||
        nextToken.type === TokenType.COLON
      ) {
        value += this.advance().value;
      } else {
        break;
      }
    }

    return {
      type: NodeType.TEXT,
      value,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private parseVariable(): VariableNode {
    const token = this.advance();
    return {
      type: NodeType.VARIABLE,
      path: token.value,
      line: token.line,
      column: token.column,
    };
  }

  parseDirective(): DirectiveNode {
    const startToken = this.advance(); // consume @directive token
    const directiveName = startToken.value.toLowerCase();

    // Read raw arguments until newline or colon (everything after the directive name)
    const { rawArgs, hasColon } = this.readDirectiveArguments();

    // Get the directive from the registry to check if it has special parsing needs
    const directive = this.directiveRegistry?.get(directiveName);

    // Parse directive body until @end or terminating directive
    const children: ASTNode[] = [];

    // If we have inline syntax with colon
    if (hasColon) {
      // Check if this directive supports having a body
      if (directive && !directive.hasBody) {
        throw new APTLSyntaxError(
          `Directive @${directiveName} does not support inline syntax (no body)`,
          startToken.line,
          startToken.column,
        );
      }

      // Parse the rest of the line as the inline body
      const inlineBody = this.parseInlineBody();
      if (inlineBody) {
        children.push(inlineBody);
      }

      // Consume the newline after the inline directive to normalize spacing behavior
      if (!this.isAtEnd() && this.peek().type === TokenType.NEWLINE) {
        this.advance();
      }

      return {
        type: NodeType.DIRECTIVE,
        name: directiveName,
        rawArgs,
        children,
        line: startToken.line,
        column: startToken.column,
        isInline: true,
      };
    }

    // Check if this directive has a body (normal block syntax)
    const hasBody =
      directive && !directive.hasBody ? false : this.checkForDirectiveBody();

    if (hasBody && directive) {
      // Class-based directive with hooks
      while (!this.isAtEnd()) {
        const nextToken = this.peek();

        // Stop at @end
        if (nextToken.type === TokenType.END) {
          break;
        }

        // Check if the next token is a directive that should terminate this directive's body
        if (nextToken.type === TokenType.DIRECTIVE) {
          const nextDirectiveName = nextToken.value.toLowerCase();

          // Ask the directive if this child directive should terminate the body
          if (
            directive.shouldTerminateBody &&
            directive.shouldTerminateBody(nextDirectiveName)
          ) {
            break;
          }

          // If the directive handles child directives specially, let it do so
          if (directive.handleChildDirective) {
            const handled = directive.handleChildDirective(
              nextDirectiveName,
              this,
              children,
            );
            if (handled) {
              continue; // The directive handled it, so skip the normal parsing
            }
          }
        }

        const node = this.parseStatement();
        if (node) {
          children.push(node);
        }
      }
    } else if (hasBody) {
      // No directive found in registry, fall back to simple body parsing
      while (!this.isAtEnd()) {
        const nextToken = this.peek();
        if (nextToken.type === TokenType.END) {
          break;
        }
        const node = this.parseStatement();
        if (node) {
          children.push(node);
        }
      }
    }

    // Consume @end if present (some directives like extends might not have @end)
    if (this.peek().type === TokenType.END) {
      this.advance(); // consume @end

      // Consume the newline after @end to normalize spacing behavior
      if (!this.isAtEnd() && this.peek().type === TokenType.NEWLINE) {
        this.advance();
      }
    }

    return {
      type: NodeType.DIRECTIVE,
      name: directiveName,
      rawArgs,
      children,
      line: startToken.line,
      column: startToken.column,
    };
  }

  /**
   * Read directive arguments until newline or colon
   * Returns the arguments and whether a colon was found
   */
  private readDirectiveArguments(): { rawArgs: string; hasColon: boolean } {
    let text = '';
    let hasColon = false;

    while (!this.isAtEnd() && this.peek().type !== TokenType.NEWLINE) {
      const token = this.peek();

      // Stop at colon - this indicates inline syntax
      if (token.type === TokenType.COLON) {
        this.advance(); // consume the colon
        hasColon = true;
        break;
      }

      // Concatenate the raw token values
      if (token.type === TokenType.STRING) {
        // Re-add quotes for string literals
        text += `"${token.value}"`;
      } else {
        text += token.value;
      }
      this.advance();
    }

    // Consume newline if no colon was found
    if (!hasColon && this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }

    return { rawArgs: text.trim(), hasColon };
  }

  /**
   * Parse the inline body (everything until end of line)
   * Returns a single node or group of nodes
   */
  private parseInlineBody(): ASTNode | null {
    const startLine = this.peek().line;
    const startColumn = this.peek().column;
    const nodes: ASTNode[] = [];

    // Parse until end of line or end of input
    while (!this.isAtEnd() && this.peek().line === startLine) {
      const node = this.parseStatement();
      if (node) {
        nodes.push(node);
      }
    }

    // If we have no nodes, return null
    if (nodes.length === 0) {
      return null;
    }

    // If we have a single node, return it directly
    if (nodes.length === 1) {
      return nodes[0];
    }

    // Multiple nodes - wrap in a template node
    const templateNode: TemplateNode = {
      type: NodeType.TEMPLATE,
      children: nodes,
      line: startLine,
      column: startColumn,
    };
    return templateNode;
  }

  private checkForDirectiveBody(): boolean {
    // Peek ahead to see if there's content before @end or EOF
    // This is a simple heuristic - if the next token is not @end, assume there's a body
    const nextToken = this.peek();
    return nextToken.type !== TokenType.END && nextToken.type !== TokenType.EOF;
  }

  private readUntilNewline(): string {
    let text = '';
    while (!this.isAtEnd() && this.peek().type !== TokenType.NEWLINE) {
      const token = this.peek();
      // Just concatenate the raw token values
      if (token.type === TokenType.STRING) {
        // Re-add quotes for string literals
        text += `"${token.value}"`;
      } else {
        text += token.value;
      }
      this.advance();
    }
    if (this.peek().type === TokenType.NEWLINE) {
      this.advance();
    }
    return text;
  }

  // Public methods required by DirectiveParser interface
  peek(): Token {
    return this.tokens[this.current];
  }

  advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  isAtEnd(): boolean {
    return (
      this.current >= this.tokens.length || this.peek().type === TokenType.EOF
    );
  }
}
