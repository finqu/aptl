/**
 * APTL Parser
 * Parses tokens into an Abstract Syntax Tree (AST)
 */

import {
  Token,
  TokenType,
  ASTNode,
  TemplateNode,
  SectionNode,
  ConditionalNode,
  IterationNode,
  VariableNode,
  TextNode,
  NodeType,
} from './types';
import { APTLSyntaxError } from '../utils/errors';

export class Parser {
  private tokens: Token[] = [];
  private current: number = 0;

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

  private parseStatement(): ASTNode | null {
    const token = this.peek();

    switch (token.type) {
      case TokenType.TEXT:
        return this.parseText();
      case TokenType.VARIABLE:
        return this.parseVariable();
      case TokenType.SECTION_START:
        return this.parseSection();
      case TokenType.IF:
        return this.parseConditional();
      case TokenType.EACH:
        return this.parseIteration();
      case TokenType.NEWLINE:
        // Handle standalone newlines as text nodes
        return this.parseText(); // This will now handle the newline properly
      case TokenType.COMMENT_LINE:
      case TokenType.COMMENT_BLOCK:
        this.advance();
        return null;
      case TokenType.EOF:
        return null;
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

    // Handle the first token (could be TEXT or NEWLINE or various punctuation)
    if (startToken.type === TokenType.TEXT) {
      value = this.advance().value;
    } else if (startToken.type === TokenType.NEWLINE) {
      value = '\n';
      this.advance();
    } else if (
      startToken.type === TokenType.PUNCTUATION ||
      startToken.type === TokenType.OPERATOR ||
      startToken.type === TokenType.LPAREN ||
      startToken.type === TokenType.RPAREN ||
      startToken.type === TokenType.ASSIGN
    ) {
      value = this.advance().value;
    }

    // Combine consecutive text, newline, and punctuation tokens
    while (!this.isAtEnd()) {
      const nextToken = this.peek();

      if (nextToken.type === TokenType.TEXT) {
        value += this.advance().value;
      } else if (nextToken.type === TokenType.NEWLINE) {
        value += '\n';
        this.advance();
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

  private parseSection(): SectionNode {
    const startToken = this.advance(); // consume @section

    // Read section name and attributes
    const headerText = this.readUntilNewline().trim();
    const { name, attributes } = this.parseSectionHeader(
      headerText,
      startToken,
    );

    // Parse section body until @end
    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().type !== TokenType.END) {
      const node = this.parseStatement();
      if (node) {
        children.push(node);
      }
    }

    if (this.peek().type !== TokenType.END) {
      throw new APTLSyntaxError(
        `Unclosed section: ${name}`,
        startToken.line,
        startToken.column,
      );
    }

    this.advance(); // consume @end

    return {
      type: NodeType.SECTION,
      name,
      attributes,
      children,
      line: startToken.line,
      column: startToken.column,
    };
  }

  /**
   * Parse section header to extract name and attributes
   * Format: name(attr1="value1", attr2="value2")
   */
  private parseSectionHeader(
    headerText: string,
    startToken: Token,
  ): { name: string; attributes: Record<string, string> } {
    const match = headerText.match(/^(\w+)(?:\((.*?)\))?$/);

    if (!match) {
      throw new APTLSyntaxError(
        `Invalid section header: ${headerText}`,
        startToken.line,
        startToken.column,
      );
    }

    const name = match[1];
    const attributesText = match[2];
    const attributes: Record<string, string> = {};

    if (attributesText && attributesText.trim()) {
      // Parse attributes: attr1="value1", attr2="value2"
      const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;
      let attrMatch;

      while ((attrMatch = attrRegex.exec(attributesText)) !== null) {
        const attrName = attrMatch[1];
        const attrValue = attrMatch[2];
        attributes[attrName] = attrValue;
      }

      // Validate that we parsed some attributes if text was provided
      if (Object.keys(attributes).length === 0) {
        throw new APTLSyntaxError(
          `Invalid attribute syntax in section header: ${headerText}`,
          startToken.line,
          startToken.column,
        );
      }
    }

    return { name, attributes };
  }

  private parseConditional(): ConditionalNode {
    const startToken = this.advance(); // consume @if

    // Read condition
    const condition = this.readUntilNewline().trim();

    // Parse consequent
    const consequent: ASTNode[] = [];
    while (!this.isAtEnd()) {
      const token = this.peek();
      if (
        token.type === TokenType.ELIF ||
        token.type === TokenType.ELSE ||
        token.type === TokenType.END
      ) {
        break;
      }
      const node = this.parseStatement();
      if (node) {
        consequent.push(node);
      }
    }

    // Parse alternate (elif/else)
    let alternate: ConditionalNode | ASTNode[] | undefined;

    if (this.peek().type === TokenType.ELIF) {
      // Parse elif as a nested conditional but don't consume the @end
      const elifToken = this.advance(); // consume @elif
      const elifCondition = this.readUntilNewline().trim();

      // Parse elif consequent
      const elifConsequent: ASTNode[] = [];
      while (!this.isAtEnd()) {
        const token = this.peek();
        if (
          token.type === TokenType.ELIF ||
          token.type === TokenType.ELSE ||
          token.type === TokenType.END
        ) {
          break;
        }
        const node = this.parseStatement();
        if (node) {
          elifConsequent.push(node);
        }
      }

      // Handle further elif/else
      let elifAlternate: ConditionalNode | ASTNode[] | undefined;
      if (this.peek().type === TokenType.ELIF) {
        // Recursively handle more elif
        const nestedConditional = this.parseConditional();
        elifAlternate = nestedConditional;
        // Don't advance past @end here - the recursive call already consumed it
        return {
          type: NodeType.CONDITIONAL,
          condition,
          consequent,
          alternate: {
            type: NodeType.CONDITIONAL,
            condition: elifCondition,
            consequent: elifConsequent,
            alternate: elifAlternate,
            line: elifToken.line,
            column: elifToken.column,
          },
          line: startToken.line,
          column: startToken.column,
        };
      } else if (this.peek().type === TokenType.ELSE) {
        this.advance(); // consume @else
        elifAlternate = [];
        while (!this.isAtEnd() && this.peek().type !== TokenType.END) {
          const node = this.parseStatement();
          if (node) {
            elifAlternate.push(node);
          }
        }
      }

      alternate = {
        type: NodeType.CONDITIONAL,
        condition: elifCondition,
        consequent: elifConsequent,
        alternate: elifAlternate,
        line: elifToken.line,
        column: elifToken.column,
      };
    } else if (this.peek().type === TokenType.ELSE) {
      this.advance(); // consume @else
      alternate = [];
      while (!this.isAtEnd() && this.peek().type !== TokenType.END) {
        const node = this.parseStatement();
        if (node) {
          alternate.push(node);
        }
      }
    }

    if (this.peek().type !== TokenType.END) {
      throw new APTLSyntaxError(
        'Unclosed conditional',
        startToken.line,
        startToken.column,
      );
    }

    this.advance(); // consume @end

    return {
      type: NodeType.CONDITIONAL,
      condition,
      consequent,
      alternate,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private parseIteration(): IterationNode {
    const startToken = this.advance(); // consume @each

    // Read iteration spec: "item in array.path"
    const spec = this.readUntilNewline().trim();
    const parts = spec.split(/\s+in\s+/);

    if (parts.length !== 2) {
      throw new APTLSyntaxError(
        'Invalid iteration syntax. Expected: @each item in array',
        startToken.line,
        startToken.column,
      );
    }

    const itemName = parts[0].trim();
    const arrayPath = parts[1].trim();

    // Parse iteration body
    const children: ASTNode[] = [];
    while (!this.isAtEnd() && this.peek().type !== TokenType.END) {
      const node = this.parseStatement();
      if (node) {
        children.push(node);
      }
    }

    if (this.peek().type !== TokenType.END) {
      throw new APTLSyntaxError(
        'Unclosed iteration',
        startToken.line,
        startToken.column,
      );
    }

    this.advance(); // consume @end

    return {
      type: NodeType.ITERATION,
      itemName,
      arrayPath,
      children,
      line: startToken.line,
      column: startToken.column,
    };
  }

  private readUntilNewline(): string {
    let text = '';
    while (!this.isAtEnd() && this.peek().type !== TokenType.NEWLINE) {
      const token = this.peek();
      if (token.type === TokenType.STRING) {
        // Re-add quotes for string literals
        text += `"${token.value}"`;
      } else if (
        token.type === TokenType.LPAREN ||
        token.type === TokenType.RPAREN ||
        token.type === TokenType.ASSIGN ||
        token.type === TokenType.OPERATOR ||
        token.type === TokenType.PUNCTUATION
      ) {
        // For punctuation and operators, just add their value
        text += token.value;
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

  private peek(): Token {
    return this.tokens[this.current];
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return (
      this.current >= this.tokens.length || this.peek().type === TokenType.EOF
    );
  }
}
