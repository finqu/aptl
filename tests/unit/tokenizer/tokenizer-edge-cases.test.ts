/**
 * Additional APTL Tokenizer Edge Case Tests
 */

import { Tokenizer } from '@/core/tokenizer';
import { TokenType } from '@/core/types';
import { APTLSyntaxError } from '@/utils/errors';

describe('Tokenizer Edge Cases', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer();
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle consecutive directives', () => {
      // Directives must be at statement boundaries (after newlines)
      const tokens = tokenizer.tokenize('@if\n@else\n@end');

      // if + newline + else + newline + end + EOF = 6 tokens
      const directiveTokens = tokens.filter(
        (t) =>
          t.type === TokenType.IF ||
          t.type === TokenType.ELSE ||
          t.type === TokenType.END,
      );
      expect(directiveTokens).toHaveLength(3);
      expect(directiveTokens[0].type).toBe(TokenType.IF);
      expect(directiveTokens[1].type).toBe(TokenType.ELSE);
      expect(directiveTokens[2].type).toBe(TokenType.END);
    });

    it('should handle number literals in text', () => {
      const tokens = tokenizer.tokenize('42 3.14 -100');
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: '42 3.14 -100',
      });
    });

    it('should handle boolean literals in text', () => {
      const tokens = tokenizer.tokenize('true false');
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'true false',
      });
    });

    it('should handle identifiers with hyphens', () => {
      const tokens = tokenizer.tokenize('@{user-name} @{my-var}');
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'user-name',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'my-var',
      });
    });

    it('should handle mixed quotes in strings', () => {
      const tokens = tokenizer.tokenize('"He said \'hello\'"');

      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: "He said 'hello'",
      });
    });

    it('should handle empty sections and variables', () => {
      // Directives must be at statement boundaries
      const tokens = tokenizer.tokenize(`@section test
@{}
@end`);

      const sectionTokens = tokens.filter(
        (t) => t.type === TokenType.SECTION_START,
      );
      const variableTokens = tokens.filter(
        (t) => t.type === TokenType.VARIABLE,
      );
      const endTokens = tokens.filter((t) => t.type === TokenType.END);

      expect(sectionTokens).toHaveLength(1);
      expect(variableTokens).toHaveLength(1);
      expect(variableTokens[0].value).toBe('');
      expect(endTokens).toHaveLength(1);
    });

    it('should handle special characters in text', () => {
      const tokens = tokenizer.tokenize('Text with!#$%^&*[]{}|\\:<>?,.`~');

      // Some special chars like <, >, and , are now recognized as operators/punctuation
      // So we expect multiple tokens
      expect(tokens.length).toBeGreaterThan(2);
      expect(tokens.some((t) => t.type === TokenType.TEXT)).toBe(true);
      expect(
        tokens.some(
          (t) =>
            t.type === TokenType.OPERATOR &&
            (t.value === '<' || t.value === '>'),
        ),
      ).toBe(true);
      expect(
        tokens.some((t) => t.type === TokenType.PUNCTUATION && t.value === ','),
      ).toBe(true);
    });

    it('should handle assignment separately from special chars', () => {
      const tokens = tokenizer.tokenize('text=value');

      expect(tokens).toHaveLength(4); // text + = + value + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'text',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.ASSIGN,
        value: '=',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.TEXT,
        value: 'value',
      });
    });

    it('should handle multiple operators in sequence', () => {
      const tokens = tokenizer.tokenize('a == b != c');

      // Should find both operators
      const operators = tokens.filter((t) => t.type === TokenType.OPERATOR);
      expect(operators).toHaveLength(2);
      expect(operators[0].value).toBe('==');
      expect(operators[1].value).toBe('!=');
    });

    it('should handle deeply nested quotes', () => {
      const template = '"Outer \\"Middle \\\\\\"Inner\\\\\\" Middle\\" Outer"';
      const tokens = tokenizer.tokenize(template);

      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'Outer "Middle \\"Inner\\" Middle" Outer',
      });
    });

    it('should handle variables at start and end', () => {
      const tokens = tokenizer.tokenize('@{start}middle@{end}');

      expect(tokens).toHaveLength(4); // var + text + var + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'start',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.TEXT,
        value: 'middle',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'end',
      });
    });

    it('should handle complex section attributes', () => {
      const tokens = tokenizer.tokenize(
        '@section test(role="system" priority="high")',
      );

      expect(tokens[0]).toMatchObject({
        type: TokenType.SECTION_START,
        value: 'section',
      });

      // Should contain parentheses, strings, and assignment operators
      expect(tokens.some((t) => t.type === TokenType.LPAREN)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.RPAREN)).toBe(true);
      expect(tokens.filter((t) => t.type === TokenType.STRING)).toHaveLength(2);
      expect(tokens.filter((t) => t.type === TokenType.ASSIGN)).toHaveLength(2);
    });

    it('should handle line endings correctly', () => {
      const tokens = tokenizer.tokenize('line1\r\nline2\nline3\rline4');

      // \r\n is one newline, \n is one newline, \r is one newline = 3 total
      expect(tokens.filter((t) => t.type === TokenType.NEWLINE)).toHaveLength(
        3,
      );
      expect(tokens.filter((t) => t.type === TokenType.TEXT)).toHaveLength(4);

      // Verify the newline values
      const newlines = tokens.filter((t) => t.type === TokenType.NEWLINE);
      expect(newlines[0].value).toBe('\r\n'); // Windows line ending
      expect(newlines[1].value).toBe('\n'); // Unix line ending
      expect(newlines[2].value).toBe('\r'); // Classic Mac line ending
    });

    it('should handle very long strings', () => {
      const longString = '"' + 'a'.repeat(1000) + '"';
      const tokens = tokenizer.tokenize(longString);

      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'a'.repeat(1000),
      });
    });

    it('should handle Unicode characters', () => {
      const tokens = tokenizer.tokenize('@{user.😀} "Hello 世界! 🌍"');

      expect(tokens[0]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'user.😀',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.STRING,
        value: 'Hello 世界! 🌍',
      });
    });

    it('should handle malformed but recoverable syntax', () => {
      // Extra spaces, mixed case, etc. - directives must still be on separate lines
      const tokens = tokenizer.tokenize(
        '  @SECTION   test  \n@IF   condition  \n@END  ',
      );

      expect(tokens.some((t) => t.type === TokenType.SECTION_START)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.IF)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.END)).toBe(true);
    });

    it('should handle empty lines and whitespace-only lines', () => {
      const tokens = tokenizer.tokenize('line1\n\n   \t   \n\nline2');

      // Should preserve structure for the parser to handle
      expect(tokens.filter((t) => t.type === TokenType.NEWLINE)).toHaveLength(
        4,
      );
      expect(tokens.filter((t) => t.type === TokenType.TEXT)).toHaveLength(3);
    });

    it('should handle comments at different positions', () => {
      const tokenizer = new Tokenizer({ preserveComments: true });
      const tokens = tokenizer.tokenize(
        '// Start\ntext /* mid */ text\n// End',
      );

      expect(
        tokens.filter((t) => t.type === TokenType.COMMENT_LINE),
      ).toHaveLength(2);
      expect(
        tokens.filter((t) => t.type === TokenType.COMMENT_BLOCK),
      ).toHaveLength(1);
    });
  });

  describe('@ Symbol Edge Cases', () => {
    it('should handle @ at end of line', () => {
      const tokens = tokenizer.tokenize('Email: user@');
      expect(tokens[0].value).toBe('Email: user@');
      expect(tokens[0].type).toBe(TokenType.TEXT);
    });

    it('should handle @ not followed by keyword char (BNF rule)', () => {
      // Per BNF: <text> ::= "@" <not-keyword-char>
      const tokens = tokenizer.tokenize('Price @$19.99 and @123');
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toContain('@$');
      expect(tokens[0].value).toContain('@123');
    });

    it('should throw error when @ is followed by letters (potential directive)', () => {
      // @ followed by letters is reserved for directives
      expect(() => tokenizer.tokenize('user@example.com')).toThrow(
        APTLSyntaxError,
      );
      expect(() => tokenizer.tokenize('user@example.com')).toThrow(
        /Unknown directive '@example'/,
      );
      expect(() => tokenizer.tokenize('user@example.com')).toThrow(
        /escape the @ symbol/,
      );
    });

    it('should handle multiple @ in text when not followed by letters', () => {
      const tokens = tokenizer.tokenize('Contact: user@123.com');
      // Should treat @ followed by numbers as regular text
      expect(
        tokens.some((t) => t.type === TokenType.TEXT && t.value.includes('@')),
      ).toBe(true);
    });

    it('should require escaping @ when followed by letters', () => {
      // According to BNF, @ followed by letters could be a directive
      // so email addresses must be escaped
      const tokens = tokenizer.tokenize(
        'Email me at john.doe\\@example.com or jane\\@test.org',
      );
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toContain('john.doe@example.com');
      expect(tokens[0].value).toContain('jane@test.org');
    });

    it('should handle @ followed by numbers', () => {
      const tokens = tokenizer.tokenize('@123 is not a directive');
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toContain('@123');
    });

    it('should throw error for @@ when second @ is followed by letters', () => {
      // @@ is not a valid escape sequence in BNF
      // The second @ followed by letters is still an unknown directive
      expect(() => tokenizer.tokenize('Email: user@@domain.com')).toThrow(
        APTLSyntaxError,
      );
      expect(() => tokenizer.tokenize('Email: user@@domain.com')).toThrow(
        /Unknown directive '@domain'/,
      );
    });

    it('should handle @@ when second @ is not followed by letters', () => {
      // @@ followed by non-letter is valid
      const tokens = tokenizer.tokenize('Email: user@@123.com');
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toBe('Email: user@@123.com');
    });

    it('should handle @ followed by special characters', () => {
      const tokens = tokenizer.tokenize('Price: @$19.99');
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toContain('@$');
    });
  });

  describe('Blank Line Handling', () => {
    it('should detect consecutive newlines as blank lines', () => {
      const tokens = tokenizer.tokenize('Line1\n\nLine2');
      const newlines = tokens.filter((t) => t.type === TokenType.NEWLINE);
      expect(newlines.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle multiple blank lines', () => {
      const tokens = tokenizer.tokenize('Line1\n\n\nLine2');
      const newlines = tokens.filter((t) => t.type === TokenType.NEWLINE);
      expect(newlines.length).toBeGreaterThanOrEqual(3);
    });

    it('should preserve blank lines in template structure', () => {
      const template = `@section test
Content here

More content
@end`;
      const tokens = tokenizer.tokenize(template);
      const newlines = tokens.filter((t) => t.type === TokenType.NEWLINE);
      expect(newlines.length).toBeGreaterThan(0);
    });

    it('should handle blank lines between directives', () => {
      const template = `@if condition

@else

@end`;
      const tokens = tokenizer.tokenize(template);
      const newlines = tokens.filter((t) => t.type === TokenType.NEWLINE);
      // Should have newlines preserved
      expect(newlines.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Escape Sequences', () => {
    it('should handle escaped @ symbol', () => {
      const tokens = tokenizer.tokenize('Text with \\@ symbol');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Text with @ symbol',
      });
    });

    it('should handle escaped forward slash', () => {
      const tokens = tokenizer.tokenize('Path: C:\\/ or D:\\/');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Path: C:/ or D:/',
      });
    });

    it('should handle escaped parentheses', () => {
      const tokens = tokenizer.tokenize('Function\\(param\\)');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Function(param)',
      });
    });

    it('should handle escaped quotes', () => {
      const tokens = tokenizer.tokenize('He said \\"Hello\\" to me');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'He said "Hello" to me',
      });
    });

    it('should handle escaped equals sign', () => {
      const tokens = tokenizer.tokenize('Math: 2 + 2 \\= 4');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Math: 2 + 2 = 4',
      });
    });

    it('should handle escaped exclamation mark', () => {
      const tokens = tokenizer.tokenize('Not a directive\\! Just text');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Not a directive! Just text',
      });
    });

    it('should handle escaped single equals', () => {
      const tokens = tokenizer.tokenize('Math equation: 2 + 2 \\= 4');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Math equation: 2 + 2 = 4',
      });
    });

    it('should handle escaped backslash', () => {
      const tokens = tokenizer.tokenize('Path: C:\\\\Users\\\\name');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Path: C:\\Users\\name',
      });
    });

    it('should handle escaped newlines', () => {
      const tokens = tokenizer.tokenize('Line 1\\nLine 2');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Line 1\nLine 2',
      });
    });

    it('should handle multiple escaped characters', () => {
      const tokens = tokenizer.tokenize(
        '\\@section identity\\(role\\=\\"system\\"\\)',
      );

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: '@section identity(role="system")',
      });
    });

    it('should handle mixed escaped and unescaped', () => {
      const tokens = tokenizer.tokenize(
        'Normal @{var} and escaped \\@{not_var}',
      );

      // Should have: text + variable + text + EOF
      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Normal ',
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.VARIABLE,
        value: 'var',
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.TEXT,
        value: ' and escaped @{not_var}',
      });
    });

    it('should handle escape at end of input', () => {
      const tokens = tokenizer.tokenize('Text ending with\\');

      expect(tokens).toHaveLength(2); // text + EOF
      expect(tokens[0]).toMatchObject({
        type: TokenType.TEXT,
        value: 'Text ending with\\',
      });
    });
  });

  describe('Performance and Limits', () => {
    it('should handle reasonable template sizes efficiently', () => {
      const largeTemplate =
        '@section test\n'.repeat(1000) +
        'Large content\n'.repeat(1000) +
        '@end\n'.repeat(1000);

      const start = Date.now();
      const tokens = tokenizer.tokenize(largeTemplate);
      const end = Date.now();

      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
      expect(tokens.length).toBeGreaterThan(1000);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });
  });
});
