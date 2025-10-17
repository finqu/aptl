/**
 * Tests for @each directive with @else support
 */

import { EachDirective } from '@/directives/each-directive-class';
import { DirectiveContext } from '@/directives/types';
import { DirectiveNode, NodeType, TextNode, VariableNode } from '@/core/types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';

describe('Each Directive', () => {
  describe('parseArguments', () => {
    const directive = new EachDirective();

    it('should parse simple iteration syntax', () => {
      const result = directive.parseArguments('item in items');
      expect(result).toEqual({
        itemName: 'item',
        arrayPath: 'items',
      });
    });

    it('should parse iteration with index variable', () => {
      const result = directive.parseArguments('item, index in items');
      expect(result).toEqual({
        itemName: 'item',
        indexName: 'index',
        arrayPath: 'items',
      });
    });

    it('should parse iteration with nested path', () => {
      const result = directive.parseArguments('user in company.users');
      expect(result).toEqual({
        itemName: 'user',
        arrayPath: 'company.users',
      });
    });

    it('should trim whitespace', () => {
      const result = directive.parseArguments('  item   in   items  ');
      expect(result).toEqual({
        itemName: 'item',
        arrayPath: 'items',
      });
    });

    it('should throw on empty syntax', () => {
      expect(() => directive.parseArguments('')).toThrow(APTLSyntaxError);
    });

    it('should throw on missing "in" keyword', () => {
      expect(() => directive.parseArguments('item items')).toThrow(
        APTLSyntaxError,
      );
      expect(() => directive.parseArguments('item items')).toThrow(
        /missing 'in' keyword/i,
      );
    });

    it('should throw on missing item name', () => {
      expect(() => directive.parseArguments('in items')).toThrow(
        APTLSyntaxError,
      );
    });

    it('should throw on missing array path', () => {
      expect(() => directive.parseArguments('item in')).toThrow(
        APTLSyntaxError,
      );
    });
  });

  describe('validate', () => {
    const directive = new EachDirective();

    it('should validate correct each directive', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).not.toThrow();
    });

    it('should throw if no arguments provided', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: '',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).toThrow(APTLSyntaxError);
      expect(() => directive.validate(node)).toThrow(
        'requires iteration syntax',
      );
    });

    it('should throw if arguments are only whitespace', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: '   ',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).toThrow(APTLSyntaxError);
    });

    it('should throw on invalid iteration syntax', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'invalid syntax',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).toThrow(APTLSyntaxError);
      expect(() => directive.validate(node)).toThrow(
        'Invalid iteration syntax',
      );
    });
  });

  describe('execute', () => {
    const directive = new EachDirective();

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
                // Simple variable resolution for testing
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

    it('should iterate over array and render content for each item', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [
          createTextNode('- '),
          createVariableNode('item'),
          createTextNode('\n'),
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, {
        items: ['apple', 'banana', 'cherry'],
      });
      const result = directive.execute(context);

      expect(result).toBe('- apple\n- banana\n- cherry\n');
    });

    it('should provide loop metadata', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [
          createVariableNode('loop.index'),
          createTextNode(':'),
          createVariableNode('item'),
          createTextNode(' '),
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: ['a', 'b', 'c'] });
      const result = directive.execute(context);

      expect(result).toBe('0:a 1:b 2:c ');
    });

    it('should provide loop.first and loop.last flags', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [
          createVariableNode('item'),
          createTextNode(':'),
          createVariableNode('loop.first'),
          createTextNode(','),
          createVariableNode('loop.last'),
          createTextNode(' '),
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: ['a', 'b', 'c'] });
      const result = directive.execute(context);

      expect(result).toBe('a:true,false b:false,false c:false,true ');
    });

    it('should provide loop.even and loop.odd flags', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [
          createVariableNode('loop.index'),
          createTextNode(':even='),
          createVariableNode('loop.even'),
          createTextNode(',odd='),
          createVariableNode('loop.odd'),
          createTextNode(' '),
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: ['a', 'b', 'c'] });
      const result = directive.execute(context);

      expect(result).toBe(
        '0:even=true,odd=false 1:even=false,odd=true 2:even=true,odd=false ',
      );
    });

    it('should provide loop.length', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [
          createVariableNode('loop.index'),
          createTextNode('/'),
          createVariableNode('loop.length'),
          createTextNode(' '),
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: ['a', 'b', 'c'] });
      const result = directive.execute(context);

      expect(result).toBe('0/3 1/3 2/3 ');
    });

    it('should support custom index variable name', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item, idx in items',
        children: [
          createVariableNode('idx'),
          createTextNode(':'),
          createVariableNode('item'),
          createTextNode(' '),
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: ['x', 'y', 'z'] });
      const result = directive.execute(context);

      expect(result).toBe('0:x 1:y 2:z ');
    });

    it('should iterate over array of objects', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'user in users',
        children: [
          createVariableNode('user.name'),
          createTextNode(' ('),
          createVariableNode('user.age'),
          createTextNode(') '),
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, {
        users: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ],
      });
      const result = directive.execute(context);

      expect(result).toBe('Alice (30) Bob (25) ');
    });

    it('should render nothing for empty array', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [createTextNode('Should not see this')],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: [] });
      const result = directive.execute(context);

      expect(result).toBe('');
    });

    it('should render nothing when array does not exist', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in nonexistent',
        children: [createTextNode('Should not see this')],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, {});
      const result = directive.execute(context);

      expect(result).toBe('');
    });

    it('should render nothing when value is not an array', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in notAnArray',
        children: [createTextNode('Should not see this')],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { notAnArray: 'string' });
      const result = directive.execute(context);

      expect(result).toBe('');
    });

    it('should iterate over nested array path', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'product in company.products',
        children: [createVariableNode('product'), createTextNode(' ')],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, {
        company: {
          products: ['Widget', 'Gadget', 'Gizmo'],
        },
      });
      const result = directive.execute(context);

      expect(result).toBe('Widget Gadget Gizmo ');
    });

    it('should throw if renderTemplate is not available', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [createTextNode('Content')],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: ['a'] });
      delete context.renderTemplate;

      expect(() => directive.execute(context)).toThrow(APTLRuntimeError);
      expect(() => directive.execute(context)).toThrow(
        'requires renderTemplate',
      );
    });
  });

  describe('@else branch', () => {
    const directive = new EachDirective();

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

    it('should render else branch when array is empty', () => {
      const elseNode: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'else',
        rawArgs: '',
        children: [createTextNode('No items found')],
        line: 2,
        column: 1,
      };

      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [
          createTextNode('- '),
          createVariableNode('item'),
          createTextNode('\n'),
          elseNode,
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: [] });
      const result = directive.execute(context);

      expect(result).toBe('No items found');
    });

    it('should render else branch when array does not exist', () => {
      const elseNode: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'else',
        rawArgs: '',
        children: [createTextNode('No items')],
        line: 2,
        column: 1,
      };

      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in nonexistent',
        children: [
          createTextNode('Item: '),
          createVariableNode('item'),
          elseNode,
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, {});
      const result = directive.execute(context);

      expect(result).toBe('No items');
    });

    it('should render else branch when value is not an array', () => {
      const elseNode: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'else',
        rawArgs: '',
        children: [createTextNode('Not an array')],
        line: 2,
        column: 1,
      };

      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in notArray',
        children: [createTextNode('Item'), elseNode],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { notArray: 'string' });
      const result = directive.execute(context);

      expect(result).toBe('Not an array');
    });

    it('should not render else branch when array has items', () => {
      const elseNode: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'else',
        rawArgs: '',
        children: [createTextNode('No items')],
        line: 2,
        column: 1,
      };

      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [createVariableNode('item'), createTextNode(' '), elseNode],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, { items: ['a', 'b'] });
      const result = directive.execute(context);

      expect(result).toBe('a b ');
    });

    it('should render else branch with complex content', () => {
      const elseNode: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'else',
        rawArgs: '',
        children: [
          createTextNode('No '),
          createVariableNode('itemType'),
          createTextNode(' available'),
        ],
        line: 2,
        column: 1,
      };

      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in items',
        children: [createVariableNode('item'), elseNode],
        line: 1,
        column: 1,
      };

      const context = createMockContext(node, {
        items: [],
        itemType: 'products',
      });
      const result = directive.execute(context);

      expect(result).toBe('No products available');
    });
  });

  describe('nested each directives', () => {
    const directive = new EachDirective();

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
              } else if (
                child.type === NodeType.DIRECTIVE &&
                child.name === 'each'
              ) {
                // Recursively handle nested each
                const nestedContext = createMockContext(child, renderData);
                return directive.execute(nestedContext);
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

    it('should handle nested each directives', () => {
      const innerEach: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'item in category.items',
        children: [
          createTextNode('    '),
          createVariableNode('item'),
          createTextNode('\n'),
        ],
        line: 2,
        column: 1,
      };

      const outerEach: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'each',
        rawArgs: 'category in categories',
        children: [
          createVariableNode('category.name'),
          createTextNode(':\n'),
          innerEach,
        ],
        line: 1,
        column: 1,
      };

      const context = createMockContext(outerEach, {
        categories: [
          { name: 'Fruits', items: ['Apple', 'Banana'] },
          { name: 'Veggies', items: ['Carrot'] },
        ],
      });

      const result = directive.execute(context);

      expect(result).toBe(
        'Fruits:\n    Apple\n    Banana\nVeggies:\n    Carrot\n',
      );
    });
  });

  describe('getConditionalKeywords', () => {
    const directive = new EachDirective();

    it('should return else as conditional keyword', () => {
      const keywords = directive.getConditionalKeywords();
      expect(keywords).toEqual(['else']);
    });
  });
});
