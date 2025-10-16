/**
 * Section Attributes Parsing Tests
 */

import { Tokenizer } from '@/core/tokenizer';
import { Parser } from '@/core/parser';
import { NodeType, SectionNode } from '@/core/types';

describe('Parser - Section Attributes', () => {
  let tokenizer: Tokenizer;
  let parser: Parser;

  beforeEach(() => {
    tokenizer = new Tokenizer();
    parser = new Parser();
  });

  // Helper to find the first section node in AST
  const findSectionNode = (ast: any): SectionNode => {
    return ast.children.find(
      (node: any) => node.type === NodeType.SECTION,
    ) as SectionNode;
  };

  describe('Section without attributes', () => {
    it('should parse section with just a name', () => {
      const template = `
@section intro
  Hello world
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section).toBeDefined();
      expect(section.type).toBe(NodeType.SECTION);
      expect(section.name).toBe('intro');
      expect(section.attributes).toEqual({});
    });
  });

  describe('Section with single attribute', () => {
    it('should parse section with one attribute', () => {
      const template = `
@section intro(style="formal")
  Hello world
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section).toBeDefined();
      expect(section.type).toBe(NodeType.SECTION);
      expect(section.name).toBe('intro');
      expect(section.attributes).toEqual({
        style: 'formal',
      });
    });

    it('should handle attributes with spaces around equals', () => {
      const template = `
@section intro(style = "formal")
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        style: 'formal',
      });
    });
  });

  describe('Section with multiple attributes', () => {
    it('should parse section with two attributes', () => {
      const template = `
@section intro(style="formal", tone="friendly")
  Hello world
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.type).toBe(NodeType.SECTION);
      expect(section.name).toBe('intro');
      expect(section.attributes).toEqual({
        style: 'formal',
        tone: 'friendly',
      });
    });

    it('should parse section with three attributes', () => {
      const template = `
@section content(style="formal", tone="friendly", length="short")
  Content here
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        style: 'formal',
        tone: 'friendly',
        length: 'short',
      });
    });

    it('should handle attributes with spaces in various places', () => {
      const template = `
@section intro( style="formal" , tone = "friendly" )
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        style: 'formal',
        tone: 'friendly',
      });
    });
  });

  describe('Attribute values', () => {
    it('should handle empty string values', () => {
      const template = `
@section intro(style="")
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        style: '',
      });
    });

    it('should handle values with spaces', () => {
      const template = `
@section intro(style="very formal and polite")
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        style: 'very formal and polite',
      });
    });

    it('should handle values with special characters', () => {
      const template = `
@section intro(style="formal: professional, tone: friendly!")
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        style: 'formal: professional, tone: friendly!',
      });
    });

    it('should handle values with numbers', () => {
      const template = `
@section intro(max="100", min="0")
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        max: '100',
        min: '0',
      });
    });
  });

  describe('Nested sections with attributes', () => {
    it('should parse nested sections each with their own attributes', () => {
      const template = `
@section outer(style="formal")
  Outer content
  @section inner(tone="friendly")
    Inner content
  @end
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const outerSection = findSectionNode(ast);
      expect(outerSection.type).toBe(NodeType.SECTION);
      expect(outerSection.name).toBe('outer');
      expect(outerSection.attributes).toEqual({
        style: 'formal',
      });

      const innerSection = outerSection.children.find(
        (node: any) => node.type === NodeType.SECTION,
      ) as SectionNode;
      expect(innerSection).toBeDefined();
      expect(innerSection.type).toBe(NodeType.SECTION);
      expect(innerSection.name).toBe('inner');
      expect(innerSection.attributes).toEqual({
        tone: 'friendly',
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle API response format section', () => {
      const template = `@section response(format="json", indent="2", pretty="true")
Content with JSON format
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        format: 'json',
        indent: '2',
        pretty: 'true',
      });
    });

    it('should handle prompt instruction section', () => {
      const template = `
@section instructions(priority="high", audience="technical", style="concise")
  Follow these steps carefully.
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        priority: 'high',
        audience: 'technical',
        style: 'concise',
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid attribute syntax (no quotes)', () => {
      const template = `
@section intro(style=formal)
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      expect(() => parser.parse(tokens)).toThrow(/Invalid attribute syntax/);
    });

    it('should throw error for unclosed quotes', () => {
      const template = `@section intro(style="formal)
  Content
@end`;

      expect(() => {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
      }).toThrow(/Unterminated string literal|Invalid/);
    });

    it('should throw error for missing attribute value', () => {
      const template = `
@section intro(style=)
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      expect(() => parser.parse(tokens)).toThrow(/Invalid/);
    });

    it('should throw error for invalid section header format', () => {
      const template = `
@section intro(invalid attribute syntax here
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      expect(() => parser.parse(tokens)).toThrow(/Invalid section header/);
    });
  });

  describe('Edge cases', () => {
    it('should handle section name with underscores', () => {
      const template = `
@section user_profile(type="admin")
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.name).toBe('user_profile');
      expect(section.attributes).toEqual({
        type: 'admin',
      });
    });

    it('should handle attribute names with underscores', () => {
      const template = `
@section intro(user_type="admin", max_length="100")
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({
        user_type: 'admin',
        max_length: '100',
      });
    });

    it('should handle empty parentheses', () => {
      const template = `
@section intro()
  Content
@end
      `;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = findSectionNode(ast);
      expect(section.attributes).toEqual({});
    });
  });
});
