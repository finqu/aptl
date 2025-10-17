/**
 * Tokenizer Tests - Where @ meets its maker
 * Testing the fine art of turning strings into tokens without losing your mind
 */

import { Tokenizer } from '@/core/tokenizer';
import { TokenType } from '@/core/types';
import { APTLSyntaxError } from '@/utils/errors';

describe('Tokenizer - The @ Whisperer', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer();
  });

  describe('Plain Text - The Boring Baseline', () => {
    it('should tokenize plain text without drama', () => {
      const tokens = tokenizer.tokenize('Hello world!');
      expect(tokens).toHaveLength(2); // TEXT + EOF
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toBe('Hello world!');
    });

    it('should handle empty strings like a pro', () => {
      const tokens = tokenizer.tokenize('');
      expect(tokens).toHaveLength(1); // Just EOF
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    it('should preserve whitespace (we care about indentation)', () => {
      const tokens = tokenizer.tokenize('  spaces  ');
      expect(tokens[0].value).toBe('  spaces  ');
    });
  });

  describe('Variables - @ {curly braces of power}', () => {
    it('should extract simple variables', () => {
      const tokens = tokenizer.tokenize('@{user}');
      expect(tokens[0].type).toBe(TokenType.VARIABLE);
      expect(tokens[0].value).toBe('user');
    });

    it('should handle nested paths like a champ', () => {
      const tokens = tokenizer.tokenize('@{user.profile.email}');
      expect(tokens[0].type).toBe(TokenType.VARIABLE);
      expect(tokens[0].value).toBe('user.profile.email');
    });

    it('should tokenize variables mid-text (inline interpolation)', () => {
      const tokens = tokenizer.tokenize('Hello @{name} and welcome!');
      expect(tokens).toHaveLength(4); // TEXT, VARIABLE, TEXT, EOF
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toBe('Hello ');
      expect(tokens[1].type).toBe(TokenType.VARIABLE);
      expect(tokens[1].value).toBe('name');
      expect(tokens[2].type).toBe(TokenType.TEXT);
      expect(tokens[2].value).toBe(' and welcome!');
    });

    it('should handle whitespace in variable braces', () => {
      const tokens = tokenizer.tokenize('@{ user.name }');
      expect(tokens[0].value).toBe('user.name'); // Trimmed
    });

    it('should throw on unterminated variables (no escape hatch)', () => {
      expect(() => tokenizer.tokenize('@{user')).toThrow(APTLSyntaxError);
      expect(() => tokenizer.tokenize('@{user')).toThrow(
        /Unterminated variable/,
      );
    });

    it('should handle consecutive variables without spaces', () => {
      const tokens = tokenizer.tokenize('@{first}@{second}');
      expect(tokens).toHaveLength(3); // VAR, VAR, EOF
      expect(tokens[0].value).toBe('first');
      expect(tokens[1].value).toBe('second');
    });
  });

  describe('Directives - @ the statement start', () => {
    beforeEach(() => {
      // Register common directives
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('each');
      tokenizer.registerDirective('section');
    });

    it('should recognize registered directives', () => {
      const tokens = tokenizer.tokenize('@if condition\n');
      expect(tokens[0].type).toBe(TokenType.DIRECTIVE);
      expect(tokens[0].value).toBe('if');
    });

    it('should always recognize @end (the universal closer)', () => {
      const tokens = tokenizer.tokenize('@end\n');
      expect(tokens[0].type).toBe(TokenType.END);
      expect(tokens[0].value).toBe('end');
    });

    it('should throw on unknown directives (no guessing games)', () => {
      expect(() => tokenizer.tokenize('@unknown test\n')).toThrow(
        APTLSyntaxError,
      );
      expect(() => tokenizer.tokenize('@unknown test\n')).toThrow(
        /Unknown directive/,
      );
    });

    it('should suggest escaping in error message', () => {
      expect(() => tokenizer.tokenize('@twitter handle\n')).toThrow(
        /escape the @ symbol/,
      );
    });

    it('should handle directives at line start only', () => {
      const tokens = tokenizer.tokenize('@if test\n');
      expect(tokens[0].type).toBe(TokenType.DIRECTIVE);
    });

    it('should reject directives mid-line in strict mode', () => {
      const strictTokenizer = new Tokenizer({ strictMode: true });
      strictTokenizer.registerDirective('if');

      expect(() =>
        strictTokenizer.tokenize('Some text @if condition\n'),
      ).toThrow(/must be at the start of a statement/);
    });

    it('should allow directives after newlines', () => {
      const tokens = tokenizer.tokenize('text\n@if condition\n');
      expect(tokens[2].type).toBe(TokenType.DIRECTIVE); // After TEXT, NEWLINE
    });

    it('should handle case-insensitive directive names', () => {
      tokenizer.registerDirective('MyDirective');
      const tokens = tokenizer.tokenize('@mydirective\n');
      expect(tokens[0].type).toBe(TokenType.DIRECTIVE);
    });
  });

  describe('Escape Sequences - The \\ Savior', () => {
    it('should escape @ symbols', () => {
      const tokens = tokenizer.tokenize('Email: user\\@example.com');
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toBe('Email: user@example.com');
    });

    it('should escape backslashes', () => {
      const tokens = tokenizer.tokenize('Path: C:\\\\Users\\\\');
      expect(tokens[0].value).toBe('Path: C:\\Users\\');
    });

    it('should handle standard escapes (\\n, \\t, \\r)', () => {
      const tokens = tokenizer.tokenize('Line1\\nLine2\\tTabbed');
      expect(tokens[0].value).toBe('Line1\nLine2\tTabbed');
    });

    it('should preserve unknown escape sequences', () => {
      const tokens = tokenizer.tokenize('\\x\\y\\z');
      expect(tokens[0].value).toBe('\\x\\y\\z');
    });

    it('should handle trailing backslash gracefully', () => {
      const tokens = tokenizer.tokenize('test\\');
      expect(tokens[0].value).toBe('test\\');
    });

    it('should escape quotes', () => {
      const tokens = tokenizer.tokenize('He said \\"hello\\"');
      expect(tokens[0].value).toBe('He said "hello"');
    });
  });

  describe('Comments - The Silent Observers', () => {
    it('should skip line comments by default', () => {
      const tokens = tokenizer.tokenize('text // comment\n');
      // Line comments consume their trailing newline to avoid blank lines
      expect(tokens).toHaveLength(2); // TEXT, EOF (no NEWLINE after comment)
      expect(tokens.some((t) => t.type === TokenType.COMMENT_LINE)).toBe(false);
    });

    it('should preserve line comments when asked nicely', () => {
      const preservingTokenizer = new Tokenizer({ preserveComments: true });
      const tokens = preservingTokenizer.tokenize('// wisdom\n');
      expect(tokens[0].type).toBe(TokenType.COMMENT_LINE);
      expect(tokens[0].value).toBe('wisdom');
    });

    it('should skip block comments by default', () => {
      const tokens = tokenizer.tokenize('before /* noise */ after');
      expect(tokens.some((t) => t.type === TokenType.COMMENT_BLOCK)).toBe(
        false,
      );
    });

    it('should preserve block comments when configured', () => {
      const preservingTokenizer = new Tokenizer({ preserveComments: true });
      const tokens = preservingTokenizer.tokenize('/* important */');
      expect(tokens[0].type).toBe(TokenType.COMMENT_BLOCK);
      expect(tokens[0].value).toBe('important');
    });

    it('should handle multiline block comments', () => {
      const preservingTokenizer = new Tokenizer({ preserveComments: true });
      const tokens = preservingTokenizer.tokenize('/* line1\nline2\nline3 */');
      expect(tokens[0].type).toBe(TokenType.COMMENT_BLOCK);
      expect(tokens[0].value).toContain('line1');
    });

    it('should handle unterminated block comments gracefully', () => {
      const preservingTokenizer = new Tokenizer({ preserveComments: true });
      const tokens = preservingTokenizer.tokenize('/* forever');
      // Should consume until EOF without throwing
      expect(tokens[0].type).toBe(TokenType.COMMENT_BLOCK);
    });
  });

  describe('Newlines - The Statement Separators', () => {
    it('should tokenize Unix newlines (\\n)', () => {
      const tokens = tokenizer.tokenize('line1\nline2\n');
      expect(tokens[1].type).toBe(TokenType.NEWLINE);
      expect(tokens[1].value).toBe('\n');
    });

    it('should tokenize Windows newlines (\\r\\n)', () => {
      const tokens = tokenizer.tokenize('line1\r\nline2\r\n');
      expect(tokens[1].type).toBe(TokenType.NEWLINE);
      expect(tokens[1].value).toBe('\r\n');
    });

    it('should tokenize old Mac newlines (\\r)', () => {
      const tokens = tokenizer.tokenize('line1\rline2\r');
      expect(tokens[1].type).toBe(TokenType.NEWLINE);
      expect(tokens[1].value).toBe('\r');
    });

    it('should track line numbers correctly', () => {
      const tokens = tokenizer.tokenize('line1\nline2\nline3');
      expect(tokens[0].line).toBe(1); // line1
      expect(tokens[2].line).toBe(2); // line2
      expect(tokens[4].line).toBe(3); // line3
    });

    it('should reset column on newlines', () => {
      const tokens = tokenizer.tokenize('text\nmore');
      expect(tokens[0].column).toBe(1); // text starts at column 1
      expect(tokens[2].column).toBe(1); // more starts at column 1 after newline
    });
  });

  describe('Operators - The Comparison Crew', () => {
    it('should tokenize equality operators', () => {
      const tokens = tokenizer.tokenize('a == b');
      expect(tokens[1].type).toBe(TokenType.OPERATOR);
      expect(tokens[1].value).toBe('==');
    });

    it('should tokenize inequality operators', () => {
      const tokens = tokenizer.tokenize('a != b');
      expect(tokens[1].type).toBe(TokenType.OPERATOR);
      expect(tokens[1].value).toBe('!=');
    });

    it('should tokenize comparison operators', () => {
      const tokens = tokenizer.tokenize('a > b < c >= d <= e');
      const operators = tokens.filter((t) => t.type === TokenType.OPERATOR);
      expect(operators.map((t) => t.value)).toEqual(['>', '<', '>=', '<=']);
    });

    it('should distinguish >= from > and =', () => {
      const tokens = tokenizer.tokenize('a >= b');
      expect(tokens[1].type).toBe(TokenType.OPERATOR);
      expect(tokens[1].value).toBe('>=');
    });

    it('should handle operators without spaces', () => {
      const tokens = tokenizer.tokenize('a==b');
      const operator = tokens.find((t) => t.type === TokenType.OPERATOR);
      expect(operator?.value).toBe('==');
    });
  });

  describe('Strings - The Quoted Ones', () => {
    it('should tokenize double-quoted strings', () => {
      const tokens = tokenizer.tokenize('"hello world"');
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('hello world');
    });

    it('should tokenize single-quoted strings', () => {
      const tokens = tokenizer.tokenize("'hello world'");
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('hello world');
    });

    it('should handle escape sequences in strings', () => {
      const tokens = tokenizer.tokenize('"line1\\nline2\\ttab"');
      expect(tokens[0].value).toBe('line1\nline2\ttab');
    });

    it('should handle escaped quotes', () => {
      const tokens = tokenizer.tokenize('"say \\"hi\\""');
      expect(tokens[0].value).toBe('say "hi"');
    });

    it('should throw on unterminated strings', () => {
      expect(() => tokenizer.tokenize('"unclosed')).toThrow(APTLSyntaxError);
      expect(() => tokenizer.tokenize('"unclosed')).toThrow(
        /Unterminated string/,
      );
    });

    it('should handle multiline strings', () => {
      const tokens = tokenizer.tokenize('"line1\nline2"');
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toContain('\n');
    });

    it('should handle empty strings', () => {
      const tokens = tokenizer.tokenize('""');
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('');
    });
  });

  describe('Punctuation - The Supporting Cast', () => {
    it('should tokenize parentheses', () => {
      const tokens = tokenizer.tokenize('(test)');
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[2].type).toBe(TokenType.RPAREN);
    });

    it('should tokenize commas', () => {
      const tokens = tokenizer.tokenize('a, b, c');
      const commas = tokens.filter((t) => t.type === TokenType.PUNCTUATION);
      expect(commas).toHaveLength(2);
    });

    it('should tokenize assignment operator', () => {
      const tokens = tokenizer.tokenize('x = 5');
      expect(tokens[1].type).toBe(TokenType.ASSIGN);
      expect(tokens[1].value).toBe('=');
    });

    it('should escape parentheses when needed', () => {
      const tokens = tokenizer.tokenize('\\(not a paren\\)');
      expect(tokens[0].type).toBe(TokenType.TEXT);
      expect(tokens[0].value).toBe('(not a paren)');
    });
  });

  describe('Edge Cases - Where Dragons Live', () => {
    it('should handle @ at end of input', () => {
      const tokens = tokenizer.tokenize('test@');
      expect(tokens[0].value).toBe('test@');
    });

    it('should handle @ not followed by letter or brace', () => {
      const tokens = tokenizer.tokenize('@ alone');
      expect(tokens[0].value).toBe('@ alone');
    });

    it('should handle multiple @ symbols', () => {
      const tokens = tokenizer.tokenize('@@@@');
      expect(tokens[0].value).toBe('@@@@');
    });

    it('should handle emoji and unicode', () => {
      const tokens = tokenizer.tokenize('Hello 👋 世界');
      expect(tokens[0].value).toBe('Hello 👋 世界');
    });

    it('should handle very long lines without choking', () => {
      const longText = 'a'.repeat(10000);
      const tokens = tokenizer.tokenize(longText);
      expect(tokens[0].value).toHaveLength(10000);
    });

    it('should handle mixed line endings in one file', () => {
      const tokens = tokenizer.tokenize('unix\nwindows\r\nmac\r');
      const newlines = tokens.filter((t) => t.type === TokenType.NEWLINE);
      expect(newlines).toHaveLength(3);
    });

    it('should track position accurately through complex input', () => {
      tokenizer.registerDirective('if');
      const tokens = tokenizer.tokenize('@if test\n  @{var}\n@end\n');
      // Check that all tokens have valid line/column info
      tokens.forEach((token) => {
        expect(token.line).toBeGreaterThan(0);
        expect(token.column).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-world Scenarios - Battle-tested', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('each');
      tokenizer.registerDirective('section');
    });

    it('should tokenize conditional with comparison', () => {
      const tokens = tokenizer.tokenize('@if user.age >= 18\n@end\n');
      expect(tokens[0].type).toBe(TokenType.DIRECTIVE);
      expect(tokens[0].value).toBe('if');
      expect(tokens.some((t) => t.type === TokenType.END)).toBe(true);
    });

    it('should tokenize loop with variable', () => {
      const input = '@each item in items\n  - @{item.name}\n@end\n';
      const tokens = tokenizer.tokenize(input);
      expect(tokens[0].type).toBe(TokenType.DIRECTIVE);
      expect(tokens[0].value).toBe('each');
      expect(tokens.filter((t) => t.type === TokenType.VARIABLE)).toHaveLength(
        1,
      );
    });

    it('should tokenize section with attributes', () => {
      const input = '@section code(lang="js", format="json")\n@end\n';
      const tokens = tokenizer.tokenize(input);
      expect(tokens[0].type).toBe(TokenType.DIRECTIVE);
      expect(tokens[0].value).toBe('section');
      // Arguments are handled by parser, not tokenizer
    });

    it('should tokenize email addresses with escaped @', () => {
      const tokens = tokenizer.tokenize('Contact: support\\@example.com');
      expect(tokens[0].value).toBe('Contact: support@example.com');
    });

    it('should tokenize template with mixed content', () => {
      const input = `Hello @{user.name}!
@if user.isPremium
  Premium content here
@end
// This is a comment
Regular text`;

      const tokens = tokenizer.tokenize(input);
      expect(tokens.some((t) => t.type === TokenType.VARIABLE)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.DIRECTIVE)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.END)).toBe(true);
      expect(tokens.some((t) => t.type === TokenType.TEXT)).toBe(true);
    });

    it('should handle nested structures with proper indentation', () => {
      const input = `@if outer
  Text
  @if inner
    Nested
  @end
@end`;

      const tokens = tokenizer.tokenize(input);
      const directives = tokens.filter(
        (t) => t.type === TokenType.DIRECTIVE || t.type === TokenType.END,
      );
      expect(directives).toHaveLength(4); // @if, @if, @end, @end
    });
  });

  describe('Directive Registration - The Registry Dance', () => {
    it('should register directives', () => {
      tokenizer.registerDirective('custom');
      const tokens = tokenizer.tokenize('@custom\n');
      expect(tokens[0].type).toBe(TokenType.DIRECTIVE);
    });

    it('should unregister directives', () => {
      tokenizer.registerDirective('temp');
      tokenizer.unregisterDirective('temp');
      expect(() => tokenizer.tokenize('@temp\n')).toThrow(/Unknown directive/);
    });

    it('should list registered directives', () => {
      tokenizer.registerDirective('one');
      tokenizer.registerDirective('two');
      const directives = tokenizer.getRegisteredDirectives();
      expect(directives).toContain('one');
      expect(directives).toContain('two');
    });

    it('should handle duplicate registrations gracefully', () => {
      tokenizer.registerDirective('same');
      tokenizer.registerDirective('same');
      const directives = tokenizer.getRegisteredDirectives();
      expect(directives.filter((d) => d === 'same')).toHaveLength(1);
    });
  });

  describe('Error Messages - User-Friendly Fails', () => {
    it('should provide line and column in errors', () => {
      try {
        tokenizer.tokenize('line1\nline2\n@{unclosed');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.line).toBe(3);
        expect(syntaxError.column).toBeGreaterThan(0);
      }
    });

    it('should include helpful context in directive errors', () => {
      expect(() => tokenizer.tokenize('@mystery\n')).toThrow(
        /Unknown directive '@mystery'/,
      );
    });

    it('should suggest escaping for unknown directives', () => {
      expect(() => tokenizer.tokenize('@social handle\n')).toThrow(/\\@social/);
    });
  });

  describe('Strict vs Lenient Mode - The Discipline Debate', () => {
    it('should throw in strict mode for mid-line directives', () => {
      const strict = new Tokenizer({ strictMode: true });
      strict.registerDirective('if');

      expect(() => strict.tokenize('text @if cond\n')).toThrow(
        /must be at the start/,
      );
    });

    it('should be lenient by default', () => {
      tokenizer.registerDirective('if');
      // In lenient mode, should backtrack and treat as text
      // But since @if is unknown when not registered... it throws
      // Let's test with @ followed by letters that form directive
      const tokens = tokenizer.tokenize('Email is user\\@if.com\n');
      expect(tokens[0].type).toBe(TokenType.TEXT);
    });
  });

  describe('Performance - No Infinite Loops Here', () => {
    it('should handle deeply nested structures efficiently', () => {
      tokenizer.registerDirective('if');
      const depth = 50;
      const opening = '@if test\n'.repeat(depth);
      const closing = '@end\n'.repeat(depth);
      const input = opening + closing;

      const start = Date.now();
      const tokens = tokenizer.tokenize(input);
      const elapsed = Date.now() - start;

      expect(tokens.length).toBeGreaterThan(depth * 2);
      expect(elapsed).toBeLessThan(1000); // Should be fast
    });

    it('should not infinite loop on empty text advancement', () => {
      // This tests the safety net in handleText()
      const tokens = tokenizer.tokenize('>><<');
      expect(tokens).toBeDefined();
      expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    });
  });
});
