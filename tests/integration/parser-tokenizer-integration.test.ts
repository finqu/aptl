/**
 * Parser and Tokenizer Integration Tests
 * Tests that parser correctly handles tokenizer's strict @ handling
 */

import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';
import { APTLSyntaxError } from '@/utils/errors';

describe('Parser-Tokenizer Integration', () => {
  let parser: Parser;
  let tokenizer: Tokenizer;

  beforeEach(() => {
    parser = new Parser();
    tokenizer = new Tokenizer();
  });

  describe('@ Symbol Handling', () => {
    it('should reject unescaped @ followed by letters in text', () => {
      // After tokenizer changes, @ followed by letters must be escaped
      const template = 'Contact: user@example.com';

      expect(() => {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
      }).toThrow(APTLSyntaxError);

      expect(() => {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
      }).toThrow(/Unknown directive '@example'/);
    });

    it('should accept escaped @ in text', () => {
      const template = 'Contact: user\\@example.com';

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: 'TEXT',
        value: 'Contact: user@example.com',
      });
    });

    it('should accept @ followed by non-letters', () => {
      const template = 'Price: @$19.99, Code: @123';

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: 'TEXT',
        value: 'Price: @$19.99, Code: @123',
      });
    });

    it('should accept @ at end of text', () => {
      const template = 'Username: user@';

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: 'TEXT',
        value: 'Username: user@',
      });
    });

    it('should reject unknown directives', () => {
      const template = '@unknown directive here';

      expect(() => {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
      }).toThrow(APTLSyntaxError);

      expect(() => {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
      }).toThrow(/Unknown directive '@unknown'/);
    });

    it('should accept valid directives only', () => {
      const template = `@section test
Content here
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: 'SECTION',
        name: 'test',
      });
    });
  });

  describe('Complex Templates with @ Handling', () => {
    it('should handle mixed escaped and directive @', () => {
      const template = `@section contact
Email: support\\@company.com
@if hasPhone
Phone available
@end
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      const section = ast.children[0] as any;
      expect(section.type).toBe('SECTION');
      expect(section.name).toBe('contact');
      expect(section.children.length).toBeGreaterThan(0);
    });

    it('should handle sections with escaped @ in attributes', () => {
      const template = `@section email(recipient="user\\@example.com")
Message content
@end`;

      // This should work - the escape happens in the attribute value
      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      const section = ast.children[0] as any;
      expect(section.attributes.recipient).toBe('user@example.com');
    });

    it('should handle variables with @ in their values', () => {
      const template = `Contact @{email} or call us`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(3);
      expect(ast.children[0]).toMatchObject({
        type: 'TEXT',
        value: 'Contact ',
      });
      expect(ast.children[1]).toMatchObject({
        type: 'VARIABLE',
        path: 'email',
      });
      expect(ast.children[2]).toMatchObject({
        type: 'TEXT',
        value: ' or call us',
      });
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error for unescaped @ in section content', () => {
      const template = `@section info
Contact us at support@company.com
@end`;

      try {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.message).toContain('Unknown directive');
        expect(syntaxError.message).toContain('@company');
        expect(syntaxError.message).toContain('escape');
        expect(syntaxError.line).toBe(2);
      }
    });

    it('should provide helpful error for unescaped @ in conditional', () => {
      const template = `@if condition
Email: admin@site.org
@end`;

      try {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.message).toContain('Unknown directive');
        expect(syntaxError.message).toContain('@site');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle @@ correctly (not an escape)', () => {
      const template = 'User: admin@@123.com';

      // @@123 should be fine since second @ is followed by number
      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: 'TEXT',
        value: 'User: admin@@123.com',
      });
    });

    it('should reject @@ when second @ is followed by letters', () => {
      const template = 'User: admin@@domain.com';

      expect(() => {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
      }).toThrow(APTLSyntaxError);

      expect(() => {
        const tokens = tokenizer.tokenize(template);
        parser.parse(tokens);
      }).toThrow(/Unknown directive '@domain'/);
    });

    it('should handle multiple escaped @ symbols', () => {
      const template = 'Emails: user\\@test.com and admin\\@test.org';

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      expect(ast.children).toHaveLength(1);
      expect(ast.children[0]).toMatchObject({
        type: 'TEXT',
        value: 'Emails: user@test.com and admin@test.org',
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle agent prompt with contact information', () => {
      const template = `@section identity(role="system")
You are a helpful AI assistant.
For support, contact us at help\\@company.com
@end

@section instructions
@if hasUserEmail
Reply to: @{user.email}
@end
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      // Should have 2 sections plus whitespace text nodes
      const sections = ast.children.filter((c: any) => c.type === 'SECTION');
      expect(sections).toHaveLength(2);
      expect(sections[0]).toMatchObject({
        type: 'SECTION',
        name: 'identity',
      });
      expect(sections[1]).toMatchObject({
        type: 'SECTION',
        name: 'instructions',
      });
    });

    it('should handle template with code examples containing @', () => {
      const template = `@section code
Example: Use \\@section to define sections
Or use \\@if for conditionals
Decorator syntax: \\@decorator
@end`;

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);

      const section = ast.children[0] as any;
      expect(section.type).toBe('SECTION');
      // The content should have all @ symbols unescaped
      const textContent = section.children
        .filter((c: any) => c.type === 'TEXT')
        .map((c: any) => c.value)
        .join('');
      expect(textContent).toContain('@section');
      expect(textContent).toContain('@if');
      expect(textContent).toContain('@decorator');
    });
  });
});
