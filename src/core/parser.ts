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
import {
  DirectiveRegistry,
  isClassBasedDirective,
} from '@/directives/directive-registry';
import { DirectiveParser, BaseDirective } from '@/directives/base-directive';

export class Parser implements DirectiveParser {
  private tokens: Token[] = [];
  private current: number = 0;
  private directiveRegistry?: DirectiveRegistry;

  constructor(directiveRegistry?: DirectiveRegistry) {
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
      startToken.type === TokenType.ASSIGN
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
        nextToken.type === TokenType.ASSIGN
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

    // Read raw arguments until newline (everything after the directive name)
    const rawArgs = this.readUntilNewline().trim();

    // Get the directive from the registry to check if it has special parsing needs
    const directive = this.directiveRegistry?.get(directiveName);

    // Parse directive body until @end or terminating directive
    const children: ASTNode[] = [];

    // Check if this directive has a body
    const hasBody = this.checkForDirectiveBody();

    if (hasBody && directive && isClassBasedDirective(directive)) {
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
    } else if (hasBody && directive && !isClassBasedDirective(directive)) {
      // Legacy object-based directive - check for bodyTerminators
      while (!this.isAtEnd()) {
        const nextToken = this.peek();
        if (nextToken.type === TokenType.END) {
          break;
        }

        // Check legacy bodyTerminators field
        if (
          nextToken.type === TokenType.DIRECTIVE &&
          directive.bodyTerminators
        ) {
          const nextDirectiveName = nextToken.value.toLowerCase();
          if (directive.bodyTerminators.includes(nextDirectiveName)) {
            break;
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
