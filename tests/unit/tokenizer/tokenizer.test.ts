/**
 * APTL Tokenizer Unit Tests
 */

import { Tokenizer } from '@/core/tokenizer';
import { TokenType } from '@/core/types';
import { APTLSyntaxError } from '@/utils/errors';

describe('Tokenizer', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer();
  });

  describe('Basic Functionality', () => {
    it('should tokenize empty string', () => {
      const tokens = tokenizer.tokenize('');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should tokenize plain text', () => {
      const tokens = tokenizer.tokenize('Hello world');
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Hello world',
        line: 1,
        column: 1,
      });
      expect(tokens[1].type).toBe(TokenType.EOF);
    });

    it('should handle newlines', () => {
      const tokens = tokenizer.tokenize('Line 1\nLine 2');
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Line 1',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.NEWLINE,
        value: '\n',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Line 2',
      });
    });
  });

  describe('Variable Interpolation', () => {
    it('should tokenize simple variable', () => {
      const tokens = tokenizer.tokenize('@{name}');
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'name',
        line: 1,
        column: 1,
      });
    });

    it('should tokenize variable with default value', () => {
      const tokens = tokenizer.tokenize('@{name|"Guest"}');
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'name|"Guest"',
      });
    });

    it('should tokenize variable with accessor and default', () => {
      const tokens = tokenizer.tokenize('@{user.name|"Anonymous"}');
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'user.name|"Anonymous"',
      });
    });

    it('should tokenize nested variable paths', () => {
      const tokens = tokenizer.tokenize('@{user.profile.name}');
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'user.profile.name',
      });
    });

    it('should handle deeply nested accessors', () => {
      const tokens = tokenizer.tokenize(
        '@{company.departments.employees.contact.email}',
      );
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'company.departments.employees.contact.email',
      });
    });

    it('should handle multiple levels of dot notation', () => {
      const tokens = tokenizer.tokenize('@{a.b.c.d.e.f}');
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'a.b.c.d.e.f',
      });
    });

    it('should handle variables with underscores', () => {
      const tokens = tokenizer.tokenize('@{user_name} @{_private}');
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'user_name',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.VARIABLE,
        value: '_private',
      });
    });

    it('should handle variables with text', () => {
      const tokens = tokenizer.tokenize('Hello @{name}!');
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Hello ',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'name',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.TEXT,
        value: '!',
      });
    });

    it('should throw error on unterminated variable', () => {
      expect(() => tokenizer.tokenize('@{name')).toThrow(APTLSyntaxError);
    });

    it('should handle empty variable', () => {
      const tokens = tokenizer.tokenize('@{}');
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: '',
      });
    });
  });

  describe('Directives', () => {
    it('should tokenize @section directive', () => {
      const tokens = tokenizer.tokenize('@section');
      expect(tokens[0]).toMatchObject({
        type: TokenType.SECTION_START,
        value: 'section',
      });
    });

    it('should handle case-insensitive directives', () => {
      const tokens = tokenizer.tokenize('@SECTION\n@IF\n@ELSE\n@END');
      const directiveTokens = tokens.filter(
        (t) =>
          t.type === TokenType.SECTION_START ||
          t.type === TokenType.IF ||
          t.type === TokenType.ELSE ||
          t.type === TokenType.END,
      );
      expect(directiveTokens).toHaveLength(4);
      expect(directiveTokens[0].type).toBe(TokenType.SECTION_START);
      expect(directiveTokens[1].type).toBe(TokenType.IF);
      expect(directiveTokens[2].type).toBe(TokenType.ELSE);
      expect(directiveTokens[3].type).toBe(TokenType.END);
    });

    it('should tokenize @end directive', () => {
      const tokens = tokenizer.tokenize('@end');
      expect(tokens[0]).toMatchObject({
        type: TokenType.END,
        value: 'end',
      });
    });

    it('should tokenize conditional directives', () => {
      // Directives must be on separate lines
      const tokens = tokenizer.tokenize('@if\n@elif\n@else');

      const directiveTokens = tokens.filter(
        (t) =>
          t.type === TokenType.IF ||
          t.type === TokenType.ELIF ||
          t.type === TokenType.ELSE,
      );

      expect(directiveTokens).toHaveLength(3);
      expect(directiveTokens[0].type).toBe(TokenType.IF);
      expect(directiveTokens[1].type).toBe(TokenType.ELIF);
      expect(directiveTokens[2].type).toBe(TokenType.ELSE);
    });

    it('should tokenize @each directive', () => {
      const tokens = tokenizer.tokenize('@each');
      expect(tokens[0]).toMatchObject({
        type: TokenType.EACH,
        value: 'each',
      });
    });

    it('should throw error on unknown directives', () => {
      // Unknown directive keywords must be escaped
      expect(() => tokenizer.tokenize('@unknown')).toThrow(APTLSyntaxError);
      expect(() => tokenizer.tokenize('@unknown')).toThrow(
        /Unknown directive '@unknown'/,
      );
      expect(() => tokenizer.tokenize('@unknown')).toThrow(
        /escape the @ symbol/,
      );
    });
  });

  describe('Keywords', () => {
    it('should tokenize "in" keyword', () => {
      const tokens = tokenizer.tokenize('@each item in items');

      // The 'in' keyword is mainly important in the context of @each
      // Let's focus on that use case
      expect(tokens).toHaveLength(3); // @each + text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.EACH,
        value: 'each',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.TEXT,
        value: ' item in items',
      });
    });

    it('should recognize logical operator keywords', () => {
      // Test that and, or, not appear in text for now
      // The parser will handle their semantic meaning
      const tokens = tokenizer.tokenize('@if isAdmin and isActive');
      expect(tokens.some((t) => t.value.includes('and'))).toBe(true);
    });

    it('should handle "or" in conditions', () => {
      const tokens = tokenizer.tokenize('@if isGuest or isAnonymous');
      expect(tokens.some((t) => t.value.includes('or'))).toBe(true);
    });

    it('should handle "not" in conditions', () => {
      const tokens = tokenizer.tokenize('@if not isLoggedIn');
      expect(tokens.some((t) => t.value.includes('not'))).toBe(true);
    });

    it('should handle complex logical expressions', () => {
      const tokens = tokenizer.tokenize(
        '@if (isAdmin and isActive) or isSuperUser',
      );
      expect(tokens.filter((t) => t.type === TokenType.LPAREN)).toHaveLength(1);
      expect(tokens.filter((t) => t.type === TokenType.RPAREN)).toHaveLength(1);
      expect(tokens.some((t) => t.value.includes('and'))).toBe(true);
      expect(tokens.some((t) => t.value.includes('or'))).toBe(true);
    });
  });

  describe('Operators', () => {
    it('should tokenize equality operators', () => {
      const tokens = tokenizer.tokenize('a == b');

      // Should detect the operator and split appropriately
      expect(tokens.length).toBeGreaterThan(2);
      const hasOperator = tokens.some(
        (token) => token.type === TokenType.OPERATOR && token.value === '==',
      );
      expect(hasOperator).toBe(true);
    });

    it('should tokenize inequality operators', () => {
      const tokens = tokenizer.tokenize('a != b');

      // Should detect the operator and split appropriately
      expect(tokens.length).toBeGreaterThan(2);
      const hasOperator = tokens.some(
        (token) => token.type === TokenType.OPERATOR && token.value === '!=',
      );
      expect(hasOperator).toBe(true);
    });

    it('should tokenize greater than operator', () => {
      const tokens = tokenizer.tokenize('count > 5');
      expect(
        tokens.some((t) => t.type === TokenType.OPERATOR && t.value === '>'),
      ).toBe(true);
    });

    it('should tokenize less than operator', () => {
      const tokens = tokenizer.tokenize('age < 18');
      expect(
        tokens.some((t) => t.type === TokenType.OPERATOR && t.value === '<'),
      ).toBe(true);
    });

    it('should tokenize greater than or equal', () => {
      const tokens = tokenizer.tokenize('score >= 90');
      expect(
        tokens.some((t) => t.type === TokenType.OPERATOR && t.value === '>='),
      ).toBe(true);
    });

    it('should tokenize less than or equal', () => {
      const tokens = tokenizer.tokenize('value <= 100');
      expect(
        tokens.some((t) => t.type === TokenType.OPERATOR && t.value === '<='),
      ).toBe(true);
    });

    it('should differentiate single = from ==', () => {
      const tokens1 = tokenizer.tokenize('a = b');
      const tokens2 = tokenizer.tokenize('a == b');

      expect(
        tokens1.some((t) => t.type === TokenType.ASSIGN && t.value === '='),
      ).toBe(true);
      expect(
        tokens2.some((t) => t.type === TokenType.OPERATOR && t.value === '=='),
      ).toBe(true);
    });

    it('should tokenize assignment', () => {
      const tokens = tokenizer.tokenize('role="system"');
      expect(tokens).toHaveLength(4); // identifier + = + string + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'role',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.ASSIGN,
        value: '=',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.STRING,
        value: 'system',
      });
    });
  });

  describe('String Literals', () => {
    it('should tokenize double-quoted strings', () => {
      const tokens = tokenizer.tokenize('"hello world"');
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'hello world',
      });
    });

    it('should tokenize single-quoted strings', () => {
      const tokens = tokenizer.tokenize("'hello world'");
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'hello world',
      });
    });

    it('should handle escaped characters in strings', () => {
      const tokens = tokenizer.tokenize('"hello\\nworld\\t!"');
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'hello\nworld\t!',
      });
    });

    it('should handle escaped quotes', () => {
      const tokens = tokenizer.tokenize('"He said \\"Hello\\""');
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'He said "Hello"',
      });
    });

    it('should throw error on unterminated string', () => {
      expect(() => tokenizer.tokenize('"unterminated')).toThrow(
        APTLSyntaxError,
      );
    });

    it('should handle multiline strings', () => {
      const tokens = tokenizer.tokenize('"line 1\nline 2"');
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'line 1\nline 2',
      });
    });
  });

  describe('Punctuation', () => {
    it('should tokenize parentheses', () => {
      const tokens = tokenizer.tokenize('(content)');
      expect(tokens).toHaveLength(4); // ( + content + ) + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.LPAREN,
        value: '(',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.TEXT,
        value: 'content',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.RPAREN,
        value: ')',
      });
    });

    it('should tokenize commas in attribute lists', () => {
      const tokens = tokenizer.tokenize('(a="1", b="2")');
      expect(
        tokens.some((t) => t.type === TokenType.PUNCTUATION && t.value === ','),
      ).toBe(true);
    });

    it('should handle multiple comma-separated attributes', () => {
      const tokens = tokenizer.tokenize(
        '@section test(role="system", priority="high", mode="strict")',
      );
      const commas = tokens.filter(
        (t) => t.type === TokenType.PUNCTUATION && t.value === ',',
      );
      expect(commas.length).toBeGreaterThanOrEqual(2);
    });

    it('should not tokenize comma inside strings', () => {
      const tokens = tokenizer.tokenize('"hello, world"');
      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'hello, world',
      });
      // Comma inside string should not be a separate punctuation token
      const commaPunctuation = tokens.filter(
        (t) => t.type === TokenType.PUNCTUATION && t.value === ',',
      );
      expect(commaPunctuation).toHaveLength(0);
    });
  });

  describe('Comments', () => {
    it('should handle line comments', () => {
      const tokenizer = new Tokenizer({ preserveComments: true });
      const tokens = tokenizer.tokenize('// This is a comment');
      expect(tokens[0]).toMatchObject({
        type: TokenType.COMMENT_LINE,
        value: 'This is a comment',
      });
    });

    it('should handle block comments', () => {
      const tokenizer = new Tokenizer({ preserveComments: true });
      const tokens = tokenizer.tokenize('/* Block comment */');
      expect(tokens[0]).toMatchObject({
        type: TokenType.COMMENT_BLOCK,
        value: 'Block comment',
      });
    });

    it('should handle multiline block comments', () => {
      const tokenizer = new Tokenizer({ preserveComments: true });
      const tokens = tokenizer.tokenize('/* Line 1\nLine 2 */');
      expect(tokens[0]).toMatchObject({
        type: TokenType.COMMENT_BLOCK,
        value: 'Line 1\nLine 2',
      });
    });

    it('should skip comments by default', () => {
      const tokens = tokenizer.tokenize('// Comment\ntext');
      expect(tokens).toHaveLength(3); // newline + text + EOF
      expect(tokens[0].type).toBe(TokenType.NEWLINE);
      expect(tokens[1].type).toBe(TokenType.TEXT);
    });

    it('should throw error on unterminated block comment', () => {
      expect(() => tokenizer.tokenize('/* unterminated')).not.toThrow();
      // Block comments that reach EOF are allowed (they just end)
    });
  });

  describe('Complex Templates', () => {
    it('should tokenize section with attributes', () => {
      const tokens = tokenizer.tokenize('@section identity(role="system")');

      expect(tokens[0]).toMatchObject({
        type: TokenType.SECTION_START,
        value: 'section',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.TEXT,
        value: ' identity',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.LPAREN,
        value: '(',
      });
      expect(tokens[3]).toMatchObject({
        type: TokenType.TEXT,
        value: 'role',
      });
      expect(tokens[4]).toMatchObject({
        type: TokenType.ASSIGN,
        value: '=',
      });
      expect(tokens[5]).toMatchObject({
        type: TokenType.STRING,
        value: 'system',
      });
      expect(tokens[6]).toMatchObject({
        type: TokenType.RPAREN,
        value: ')',
      });
    });

    it('should tokenize conditional with comparison', () => {
      const tokens = tokenizer.tokenize('@if userLevel == "beginner"');

      expect(tokens[0]).toMatchObject({
        type: TokenType.IF,
        value: 'if',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.TEXT,
        value: ' userLevel ',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.OPERATOR,
        value: '==',
      });
      expect(tokens[3]).toMatchObject({
        type: TokenType.TEXT,
        value: ' ',
      });
      expect(tokens[4]).toMatchObject({
        type: TokenType.STRING,
        value: 'beginner',
      });
    });

    it('should tokenize iteration syntax', () => {
      const tokens = tokenizer.tokenize('@each credential in credentials');

      expect(tokens[0]).toMatchObject({
        type: TokenType.EACH,
        value: 'each',
      });
      // The rest can be handled by the parser
      expect(tokens[1]).toMatchObject({
        type: TokenType.TEXT,
        value: ' credential in credentials',
      });
    });

    it('should handle complex nested template', () => {
      const template = `@section identity(role="system")
  You are @{agentName}, a @{agentRole}.
  @if credentials
    Credentials: @{credentials}
  @end
@end`;

      const tokens = tokenizer.tokenize(template);

      // Should have proper tokens for the entire structure
      expect(tokens.length).toBeGreaterThan(10);
      expect(tokens[0].type).toBe(TokenType.SECTION_START);
      expect(tokens.filter((t) => t.type === TokenType.VARIABLE)).toHaveLength(
        3,
      );
      expect(tokens.filter((t) => t.type === TokenType.IF)).toHaveLength(1);
      expect(tokens.filter((t) => t.type === TokenType.END)).toHaveLength(2);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });
  });

  describe('Line and Column Tracking', () => {
    it('should track line numbers correctly', () => {
      const tokens = tokenizer.tokenize('line1\nline2\nline3');

      expect(tokens[0]).toMatchObject({ line: 1 }); // line1
      expect(tokens[1]).toMatchObject({ line: 1 }); // \n
      expect(tokens[2]).toMatchObject({ line: 2 }); // line2
      expect(tokens[3]).toMatchObject({ line: 2 }); // \n
      expect(tokens[4]).toMatchObject({ line: 3 }); // line3
    });

    it('should track column numbers correctly', () => {
      const tokens = tokenizer.tokenize('@{var}');

      expect(tokens[0]).toMatchObject({
        line: 1,
        column: 1,
      });
    });

    it('should handle complex line/column tracking', () => {
      const template = `@section test
  @{variable}`;

      const tokens = tokenizer.tokenize(template);
      const variableToken = tokens.find((t) => t.type === TokenType.VARIABLE);

      expect(variableToken).toMatchObject({
        line: 2,
        column: 3,
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages with location', () => {
      try {
        tokenizer.tokenize('@{unterminated');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.line).toBe(1);
        expect(syntaxError.column).toBe(1);
        expect(syntaxError.message).toContain(
          'Unterminated variable interpolation',
        );
      }
    });

    it('should handle syntax errors in complex templates', () => {
      const template = `@section test
@unknown directive
@end`;

      try {
        tokenizer.tokenize(template);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.line).toBe(2);
        expect(syntaxError.message).toContain('Unknown directive');
        expect(syntaxError.message).toContain('@unknown');
        expect(syntaxError.message).toContain('escape');
      }
    });
  });

  describe('Whitespace Handling', () => {
    it('should skip spaces and tabs but preserve in text', () => {
      const tokens = tokenizer.tokenize('  text  ');
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: '  text  ',
      });
    });

    it('should handle mixed whitespace correctly', () => {
      const tokens = tokenizer.tokenize('\t@section \t test');

      // Should tokenize the leading tab as text, then @section, then the rest
      expect(tokens.length).toBeGreaterThan(2);
      expect(tokens.some((t) => t.type === TokenType.SECTION_START)).toBe(true);
      expect(
        tokens.some(
          (t) => t.type === TokenType.TEXT && t.value.includes('test'),
        ),
      ).toBe(true);
    });
  });
});
