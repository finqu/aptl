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
  private onDirectiveLine: boolean = false; // Track if we're on a line with a directive

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
    this.onDirectiveLine = false;

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
          this.onDirectiveLine = false; // Reset directive line flag on newline
        } else if (
          token.type === TokenType.VARIABLE ||
          token.type === TokenType.DIRECTIVE
        ) {
          // Once we've started a statement with variable/directive start, we're no longer at start
          this.atStatementStart = false;
          // If we just tokenized a directive, we're on a directive line
          if (token.type === TokenType.DIRECTIVE) {
            this.onDirectiveLine = true;
          }
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
   * Tokenize directive arguments where quotes should be parsed as string literals
   * This is used by argument parsers to properly handle quoted strings in directive arguments
   */
  tokenizeDirectiveArguments(source: string): Token[] {
    this.source = source;
    this.position = 0;
    this.line = 1;
    this.column = 1;
    this.indentStack = [0];
    this.lastTokenType = null;
    this.atStatementStart = false; // Arguments are not at statement start

    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const token = this.nextTokenForArguments();
      if (token) {
        tokens.push(token);
        this.lastTokenType = token.type;
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

    // Handle colon - only as punctuation on directive lines
    // This allows inline directive syntax like @section name: content
    // But doesn't interfere with regular text like "Email: user@example.com"
    if (this.peek() === ':' && this.onDirectiveLine) {
      return this.handlePunctuation();
    }

    // Handle everything else as text (including whitespace and keywords)
    // Quotes are just regular text characters unless parsed in specific contexts
    return this.handleText();
  }

  /**
   * Token parsing specifically for directive arguments where quotes are string delimiters
   */
  private nextTokenForArguments(): Token | null {
    // Handle newlines
    if (this.peek() === '\n' || this.peek() === '\r') {
      return this.handleNewline();
    }

    // Handle string literals - in argument context, quotes are string delimiters
    if (this.peek() === '"' || this.peek() === "'") {
      return this.handleString();
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

    // Handle everything else as text
    return this.handleTextForArguments();
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
      // @end can appear anywhere (inline or at statement start)
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
    // If NOT at statement start (i.e., there's text before the @),
    // we MUST have inline syntax with a colon `:` somewhere before the newline
    if (!this.atStatementStart) {
      // Look ahead to check if there's a colon before the next newline
      // This validates inline syntax: text @directive args: inline content
      const savedPos = this.position;
      const savedCol = this.column;

      let foundColon = false;
      while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
        if (this.peek() === ':') {
          foundColon = true;
          break;
        }
        this.advance();
      }

      // Restore position
      this.position = savedPos;
      this.column = savedCol;

      // Now we should have found a colon for inline syntax
      if (!foundColon) {
        throw new APTLSyntaxError(
          `Directive @${keyword} must use inline syntax with ':' when not at statement start. Expected: @${keyword}(...): content`,
          this.line,
          startColumn,
        );
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
            // Always break to let handleDirective process it, regardless of position
            // The directive handler will determine if it needs a colon for inline syntax
            break;
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
        (char === ':' && this.onDirectiveLine) // Stop at colon on directive lines
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

  /**
   * Handle text tokens in argument context - simpler than template text
   * Stop at quotes, punctuation, and newlines
   */
  private handleTextForArguments(): Token {
    const startColumn = this.column;
    let value = '';

    while (!this.isAtEnd()) {
      const char = this.peek();

      // Stop at quotes (they are string delimiters in argument context)
      if (char === '"' || char === "'") {
        break;
      }

      // Stop at newlines
      if (char === '\n' || char === '\r') {
        break;
      }

      // Stop at punctuation
      if (char === '(' || char === ')' || char === ',' || char === '=') {
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

    return this.createToken(TokenType.TEXT, value, startColumn);
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
      case ':':
        return this.createToken(TokenType.COLON, char, startColumn);
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
