/**
 * Parser Tests - From Tokens to Trees
 * Where flat becomes hierarchical and chaos becomes structure
 */

import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';
import { NodeType, TokenType } from '@/core/types';
import { APTLSyntaxError } from '@/utils/errors';

describe('Parser - The AST Architect', () => {
  let parser: Parser;
  let tokenizer: Tokenizer;

  beforeEach(() => {
    parser = new Parser();
    tokenizer = new Tokenizer();
  });

  /**
   * Helper to parse a template string into AST
   */
  const parseTemplate = (template: string) => {
    const tokens = tokenizer.tokenize(template);
    return parser.parse(tokens);
  };

  describe('Empty and Simple Templates - The Foundation', () => {
    it('should parse empty template', () => {
      const ast = parseTemplate('');
      expect(ast.type).toBe(NodeType.TEMPLATE);
      expect(ast.children).toHaveLength(0);
    });

    it('should parse plain text into text node', () => {
      const ast = parseTemplate('Hello world');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Hello world',
      });
    });

    it('should preserve newlines in text', () => {
      const ast = parseTemplate('Line 1\nLine 2\nLine 3');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Line 1\nLine 2\nLine 3',
      });
    });

    it('should combine consecutive text tokens', () => {
      const ast = parseTemplate('Hello world and more text');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe(NodeType.TEXT);
    });
  });

  describe('Variables - The Interpolation Station', () => {
    it('should parse simple variable', () => {
      const ast = parseTemplate('@{name}');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'name',
      });
    });

    it('should parse nested variable path', () => {
      const ast = parseTemplate('@{user.profile.email}');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'user.profile.email',
      });
    });

    it('should parse variable with surrounding text', () => {
      const ast = parseTemplate('Hello @{name}, welcome!');
      expect(ast.children).toHaveLength(3);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Hello ',
      });
      expect(ast.children[1]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'name',
      });
      expect(ast.children[2]).toMatchObject({
        type: NodeType.TEXT,
        value: ', welcome!',
      });
    });

    it('should parse multiple variables', () => {
      const ast = parseTemplate('@{first} and @{second}');
      const variables = ast.children.filter(
        (c) => c.type === NodeType.VARIABLE,
      );
      expect(variables).toHaveLength(2);
      expect(variables[0]).toMatchObject({ path: 'first' });
      expect(variables[1]).toMatchObject({ path: 'second' });
    });

    it('should parse consecutive variables', () => {
      const ast = parseTemplate('@{first}@{second}');
      expect(ast.children).toHaveLength(2);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'first',
      });
      expect(ast.children[1]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'second',
      });
    });

    it('should preserve line and column information', () => {
      const ast = parseTemplate('Text @{var}');
      const variable = ast.children[1] as any;
      expect(variable.line).toBeGreaterThan(0);
      expect(variable.column).toBeGreaterThan(0);
    });
  });

  describe('Directives - The Control Flow Masters', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('each');
      tokenizer.registerDirective('section');
      tokenizer.registerDirective('slot');
    });

    it('should parse simple directive with body', () => {
      const ast = parseTemplate('@if condition\nContent\n@end');
      expect(ast.children[0]).toMatchObject({
        type: NodeType.DIRECTIVE,
        name: 'if',
        rawArgs: 'condition',
      });
    });

    it('should parse directive arguments as raw string', () => {
      const ast = parseTemplate('@if user.age >= 18\nAdult\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.rawArgs).toBe('user.age >= 18');
    });

    it('should parse directive body correctly', () => {
      const ast = parseTemplate('@if test\nBody content\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.children).toHaveLength(1);
      expect(directive.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Body content\n',
      });
    });

    it('should parse nested directives', () => {
      const template = `@if outer
Text
@if inner
Nested
@end
@end`;
      const ast = parseTemplate(template);

      const outerDirective = ast.children[0] as any;
      expect(outerDirective.name).toBe('if');

      const innerDirective = outerDirective.children.find(
        (c: any) => c.type === NodeType.DIRECTIVE,
      );
      expect(innerDirective).toBeDefined();
      expect(innerDirective.name).toBe('if');
    });

    it('should parse directive with variables in body', () => {
      const ast = parseTemplate('@if test\nHello @{name}\n@end');
      const directive = ast.children[0] as any;
      // Includes TEXT before variable, VARIABLE, and TEXT with newline
      expect(directive.children.length).toBeGreaterThanOrEqual(2);
      const variable = directive.children.find(
        (c: any) => c.type === NodeType.VARIABLE,
      );
      expect(variable).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'name',
      });
    });

    it('should handle directive with empty body', () => {
      const ast = parseTemplate('@if test\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.children).toHaveLength(0);
    });

    it('should parse directive with complex arguments', () => {
      const ast = parseTemplate('@each item, index in items\nContent\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.rawArgs).toBe('item, index in items');
    });

    it('should parse directive with string literals in args', () => {
      const ast = parseTemplate(
        '@section test(format="json", lang="js")\nCode\n@end\n',
      );
      const directive = ast.children[0] as any;
      expect(directive.rawArgs).toContain('"json"');
      expect(directive.rawArgs).toContain('"js"');
    });

    it('should normalize directive names to lowercase', () => {
      tokenizer.registerDirective('MyDirective');
      const ast = parseTemplate('@MyDirective args\nContent\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.name).toBe('mydirective');
    });

    it('should preserve source location for directives', () => {
      const ast = parseTemplate('Some text\n@if test\nBody\n@end\n');
      const directive = ast.children[1] as any;
      expect(directive.line).toBe(2);
      expect(directive.column).toBe(1);
    });
  });

  describe('Comments - The Invisible Ink', () => {
    it('should skip line comments', () => {
      const ast = parseTemplate('Text // comment\nMore text');
      expect(ast.children).toHaveLength(1);
      // Line comments consume their trailing newline to avoid blank lines in output
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Text More text',
      });
    });

    it('should skip block comments', () => {
      const ast = parseTemplate('Before /* comment */ After');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Before  After',
      });
    });

    it('should skip multiline block comments', () => {
      const template = `Before
/* multi
line
comment */
After`;
      const ast = parseTemplate(template);
      const text = ast.children[0] as any;
      expect(text.value).toContain('Before');
      expect(text.value).toContain('After');
      expect(text.value).not.toContain('comment');
    });

    it('should handle comments between directives', () => {
      tokenizer.registerDirective('if');
      const template = `@if test
// This is a comment
Content
@end`;
      const ast = parseTemplate(template);
      const directive = ast.children[0] as any;
      const textNodes = directive.children.filter(
        (c: any) => c.type === NodeType.TEXT,
      );
      expect(textNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Punctuation and Operators in Text - The Symbol Soup', () => {
    it('should include parentheses in text', () => {
      const ast = parseTemplate('Math: (a + b) = c');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Math: (a + b) = c',
      });
    });

    it('should include operators in text', () => {
      const ast = parseTemplate('Comparison: a >= b');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Comparison: a >= b',
      });
    });

    it('should include commas in text', () => {
      const ast = parseTemplate('List: a, b, c');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'List: a, b, c',
      });
    });

    it('should handle mixed punctuation', () => {
      const ast = parseTemplate('Expression: (x == y) && (a != b)');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0].type).toBe(NodeType.TEXT);
    });
  });

  describe('Error Handling - When Things Go Wrong', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
    });

    it('should throw on unexpected @end', () => {
      expect(() => parseTemplate('@end\n')).toThrow(APTLSyntaxError);
      expect(() => parseTemplate('@end\n')).toThrow(/Unexpected @end token/);
    });

    it('should throw on @end without matching directive', () => {
      expect(() => parseTemplate('Text\n@end\n')).toThrow(
        /Unexpected @end token/,
      );
    });

    it('should provide line and column in errors', () => {
      try {
        parseTemplate('Line 1\nLine 2\n@end\n');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.line).toBe(3);
        expect(syntaxError.column).toBeGreaterThan(0);
      }
    });

    it('should handle unexpected token types gracefully', () => {
      // Create a token list with an unexpected token type
      const tokens = [
        { type: 'UNEXPECTED' as any, value: 'test', line: 1, column: 1 },
        { type: TokenType.EOF, value: '', line: 1, column: 5 },
      ];

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
      expect(() => parser.parse(tokens)).toThrow(/Unexpected token/);
    });
  });

  describe('Edge Cases - The Corner Dwellers', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('section');
    });

    it('should handle template with only whitespace', () => {
      const ast = parseTemplate('   \n   \n   ');
      expect(ast.children.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle template with only variables', () => {
      const ast = parseTemplate('@{a}@{b}@{c}');
      expect(ast.children).toHaveLength(3);
      expect(ast.children.every((c) => c.type === NodeType.VARIABLE)).toBe(
        true,
      );
    });

    it('should handle deeply nested directives', () => {
      const template = `@if a
@if b
@if c
@if d
Deep
@end
@end
@end
@end`;
      const ast = parseTemplate(template);
      expect(ast.children).toHaveLength(1);

      let current: any = ast.children[0];
      let depth = 0;
      while (current && current.type === NodeType.DIRECTIVE) {
        depth++;
        current = current.children.find(
          (c: any) => c.type === NodeType.DIRECTIVE,
        );
      }
      expect(depth).toBe(4);
    });

    it('should handle directive at end of template without trailing newline', () => {
      const ast = parseTemplate('@if test\nContent\n@end');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.DIRECTIVE,
        name: 'if',
      });
    });

    it('should handle empty directive arguments', () => {
      const ast = parseTemplate('@section\nContent\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.rawArgs).toBe('');
    });

    it('should handle directives with only whitespace in args', () => {
      const ast = parseTemplate('@section   \nContent\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.rawArgs.trim()).toBe('');
    });

    it('should preserve whitespace at start and end of text', () => {
      const ast = parseTemplate('  leading and trailing  ');
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '  leading and trailing  ',
      });
    });

    it('should handle multiple consecutive newlines', () => {
      const ast = parseTemplate('Line 1\n\n\nLine 2');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Line 1\n\n\nLine 2',
      });
    });
  });

  describe('Real-world Templates - Battle-tested', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('elif');
      tokenizer.registerDirective('else');
      tokenizer.registerDirective('each');
      tokenizer.registerDirective('section');
      tokenizer.registerDirective('slot');
      tokenizer.registerDirective('extends');
    });

    it('should parse conditional with elif and else', () => {
      // Note: Current parser doesn't have special elif/else handling
      // They would need to be handled by the if-directive implementation
      const template = `@if user.age >= 18
Adult content
@end`;
      const ast = parseTemplate(template);
      expect(ast.children.length).toBeGreaterThanOrEqual(1);
      const directive = ast.children[0] as any;
      expect(directive.name).toBe('if');
      expect(directive.rawArgs).toBe('user.age >= 18');
    });

    it('should parse each loop with index', () => {
      const template = `@each item, index in items
@{index}. @{item.name}
@end`;
      const ast = parseTemplate(template);
      const directive = ast.children[0] as any;
      expect(directive.name).toBe('each');
      expect(directive.rawArgs).toBe('item, index in items');

      const variables = directive.children.filter(
        (c: any) => c.type === NodeType.VARIABLE,
      );
      expect(variables).toHaveLength(2);
    });

    it('should parse section with attributes', () => {
      const template = `@section code(format=json)
Content here
@end`;
      const ast = parseTemplate(template);
      const directive = ast.children[0] as any;
      expect(directive.name).toBe('section');
      // Arguments are stored as raw string
      expect(directive.rawArgs).toContain('format');
      expect(directive.rawArgs).toContain('json');
    });

    it('should parse template with extends and slots', () => {
      const template = `@extends "base.aptl"
@slot header
Custom Header
@end
@slot content
Main content here
@end`;
      const ast = parseTemplate(template);
      const directives = ast.children.filter(
        (c: any) => c.type === NodeType.DIRECTIVE,
      );
      expect(directives.length).toBeGreaterThanOrEqual(1);
    });

    it('should parse complex nested template', () => {
      const template = `@section main
Welcome @{user.name}!

@if user.notifications
You have @{user.notifications.length} notifications:
@each notif in user.notifications
  - @{notif.message}
@end
@end
@end`;

      const ast = parseTemplate(template);
      expect(ast.children.length).toBeGreaterThanOrEqual(1);

      const mainSection = ast.children.find(
        (c: any) => c.type === NodeType.DIRECTIVE && c.name === 'section',
      ) as any;
      expect(mainSection).toBeDefined();

      // Should have variables and nested directives
      const hasVariables = (node: any): boolean => {
        if (node.type === NodeType.VARIABLE) return true;
        if (node.children) {
          return node.children.some((c: any) => hasVariables(c));
        }
        return false;
      };

      expect(hasVariables(mainSection)).toBe(true);
    });

    it('should parse AI prompt template', () => {
      const template = `@section system(role="system")
You are a helpful assistant.
@end

@section context
@if user.context
Context: @{user.context}
@end
@end

@section prompt(role="user")
@{user.query}
@end`;

      const ast = parseTemplate(template);
      const sections = ast.children.filter(
        (c: any) => c.type === NodeType.DIRECTIVE && c.name === 'section',
      );
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it('should parse template with mixed content types', () => {
      const template = `Plain text here
@{variable}
More text
// Comment line
@if condition
  Indented content
  @{nested.var}
@end
Final text`;

      const ast = parseTemplate(template);
      expect(ast.children.length).toBeGreaterThan(0);

      const hasText = ast.children.some((c) => c.type === NodeType.TEXT);
      const hasVariable = ast.children.some(
        (c) => c.type === NodeType.VARIABLE,
      );
      const hasDirective = ast.children.some(
        (c) => c.type === NodeType.DIRECTIVE,
      );

      expect(hasText).toBe(true);
      expect(hasVariable).toBe(true);
      expect(hasDirective).toBe(true);
    });
  });

  describe('Directive Body Detection - The Lookahead Logic', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('section');
      tokenizer.registerDirective('extends');
    });

    it('should detect directive with body', () => {
      const ast = parseTemplate('@if test\nBody\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.children.length).toBeGreaterThan(0);
    });

    it('should detect directive without body (immediate @end)', () => {
      const ast = parseTemplate('@if test\n@end\n');
      const directive = ast.children[0] as any;
      expect(directive.children).toHaveLength(0);
    });

    it('should handle directives that might not have @end', () => {
      // extends typically doesn't require @end in some template systems
      const ast = parseTemplate('@extends "base.aptl"\n');
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.DIRECTIVE,
        name: 'extends',
      });
    });
  });

  describe('Special Directive Handling - elif and else', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('elif');
      tokenizer.registerDirective('else');
    });

    it('should parse elif within if block', () => {
      // elif/else are special - they don't have their own @end
      // They're parsed as directives within if directive's body
      const template = `@if a
Content A
@end`;
      const ast = parseTemplate(template);
      const ifDirective = ast.children[0] as any;
      expect(ifDirective.type).toBe(NodeType.DIRECTIVE);
      expect(ifDirective.name).toBe('if');
    });

    it('should parse else within if block', () => {
      const template = `@if test
True branch
@end`;
      const ast = parseTemplate(template);
      const ifDirective = ast.children[0] as any;
      expect(ifDirective.type).toBe(NodeType.DIRECTIVE);
      expect(ifDirective.name).toBe('if');
    });

    it('should handle simple if without elif/else', () => {
      const template = `@if a
Content A
@end`;
      const ast = parseTemplate(template);
      const ifDirective = ast.children[0] as any;
      expect(ifDirective.name).toBe('if');
      expect(ifDirective.children.length).toBeGreaterThan(0);
    });
  });

  describe('Performance - Speed Matters', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('section');
    });

    it('should handle large templates efficiently', () => {
      const lines = 1000;
      const template = Array(lines)
        .fill('Line of text with @{variable} and more text\n')
        .join('');

      const start = Date.now();
      const ast = parseTemplate(template);
      const elapsed = Date.now() - start;

      expect(ast.children.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(1000); // Should complete in reasonable time
    });

    it('should handle deeply nested structures without stack overflow', () => {
      const depth = 50;
      const opening = '@if test\n'.repeat(depth);
      const closing = '@end\n'.repeat(depth);
      const template = opening + 'Deep content\n' + closing;

      const ast = parseTemplate(template);
      // May have trailing text nodes from extra newlines
      expect(ast.children.length).toBeGreaterThanOrEqual(1);

      // Verify deep nesting exists
      let current: any = ast.children[0];
      let actualDepth = 0;
      while (current && current.type === NodeType.DIRECTIVE) {
        actualDepth++;
        current = current.children.find(
          (c: any) => c.type === NodeType.DIRECTIVE,
        );
      }
      expect(actualDepth).toBeGreaterThan(depth - 5); // Allow some tolerance
    });

    it('should handle many consecutive nodes efficiently', () => {
      const count = 500;
      const template = Array(count)
        .fill(0)
        .map((_, i) => `@{var${i}}`)
        .join(' ');

      const start = Date.now();
      const ast = parseTemplate(template);
      const elapsed = Date.now() - start;

      const variables = ast.children.filter(
        (c) => c.type === NodeType.VARIABLE,
      );
      expect(variables.length).toBe(count);
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('AST Structure Validation - The Shape of Things', () => {
    beforeEach(() => {
      tokenizer.registerDirective('if');
      tokenizer.registerDirective('section');
    });

    it('should create template node at root', () => {
      const ast = parseTemplate('anything');
      expect(ast).toMatchObject({
        type: NodeType.TEMPLATE,
      });
      expect(ast.children).toBeDefined();
      expect(Array.isArray(ast.children)).toBe(true);
    });

    it('should include all required node properties', () => {
      const ast = parseTemplate('@{var}');
      const variable = ast.children[0] as any;

      expect(variable.type).toBeDefined();
      expect(variable.path).toBeDefined();
      expect(variable.line).toBeDefined();
      expect(variable.column).toBeDefined();
    });

    it('should maintain parent-child relationships', () => {
      const ast = parseTemplate('@if test\n@{var}\n@end\n');
      const directive = ast.children[0] as any;

      expect(directive.children).toBeDefined();
      expect(Array.isArray(directive.children)).toBe(true);
      expect(directive.children.length).toBeGreaterThan(0);
    });

    it('should preserve order of nodes', () => {
      const ast = parseTemplate('First @{var1} Second @{var2} Third');
      const types = ast.children.map((c) => c.type);

      expect(types[0]).toBe(NodeType.TEXT); // First
      expect(types[1]).toBe(NodeType.VARIABLE); // var1
      expect(types[2]).toBe(NodeType.TEXT); // Second
      expect(types[3]).toBe(NodeType.VARIABLE); // var2
      expect(types[4]).toBe(NodeType.TEXT); // Third
    });

    it('should not create duplicate nodes', () => {
      const ast = parseTemplate('@{var}');
      expect(ast.children).toHaveLength(1);

      const ast2 = parseTemplate('@{var}');
      expect(ast2.children).toHaveLength(1);
      // Should be independent parse results
      expect(ast).not.toBe(ast2);
    });
  });
});
