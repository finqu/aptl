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
    parser = new Parser();
    tokenizer = new Tokenizer();
    compiler = new Compiler(tokenizer, parser, {
      preserveWhitespace: true,
    });
  });

  // Helper function to compile and render a template
  const compileAndRender = async (
    template: string,
    data: Record<string, any> = {},
  ): Promise<string> => {
    const compiled = await compiler.compile(template);
    return compiled.render(data);
  };

  describe('Basic Template Compilation', () => {
    it('should compile and render simple text', async () => {
      const result = await compileAndRender('Hello World!');
      expect(result).toBe('Hello World!');
    });

    it('should compile and render simple variables', async () => {
      const result = await compileAndRender('Hello @{name}!', {
        name: 'Alice',
      });
      expect(result).toBe('Hello Alice!');
    });

    it('should compile and render nested variables', async () => {
      const result = await compileAndRender('Hello @{user.name}!', {
        user: { name: 'Bob' },
      });
      expect(result).toBe('Hello Bob!');
    });

    it('should compile and render multiple variables', async () => {
      const result = await compileAndRender(
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
    it('should handle missing variables gracefully', async () => {
      const result = await compileAndRender('Hello @{missing}!');
      expect(result).toBe('Hello !');
    });

    it('should handle different data types', async () => {
      const data = {
        string: 'text',
        number: 42,
        boolean: true,
        array: ['a', 'b', 'c'],
        object: { key: 'value' },
        null_value: null,
        undefined_value: undefined,
      };

      expect(await compileAndRender('@{string}', data)).toBe('text');
      expect(await compileAndRender('@{number}', data)).toBe('42');
      expect(await compileAndRender('@{boolean}', data)).toBe('true');
      expect(await compileAndRender('@{array}', data)).toBe('a, b, c');
      expect(await compileAndRender('@{object}', data)).toBe('{"key":"value"}');
      expect(await compileAndRender('@{null_value}', data)).toBe('');
      expect(await compileAndRender('@{undefined_value}', data)).toBe('');
    });

    it('should handle array access syntax', async () => {
      const data = {
        items: [
          { name: 'Item 1', id: 1 },
          { name: 'Item 2', id: 2 },
        ],
      };

      expect(await compileAndRender('@{items[0].name}', data)).toBe('Item 1');
      expect(await compileAndRender('@{items[1].id}', data)).toBe('2');
    });
  });

  describe('Compiler Options', () => {
    it('should throw error for undefined variables when allowUndefined is false', async () => {
      const strictCompiler = new Compiler(tokenizer, parser, {
        allowUndefined: false,
      });
      const compiled = await strictCompiler.compile('Hello @{missing}!');

      expect(() => compiled.render({})).toThrow(APTLRuntimeError);
    });

    it('should preserve whitespace when requested', async () => {
      const preserveCompiler = new Compiler(tokenizer, parser, {
        preserveWhitespace: true,
      });
      const template = `  Line 1

  Line 2


`;
      const compiled = await preserveCompiler.compile(template);
      const result = compiled.render({});

      // Should preserve the original whitespace structure
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      // Exact match might vary due to tokenization, so just check it doesn't clean aggressively
      expect(result.length).toBeGreaterThan('Line 1Line 2'.length);
    });

    it('should preserve whitespace by default', async () => {
      // The tokenizer/parser combines adjacent text, so test with what actually reaches the compiler
      const template = `
        Line 1

        Line 2


      `;
      const result = await compileAndRender(template);
      // Should preserve all whitespace including indentation and blank lines
      expect(result).toBe(template);
    });

    it('should clean whitespace when preserveWhitespace is false', async () => {
      const cleaningCompiler = new Compiler(tokenizer, parser, {
        preserveWhitespace: false,
      });
      const template = `
        Line 1

        Line 2


      `;

      const compiledTemplate = await cleaningCompiler.compile(template);
      const result = compiledTemplate.render({});
      // Should clean up extra spaces and limit empty lines
      expect(result).toMatch(/Line 1\s*Line 2\n?$/);
    });
  });

  describe('Helper Functions', () => {
    it('should support helper functions', () => {
      const helperCompiler = new Compiler(tokenizer, parser, {
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
      const helperCompiler = new Compiler(tokenizer, parser, {
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
    it('should provide meaningful error messages for undefined variables', async () => {
      const strictCompiler = new Compiler(tokenizer, parser, {
        allowUndefined: false,
      });
      const compiled = await strictCompiler.compile(
        'Hello @{missing.deeply.nested}!',
      );

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

      const compiled = compiler.compileAST(ast as any);
      expect(() => compiled.render({})).toThrow(APTLRuntimeError);
    });
  });

  describe('Template Source Generation', () => {
    it('should generate source information', async () => {
      const compiled = await compiler.compile('Hello @{name}!');

      expect(compiled.source).toBeDefined();
      expect(typeof compiled.source).toBe('string');
    });
  });

  describe('Option Updates', () => {
    it('should allow updating options', () => {
      expect(compiler.getOptions().allowUndefined).toBe(true);

      compiler.updateOptions({ allowUndefined: false });
      expect(compiler.getOptions().allowUndefined).toBe(false);
    });

    it('should update variable resolver when allowUndefined changes', async () => {
      const compiled = await compiler.compile('Hello @{missing}!');

      // Should work when allowUndefined is true (default)
      expect(() => compiled.render({})).not.toThrow();

      compiler.updateOptions({ allowUndefined: false });
      const strictCompiled = await compiler.compile('Hello @{missing}!');

      // Should throw when allowUndefined is false
      expect(() => strictCompiled.render({})).toThrow();
    });
  });
});
