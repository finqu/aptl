/**
 * APTL Tokenizer
 * Performs lexical analysis of APTL template strings
 */

import { Token, TokenType } from './types';
import { APTLSyntaxError } from '@/utils/errors';

export interface TokenizerOptions {
  preserveComments?: boolean;
  strictMode?: boolean; // If true, throws error when directives are not at statement boundaries
}

export class Tokenizer {
  private source: string = '';
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private indentStack: number[] = [0];
  private options: TokenizerOptions;
  private lastTokenType: TokenType | null = null;
  private atStatementStart: boolean = true; // Track if we're at the start of a statement
  private registeredDirectives: Set<string> = new Set();

  constructor(options: TokenizerOptions = {}) {
    this.options = {
      preserveComments: false,
      strictMode: false,
      ...options,
    };
  }

  /**
   * Tokenize a template string into an array of tokens
   */
  tokenize(source: string): Token[] {
    this.source = source;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.indentStack = [0];
    this.lastTokenType = null;
    this.atStatementStart = true; // Start at beginning of input

    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
        this.lastTokenType = token.type;

        // Update statement start tracking
        // We're at statement start ONLY after: newlines, or directive keywords that end statements
        if (token.type === TokenType.NEWLINE || token.type === TokenType.END) {
          this.atStatementStart = true;
        } else if (
          token.type === TokenType.VARIABLE ||
          token.type === TokenType.DIRECTIVE
        ) {
          // Once we've started a statement with variable/directive start, we're no longer at start
          this.atStatementStart = false;
        } else if (token.type === TokenType.TEXT && token.value.trim() !== '') {
          // TEXT tokens with non-whitespace content mean we're no longer at statement start
          // But whitespace-only TEXT tokens (indentation) preserve the statement start state
          this.atStatementStart = false;
        }
      }
    }

    // Add final EOF token
    tokens.push(this.createToken(TokenType.EOF, ''));

    return tokens;
  }

  /**
   * Register a directive name for recognition
   */
  registerDirective(name: string): void {
    this.registeredDirectives.add(name.toLowerCase());
  }

  /**
   * Unregister a directive name
   */
  unregisterDirective(name: string): void {
    this.registeredDirectives.delete(name.toLowerCase());
  }

  /**
   * Get all registered directives
   */
  getRegisteredDirectives(): string[] {
    return Array.from(this.registeredDirectives);
  }

  private nextToken(): Token | null {
    // Handle newlines
    if (this.peek() === '\n' || this.peek() === '\r') {
      return this.handleNewline();
    }

    // Handle comments
    if (this.peek() === '/' && this.peekNext() === '/') {
      return this.handleLineComment();
    }

    if (this.peek() === '/' && this.peekNext() === '*') {
      return this.handleBlockComment();
    }

    // Handle @ directives
    if (this.peek() === '@') {
      return this.handleDirective();
    }

    // Handle two-character operators first
    if (this.peek() === '=' && this.peekNext() === '=') {
      return this.handleOperator();
    }

    if (this.peek() === '!' && this.peekNext() === '=') {
      return this.handleOperator();
    }

    if (this.peek() === '>' && this.peekNext() === '=') {
      return this.handleOperator();
    }

    if (this.peek() === '<' && this.peekNext() === '=') {
      return this.handleOperator();
    }

    // Handle single character operators
    if (this.peek() === '>' || this.peek() === '<') {
      return this.handleOperator();
    }

    // Handle single character punctuation
    if (this.peek() === '=') {
      return this.handlePunctuation();
    }

    if (this.peek() === '(' || this.peek() === ')') {
      return this.handlePunctuation();
    }

    if (this.peek() === ',') {
      return this.handlePunctuation();
    }

    // Handle string literals - content inside quotes is NOT interpolated
    // Strings are literals: "@{var}" stays as "@{var}", not interpolated
    if (this.peek() === '"' || this.peek() === "'") {
      return this.handleString();
    }

    // Handle everything else as text (including whitespace and keywords)
    return this.handleText();
  }

  private handleNewline(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    let value = '';

    // Handle different line ending types
    if (this.peek() === '\r') {
      value += this.advance(); // \r
      if (this.peek() === '\n') {
        value += this.advance(); // \n (for \r\n)
      }
    } else if (this.peek() === '\n') {
      value += this.advance(); // \n
    }

    this.line++;
    this.column = 1;

    return {
      type: TokenType.NEWLINE,
      value,
      line: startLine,
      column: startColumn,
    };
  }

  private handleLineComment(): Token | null {
    const startColumn = this.column;

    this.advance(); // /
    this.advance(); // /

    let value = '';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.peek();
      this.advance();
    }

    // Consume the newline after the comment
    if (!this.isAtEnd() && this.peek() === '\n') {
      this.advance();
    }

    if (this.options.preserveComments) {
      return {
        type: TokenType.COMMENT_LINE,
        value: value.trim(),
        line: this.line,
        column: startColumn,
      };
    }

    return null;
  }

  private handleBlockComment(): Token | null {
    const startColumn = this.column;

    this.advance(); // /
    this.advance(); // *

    let value = '';
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance(); // *
        this.advance(); // /
        break;
      }
      if (this.peek() === '\n') {
        this.line++;
        this.column = 0;
      }
      value += this.peek();
      this.advance();
    }

    // Consume the newline after the block comment (if present)
    if (!this.isAtEnd() && this.peek() === '\n') {
      this.advance();
    }

    if (this.options.preserveComments) {
      return {
        type: TokenType.COMMENT_BLOCK,
        value: value.trim(),
        line: this.line,
        column: startColumn,
      };
    }

    return null;
  }

  private handleDirective(): Token {
    const startColumn = this.column;
    this.advance(); // @

    // Check for variable interpolation @{...}
    // Variables can appear anywhere, even in the middle of text
    if (this.peek() === '{') {
      return this.handleVariable(startColumn);
    }

    // If next character is not a letter, treat @ as text
    if (!this.isAlpha(this.peek())) {
      // Backtrack and treat as text
      this.position--;
      this.column--;
      return this.handleText();
    }

    // Read the potential keyword
    const keywordStart = this.position;
    const keyword = this.readIdentifier();

    // Special case: @end is always recognized as it closes all directives
    if (keyword.toLowerCase() === 'end') {
      if (!this.atStatementStart) {
        if (this.options.strictMode) {
          throw new APTLSyntaxError(
            `Directive @end must be at the start of a statement (after a newline).`,
            this.line,
            startColumn,
          );
        } else {
          // In lenient mode, backtrack and treat as text
          this.position = keywordStart - 1;
          this.column = startColumn;
          return this.handleText();
        }
      }
      return this.createToken(TokenType.END, keyword, startColumn);
    }

    // Check if it's a registered directive
    const isRegistered = this.registeredDirectives.has(keyword.toLowerCase());

    if (!isRegistered) {
      // Not a known directive - this is an error!
      // According to BNF, @ followed by letters is reserved for directives
      // Users must escape @ when followed by letters: \@example
      throw new APTLSyntaxError(
        `Unknown directive '@${keyword}'. If this is not a directive, escape the @ symbol: \\@${keyword}`,
        this.line,
        startColumn,
      );
    }

    // Check if we're at a valid position for a directive
    // Directives can only appear at statement boundaries
    if (!this.atStatementStart) {
      if (this.options.strictMode) {
        // In strict mode, this is an error
        throw new APTLSyntaxError(
          `Directive @${keyword} must be at the start of a statement (after a newline). Multiple directives on the same line are not allowed.`,
          this.line,
          startColumn,
        );
      } else {
        // In lenient mode, backtrack and treat as text
        this.position = keywordStart - 1;
        this.column = startColumn;
        return this.handleText();
      }
    }

    // It's a valid directive!
    // All directives use the DIRECTIVE token type (except @end which is special)
    return this.createToken(TokenType.DIRECTIVE, keyword, startColumn);
  }

  private handleVariable(startColumn: number): Token {
    this.advance(); // {

    let path = '';
    while (!this.isAtEnd() && this.peek() !== '}') {
      path += this.peek();
      this.advance();
    }

    if (this.peek() !== '}') {
      throw new APTLSyntaxError(
        'Unterminated variable interpolation',
        this.line,
        startColumn,
      );
    }

    this.advance(); // }

    return this.createToken(TokenType.VARIABLE, path.trim(), startColumn);
  }

  private handleText(): Token {
    const startColumn = this.column;
    let value = '';

    while (!this.isAtEnd()) {
      const char = this.peek();

      // Handle escape sequences
      if (char === '\\') {
        this.advance(); // consume the backslash
        if (!this.isAtEnd()) {
          const escaped = this.peek();
          switch (escaped) {
            case 'n':
              value += '\n';
              break;
            case 't':
              value += '\t';
              break;
            case 'r':
              value += '\r';
              break;
            case '\\':
              value += '\\';
              break;
            case '@':
              value += '@';
              break;
            case '/':
              value += '/';
              break;
            case '(':
              value += '(';
              break;
            case ')':
              value += ')';
              break;
            case '=':
              value += '=';
              break;
            case '!':
              value += '!';
              break;
            case '"':
              value += '"';
              break;
            case "'":
              value += "'";
              break;
            default:
              // If not a recognized escape sequence, keep both characters
              value += '\\' + escaped;
              break;
          }
          this.advance();
        } else {
          // Backslash at end of input - preserve it
          value += '\\';
        }
        continue;
      }

      // Handle @ character carefully
      if (char === '@') {
        const nextChar = this.peekNext();

        // It's a variable if followed by {
        if (nextChar === '{') {
          break; // Let handleVariable process it
        }

        // Check if it could be a directive
        if (this.isAlpha(nextChar)) {
          // Peek ahead to read the potential keyword
          const savedPos = this.position;
          const savedCol = this.column;
          const savedLine = this.line;
          this.advance(); // Skip @
          const keyword = this.readIdentifier();

          // Reset position
          this.position = savedPos;
          this.column = savedCol;
          this.line = savedLine;

          // Check if it's a registered directive (or 'end' which is always valid)
          const isEndKeyword = keyword.toLowerCase() === 'end';
          const isRegisteredKeyword = this.registeredDirectives.has(
            keyword.toLowerCase(),
          );

          if (isEndKeyword || isRegisteredKeyword) {
            if (this.atStatementStart) {
              break; // Let handleDirective process it
            } else if (this.options.strictMode) {
              // In strict mode, throw an error if a directive is not at statement start
              throw new APTLSyntaxError(
                `Directive @${keyword} must be at the start of a statement (after a newline). Multiple directives on the same line are not allowed.`,
                this.line,
                this.column,
              );
            }
          } else {
            // Unknown directive - must be escaped!
            throw new APTLSyntaxError(
              `Unknown directive '@${keyword}'. If this is not a directive, escape the @ symbol: \\@${keyword}`,
              this.line,
              this.column,
            );
          }
        }

        // Otherwise, @ is just regular text - consume it
        value += char;
        this.advance();
        continue;
      }

      if (
        char === '\n' ||
        char === '\r' ||
        (char === '/' &&
          (this.peekNext() === '/' || this.peekNext() === '*')) ||
        char === '(' ||
        char === ')' ||
        char === ',' ||
        char === '"' ||
        char === "'"
      ) {
        break;
      }

      // Stop at two-character operators
      if (
        (char === '=' && this.peekNext() === '=') ||
        (char === '!' && this.peekNext() === '=') ||
        (char === '>' && this.peekNext() === '=') ||
        (char === '<' && this.peekNext() === '=')
      ) {
        break;
      }

      // Stop at single character operators
      if ((char === '>' || char === '<') && value.trim() !== '') {
        break;
      }

      // Stop at single = if we already have some non-whitespace content
      if (char === '=' && value.trim() !== '') {
        break;
      }

      value += char;
      this.advance();
    }

    // If we didn't consume any characters, consume at least one to avoid infinite loops
    if (value === '' && !this.isAtEnd()) {
      value = this.peek();
      this.advance();
    }

    // Now check if this text token contains special keywords and split if needed
    return this.processTextForKeywords(value, startColumn);
  }

  private processTextForKeywords(text: string, startColumn: number): Token {
    // For now, keep it simple - handle operators but not complex keyword splitting
    // The parser can handle "in" detection later

    // Check for operators within the text (but only at word boundaries)
    const operatorMatch = text.match(/^(.*?)(\s*)(==|!=)(\s.*)$/);
    if (operatorMatch) {
      const beforeOp = operatorMatch[1] + operatorMatch[2];

      // Backtrack to just before the operator
      const backtrackLength = text.length - beforeOp.length;
      this.position -= backtrackLength;
      this.column -= backtrackLength;

      return this.createToken(TokenType.TEXT, beforeOp, startColumn);
    }

    return this.createToken(TokenType.TEXT, text, startColumn);
  }

  private readIdentifier(): string {
    let identifier = '';

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      identifier += this.peek();
      this.advance();
    }

    return identifier;
  }

  private handleOperator(): Token {
    const startColumn = this.column;

    if (this.peek() === '=' && this.peekNext() === '=') {
      this.advance(); // =
      this.advance(); // =
      return this.createToken(TokenType.OPERATOR, '==', startColumn);
    }

    if (this.peek() === '!' && this.peekNext() === '=') {
      this.advance(); // !
      this.advance(); // =
      return this.createToken(TokenType.OPERATOR, '!=', startColumn);
    }

    if (this.peek() === '>' && this.peekNext() === '=') {
      this.advance(); // >
      this.advance(); // =
      return this.createToken(TokenType.OPERATOR, '>=', startColumn);
    }

    if (this.peek() === '<' && this.peekNext() === '=') {
      this.advance(); // <
      this.advance(); // =
      return this.createToken(TokenType.OPERATOR, '<=', startColumn);
    }

    // Single character operators
    const char = this.peek();
    this.advance();
    return this.createToken(TokenType.OPERATOR, char, startColumn);
  }

  private handleString(): Token {
    const startColumn = this.column;
    const quote = this.peek();
    this.advance(); // Opening quote

    let value = '';
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance(); // Skip escape character
        if (!this.isAtEnd()) {
          const escaped = this.peek();
          switch (escaped) {
            case 'n':
              value += '\n';
              break;
            case 't':
              value += '\t';
              break;
            case 'r':
              value += '\r';
              break;
            case '\\':
              value += '\\';
              break;
            case '"':
              value += '"';
              break;
            case "'":
              value += "'";
              break;
            default:
              value += escaped;
              break;
          }
          this.advance();
        }
      } else {
        if (this.peek() === '\n') {
          this.line++;
          this.column = 0;
        }
        value += this.peek();
        this.advance();
      }
    }

    if (this.peek() === quote) {
      this.advance(); // Closing quote
    } else {
      throw new APTLSyntaxError(
        `Unterminated string literal`,
        this.line,
        startColumn,
      );
    }

    return this.createToken(TokenType.STRING, value, startColumn);
  }

  private handlePunctuation(): Token {
    const startColumn = this.column;
    const char = this.peek();
    this.advance();

    switch (char) {
      case '(':
        return this.createToken(TokenType.LPAREN, char, startColumn);
      case ')':
        return this.createToken(TokenType.RPAREN, char, startColumn);
      case ',':
        return this.createToken(TokenType.PUNCTUATION, char, startColumn);
      case '=':
        return this.createToken(TokenType.ASSIGN, char, startColumn);
      default:
        return this.createToken(TokenType.PUNCTUATION, char, startColumn);
    }
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_-]/.test(char);
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.source.length) return '\0';
    return this.source[this.position + 1];
  }

  private advance(): string {
    const char = this.source[this.position];
    this.position++;
    this.column++;
    return char;
  }

  private isAtEnd(): boolean {
    return this.position >= this.source.length;
  }

  private createToken(type: TokenType, value: string, column?: number): Token {
    return {
      type,
      value,
      line: this.line,
      column: column ?? this.column,
    };
  }
}
