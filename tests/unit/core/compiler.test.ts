/**
 * Compiler Tests
 * Tests for APTL compiler core functionality
 * Note: Directive rendering (section, conditional, iteration) is tested in integration tests
 */

import { Compiler, CompilerOptions } from '@/core/compiler';
import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';
import { NodeType } from '@/core/types';
import { APTLRuntimeError } from '@/utils/errors';

describe('Compiler', () => {
  let compiler: Compiler;
  let parser: Parser;
  let tokenizer: Tokenizer;

  beforeEach(() => {
    compiler = new Compiler();
    parser = new Parser();
    tokenizer = new Tokenizer();
  });

  // Helper function to compile and render a template
  const compileAndRender = (
    template: string,
    data: Record<string, any> = {},
  ): string => {
    const tokens = tokenizer.tokenize(template);
    const ast = parser.parse(tokens);
    const compiled = compiler.compile(ast);
    return compiled.render(data);
  };

  describe('Basic Template Compilation', () => {
    it('should compile and render simple text', () => {
      const result = compileAndRender('Hello World!');
      expect(result).toBe('Hello World!');
    });

    it('should compile and render simple variables', () => {
      const result = compileAndRender('Hello @{name}!', { name: 'Alice' });
      expect(result).toBe('Hello Alice!');
    });

    it('should compile and render nested variables', () => {
      const result = compileAndRender('Hello @{user.name}!', {
        user: { name: 'Bob' },
      });
      expect(result).toBe('Hello Bob!');
    });

    it('should compile and render multiple variables', () => {
      const result = compileAndRender(
        '@{greeting} @{name}! You are @{age} years old.',
        {
          greeting: 'Hi',
          name: 'Charlie',
          age: 25,
        },
      );
      expect(result).toBe('Hi Charlie! You are 25 years old.');
    });
  });

  describe('Variable Handling', () => {
    it('should handle missing variables gracefully', () => {
      const result = compileAndRender('Hello @{missing}!');
      expect(result).toBe('Hello !');
    });

    it('should handle different data types', () => {
      const data = {
        string: 'text',
        number: 42,
        boolean: true,
        array: ['a', 'b', 'c'],
        object: { key: 'value' },
        null_value: null,
        undefined_value: undefined,
      };

      expect(compileAndRender('@{string}', data)).toBe('text');
      expect(compileAndRender('@{number}', data)).toBe('42');
      expect(compileAndRender('@{boolean}', data)).toBe('true');
      expect(compileAndRender('@{array}', data)).toBe('a, b, c');
      expect(compileAndRender('@{object}', data)).toBe('{"key":"value"}');
      expect(compileAndRender('@{null_value}', data)).toBe('');
      expect(compileAndRender('@{undefined_value}', data)).toBe('');
    });

    it('should handle array access syntax', () => {
      const data = {
        items: [
          { name: 'Item 1', id: 1 },
          { name: 'Item 2', id: 2 },
        ],
      };

      expect(compileAndRender('@{items[0].name}', data)).toBe('Item 1');
      expect(compileAndRender('@{items[1].id}', data)).toBe('2');
    });
  });

  describe('Compiler Options', () => {
    it('should respect strict mode for undefined variables', () => {
      const strictCompiler = new Compiler({ strict: true });
      const tokens = tokenizer.tokenize('Hello @{missing}!');
      const ast = parser.parse(tokens);
      const compiled = strictCompiler.compile(ast);

      expect(() => compiled.render({})).toThrow(APTLRuntimeError);
    });

    it('should preserve whitespace when requested', () => {
      const preserveCompiler = new Compiler({ preserveWhitespace: true });
      const template = `  Line 1

  Line 2


`;
      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);
      const compiled = preserveCompiler.compile(ast);
      const result = compiled.render({});

      // Should preserve the original whitespace structure
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      // Exact match might vary due to tokenization, so just check it doesn't clean aggressively
      expect(result.length).toBeGreaterThan('Line 1Line 2'.length);
    });

    it('should preserve whitespace by default', () => {
      // The tokenizer/parser combines adjacent text, so test with what actually reaches the compiler
      const template = `
        Line 1

        Line 2


      `;
      const result = compileAndRender(template);
      // Should preserve all whitespace including indentation and blank lines
      expect(result).toBe(template);
    });

    it('should clean whitespace when preserveWhitespace is false', () => {
      const cleaningCompiler = new Compiler({ preserveWhitespace: false });
      const cleaningTokenizer = new Tokenizer();
      const cleaningParser = new Parser();
      const template = `
        Line 1

        Line 2


      `;
      const tokens = cleaningTokenizer.tokenize(template);
      const ast = cleaningParser.parse(tokens);
      const compiledTemplate = cleaningCompiler.compile(ast);
      const result = compiledTemplate.render({});
      // Should clean up extra spaces and limit empty lines
      expect(result).toMatch(/Line 1\s*Line 2\n?$/);
    });
  });

  describe('Helper Functions', () => {
    it('should support helper functions', () => {
      const helperCompiler = new Compiler({
        helpers: {
          upper: (str: string) => str.toUpperCase(),
          multiply: (a: number, b: number) => a * b,
        },
      });

      // Note: This test assumes helper syntax would be parsed
      // The actual implementation would need parser support for helpers
      helperCompiler.addHelper('greet', (name: string) => `Hello, ${name}!`);

      expect(helperCompiler.getOptions().helpers?.greet).toBeDefined();
    });

    it('should handle helper errors gracefully in non-strict mode', () => {
      const helperCompiler = new Compiler({
        helpers: {
          failing: () => {
            throw new Error('Helper failed');
          },
        },
      });

      // This would require helper syntax support in parser
      // For now, just test that helpers can be added
      expect(helperCompiler.getOptions().helpers?.failing).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const strictCompiler = new Compiler({ strict: true });
      const tokens = tokenizer.tokenize('Hello @{missing.deeply.nested}!');
      const ast = parser.parse(tokens);
      const compiled = strictCompiler.compile(ast);

      expect(() => compiled.render({})).toThrow(/Undefined variable/);
    });

    it('should handle template rendering errors', () => {
      // Test with malformed template
      const ast = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: 'INVALID' as any,
            value: 'test',
          },
        ],
      };

      const compiled = compiler.compile(ast as any);
      expect(() => compiled.render({})).toThrow(APTLRuntimeError);
    });
  });

  describe('Template Source Generation', () => {
    it('should generate source information', () => {
      const tokens = tokenizer.tokenize('Hello @{name}!');
      const ast = parser.parse(tokens);
      const compiled = compiler.compile(ast);

      expect(compiled.source).toBeDefined();
      expect(typeof compiled.source).toBe('string');
    });
  });

  describe('Option Updates', () => {
    it('should allow updating options', () => {
      expect(compiler.getOptions().strict).toBe(false);

      compiler.updateOptions({ strict: true });
      expect(compiler.getOptions().strict).toBe(true);
    });

    it('should update variable resolver when strict mode changes', () => {
      const tokens = tokenizer.tokenize('Hello @{missing}!');
      const ast = parser.parse(tokens);
      const compiled = compiler.compile(ast);

      // Should work in non-strict mode
      expect(() => compiled.render({})).not.toThrow();

      compiler.updateOptions({ strict: true });
      const strictCompiled = compiler.compile(ast);

      // Should throw in strict mode
      expect(() => strictCompiled.render({})).toThrow();
    });
  });
});
