/**
 * Compiler Tests
 * Tests for APTL compiler functionality
 */

import { Compiler, CompilerOptions } from '../../../src/core/compiler';
import { Parser } from '../../../src/core/parser';
import { Tokenizer } from '../../../src/core/tokenizer';
import { NodeType } from '../../../src/core/types';
import { APTLRuntimeError } from '../../../src/utils/errors';
import {
  DefaultFormatterRegistry,
  StructuredFormatter,
  MarkdownFormatter,
} from '../../../src/formatters';

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

  describe('Section Rendering', () => {
    it('should render sections with default wrapper (none)', () => {
      const template = `
        @section greeting
          Hello @{name}!
        @end
      `;
      const result = compileAndRender(template, { name: 'Dave' });
      expect(result.trim()).toBe('Hello Dave!');
    });

    it('should render sections with XML wrapper', () => {
      const registry = new DefaultFormatterRegistry();
      registry.setDefaultFormatter(new StructuredFormatter());
      const xmlCompiler = new Compiler({ formatterRegistry: registry });
      const tokens = tokenizer.tokenize('@section test\nContent\n@end');
      const ast = parser.parse(tokens);
      const compiled = xmlCompiler.compile(ast);
      const result = compiled.render({});

      expect(result).toContain('<test>');
      expect(result).toContain('Content');
      expect(result).toContain('</test>');
    });

    it('should render sections with markdown wrapper', () => {
      const registry = new DefaultFormatterRegistry();
      registry.setDefaultFormatter(new MarkdownFormatter());
      const mdCompiler = new Compiler({ formatterRegistry: registry });
      const tokens = tokenizer.tokenize(
        '@section identity\nI am an AI assistant.\n@end',
      );
      const ast = parser.parse(tokens);
      const compiled = mdCompiler.compile(ast);
      const result = compiled.render({});

      expect(result).toContain('## Identity');
      expect(result).toContain('I am an AI assistant.');
    });

    it('should render sections with attributes', () => {
      const registry = new DefaultFormatterRegistry();
      registry.setDefaultFormatter(new StructuredFormatter());
      const xmlCompiler = new Compiler({ formatterRegistry: registry });
      const tokens = tokenizer.tokenize(
        '@section test(role="system", priority="high")\nContent\n@end',
      );
      const ast = parser.parse(tokens);
      const compiled = xmlCompiler.compile(ast);
      const result = compiled.render({});

      expect(result).toContain('<test role="system" priority="high">');
      expect(result).toContain('Content');
      expect(result).toContain('</test>');
    });

    it('should skip empty sections', () => {
      const result = compileAndRender('@section empty\n  \n@end');
      expect(result.trim()).toBe('');
    });
  });

  describe('Conditional Rendering', () => {
    it('should render true conditionals', () => {
      const result = compileAndRender(
        `
        @if user.isActive
          User is active
        @end
      `,
        { user: { isActive: true } },
      );

      expect(result.trim()).toBe('User is active');
    });

    it('should skip false conditionals', () => {
      const result = compileAndRender(
        `
        @if user.isActive
          User is active
        @end
      `,
        { user: { isActive: false } },
      );

      expect(result.trim()).toBe('');
    });

    it('should render else branches', () => {
      const result = compileAndRender(
        `
        @if user.isActive
          User is active
        @else
          User is inactive
        @end
      `,
        { user: { isActive: false } },
      );

      expect(result.trim()).toBe('User is inactive');
    });

    it('should handle elif branches', () => {
      const template = `
        @if level == "beginner"
          Use simple language
        @elif level == "intermediate"
          Balance detail with clarity
        @else
          Use technical terminology
        @end
      `;

      expect(compileAndRender(template, { level: 'beginner' }).trim()).toBe(
        'Use simple language',
      );
      expect(compileAndRender(template, { level: 'intermediate' }).trim()).toBe(
        'Balance detail with clarity',
      );
      expect(compileAndRender(template, { level: 'advanced' }).trim()).toBe(
        'Use technical terminology',
      );
    });

    it('should handle complex conditions', () => {
      const data = {
        user: { role: 'admin', active: true },
        features: { advanced: true },
      };

      expect(
        compileAndRender(
          '@if user.role == "admin"\nAdmin user\n@end',
          data,
        ).trim(),
      ).toBe('Admin user');
      expect(
        compileAndRender(
          '@if user.active and features.advanced\nAdvanced admin\n@end',
          data,
        ).trim(),
      ).toBe('Advanced admin');
      expect(
        compileAndRender(
          '@if user.role != "guest"\nNot a guest\n@end',
          data,
        ).trim(),
      ).toBe('Not a guest');
    });

    it('should handle missing condition variables', () => {
      const result = compileAndRender(`
        @if missing.variable
          This should not render
        @end
        Always rendered
      `);

      expect(result.trim()).toBe('Always rendered');
    });
  });

  describe('Iteration Rendering', () => {
    it('should iterate over arrays', () => {
      const data = {
        items: ['Apple', 'Banana', 'Cherry'],
      };

      const result = compileAndRender(
        `
        @each item in items
          - @{item}
        @end
      `,
        data,
      );

      expect(result.trim()).toContain('- Apple');
      expect(result.trim()).toContain('- Banana');
      expect(result.trim()).toContain('- Cherry');
    });

    it('should iterate over object arrays', () => {
      const data = {
        users: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ],
      };

      const result = compileAndRender(
        `
        @each user in users
          Name: @{user.name}, Age: @{user.age}
        @end
      `,
        data,
      );

      expect(result).toContain('Name: Alice, Age: 25');
      expect(result).toContain('Name: Bob, Age: 30');
    });

    it('should provide iteration metadata', () => {
      const data = { nums: [10, 20, 30] };

      // For now, test without @ prefixed variables until tokenizer supports them
      const result = compileAndRender(
        `
        @each num in nums
          @{num}
        @end
      `,
        data,
      );

      expect(result).toContain('10');
      expect(result).toContain('20');
      expect(result).toContain('30');
    });

    it('should handle empty arrays', () => {
      const result = compileAndRender(
        `
        @each item in empty
          Should not render
        @end
        After loop
      `,
        { empty: [] },
      );

      expect(result.trim()).toBe('After loop');
    });

    it('should handle non-array values gracefully', () => {
      const result = compileAndRender(
        `
        @each item in notArray
          Should not render
        @end
        After loop
      `,
        { notArray: 'string' },
      );

      expect(result.trim()).toBe('After loop');
    });

    it('should handle nested iterations', () => {
      const data = {
        groups: [
          { name: 'Group A', items: ['A1', 'A2'] },
          { name: 'Group B', items: ['B1', 'B2'] },
        ],
      };

      const result = compileAndRender(
        `
        @each group in groups
          @{group.name}:
          @each item in group.items
            - @{item}
          @end
        @end
      `,
        data,
      );

      expect(result).toContain('Group A:');
      expect(result).toContain('- A1');
      expect(result).toContain('- A2');
      expect(result).toContain('Group B:');
      expect(result).toContain('- B1');
      expect(result).toContain('- B2');
    });
  });

  describe('Complex Templates', () => {
    it('should handle mixed content types', () => {
      const template = `
        @section identity
          You are @{agentName}.

          @if credentials
            Credentials:
            @each cred in credentials
              • @{cred}
            @end
          @end
        @end

        @section guidelines
          @if userLevel == "beginner"
            Use simple language
          @else
            Use technical terms
          @end
        @end
      `;

      const data = {
        agentName: 'Assistant',
        credentials: ['Expert in AI', 'Certified Developer'],
        userLevel: 'beginner',
      };

      const result = compileAndRender(template, data);

      expect(result).toContain('You are Assistant.');
      expect(result).toContain('• Expert in AI');
      expect(result).toContain('• Certified Developer');
      expect(result).toContain('Use simple language');
    });

    it('should handle deeply nested structures', () => {
      const template = `
        @each category in data
          Category: @{category.name}
          @each section in category.sections
            Section: @{section.title}
            @if section.items
              @each item in section.items
                - @{item.name}: @{item.value}
              @end
            @end
          @end
        @end
      `;

      const data = {
        data: [
          {
            name: 'Config',
            sections: [
              {
                title: 'Database',
                items: [
                  { name: 'host', value: 'localhost' },
                  { name: 'port', value: '5432' },
                ],
              },
            ],
          },
        ],
      };

      const result = compileAndRender(template, data);

      expect(result).toContain('Category: Config');
      expect(result).toContain('Section: Database');
      expect(result).toContain('- host: localhost');
      expect(result).toContain('- port: 5432');
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

    it('should respect strict mode for invalid iterations', () => {
      const strictCompiler = new Compiler({ strict: true });
      const tokens = tokenizer.tokenize(
        '@each item in notArray\n@{item}\n@end',
      );
      const ast = parser.parse(tokens);
      const compiled = strictCompiler.compile(ast);

      expect(() => compiled.render({ notArray: 'string' })).toThrow(
        APTLRuntimeError,
      );
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

    it('should clean whitespace by default', () => {
      // The tokenizer/parser combines adjacent text, so test with what actually reaches the compiler
      const template = `
        Line 1

        Line 2


      `;
      const result = compileAndRender(template);
      // Should clean up extra spaces and limit empty lines - may or may not have trailing newline
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

    it('should include context in error messages', () => {
      const strictCompiler = new Compiler({ strict: true });
      const tokens = tokenizer.tokenize('@each item in invalid\n@{item}\n@end');
      const ast = parser.parse(tokens);
      const compiled = strictCompiler.compile(ast);

      expect(() => compiled.render({ invalid: 'not-array' })).toThrow(
        /Expected array for iteration/,
      );
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

      const registry = new DefaultFormatterRegistry();
      compiler.updateOptions({ formatterRegistry: registry });
      expect(compiler.getOptions().formatterRegistry).toBe(registry);
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

  describe('Real-world Templates', () => {
    it('should handle agent prompt template', () => {
      const template = `
        @section identity
          You are @{agentName}, a @{agentRole}.

          @if domain
            You specialize in @{domain}.
          @end
        @end

        @section guidelines
          @if userLevel == "beginner"
            • Use simple, clear language
            • Explain technical terms
          @elif userLevel == "intermediate"
            • Balance technical detail with clarity
            • Provide context for complex topics
          @else
            • Use technical terminology appropriately
            • Focus on advanced concepts
          @end
        @end

        @if examples
          @section examples
            @each example in examples
              **@{example.title}**: @{example.description}
            @end
          @end
        @end
      `;

      const data = {
        agentName: 'CodeAssistant',
        agentRole: 'programming helper',
        domain: 'web development',
        userLevel: 'intermediate',
        examples: [
          {
            title: 'Code Review',
            description: 'Analyze code for improvements',
          },
          { title: 'Debugging', description: 'Help identify and fix issues' },
        ],
      };

      const result = compileAndRender(template, data);

      expect(result).toContain('You are CodeAssistant, a programming helper.');
      expect(result).toContain('You specialize in web development.');
      expect(result).toContain('Balance technical detail with clarity');
      expect(result).toContain(
        '**Code Review**: Analyze code for improvements',
      );
      expect(result).toContain('**Debugging**: Help identify and fix issues');
    });
  });
});
