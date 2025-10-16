/**
 * Template Validator Unit Tests
 */

import { TemplateValidator } from '@/templates/template-validator';
import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';
import {
  NodeType,
  TemplateNode,
  SectionNode,
  ConditionalNode,
  IterationNode,
  VariableNode,
} from '@/core/types';
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

  const parseTemplate = (template: string): TemplateNode => {
    const tokens = tokenizer.tokenize(template);
    return parser.parse(tokens);
  };

  describe('validate() - AST Validation', () => {
    describe('Valid Templates', () => {
      it('should validate empty template', () => {
        const ast = parseTemplate('');
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate plain text template', () => {
        const ast = parseTemplate('Hello world');
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate template with variables', () => {
        const ast = parseTemplate('Hello @{name}!');
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate template with sections', () => {
        const template = `
@section system
You are a helpful assistant.
@end
`;
        const ast = parseTemplate(template);
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate template with section attributes', () => {
        const template = `
@section user(role="admin", status="active")
User content
@end
`;
        const ast = parseTemplate(template);
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate template with conditionals', () => {
        const template = `
@if active == true
Active user
@end
`;
        const ast = parseTemplate(template);
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate template with conditionals with elif and else', () => {
        const template = `
@if status == "active"
Active
@elif status == "pending"
Pending
@else
Inactive
@end
`;
        const ast = parseTemplate(template);
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate template with iterations', () => {
        const template = `
@each item in items
- @{item.name}
@end
`;
        const ast = parseTemplate(template);
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate template with nested structures', () => {
        const template = `
@section main
@if showList == true
@each item in items
- @{item.name}
@end
@end
@end
`;
        const ast = parseTemplate(template);
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate nested variable paths', () => {
        const ast = parseTemplate('@{user.profile.address.city}');
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid Variable Paths', () => {
      it('should detect invalid variable paths', () => {
        const validator = new TemplateValidator({ validateVariables: true });

        // Manually create AST with invalid variable path
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.VARIABLE,
              path: 'user..name', // Double dot is invalid
              line: 1,
              column: 1,
            } as VariableNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Invalid variable path');
      });

      it('should detect empty variable path', () => {
        const validator = new TemplateValidator({ validateVariables: true });

        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.VARIABLE,
              path: '',
              line: 1,
              column: 1,
            } as VariableNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Empty variable path')),
        ).toBe(true);
      });

      it('should detect variable path starting with number', () => {
        const validator = new TemplateValidator({ validateVariables: true });

        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.VARIABLE,
              path: '123invalid',
              line: 1,
              column: 1,
            } as VariableNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Invalid variable path')),
        ).toBe(true);
      });
    });

    describe('Invalid Sections', () => {
      it('should detect empty section name', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.SECTION,
              name: '',
              attributes: {},
              children: [],
              line: 1,
              column: 1,
            } as SectionNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('empty name'))).toBe(true);
      });

      it('should detect invalid section name characters', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.SECTION,
              name: 'invalid@section',
              attributes: {},
              children: [],
              line: 1,
              column: 1,
            } as SectionNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Invalid section name')),
        ).toBe(true);
      });

      it('should detect empty sections when not allowed', () => {
        const validator = new TemplateValidator({ allowEmptySections: false });

        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.SECTION,
              name: 'empty',
              attributes: {},
              children: [],
              line: 1,
              column: 1,
            } as SectionNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Empty section'))).toBe(
          true,
        );
      });

      it('should allow empty sections by default', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.SECTION,
              name: 'empty',
              attributes: {},
              children: [],
              line: 1,
              column: 1,
            } as SectionNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
      });

      it('should detect invalid attribute names', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.SECTION,
              name: 'section1',
              attributes: { 'invalid@attr': 'value' },
              children: [],
              line: 1,
              column: 1,
            } as SectionNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Invalid attribute name')),
        ).toBe(true);
      });
    });

    describe('Invalid Conditionals', () => {
      it('should detect empty condition', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.CONDITIONAL,
              condition: '',
              consequent: [],
              line: 1,
              column: 1,
            } as ConditionalNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Empty condition'))).toBe(
          true,
        );
      });

      it('should detect malformed operator usage', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.CONDITIONAL,
              condition: '== value',
              consequent: [],
              line: 1,
              column: 1,
            } as ConditionalNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Invalid condition syntax')),
        ).toBe(true);
      });
    });

    describe('Invalid Iterations', () => {
      it('should detect empty item name', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.ITERATION,
              itemName: '',
              arrayPath: 'items',
              children: [],
              line: 1,
              column: 1,
            } as IterationNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Empty item name'))).toBe(
          true,
        );
      });

      it('should detect empty array path', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.ITERATION,
              itemName: 'item',
              arrayPath: '',
              children: [],
              line: 1,
              column: 1,
            } as IterationNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Empty array path'))).toBe(
          true,
        );
      });

      it('should detect invalid item name', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.ITERATION,
              itemName: '123invalid',
              arrayPath: 'items',
              children: [],
              line: 1,
              column: 1,
            } as IterationNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('Invalid item name'))).toBe(
          true,
        );
      });

      it('should detect empty iteration block', () => {
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.ITERATION,
              itemName: 'item',
              arrayPath: 'items',
              children: [],
              line: 1,
              column: 1,
            } as IterationNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) => e.includes('Empty iteration block')),
        ).toBe(true);
      });
    });

    describe('Nesting Depth Validation', () => {
      it('should detect excessive nesting depth', () => {
        const validator = new TemplateValidator({ maxNestingDepth: 3 });

        // Create deeply nested structure
        const ast: TemplateNode = {
          type: NodeType.TEMPLATE,
          children: [
            {
              type: NodeType.SECTION,
              name: 'level1',
              attributes: {},
              children: [
                {
                  type: NodeType.SECTION,
                  name: 'level2',
                  attributes: {},
                  children: [
                    {
                      type: NodeType.SECTION,
                      name: 'level3',
                      attributes: {},
                      children: [
                        {
                          type: NodeType.SECTION,
                          name: 'level4',
                          attributes: {},
                          children: [],
                          line: 1,
                          column: 1,
                        } as SectionNode,
                      ],
                      line: 1,
                      column: 1,
                    } as SectionNode,
                  ],
                  line: 1,
                  column: 1,
                } as SectionNode,
              ],
              line: 1,
              column: 1,
            } as SectionNode,
          ],
        };

        const result = validator.validate(ast);

        expect(result.valid).toBe(false);
        expect(
          result.errors.some((e) =>
            e.includes('Maximum nesting depth exceeded'),
          ),
        ).toBe(true);
      });

      it('should allow reasonable nesting depth', () => {
        const validator = new TemplateValidator({ maxNestingDepth: 10 });

        const template = `
@section level1
  @section level2
    @section level3
      Content
    @end
  @end
@end
`;
        const ast = parseTemplate(template);
        const result = validator.validate(ast);

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateSyntax() - Raw Template Validation', () => {
    describe('Valid Syntax', () => {
      it('should validate empty template', () => {
        const result = validator.validateSyntax('');

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate plain text', () => {
        const result = validator.validateSyntax('Hello world');

        expect(result.valid).toBe(true);
      });

      it('should validate balanced directives', () => {
        const template = `
@section test
Content
@end
`;
        const result = validator.validateSyntax(template);

        expect(result.valid).toBe(true);
      });

      it('should validate multiple balanced blocks', () => {
        const template = `
@section one
Content
@end
@section two
More content
@end
`;
        const result = validator.validateSyntax(template);

        expect(result.valid).toBe(true);
      });

      it('should validate nested balanced blocks', () => {
        const template = `
@section outer
  @if condition == true
    @each item in items
      Content
    @end
  @end
@end
`;
        const result = validator.validateSyntax(template);

        expect(result.valid).toBe(true);
      });
    });

    describe('Parser-Detected Errors', () => {
      it('should detect unclosed section', () => {
        const template = `
@section test
Content without end
`;
        const result = validator.validateSyntax(template);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should detect unclosed if', () => {
        const template = `
@if condition == true
Content without end
`;
        const result = validator.validateSyntax(template);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should detect unclosed each', () => {
        const template = `
@each item in items
Content without end
`;
        const result = validator.validateSyntax(template);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should detect unclosed variable interpolation', () => {
        const result = validator.validateSyntax('Hello @{name');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should detect invalid @each syntax', () => {
        const template = `
@each item
Content
@end
`;
        const result = validator.validateSyntax(template);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Integration with Parser', () => {
      it('should validate complex valid templates', () => {
        const template = `
@section system
You are a helpful assistant.
@end

@section user
@if user.authenticated == true
Hello @{user.name}!

@each message in messages
- @{message.text}
@end
@else
Please log in.
@end
@end
`;
        const result = validator.validateSyntax(template);

        expect(result.valid).toBe(true);
      });

      it('should catch empty variable interpolation', () => {
        const result = validator.validateSyntax('Hello @{}!');

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('assertValid()', () => {
    it('should not throw for valid template', () => {
      const ast = parseTemplate('Hello @{name}!');

      expect(() => {
        validator.assertValid(ast);
      }).not.toThrow();
    });

    it('should throw APTLValidationError for invalid template', () => {
      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.SECTION,
            name: '',
            attributes: {},
            children: [],
            line: 1,
            column: 1,
          } as SectionNode,
        ],
      };

      expect(() => {
        validator.assertValid(ast);
      }).toThrow(APTLValidationError);
    });

    it('should include validation errors in exception message', () => {
      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.SECTION,
            name: '',
            attributes: {},
            children: [],
            line: 1,
            column: 1,
          } as SectionNode,
        ],
      };

      try {
        validator.assertValid(ast);
        fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(APTLValidationError);
        const error = e as APTLValidationError;
        expect(error.errors.length).toBeGreaterThan(0);
        expect(error.errors[0]).toContain('empty name');
      }
    });
  });

  describe('Validation Options', () => {
    it('should respect strict mode option', () => {
      const strictValidator = new TemplateValidator({ strict: true });
      const lenientValidator = new TemplateValidator({ strict: false });

      const ast = parseTemplate('@{name}');

      // Both should validate syntax correctly
      expect(strictValidator.validate(ast).valid).toBe(true);
      expect(lenientValidator.validate(ast).valid).toBe(true);
    });

    it('should respect allowEmptySections option', () => {
      const strictValidator = new TemplateValidator({
        allowEmptySections: false,
      });
      const lenientValidator = new TemplateValidator({
        allowEmptySections: true,
      });

      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.SECTION,
            name: 'empty',
            attributes: {},
            children: [],
            line: 1,
            column: 1,
          } as SectionNode,
        ],
      };

      expect(strictValidator.validate(ast).valid).toBe(false);
      expect(lenientValidator.validate(ast).valid).toBe(true);
    });

    it('should respect validateVariables option', () => {
      const validatingValidator = new TemplateValidator({
        validateVariables: true,
      });
      const nonValidatingValidator = new TemplateValidator({
        validateVariables: false,
      });

      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.VARIABLE,
            path: '123invalid',
            line: 1,
            column: 1,
          } as VariableNode,
        ],
      };

      expect(validatingValidator.validate(ast).valid).toBe(false);
      expect(nonValidatingValidator.validate(ast).valid).toBe(true);
    });

    it('should respect maxNestingDepth option', () => {
      const shallowValidator = new TemplateValidator({ maxNestingDepth: 2 });
      const deepValidator = new TemplateValidator({ maxNestingDepth: 10 });

      const ast: TemplateNode = {
        type: NodeType.TEMPLATE,
        children: [
          {
            type: NodeType.SECTION,
            name: 'level1',
            attributes: {},
            children: [
              {
                type: NodeType.SECTION,
                name: 'level2',
                attributes: {},
                children: [
                  {
                    type: NodeType.SECTION,
                    name: 'level3',
                    attributes: {},
                    children: [],
                    line: 1,
                    column: 1,
                  } as SectionNode,
                ],
                line: 1,
                column: 1,
              } as SectionNode,
            ],
            line: 1,
            column: 1,
          } as SectionNode,
        ],
      };

      expect(shallowValidator.validate(ast).valid).toBe(false);
      expect(deepValidator.validate(ast).valid).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle templates with only whitespace', () => {
      const result = validator.validateSyntax('   \n\n   ');

      expect(result.valid).toBe(true);
    });

    it('should handle templates with comments', () => {
      const template = `
// This is a comment
@section test
Content
@end
`;
      const result = validator.validateSyntax(template);

      expect(result.valid).toBe(true);
    });

    it('should handle Windows line endings', () => {
      const template = '@section test\r\nContent\r\n@end';
      const result = validator.validateSyntax(template);

      expect(result.valid).toBe(true);
    });

    it('should handle mixed line endings', () => {
      const template = '@section test\nContent\r\n@end';
      const result = validator.validateSyntax(template);

      expect(result.valid).toBe(true);
    });
  });
});
