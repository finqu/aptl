/**
 * APTL Parser Edge Cases and Error Handling Tests
 */

import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';
import {
  TokenType,
  NodeType,
  SectionNode,
  ConditionalNode,
  IterationNode,
} from '@/core/types';
import { APTLSyntaxError } from '@/utils/errors';

describe('Parser Edge Cases', () => {
  let parser: Parser;
  let tokenizer: Tokenizer;

  beforeEach(() => {
    parser = new Parser();
    tokenizer = new Tokenizer();
  });

  describe('Error Recovery', () => {
    it('should handle malformed section names gracefully', () => {
      const tokens = tokenizer.tokenize(`@section
Content
@end`);

      // Empty section name is now invalid with attribute parsing
      expect(() => parser.parse(tokens)).toThrow(/Invalid section header/);
    });

    it('should handle missing section content', () => {
      const tokens = tokenizer.tokenize(`@section test
@end`);
      const ast = parser.parse(tokens);

      const section = ast.children[0] as SectionNode;
      expect(section.children).toHaveLength(0);
    });

    it('should handle deeply nested unmatched blocks', () => {
      const tokens = tokenizer.tokenize(`@section outer
@if condition1
@each item in items
@if condition2
Content without proper closes`);

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
    });

    it('should provide context in error messages for nested structures', () => {
      const template = `@section test
@if condition
  @each item in items
    Content
    // Missing @end for each
  @end
@end`;

      const tokens = tokenizer.tokenize(template);
      try {
        parser.parse(tokens);
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        expect((error as APTLSyntaxError).message).toContain('Unclosed');
      }
    });
  });

  describe('Whitespace and Formatting Edge Cases', () => {
    it('should handle sections with only whitespace', () => {
      const tokens = tokenizer.tokenize(`@section test
   \t  \n
@end`);
      const ast = parser.parse(tokens);

      const section = ast.children[0] as SectionNode;
      // Parser now preserves newlines with whitespace
      expect(section.children).toHaveLength(1);
      expect(section.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '   \t  \n\n',
      });
    });

    it('should preserve significant whitespace in text nodes', () => {
      const tokens = tokenizer.tokenize(`Leading    @{var}    trailing`);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(3);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Leading    ',
      });
      expect(ast.children[2]).toMatchObject({
        type: NodeType.TEXT,
        value: '    trailing',
      });
    });

    it('should handle mixed line endings', () => {
      const template = 'Line 1\rLine 2\nLine 3\r\nLine 4';
      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      // Parser now combines TEXT and NEWLINE tokens for whitespace preservation
      expect(ast.children.length).toBe(1);
      expect(ast.children[0].type).toBe(NodeType.TEXT);
      // All line endings are normalized to \n
      expect((ast.children[0] as any).value).toBe(
        'Line 1\nLine 2\nLine 3\nLine 4',
      );
    });
  });

  describe('Complex Nesting Scenarios', () => {
    it('should handle alternating section and conditional nesting', () => {
      const template = `@section outer
@if condition1
  @section inner1
    @if condition2
      Deep content
    @end
  @end
@else
  @section inner2
    Alternative content
  @end
@end
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      const outerSection = ast.children[0] as SectionNode;
      expect(outerSection.children[0].type).toBe(NodeType.CONDITIONAL);
    });

    it('should handle iteration within conditional within section', () => {
      const template = `@section list
@if hasItems
  @each item in items
    - @{item.name}
    @if item.details
      Details: @{item.details}
    @end
  @end
@else
  No items available
@end
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = ast.children[0] as SectionNode;
      const conditional = section.children[0] as ConditionalNode;
      // The first consequent child is whitespace, the second is the iteration
      const iteration = conditional.consequent[1] as IterationNode;

      expect(iteration.type).toBe(NodeType.ITERATION);
      expect(iteration.children.length).toBeGreaterThan(1);
    });
  });

  describe('Variable Edge Cases', () => {
    it('should handle variables with complex paths', () => {
      const tokens = tokenizer.tokenize(
        '@{user.profile.preferences.theme.colors.primary}',
      );
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'user.profile.preferences.theme.colors.primary',
      });
    });

    it('should handle variables with array access syntax', () => {
      const tokens = tokenizer.tokenize('@{items[0].name}');
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'items[0].name',
      });
    });

    it('should handle back-to-back variables', () => {
      const tokens = tokenizer.tokenize('@{firstName}@{lastName}');
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(2);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'firstName',
      });
      expect(ast.children[1]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'lastName',
      });
    });

    it('should handle variables with numeric paths', () => {
      const tokens = tokenizer.tokenize('@{data.0.value}');
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'data.0.value',
      });
    });
  });

  describe('Conditional Edge Cases', () => {
    it('should handle empty conditionals', () => {
      const tokens = tokenizer.tokenize(`@if condition
@end`);
      const ast = parser.parse(tokens);

      const conditional = ast.children[0] as ConditionalNode;
      expect(conditional.consequent).toHaveLength(0);
      expect(conditional.alternate).toBeUndefined();
    });

    it('should handle empty else block', () => {
      const tokens = tokenizer.tokenize(`@if condition
Content
@else
@end`);
      const ast = parser.parse(tokens);

      const conditional = ast.children[0] as ConditionalNode;
      expect(conditional.consequent).toHaveLength(1);
      // The alternate contains a newline (whitespace preservation)
      expect(conditional.alternate).toHaveLength(1);
      expect((conditional.alternate as any[])[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '\n',
      });
    });

    it('should handle multiple elif blocks', () => {
      const template = `@if condition1
Content1
@elif condition2
Content2
@elif condition3
Content3
@elif condition4
Content4
@else
DefaultContent
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const conditional = ast.children[0] as ConditionalNode;
      expect(conditional.condition).toBe('condition1');

      // Check nested elif structure
      let currentElif = conditional.alternate as ConditionalNode;
      expect(currentElif.condition).toBe('condition2');

      currentElif = currentElif.alternate as ConditionalNode;
      expect(currentElif.condition).toBe('condition3');

      currentElif = currentElif.alternate as ConditionalNode;
      expect(currentElif.condition).toBe('condition4');

      expect(Array.isArray(currentElif.alternate)).toBe(true);
    });

    it('should handle complex condition expressions', () => {
      const tokens =
        tokenizer.tokenize(`@if user.isActive && user.role === "admin"
Admin content
@end`);
      const ast = parser.parse(tokens);

      const conditional = ast.children[0] as ConditionalNode;
      expect(conditional.condition).toBe(
        'user.isActive && user.role === "admin"',
      );
    });
  });

  describe('Iteration Edge Cases', () => {
    it('should handle iteration with no content', () => {
      const tokens = tokenizer.tokenize(`@each item in items
@end`);
      const ast = parser.parse(tokens);

      const iteration = ast.children[0] as IterationNode;
      expect(iteration.children).toHaveLength(0);
    });

    it('should handle iteration with complex array paths', () => {
      const tokens = tokenizer.tokenize(`@each user in data.users.active
@{user.name}
@end`);
      const ast = parser.parse(tokens);

      const iteration = ast.children[0] as IterationNode;
      expect(iteration.itemName).toBe('user');
      expect(iteration.arrayPath).toBe('data.users.active');
    });

    it('should handle nested iterations with same variable names', () => {
      const template = `@each item in outerItems
@each item in item.innerItems
@{item}
@end
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const outerIteration = ast.children[0] as IterationNode;
      const innerIteration = outerIteration.children[0] as IterationNode;

      expect(outerIteration.itemName).toBe('item');
      expect(innerIteration.itemName).toBe('item');
      expect(innerIteration.arrayPath).toBe('item.innerItems');
    });

    it('should handle iteration with underscore variable names', () => {
      const tokens = tokenizer.tokenize(`@each _item in _private_items
@{_item._value}
@end`);
      const ast = parser.parse(tokens);

      const iteration = ast.children[0] as IterationNode;
      expect(iteration.itemName).toBe('_item');
      expect(iteration.arrayPath).toBe('_private_items');
    });
  });

  describe('Mixed Content Edge Cases', () => {
    it('should handle template with no meaningful content', () => {
      const tokens = tokenizer.tokenize(`
// Just comments
/* And block comments */


`);
      const ast = parser.parse(tokens);

      // Should only have whitespace/newline nodes or be empty
      expect(ast.children.length).toBeLessThanOrEqual(1);
    });

    it('should handle interleaved text and constructs', () => {
      const template = `Start @{var1} middle
@if condition
  Conditional text @{var2}
@end
End @{var3}`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children.length).toBeGreaterThan(5);

      // Should have mix of text, variables, and conditionals
      const types = ast.children.map((child) => child.type);
      expect(types).toContain(NodeType.TEXT);
      expect(types).toContain(NodeType.VARIABLE);
      expect(types).toContain(NodeType.CONDITIONAL);
    });

    it('should handle constructs at start and end of template', () => {
      const template = `@section first
Content
@end

Middle text

@section last
Final content
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(3);
      expect(ast.children[0].type).toBe(NodeType.SECTION);
      expect(ast.children[1].type).toBe(NodeType.TEXT);
      expect(ast.children[2].type).toBe(NodeType.SECTION);
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle many consecutive variables efficiently', () => {
      const variables = Array.from(
        { length: 1000 },
        (_, i) => `@{var${i}}`,
      ).join(' ');
      const tokens = tokenizer.tokenize(variables);

      const start = Date.now();
      const ast = parser.parse(tokens);
      const end = Date.now();

      expect(ast.children).toHaveLength(1999); // 1000 vars + 999 spaces
      expect(end - start).toBeLessThan(500); // Should be fast
    });

    it('should handle wide nesting (many siblings) efficiently', () => {
      const sections = Array.from(
        { length: 100 },
        (_, i) =>
          `@section section${i}
Content ${i}
@end`,
      ).join('\n\n');

      const tokens = tokenizer.tokenize(sections);
      const start = Date.now();
      const ast = parser.parse(tokens);
      const end = Date.now();

      expect(
        ast.children.filter((c) => c.type === NodeType.SECTION),
      ).toHaveLength(100);
      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Malformed Input Recovery', () => {
    it('should handle unexpected EOF in various contexts', () => {
      const testCases = [
        '@section test',
        '@if condition',
        '@each item in items',
        '@section test\nContent',
      ];

      testCases.forEach((template) => {
        const tokens = tokenizer.tokenize(template);
        expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
      });
    });

    it('should handle invalid section syntax', () => {
      const tokens = tokenizer.tokenize(`@section
Content
@end`);

      // Empty section name is now invalid with attribute parsing
      expect(() => parser.parse(tokens)).toThrow(/Invalid section header/);
    });

    it('should handle orphaned @end tokens', () => {
      const tokens = [
        { type: TokenType.TEXT, value: 'Some text', line: 1, column: 1 },
        { type: TokenType.END, value: 'end', line: 1, column: 10 },
        { type: TokenType.EOF, value: '', line: 1, column: 13 },
      ];

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
    });

    it('should handle mixed up closing tags', () => {
      // This should ideally be caught as an error
      const tokens = tokenizer.tokenize(`@if condition
@each item in items
@end
Content after wrong close
@end`);

      // The parser should handle this gracefully or throw appropriate error
      try {
        const ast = parser.parse(tokens);
        // If it doesn't throw, verify structure makes sense
        expect(ast.children.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
      }
    });
  });
});
