/**
 * Variable Resolver Tests
 * Tests for APTL variable resolution and path handling
 */

import {
  VariableResolver,
  resolveVariables,
} from '../../../src/data/variable-resolver';

describe('VariableResolver', () => {
  let resolver: VariableResolver;
  let testData: Record<string, any>;

  beforeEach(() => {
    resolver = new VariableResolver();
    testData = {
      name: 'John Doe',
      age: 30,
      user: {
        profile: {
          name: 'Jane Smith',
          preferences: {
            theme: {
              colors: {
                primary: '#007bff',
              },
            },
          },
        },
        settings: {
          notifications: true,
        },
      },
      items: [
        { name: 'Item 1', price: 10 },
        { name: 'Item 2', price: 20 },
        { name: 'Item 3', price: 30 },
      ],
      data: {
        0: { value: 'first' },
        1: { value: 'second' },
      },
      empty: '',
      zero: 0,
      false_value: false,
      null_value: null,
      undefined_value: undefined,
    };
  });

  describe('Basic Path Resolution', () => {
    it('should resolve simple property names', () => {
      expect(resolver.resolve('name', testData)).toBe('John Doe');
      expect(resolver.resolve('age', testData)).toBe(30);
    });

    it('should resolve nested object properties', () => {
      expect(resolver.resolve('user.profile.name', testData)).toBe(
        'Jane Smith',
      );
      expect(resolver.resolve('user.settings.notifications', testData)).toBe(
        true,
      );
    });

    it('should resolve deeply nested properties', () => {
      expect(
        resolver.resolve(
          'user.profile.preferences.theme.colors.primary',
          testData,
        ),
      ).toBe('#007bff');
    });

    it('should handle empty paths', () => {
      expect(resolver.resolve('', testData)).toBe('');
      expect(resolver.resolve('   ', testData)).toBe('');
    });

    it('should handle non-existent properties', () => {
      expect(resolver.resolve('nonexistent', testData)).toBe('');
      expect(resolver.resolve('user.nonexistent', testData)).toBe('');
      expect(resolver.resolve('user.profile.nonexistent.deep', testData)).toBe(
        '',
      );
    });
  });

  describe('Array Access', () => {
    it('should resolve array indices with bracket notation', () => {
      expect(resolver.resolve('items[0].name', testData)).toBe('Item 1');
      expect(resolver.resolve('items[1].price', testData)).toBe(20);
      expect(resolver.resolve('items[2].name', testData)).toBe('Item 3');
    });

    it('should handle out-of-bounds array access', () => {
      expect(resolver.resolve('items[10].name', testData)).toBe('');
      expect(resolver.resolve('items[-1].name', testData)).toBe('');
    });

    it('should handle invalid array indices', () => {
      expect(resolver.resolve('items[abc].name', testData)).toBe('');
    });
  });

  describe('Numeric Property Access', () => {
    it('should resolve numeric property names with dot notation', () => {
      expect(resolver.resolve('data.0.value', testData)).toBe('first');
      expect(resolver.resolve('data.1.value', testData)).toBe('second');
    });

    it('should handle mixed numeric and string properties', () => {
      const mixedData = {
        sections: {
          0: { title: 'Section 0' },
          '1': { title: 'Section 1' },
          named: { title: 'Named Section' },
        },
      };

      expect(resolver.resolve('sections.0.title', mixedData)).toBe('Section 0');
      expect(resolver.resolve('sections.1.title', mixedData)).toBe('Section 1');
      expect(resolver.resolve('sections.named.title', mixedData)).toBe(
        'Named Section',
      );
    });
  });

  describe('Edge Cases and Falsy Values', () => {
    it('should correctly handle falsy but defined values', () => {
      expect(resolver.resolve('empty', testData)).toBe('');
      expect(resolver.resolve('zero', testData)).toBe(0);
      expect(resolver.resolve('false_value', testData)).toBe(false);
    });

    it('should handle null values', () => {
      expect(resolver.resolve('null_value', testData)).toBe('');
    });

    it('should handle undefined values', () => {
      expect(resolver.resolve('undefined_value', testData)).toBe('');
    });

    it('should handle accessing properties on null/undefined', () => {
      expect(resolver.resolve('null_value.property', testData)).toBe('');
      expect(resolver.resolve('undefined_value.property', testData)).toBe('');
    });
  });

  describe('Configuration Options', () => {
    it('should respect allowUndefined=false option', () => {
      const strictResolver = new VariableResolver({ allowUndefined: false });

      expect(() => strictResolver.resolve('nonexistent', testData)).toThrow(
        'Undefined variable: nonexistent',
      );
    });

    it('should respect custom default values', () => {
      const customResolver = new VariableResolver({ defaultValue: 'N/A' });

      expect(customResolver.resolve('nonexistent', testData)).toBe('N/A');
      expect(customResolver.resolve('user.nonexistent', testData)).toBe('N/A');
    });

    it('should handle custom default with strict mode', () => {
      const strictCustomResolver = new VariableResolver({
        allowUndefined: false,
        defaultValue: 'N/A',
      });

      expect(() =>
        strictCustomResolver.resolve('nonexistent', testData),
      ).toThrow('Undefined variable: nonexistent');
    });
  });

  describe('Path Existence Checking', () => {
    it('should correctly identify existing paths', () => {
      expect(resolver.exists('name', testData)).toBe(true);
      expect(resolver.exists('user.profile.name', testData)).toBe(true);
      expect(resolver.exists('items[0].name', testData)).toBe(true);
      expect(resolver.exists('zero', testData)).toBe(true);
      expect(resolver.exists('false_value', testData)).toBe(true);
    });

    it('should correctly identify non-existing paths', () => {
      expect(resolver.exists('nonexistent', testData)).toBe(false);
      expect(resolver.exists('user.nonexistent', testData)).toBe(false);
      expect(resolver.exists('items[10].name', testData)).toBe(false);
      expect(resolver.exists('null_value', testData)).toBe(false);
      expect(resolver.exists('undefined_value', testData)).toBe(false);
    });

    it('should handle empty string values as existing', () => {
      expect(resolver.exists('empty', testData)).toBe(true);
    });
  });

  describe('Path Validation', () => {
    it('should validate correct paths', () => {
      expect(resolver.validatePath('name')).toEqual({ valid: true });
      expect(resolver.validatePath('user.profile.name')).toEqual({
        valid: true,
      });
      expect(resolver.validatePath('items[0].name')).toEqual({ valid: true });
      expect(resolver.validatePath('data.0.value')).toEqual({ valid: true });
    });

    it('should reject invalid paths', () => {
      expect(resolver.validatePath('').valid).toBe(false);
      expect(resolver.validatePath('   ').valid).toBe(false);
      expect(resolver.validatePath('user..name').valid).toBe(false);
      expect(resolver.validatePath('items[].name').valid).toBe(false);
      expect(resolver.validatePath('items[0.name').valid).toBe(false);
      expect(resolver.validatePath('items0].name').valid).toBe(false);
    });

    it('should provide helpful error messages', () => {
      expect(resolver.validatePath('').error).toBe('Empty path');
      expect(resolver.validatePath('user..name').error).toBe(
        'Invalid path syntax',
      );
      expect(resolver.validatePath('items[0.name').error).toBe(
        'Unclosed brackets',
      );
      expect(resolver.validatePath('items[].name').error).toBe(
        'Invalid bracket content',
      );
    });
  });

  describe('Template Path Extraction', () => {
    it('should extract variable paths from APTL templates', () => {
      const template =
        'Hello @{name}! You have @{user.messages.count} messages.';
      const paths = resolver.extractPaths(template);

      expect(paths).toEqual(['name', 'user.messages.count']);
    });

    it('should handle templates with array access', () => {
      const template =
        'First item: @{items[0].name}, Last item: @{items[2].name}';
      const paths = resolver.extractPaths(template);

      expect(paths).toEqual(['items[0].name', 'items[2].name']);
    });

    it('should deduplicate duplicate paths', () => {
      const template = "@{name} is @{name}'s name. @{name} again.";
      const paths = resolver.extractPaths(template);

      expect(paths).toEqual(['name']);
    });

    it('should handle complex templates', () => {
      const template = `
        @section identity
          You are @{agentName}, specialized in @{domain}.
          Your level is @{user.profile.level}.
        @end

        @if user.preferences.notifications
          Notifications: @{user.preferences.notifications}
        @end
      `;
      const paths = resolver.extractPaths(template);

      expect(paths).toEqual([
        'agentName',
        'domain',
        'user.profile.level',
        'user.preferences.notifications',
      ]);
    });

    it('should handle empty templates', () => {
      expect(resolver.extractPaths('')).toEqual([]);
      expect(resolver.extractPaths('No variables here')).toEqual([]);
    });

    it('should ignore malformed variable syntax', () => {
      const template = '@{valid} @{} @invalid{ @{another.valid}';
      const paths = resolver.extractPaths(template);

      expect(paths).toEqual(['valid', 'another.valid']);
    });
  });

  describe('Complex Data Structures', () => {
    it('should handle deeply nested arrays and objects', () => {
      const complexData = {
        levels: [
          {
            sublevel: {
              items: [{ data: { value: 'deep-value' } }],
            },
          },
        ],
      };

      expect(
        resolver.resolve('levels[0].sublevel.items[0].data.value', complexData),
      ).toBe('deep-value');
    });

    it('should handle mixed array and object access', () => {
      const mixedData = {
        matrix: {
          0: ['a', 'b', 'c'],
          1: { items: ['x', 'y', 'z'] },
        },
      };

      expect(resolver.resolve('matrix.0[1]', mixedData)).toBe('b');
      expect(resolver.resolve('matrix.1.items[2]', mixedData)).toBe('z');
    });
  });
});

describe('Legacy resolveVariables function', () => {
  it('should convert data to string representation', () => {
    const data = {
      name: 'John',
      age: 30,
      active: true,
      profile: { role: 'admin' },
    };

    const result = resolveVariables(data);

    expect(result).toContain('name: John');
    expect(result).toContain('age: 30');
    expect(result).toContain('active: true');
    expect(result).toContain('profile: {"role":"admin"}');
  });

  it('should handle empty data', () => {
    expect(resolveVariables({})).toBe('');
  });

  it('should handle various data types', () => {
    const data = {
      str: 'text',
      num: 42,
      bool: false,
      arr: [1, 2, 3],
      obj: { key: 'value' },
      nil: null,
    };

    const result = resolveVariables(data);

    expect(result).toContain('str: text');
    expect(result).toContain('num: 42');
    expect(result).toContain('bool: false');
    expect(result).toContain('arr: [1,2,3]');
    expect(result).toContain('obj: {"key":"value"}');
    expect(result).toContain('nil: null');
  });
});
