/**
 * Template Validator Tests
 * Tests for template validation (structure, nesting, variable paths)
 * Note: Syntax validation is primarily tested through tokenizer/parser tests
 */

import { TemplateValidator } from '@/templates/template-validator';
import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';
import { NodeType, TemplateNode } from '@/core/types';
import { APTLValidationError } from '@/utils/errors';

describe('TemplateValidator', () => {
  let validator: TemplateValidator;
  let parser: Parser;
  let tokenizer: Tokenizer;

  beforeEach(() => {
    validator = new TemplateValidator();
    parser = new Parser();
    tokenizer = new Tokenizer();
  });

  // Helper to parse a template
  const parseTemplate = (template: string): TemplateNode => {
    const tokens = tokenizer.tokenize(template);
    return parser.parse(tokens);
  };

  describe('Syntax Validation', () => {
    it('should validate valid templates', () => {
      const result = validator.validateSyntax('Hello @{name}!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect syntax errors', () => {
      const result = validator.validateSyntax('Hello @{unclosed');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate templates with multiple variables', () => {
      const result = validator.validateSyntax(
        'Hello @{name}, you are @{age} years old.',
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate templates with comments', () => {
      const result = validator.validateSyntax(`
        // This is a comment
        Hello @{name}!
      `);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('AST Validation', () => {
    it('should validate simple AST', () => {
      const ast = parseTemplate('Hello World!');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate AST with variables', () => {
      const ast = parseTemplate('Hello @{user.name}!');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate AST with nested property access', () => {
      const ast = parseTemplate('@{user.profile.settings.theme}');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate AST with array access', () => {
      const ast = parseTemplate('@{items[0].name}');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Nesting Depth Validation', () => {
    it('should accept normal nesting depth', () => {
      // Create a simple nested structure (not too deep)
      const ast = parseTemplate(`
        @{level1}
        @{level2}
        @{level3}
      `);
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    it('should reject excessive nesting depth', () => {
      const shallowValidator = new TemplateValidator({ maxNestingDepth: 3 });

      // Create a deeply nested AST manually
      const createDeepAST = (depth: number): TemplateNode => {
        let current: any = {
          type: NodeType.TEXT,
          value: 'deep',
          line: 1,
          column: 1,
        };

        for (let i = 0; i < depth; i++) {
          current = {
            type: NodeType.TEMPLATE,
            children: [current],
            line: 1,
            column: 1,
          };
        }

        return current as TemplateNode;
      };

      const deepAST = createDeepAST(5);
      const result = shallowValidator.validate(deepAST);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Maximum nesting depth exceeded (3)');
    });

    it('should allow configurable nesting depth', () => {
      const deepValidator = new TemplateValidator({ maxNestingDepth: 100 });
      const ast = parseTemplate('@{a.b.c.d.e.f.g.h}');
      const result = deepValidator.validate(ast);
      expect(result.valid).toBe(true);
    });
  });

  describe('Variable Path Validation', () => {
    it('should accept valid variable paths', () => {
      const validPaths = [
        '@{name}',
        '@{user.name}',
        '@{user.profile.email}',
        '@{items[0]}',
        '@{items[0].name}',
        '@{data.items[5].value}',
        '@{_private}',
        '@{value123}',
      ];

      for (const template of validPaths) {
        const ast = parseTemplate(template);
        const result = validator.validate(ast);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject invalid variable paths', () => {
      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.VARIABLE,
            path: '123invalid', // starts with number
            line: 1,
            column: 1,
          } as any,
        ],
        line: 1,
        column: 1,
      };

      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid variable path');
    });

    it('should reject empty variable paths', () => {
      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.VARIABLE,
            path: '',
            line: 1,
            column: 5,
          } as any,
        ],
        line: 1,
        column: 1,
      };

      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Empty variable path at line 1, column 5',
      );
    });

    it('should skip variable validation when disabled', () => {
      const noVarValidator = new TemplateValidator({
        validateVariables: false,
      });

      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.VARIABLE,
            path: '!!!invalid!!!',
            line: 1,
            column: 1,
          } as any,
        ],
        line: 1,
        column: 1,
      };

      const result = noVarValidator.validate(ast);
      expect(result.valid).toBe(true); // Should pass when validation is disabled
    });
  });

  describe('assertValid', () => {
    it('should not throw for valid templates', () => {
      const ast = parseTemplate('Hello @{name}!');
      expect(() => validator.assertValid(ast)).not.toThrow();
    });

    it('should throw APTLValidationError for invalid templates', () => {
      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.VARIABLE,
            path: '',
            line: 1,
            column: 1,
          } as any,
        ],
        line: 1,
        column: 1,
      };

      expect(() => validator.assertValid(ast)).toThrow(APTLValidationError);
      expect(() => validator.assertValid(ast)).toThrow(
        'Template validation failed',
      );
    });

    it('should include validation errors in thrown exception', () => {
      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.VARIABLE,
            path: '',
            line: 1,
            column: 1,
          } as any,
        ],
        line: 1,
        column: 1,
      };

      try {
        validator.assertValid(ast);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLValidationError);
        if (error instanceof APTLValidationError) {
          expect(error.errors.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should validate complex templates', () => {
      const template = `
        Hello @{user.name}!

        Your email is @{user.email}.
        You have @{notifications.count} notifications.
      `;

      const result = validator.validateSyntax(template);
      expect(result.valid).toBe(true);
    });

    it('should validate templates with array access', () => {
      const template = `
        First item: @{items[0].name}
        Second item: @{items[1].name}
      `;

      const result = validator.validateSyntax(template);
      expect(result.valid).toBe(true);
    });

    it('should detect multiple errors', () => {
      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.VARIABLE,
            path: '',
            line: 1,
            column: 1,
          } as any,
          {
            type: NodeType.VARIABLE,
            path: '123invalid',
            line: 2,
            column: 1,
          } as any,
        ],
        line: 1,
        column: 1,
      };

      const result = validator.validate(ast);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1); // Multiple errors detected
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty templates', () => {
      const ast = parseTemplate('');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    it('should handle whitespace-only templates', () => {
      const ast = parseTemplate('   \n\n   ');
      const result = validator.validate(ast);
      expect(result.valid).toBe(true);
    });

    it('should handle templates with only comments', () => {
      const result = validator.validateSyntax(`
        // Comment 1
        // Comment 2
      `);
      expect(result.valid).toBe(true);
    });
  });
});
