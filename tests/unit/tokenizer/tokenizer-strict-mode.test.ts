/**
 * APTL Tokenizer Strict Mode Tests
 * Tests strict mode enforcement of directive placement rules
 */

import { Tokenizer } from '@/core/tokenizer';
import { APTLSyntaxError } from '@/utils/errors';

describe('Tokenizer Strict Mode', () => {
  let strictTokenizer: Tokenizer;
  let lenientTokenizer: Tokenizer;

  beforeEach(() => {
    strictTokenizer = new Tokenizer({ strictMode: true });
    lenientTokenizer = new Tokenizer({ strictMode: false });
  });

  describe('Multiple directives on same line', () => {
    it('should throw error for multiple directives on same line in strict mode', () => {
      expect(() => strictTokenizer.tokenize('@if @else')).toThrow(
        APTLSyntaxError,
      );
      expect(() => strictTokenizer.tokenize('@if @else')).toThrow(
        /must be at the start of a statement/,
      );
    });

    it('should treat second directive as text in lenient mode', () => {
      const tokens = lenientTokenizer.tokenize('@if @else');
      // Should get IF token followed by TEXT token containing " @else"
      expect(tokens[0].type).toBe('IF');
      expect(tokens[1].type).toBe('TEXT');
      expect(tokens[1].value).toContain('@else');
    });

    it('should throw error for consecutive directives without newline', () => {
      expect(() => strictTokenizer.tokenize('@if@else@end')).toThrow(
        APTLSyntaxError,
      );
    });

    it('should allow consecutive directives with newlines in strict mode', () => {
      expect(() => strictTokenizer.tokenize('@if\n@else\n@end')).not.toThrow();
    });
  });

  describe('Directive placement rules', () => {
    it('should throw error for directive after text on same line', () => {
      expect(() => strictTokenizer.tokenize('some text @if condition')).toThrow(
        APTLSyntaxError,
      );
      expect(() => strictTokenizer.tokenize('some text @if condition')).toThrow(
        /must be at the start of a statement/,
      );
    });

    it('should throw error for directive after variable on same line', () => {
      expect(() => strictTokenizer.tokenize('@{var} @if')).toThrow(
        APTLSyntaxError,
      );
    });

    it('should allow directive after newline following text', () => {
      expect(() =>
        strictTokenizer.tokenize('some text\n@if condition'),
      ).not.toThrow();
    });

    it('should allow directive after newline following variable', () => {
      expect(() => strictTokenizer.tokenize('@{var}\n@if')).not.toThrow();
    });
  });

  describe('Indented directives', () => {
    it('should allow indented directives at statement start', () => {
      expect(() =>
        strictTokenizer.tokenize('  @if condition\n    @each item in items'),
      ).not.toThrow();
    });

    it('should throw error for directive after text even with spaces', () => {
      expect(() => strictTokenizer.tokenize('text   @if')).toThrow(
        APTLSyntaxError,
      );
    });
  });

  describe('Complex scenarios', () => {
    it('should throw error in nested structures with invalid placement', () => {
      const template = `@section test
Content @if invalid
@end`;

      expect(() => strictTokenizer.tokenize(template)).toThrow(APTLSyntaxError);
    });

    it('should allow properly formatted nested structures', () => {
      const template = `@section test
@if condition
  @each item in items
    Content
  @end
@end
@end`;

      expect(() => strictTokenizer.tokenize(template)).not.toThrow();
    });

    it('should throw error for multiple section starts on same line', () => {
      expect(() =>
        strictTokenizer.tokenize('@section one @section two'),
      ).toThrow(APTLSyntaxError);
    });
  });

  describe('Edge cases', () => {
    it('should allow @ in text when not followed by letters', () => {
      expect(() =>
        strictTokenizer.tokenize('email@123.com and @$19.99'),
      ).not.toThrow();
    });

    it('should throw on @ followed by unknown keyword', () => {
      expect(() => strictTokenizer.tokenize('@unknown')).toThrow(
        APTLSyntaxError,
      );
      expect(() => strictTokenizer.tokenize('@unknown')).toThrow(
        /Unknown directive/,
      );
    });

    it('should allow directive-like text in variables', () => {
      expect(() => strictTokenizer.tokenize('@{if} @{else}')).not.toThrow();
    });

    it('should allow escaped @ followed by directive keyword', () => {
      expect(() => strictTokenizer.tokenize('\\@if text')).not.toThrow();
    });

    it('should throw for directive after directive start token on same line', () => {
      expect(() =>
        strictTokenizer.tokenize('@section name @if condition'),
      ).toThrow(APTLSyntaxError);
    });
  });

  describe('Error messages', () => {
    it('should provide clear error message with line and column', () => {
      try {
        strictTokenizer.tokenize('text @if');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.message).toContain('@if');
        expect(syntaxError.message).toContain('must be at the start');
        expect(syntaxError.line).toBe(1);
        expect(syntaxError.column).toBeGreaterThan(0);
      }
    });

    it('should report correct line number for multi-line templates', () => {
      try {
        strictTokenizer.tokenize('line1\nline2 @section test\nline3');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.line).toBe(2);
      }
    });
  });

  describe('Real-world template examples', () => {
    it('should enforce strict mode in agent prompt template', () => {
      // Invalid: directive after text
      const invalidTemplate = `@section identity(role="system")
You are an AI assistant. @if expert
With expertise.
@end
@end`;

      expect(() => strictTokenizer.tokenize(invalidTemplate)).toThrow(
        APTLSyntaxError,
      );
    });

    it('should accept valid agent prompt template', () => {
      const validTemplate = `@section identity(role="system")
You are an AI assistant.
@if expert
With expertise.
@end
@end`;

      expect(() => strictTokenizer.tokenize(validTemplate)).not.toThrow();
    });

    it('should handle inline conditionals by rejecting them in strict mode', () => {
      const template = `Hello @{name} @if greeting then greet @end!`;

      expect(() => strictTokenizer.tokenize(template)).toThrow(APTLSyntaxError);
    });
  });

  describe('Lenient mode behavior', () => {
    it('should not throw any errors in lenient mode for multiple directives', () => {
      expect(() => lenientTokenizer.tokenize('@if @else @end')).not.toThrow();
      expect(() =>
        lenientTokenizer.tokenize('text @section @if'),
      ).not.toThrow();
      expect(() => lenientTokenizer.tokenize('@if@else@end')).not.toThrow();
    });

    it('should treat misplaced directives as text in lenient mode', () => {
      const tokens = lenientTokenizer.tokenize('text @section name');

      // First token should be text, section should be treated as text too
      expect(tokens[0].type).toBe('TEXT');
      expect(tokens[0].value).toContain('text');

      // Find TEXT token containing @section
      const textTokens = tokens.filter((t) => t.type === 'TEXT');
      const hasSectionInText = textTokens.some((t) =>
        t.value.includes('@section'),
      );
      expect(hasSectionInText).toBe(true);
    });
  });
});
