/**
 * APTL Parser Unit Tests
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

describe('Parser', () => {
  let parser: Parser;
  let tokenizer: Tokenizer;

  beforeEach(() => {
    parser = new Parser();
    tokenizer = new Tokenizer();
  });

  describe('Basic Functionality', () => {
    it('should parse empty template', () => {
      const tokens = tokenizer.tokenize('');
      const ast = parser.parse(tokens);

      expect(ast).toMatchObject({
        type: NodeType.TEMPLATE,
        children: [],
      });
    });

    it('should parse plain text', () => {
      const tokens = tokenizer.tokenize('Hello world');
      const ast = parser.parse(tokens);

      expect(ast).toMatchObject({
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.TEXT,
            value: 'Hello world',
            line: 1,
            column: 1,
          },
        ],
      });
    });

    it('should parse multiple text nodes', () => {
      const tokens = tokenizer.tokenize('Line 1\nLine 2');
      const ast = parser.parse(tokens);

      // Parser now preserves whitespace by combining TEXT + NEWLINE tokens
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Line 1\nLine 2',
      });
    });
  });

  describe('Variable Interpolation', () => {
    it('should parse simple variable', () => {
      const tokens = tokenizer.tokenize('@{name}');
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'name',
        line: 1,
        column: 1,
      });
    });

    it('should parse nested variable paths', () => {
      const tokens = tokenizer.tokenize('@{user.profile.name}');
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'user.profile.name',
      });
    });

    it('should parse variables mixed with text', () => {
      const tokens = tokenizer.tokenize('Hello @{name}!');
      const ast = parser.parse(tokens);

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
        value: '!',
      });
    });

    it('should parse multiple variables', () => {
      const tokens = tokenizer.tokenize('@{firstName} @{lastName}');
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(3);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'firstName',
      });
      expect(ast.children[1]).toMatchObject({
        type: NodeType.TEXT,
        value: ' ',
      });
      expect(ast.children[2]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'lastName',
      });
    });
  });

  describe('Section Parsing', () => {
    it('should parse simple section', () => {
      const tokens = tokenizer.tokenize(`@section test
Content here
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.SECTION,
        name: 'test',
        attributes: {},
        children: [
          {
            type: NodeType.TEXT,
            value: 'Content here\n',
          },
        ],
      });
    });

    it('should parse section with attributes', () => {
      const tokens = tokenizer.tokenize(`@section identity(role="system")
You are an AI assistant.
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.SECTION,
        name: 'identity',
        attributes: {
          role: 'system',
        },
        children: [
          {
            type: NodeType.TEXT,
            value: 'You are an AI assistant.\n',
          },
        ],
      });
    });

    it('should parse nested sections', () => {
      const tokens = tokenizer.tokenize(`@section outer
@section inner
Inner content
@end
Outer content
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      const outerSection = ast.children[0] as SectionNode;
      expect(outerSection).toMatchObject({
        type: NodeType.SECTION,
        name: 'outer',
      });

      expect(outerSection.children).toHaveLength(2);
      expect(outerSection.children[0]).toMatchObject({
        type: NodeType.SECTION,
        name: 'inner',
        children: [
          {
            type: NodeType.TEXT,
            value: 'Inner content\n',
          },
        ],
      });
      expect(outerSection.children[1]).toMatchObject({
        type: NodeType.TEXT,
        value: '\nOuter content\n',
      });
    });

    it('should parse section with variables', () => {
      const tokens = tokenizer.tokenize(`@section greeting
Hello @{name}!
@end`);
      const ast = parser.parse(tokens);

      const section = ast.children[0] as SectionNode;
      expect(section.children).toHaveLength(3);
      expect(section.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Hello ',
      });
      expect(section.children[1]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'name',
      });
      expect(section.children[2]).toMatchObject({
        type: NodeType.TEXT,
        value: '!\n',
      });
    });

    it('should throw error on unclosed section', () => {
      const tokens = tokenizer.tokenize(`@section test
Content here`);

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
      expect(() => parser.parse(tokens)).toThrow(/Unclosed section: test/);
    });

    it('should parse empty section', () => {
      const tokens = tokenizer.tokenize(`@section empty
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.SECTION,
        name: 'empty',
        children: [],
      });
    });
  });

  describe('Conditional Parsing', () => {
    it('should parse simple if statement', () => {
      const tokens = tokenizer.tokenize(`@if condition
Content
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.CONDITIONAL,
        condition: 'condition',
        consequent: [
          {
            type: NodeType.TEXT,
            value: 'Content\n',
          },
        ],
        alternate: undefined,
      });
    });

    it('should parse if-else statement', () => {
      const tokens = tokenizer.tokenize(`@if condition
True content
@else
False content
@end`);
      const ast = parser.parse(tokens);

      const conditional = ast.children[0] as ConditionalNode;
      expect(conditional).toMatchObject({
        type: NodeType.CONDITIONAL,
        condition: 'condition',
      });

      expect(conditional.consequent).toHaveLength(1);
      expect(conditional.consequent[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'True content\n',
      });

      expect(conditional.alternate).toHaveLength(1);
      expect((conditional.alternate as any[])[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '\nFalse content\n',
      });
    });

    it('should parse if-elif-else statement', () => {
      const tokens = tokenizer.tokenize(`@if condition1
Content 1
@elif condition2
Content 2
@else
Content 3
@end`);
      const ast = parser.parse(tokens);

      const conditional = ast.children[0] as ConditionalNode;
      expect(conditional).toMatchObject({
        type: NodeType.CONDITIONAL,
        condition: 'condition1',
      });

      expect(conditional.consequent[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Content 1\n',
      });

      // elif should create a nested conditional
      expect(conditional.alternate).toMatchObject({
        type: NodeType.CONDITIONAL,
        condition: 'condition2',
      });

      const elifConditional = conditional.alternate as ConditionalNode;
      expect(elifConditional.consequent[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Content 2\n',
      });

      expect((elifConditional.alternate as any[])[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '\nContent 3\n',
      });
    });

    it('should parse nested conditionals', () => {
      const tokens = tokenizer.tokenize(`@if outer
@if inner
Nested content
@end
@end`);
      const ast = parser.parse(tokens);

      const outerConditional = ast.children[0] as ConditionalNode;
      expect(outerConditional).toMatchObject({
        type: NodeType.CONDITIONAL,
        condition: 'outer',
      });

      // The outer consequent contains the inner conditional plus a trailing newline TEXT node
      expect(outerConditional.consequent.length).toBeGreaterThanOrEqual(1);
      expect(outerConditional.consequent[0]).toMatchObject({
        type: NodeType.CONDITIONAL,
        condition: 'inner',
      });

      const innerConditional = outerConditional
        .consequent[0] as ConditionalNode;
      expect(innerConditional.consequent[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Nested content\n',
      });
    });

    it('should parse conditional with variables', () => {
      const tokens = tokenizer.tokenize(`@if hasName
Hello @{name}!
@end`);
      const ast = parser.parse(tokens);

      const conditional = ast.children[0] as ConditionalNode;
      expect(conditional.consequent).toHaveLength(3);
      expect(conditional.consequent[1]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'name',
      });
    });

    it('should throw error on unclosed conditional', () => {
      const tokens = tokenizer.tokenize(`@if condition
Content`);

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
      expect(() => parser.parse(tokens)).toThrow(/Unclosed conditional/);
    });
  });

  describe('Iteration Parsing', () => {
    it('should parse simple iteration', () => {
      const tokens = tokenizer.tokenize(`@each item in items
Item: @{item}
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.ITERATION,
        itemName: 'item',
        arrayPath: 'items',
        children: [
          {
            type: NodeType.TEXT,
            value: 'Item: ',
          },
          {
            type: NodeType.VARIABLE,
            path: 'item',
          },
          {
            type: NodeType.TEXT,
            value: '\n',
          },
        ],
      });
    });

    it('should parse iteration with nested path', () => {
      const tokens = tokenizer.tokenize(`@each user in data.users
User: @{user.name}
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.ITERATION,
        itemName: 'user',
        arrayPath: 'data.users',
      });
    });

    it('should parse nested iterations', () => {
      const tokens = tokenizer.tokenize(`@each category in categories
@each item in category.items
@{item.name}
@end
@end`);
      const ast = parser.parse(tokens);

      const outerIteration = ast.children[0] as IterationNode;
      expect(outerIteration).toMatchObject({
        type: NodeType.ITERATION,
        itemName: 'category',
        arrayPath: 'categories',
      });

      // Outer iteration contains inner iteration plus trailing newline
      expect(outerIteration.children.length).toBeGreaterThanOrEqual(1);
      expect(outerIteration.children[0]).toMatchObject({
        type: NodeType.ITERATION,
        itemName: 'item',
        arrayPath: 'category.items',
      });

      const innerIteration = outerIteration.children[0] as IterationNode;
      expect(innerIteration.children).toHaveLength(2);
      expect(innerIteration.children[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'item.name',
      });
      expect(innerIteration.children[1]).toMatchObject({
        type: NodeType.TEXT,
        value: '\n',
      });
    });

    it('should parse iteration with conditionals', () => {
      const tokens = tokenizer.tokenize(`@each item in items
@if item.visible
@{item.name}
@end
@end`);
      const ast = parser.parse(tokens);

      const iteration = ast.children[0] as IterationNode;
      // Iteration contains conditional plus optional trailing newline
      expect(iteration.children.length).toBeGreaterThanOrEqual(1);
      expect(iteration.children[0]).toMatchObject({
        type: NodeType.CONDITIONAL,
        condition: 'item.visible',
      });

      const conditional = iteration.children[0] as ConditionalNode;
      expect(conditional.consequent).toHaveLength(2);
      expect(conditional.consequent[0]).toMatchObject({
        type: NodeType.VARIABLE,
        path: 'item.name',
      });
      expect(conditional.consequent[1]).toMatchObject({
        type: NodeType.TEXT,
        value: '\n',
      });
    });

    it('should throw error on invalid iteration syntax', () => {
      const tokens = tokenizer.tokenize(`@each item
Content
@end`);

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
      expect(() => parser.parse(tokens)).toThrow(/Invalid iteration syntax/);
    });

    it('should throw error on unclosed iteration', () => {
      const tokens = tokenizer.tokenize(`@each item in items
Content`);

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
      expect(() => parser.parse(tokens)).toThrow(/Unclosed iteration/);
    });
  });

  describe('Comments Handling', () => {
    it('should skip line comments', () => {
      const tokens = tokenizer.tokenize(`// This is a comment
Text content`);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '\nText content',
      });
    });

    it('should skip block comments', () => {
      const tokens = tokenizer.tokenize(`/* Block comment */
Text content`);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '\nText content',
      });
    });

    it('should handle comments between statements', () => {
      const tokens = tokenizer.tokenize(`@section test
// Comment in section
Content
@end`);
      const ast = parser.parse(tokens);

      const section = ast.children[0] as SectionNode;
      // Comment is skipped, but newline after comment is preserved
      expect(section.children).toHaveLength(1);
      expect(section.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '\nContent\n',
      });
    });
  });

  describe('Complex Templates', () => {
    it('should parse full agent prompt template', () => {
      const template = `@section identity(role="system")
You are @{agentName}, a @{agentRole} AI assistant.

@if expertise
Your areas of expertise include:
@each area in expertise.areas
- @{area.name}: @{area.description}
@end
@end

@if guidelines
Please follow these guidelines:
@each guideline in guidelines
- @{guideline}
@end
@end
@end

@section instructions(role="user")
@{userMessage}
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      // Parser preserves whitespace, so the blank line between sections becomes a TEXT node
      expect(ast.children.length).toBeGreaterThanOrEqual(2);

      // Filter out pure whitespace nodes to find the actual sections
      const sections = ast.children.filter(
        (node) => node.type === NodeType.SECTION,
      );
      expect(sections).toHaveLength(2);

      // First section: identity
      const identitySection = sections[0] as SectionNode;
      expect(identitySection).toMatchObject({
        type: NodeType.SECTION,
        name: 'identity',
        attributes: {
          role: 'system',
        },
      });

      // Should contain text, variables, and conditionals
      expect(identitySection.children.length).toBeGreaterThan(5);

      // Second section: instructions
      const instructionsSection = sections[1] as SectionNode;
      expect(instructionsSection).toMatchObject({
        type: NodeType.SECTION,
        name: 'instructions',
        attributes: {
          role: 'user',
        },
      });
    });

    it('should parse template with all construct types', () => {
      const template = `// Header comment
@section main
Text before @{variable} text after

@if condition
  @each item in items
    @if item.active
      Active: @{item.name}
    @else
      Inactive: @{item.name}
    @end
  @end
@elif otherCondition
  Other content
@else
  Default content
@end
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      // With comment at the beginning and whitespace preservation, we may have multiple children
      const sections = ast.children.filter(
        (node) => node.type === NodeType.SECTION,
      );
      expect(sections).toHaveLength(1);
      const section = sections[0] as SectionNode;
      expect(section.type).toBe(NodeType.SECTION);

      // Should contain various node types
      const nodeTypes = new Set<string>();
      function collectNodeTypes(nodes: any[]): void {
        nodes.forEach((node: any) => {
          nodeTypes.add(node.type);
          if (node.children) {
            collectNodeTypes(node.children);
          }
          if (node.consequent) {
            collectNodeTypes(node.consequent);
          }
          if (node.alternate && Array.isArray(node.alternate)) {
            collectNodeTypes(node.alternate);
          }
          if (node.alternate && node.alternate.type) {
            collectNodeTypes([node.alternate]);
          }
        });
      }

      collectNodeTypes(section.children);

      expect(nodeTypes.has(NodeType.TEXT)).toBe(true);
      expect(nodeTypes.has(NodeType.VARIABLE)).toBe(true);
      expect(nodeTypes.has(NodeType.CONDITIONAL)).toBe(true);
      expect(nodeTypes.has(NodeType.ITERATION)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages with location', () => {
      const tokens = tokenizer.tokenize(`@section test
Content
// Missing @end`);

      try {
        parser.parse(tokens);
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.line).toBe(1);
        expect(syntaxError.column).toBe(1);
        expect(syntaxError.message).toContain('Unclosed section: test');
      }
    });

    it('should handle unexpected tokens', () => {
      // Create a mock token that would be unexpected
      const tokens = [
        { type: TokenType.TEXT, value: 'normal', line: 1, column: 1 },
        {
          type: TokenType.SECTION_END,
          value: 'section_end',
          line: 1,
          column: 7,
        }, // Unexpected
        { type: TokenType.EOF, value: '', line: 1, column: 18 },
      ];

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
    });

    it('should handle malformed iteration syntax', () => {
      const tokens = tokenizer.tokenize(`@each invalid syntax here
@end`);

      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
      expect(() => parser.parse(tokens)).toThrow(/Invalid iteration syntax/);
    });

    it('should handle multiple syntax errors appropriately', () => {
      const tokens = tokenizer.tokenize(`@section unclosed
@if also_unclosed
Content`);

      // Should throw error for the first unclosed construct
      expect(() => parser.parse(tokens)).toThrow(APTLSyntaxError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty conditionals', () => {
      const tokens = tokenizer.tokenize(`@if condition
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.CONDITIONAL,
        condition: 'condition',
        consequent: [],
      });
    });

    it('should handle empty iterations', () => {
      const tokens = tokenizer.tokenize(`@each item in items
@end`);
      const ast = parser.parse(tokens);

      expect(ast.children[0]).toMatchObject({
        type: NodeType.ITERATION,
        itemName: 'item',
        arrayPath: 'items',
        children: [],
      });
    });

    it('should handle whitespace-only content', () => {
      const tokens = tokenizer.tokenize(`@section test

@end`);
      const ast = parser.parse(tokens);

      const section = ast.children[0] as SectionNode;
      // Parser now preserves whitespace, so the empty line becomes a TEXT node
      expect(section.children).toHaveLength(1);
      expect(section.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: '\n',
      });
    });

    it('should handle consecutive newlines', () => {
      const tokens = tokenizer.tokenize('Line 1\n\n\nLine 2');
      const ast = parser.parse(tokens);

      // Parser preserves whitespace, so consecutive newlines are kept
      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: NodeType.TEXT,
        value: 'Line 1\n\n\nLine 2',
      });
    });

    it('should handle mixed indentation correctly', () => {
      const tokens = tokenizer.tokenize(`@section test
  Content with spaces
\tContent with tab
@end`);
      const ast = parser.parse(tokens);

      const section = ast.children[0] as SectionNode;
      // Parser now combines text with newlines
      expect(section.children).toHaveLength(1);
      expect((section.children[0] as any).value).toContain('spaces');
      expect((section.children[0] as any).value).toContain('tab');
    });
  });

  describe('Performance', () => {
    it('should handle large templates efficiently', () => {
      // Create a large template
      const sections = Array.from(
        { length: 100 },
        (_, i) =>
          `@section section${i}
Content for section ${i}
@{variable${i}}
@end`,
      ).join('\n');

      const tokens = tokenizer.tokenize(sections);
      const start = Date.now();
      const ast = parser.parse(tokens);
      const end = Date.now();

      // With newlines between sections being preserved as TEXT nodes,
      // we have 100 sections + 99 newline TEXT nodes = 199 children
      const sections_found = ast.children.filter(
        (node) => node.type === NodeType.SECTION,
      );
      expect(sections_found).toHaveLength(100);
      expect(end - start).toBeLessThan(1000); // Should parse in under 1 second
    });

    it('should handle deeply nested structures', () => {
      // Create a deeply nested template
      let template = '';
      const depth = 50;

      for (let i = 0; i < depth; i++) {
        template += `@section level${i}\n`;
      }
      template += 'Deep content\n';
      for (let i = 0; i < depth; i++) {
        template += '@end\n';
      }

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      // Should successfully parse without stack overflow
      // With newlines being preserved as TEXT nodes, there might be an extra node at the end
      const sections = ast.children.filter(
        (node) => node.type === NodeType.SECTION,
      );
      expect(sections).toHaveLength(1);

      // Check nesting depth
      let current = sections[0] as SectionNode;
      let actualDepth = 1;
      while (
        current.children &&
        current.children[0] &&
        current.children[0].type === NodeType.SECTION
      ) {
        current = current.children[0] as SectionNode;
        actualDepth++;
      }

      expect(actualDepth).toBe(depth);
    });
  });
});
