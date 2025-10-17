/**
 * Tests for @if directive with @elif/@else support
 */

import { IfDirective } from '@/directives/if-directive';
import { DirectiveContext } from '@/directives/types';
import { DirectiveNode, NodeType, TextNode, VariableNode } from '@/core/types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';

describe('If Directive', () => {
  const directive = new IfDirective();

  describe('parseArguments', () => {
    it('should parse simple condition', () => {
      const result = directive.parseArguments('isActive');
      expect(result).toEqual({
        condition: 'isActive',
      });
    });

    it('should parse comparison condition', () => {
      const result = directive.parseArguments('count > 5');
      expect(result).toEqual({
        condition: 'count > 5',
      });
    });

    it('should parse logical AND condition', () => {
      const result = directive.parseArguments('isActive and hasPermission');
      expect(result).toEqual({
        condition: 'isActive and hasPermission',
      });
    });

    it('should parse logical OR condition', () => {
      const result = directive.parseArguments('isAdmin or isOwner');
      expect(result).toEqual({
        condition: 'isAdmin or isOwner',
      });
    });

    it('should parse negation condition', () => {
      const result = directive.parseArguments('not isDeleted');
      expect(result).toEqual({
        condition: 'not isDeleted',
      });
    });

    it('should trim whitespace', () => {
      const result = directive.parseArguments('  isActive  ');
      expect(result).toEqual({
        condition: 'isActive',
      });
    });

    it('should parse complex nested condition with parentheses', () => {
      const result = directive.parseArguments('(a and b) or (c and d)');
      expect(result).toEqual({
        condition: '(a and b) or (c and d)',
      });
    });

    it('should throw on unbalanced parentheses', () => {
      expect(() => directive.parseArguments('(a and b')).toThrow(
        APTLSyntaxError,
      );
      expect(() => directive.parseArguments('a and b)')).toThrow(
        APTLSyntaxError,
      );
    });
  });

  describe('validate', () => {
    it('should validate correct if directive', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'if',
        rawArgs: 'isActive',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).not.toThrow();
    });

    it('should throw if no condition provided', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'if',
        rawArgs: '',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).toThrow(APTLSyntaxError);
      expect(() => directive.validate(node)).toThrow(
        'requires a condition argument',
      );
    });

    it('should throw if condition is only whitespace', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'if',
        rawArgs: '   ',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).toThrow(APTLSyntaxError);
    });

    it('should throw on unbalanced parentheses', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'if',
        rawArgs: '(value and other',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).toThrow(APTLSyntaxError);
      expect(() => directive.validate(node)).toThrow(
        'Invalid condition in @if directive',
      );
    });
  });

  describe('execute', () => {
    function createMockContext(
      node: DirectiveNode,
      data: Record<string, any> = {},
    ): DirectiveContext {
      const metadata = new Map<string, any>();

      return {
        node,
        data,
        scope: [],
        helpers: {},
        metadata,
        renderTemplate: (
          template: string,
          contextData?: Record<string, any>,
        ) => {
          const childrenToRender =
            metadata.get('childrenToRender') || node.children;
          const renderData = contextData || data;

          return childrenToRender
            .map((child: any) => {
              if (child.type === NodeType.TEXT) {
                return child.value;
              } else if (child.type === NodeType.VARIABLE) {
                const path = child.path;
                const value = path
                  .split('.')
                  .reduce((obj: any, key: string) => obj?.[key], renderData);
                return value != null ? String(value) : '';
              }
              return '';
            })
            .join('');
        },
      };
    }

    function createTextNode(value: string): TextNode {
      return {
        type: NodeType.TEXT,
        value,
        line: 1,
        column: 1,
      };
    }

    function createVariableNode(path: string): VariableNode {
      return {
        type: NodeType.VARIABLE,
        path,
        line: 1,
        column: 1,
      };
    }

    describe('basic @if conditions', () => {
      it('should render content when condition is true', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isActive',
          children: [createTextNode('Content is visible')],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { isActive: true });
        const result = directive.execute(context);

        expect(result).toBe('Content is visible');
      });

      it('should not render content when condition is false', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isActive',
          children: [createTextNode('Should not see this')],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { isActive: false });
        const result = directive.execute(context);

        expect(result).toBe('');
      });

      it('should render with variables in content', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'show',
          children: [
            createTextNode('Hello, '),
            createVariableNode('name'),
            createTextNode('!'),
          ],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { show: true, name: 'Alice' });
        const result = directive.execute(context);

        expect(result).toBe('Hello, Alice!');
      });

      it('should handle truthiness of various values', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'value',
          children: [createTextNode('Truthy')],
          line: 1,
          column: 1,
        };

        // Test truthy values
        expect(
          directive.execute(createMockContext(node, { value: true })),
        ).toBe('Truthy');
        expect(directive.execute(createMockContext(node, { value: 1 }))).toBe(
          'Truthy',
        );
        expect(
          directive.execute(createMockContext(node, { value: 'text' })),
        ).toBe('Truthy');
        expect(
          directive.execute(createMockContext(node, { value: [1, 2] })),
        ).toBe('Truthy');
        expect(
          directive.execute(createMockContext(node, { value: { a: 1 } })),
        ).toBe('Truthy');

        // Test falsy values
        expect(
          directive.execute(createMockContext(node, { value: false })),
        ).toBe('');
        expect(directive.execute(createMockContext(node, { value: 0 }))).toBe(
          '',
        );
        expect(directive.execute(createMockContext(node, { value: '' }))).toBe(
          '',
        );
        expect(directive.execute(createMockContext(node, { value: [] }))).toBe(
          '',
        );
        expect(
          directive.execute(createMockContext(node, { value: null })),
        ).toBe('');
        expect(
          directive.execute(createMockContext(node, { value: undefined })),
        ).toBe('');
      });
    });

    describe('@if with comparisons', () => {
      it('should handle equality comparison', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'status == "active"',
          children: [createTextNode('Active')],
          line: 1,
          column: 1,
        };

        expect(
          directive.execute(createMockContext(node, { status: 'active' })),
        ).toBe('Active');
        expect(
          directive.execute(createMockContext(node, { status: 'inactive' })),
        ).toBe('');
      });

      it('should handle inequality comparison', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'status != "inactive"',
          children: [createTextNode('Not inactive')],
          line: 1,
          column: 1,
        };

        expect(
          directive.execute(createMockContext(node, { status: 'active' })),
        ).toBe('Not inactive');
        expect(
          directive.execute(createMockContext(node, { status: 'inactive' })),
        ).toBe('');
      });

      it('should handle greater than comparison', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'count > 5',
          children: [createTextNode('More than 5')],
          line: 1,
          column: 1,
        };

        expect(directive.execute(createMockContext(node, { count: 10 }))).toBe(
          'More than 5',
        );
        expect(directive.execute(createMockContext(node, { count: 3 }))).toBe(
          '',
        );
      });

      it('should handle less than comparison', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'count < 5',
          children: [createTextNode('Less than 5')],
          line: 1,
          column: 1,
        };

        expect(directive.execute(createMockContext(node, { count: 3 }))).toBe(
          'Less than 5',
        );
        expect(directive.execute(createMockContext(node, { count: 10 }))).toBe(
          '',
        );
      });

      it('should handle greater than or equal comparison', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'count >= 5',
          children: [createTextNode('Five or more')],
          line: 1,
          column: 1,
        };

        expect(directive.execute(createMockContext(node, { count: 5 }))).toBe(
          'Five or more',
        );
        expect(directive.execute(createMockContext(node, { count: 6 }))).toBe(
          'Five or more',
        );
        expect(directive.execute(createMockContext(node, { count: 4 }))).toBe(
          '',
        );
      });

      it('should handle less than or equal comparison', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'count <= 5',
          children: [createTextNode('Five or less')],
          line: 1,
          column: 1,
        };

        expect(directive.execute(createMockContext(node, { count: 5 }))).toBe(
          'Five or less',
        );
        expect(directive.execute(createMockContext(node, { count: 4 }))).toBe(
          'Five or less',
        );
        expect(directive.execute(createMockContext(node, { count: 6 }))).toBe(
          '',
        );
      });
    });

    describe('@if with logical operators', () => {
      it('should handle AND operator', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isActive and hasPermission',
          children: [createTextNode('Allowed')],
          line: 1,
          column: 1,
        };

        expect(
          directive.execute(
            createMockContext(node, { isActive: true, hasPermission: true }),
          ),
        ).toBe('Allowed');
        expect(
          directive.execute(
            createMockContext(node, { isActive: true, hasPermission: false }),
          ),
        ).toBe('');
        expect(
          directive.execute(
            createMockContext(node, { isActive: false, hasPermission: true }),
          ),
        ).toBe('');
      });

      it('should handle OR operator', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isAdmin or isOwner',
          children: [createTextNode('Access granted')],
          line: 1,
          column: 1,
        };

        expect(
          directive.execute(
            createMockContext(node, { isAdmin: true, isOwner: false }),
          ),
        ).toBe('Access granted');
        expect(
          directive.execute(
            createMockContext(node, { isAdmin: false, isOwner: true }),
          ),
        ).toBe('Access granted');
        expect(
          directive.execute(
            createMockContext(node, { isAdmin: false, isOwner: false }),
          ),
        ).toBe('');
      });

      it('should handle NOT operator', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'not isDeleted',
          children: [createTextNode('Visible')],
          line: 1,
          column: 1,
        };

        expect(
          directive.execute(createMockContext(node, { isDeleted: false })),
        ).toBe('Visible');
        expect(
          directive.execute(createMockContext(node, { isDeleted: true })),
        ).toBe('');
      });

      it('should handle complex logical expressions', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isActive and (isAdmin or isOwner)',
          children: [createTextNode('Full access')],
          line: 1,
          column: 1,
        };

        expect(
          directive.execute(
            createMockContext(node, {
              isActive: true,
              isAdmin: true,
              isOwner: false,
            }),
          ),
        ).toBe('Full access');
        expect(
          directive.execute(
            createMockContext(node, {
              isActive: true,
              isAdmin: false,
              isOwner: true,
            }),
          ),
        ).toBe('Full access');
        expect(
          directive.execute(
            createMockContext(node, {
              isActive: false,
              isAdmin: true,
              isOwner: false,
            }),
          ),
        ).toBe('');
      });
    });

    describe('@elif branches', () => {
      it('should render @elif when @if is false and @elif is true', () => {
        const elifNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'status == "published"',
          children: [createTextNode('Published')],
          line: 2,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'status == "draft"',
          children: [createTextNode('Draft'), elifNode],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { status: 'published' });
        const result = directive.execute(context);

        expect(result).toBe('Published');
      });

      it('should render @if when both @if and @elif are true', () => {
        const elifNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'value > 3',
          children: [createTextNode('Greater than 3')],
          line: 2,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'value > 5',
          children: [createTextNode('Greater than 5'), elifNode],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { value: 10 });
        const result = directive.execute(context);

        expect(result).toBe('Greater than 5');
      });

      it('should handle multiple @elif clauses', () => {
        const elif1: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'grade >= 80',
          children: [createTextNode('B')],
          line: 2,
          column: 1,
        };

        const elif2: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'grade >= 70',
          children: [createTextNode('C')],
          line: 3,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'grade >= 90',
          children: [createTextNode('A'), elif1, elif2],
          line: 1,
          column: 1,
        };

        expect(directive.execute(createMockContext(node, { grade: 95 }))).toBe(
          'A',
        );
        expect(directive.execute(createMockContext(node, { grade: 85 }))).toBe(
          'B',
        );
        expect(directive.execute(createMockContext(node, { grade: 75 }))).toBe(
          'C',
        );
      });

      it('should not render anything when all conditions are false', () => {
        const elifNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'value > 10',
          children: [createTextNode('Greater than 10')],
          line: 2,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'value > 20',
          children: [createTextNode('Greater than 20'), elifNode],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { value: 5 });
        const result = directive.execute(context);

        expect(result).toBe('');
      });
    });

    describe('@else branch', () => {
      it('should render @else when @if is false', () => {
        const elseNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'else',
          rawArgs: '',
          children: [createTextNode('Else content')],
          line: 2,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isActive',
          children: [createTextNode('If content'), elseNode],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { isActive: false });
        const result = directive.execute(context);

        expect(result).toBe('Else content');
      });

      it('should not render @else when @if is true', () => {
        const elseNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'else',
          rawArgs: '',
          children: [createTextNode('Else content')],
          line: 2,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isActive',
          children: [createTextNode('If content'), elseNode],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { isActive: true });
        const result = directive.execute(context);

        expect(result).toBe('If content');
      });

      it('should render @else when @if and @elif are both false', () => {
        const elifNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'status == "published"',
          children: [createTextNode('Published')],
          line: 2,
          column: 1,
        };

        const elseNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'else',
          rawArgs: '',
          children: [createTextNode('Unknown')],
          line: 3,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'status == "draft"',
          children: [createTextNode('Draft'), elifNode, elseNode],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { status: 'archived' });
        const result = directive.execute(context);

        expect(result).toBe('Unknown');
      });

      it('should render @else with variables', () => {
        const elseNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'else',
          rawArgs: '',
          children: [
            createTextNode('Default: '),
            createVariableNode('defaultValue'),
          ],
          line: 2,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'hasValue',
          children: [createVariableNode('value'), elseNode],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, {
          hasValue: false,
          defaultValue: 'N/A',
        });
        const result = directive.execute(context);

        expect(result).toBe('Default: N/A');
      });
    });

    describe('complex @if/@elif/@else combinations', () => {
      it('should handle full if/elif/else chain correctly', () => {
        const elif1: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'grade >= 80',
          children: [createTextNode('B')],
          line: 2,
          column: 1,
        };

        const elif2: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'grade >= 70',
          children: [createTextNode('C')],
          line: 3,
          column: 1,
        };

        const elif3: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'elif',
          rawArgs: 'grade >= 60',
          children: [createTextNode('D')],
          line: 4,
          column: 1,
        };

        const elseNode: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'else',
          rawArgs: '',
          children: [createTextNode('F')],
          line: 5,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'grade >= 90',
          children: [createTextNode('A'), elif1, elif2, elif3, elseNode],
          line: 1,
          column: 1,
        };

        expect(directive.execute(createMockContext(node, { grade: 95 }))).toBe(
          'A',
        );
        expect(directive.execute(createMockContext(node, { grade: 85 }))).toBe(
          'B',
        );
        expect(directive.execute(createMockContext(node, { grade: 75 }))).toBe(
          'C',
        );
        expect(directive.execute(createMockContext(node, { grade: 65 }))).toBe(
          'D',
        );
        expect(directive.execute(createMockContext(node, { grade: 50 }))).toBe(
          'F',
        );
      });
    });

    describe('error handling', () => {
      it('should throw if renderTemplate is not available', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isActive',
          children: [createTextNode('Content')],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, { isActive: true });
        delete context.renderTemplate;

        expect(() => directive.execute(context)).toThrow(APTLRuntimeError);
        expect(() => directive.execute(context)).toThrow(
          'requires renderTemplate',
        );
      });

      it('should handle evaluation errors in non-strict mode', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'nonexistent.deeply.nested.path',
          children: [createTextNode('Should not see this')],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, {});
        const result = directive.execute(context);

        // In non-strict mode, should treat as falsy and return empty string
        expect(result).toBe('');
      });

      it('should handle undefined variable access in non-strict mode', () => {
        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'undefinedVar',
          children: [createTextNode('Content')],
          line: 1,
          column: 1,
        };

        const context = createMockContext(node, {});
        // In non-strict mode, undefined variables are treated as falsy
        const result = directive.execute(context);
        expect(result).toBe('');
      });
    });

    describe('nested @if directives', () => {
      it('should handle nested if inside if branch', () => {
        const innerIf: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isAdmin',
          children: [createTextNode('Admin')],
          line: 2,
          column: 1,
        };

        const node: DirectiveNode = {
          type: NodeType.DIRECTIVE,
          name: 'if',
          rawArgs: 'isLoggedIn',
          children: [createTextNode('Welcome! '), innerIf],
          line: 1,
          column: 1,
        };

        // Both conditions true
        const context1 = createMockContext(node, {
          isLoggedIn: true,
          isAdmin: true,
        });
        // Need to handle nested directive execution
        context1.renderTemplate = (template: string, data?: any) => {
          const childrenToRender =
            context1.metadata.get('childrenToRender') || node.children;
          return childrenToRender
            .map((child: any) => {
              if (child.type === NodeType.TEXT) {
                return child.value;
              } else if (child.type === NodeType.DIRECTIVE) {
                // For nested if, we need to execute it
                const nestedContext = createMockContext(child, data || {});
                return directive.execute(nestedContext);
              }
              return '';
            })
            .join('');
        };
        expect(directive.execute(context1)).toBe('Welcome! Admin');

        // Only outer condition true
        const context2 = createMockContext(node, {
          isLoggedIn: true,
          isAdmin: false,
        });
        context2.renderTemplate = context1.renderTemplate;
        expect(directive.execute(context2)).toBe('Welcome! ');
      });
    });
  });

  describe('getConditionalKeywords', () => {
    it('should return elif and else as conditional keywords', () => {
      const keywords = directive.getConditionalKeywords();
      expect(keywords).toEqual(['elif', 'else']);
    });
  });

  describe('hasBody property', () => {
    it('should have hasBody set to true', () => {
      expect(directive.hasBody).toBe(true);
    });
  });

  describe('name property', () => {
    it('should have name set to "if"', () => {
      expect(directive.name).toBe('if');
    });
  });
});
