/**
 * Test loop variable support via compiler integration
 */

import { VariableResolver } from '../../../src/data/variable-resolver';

describe('Variable Resolver - Loop Variables', () => {
  let resolver: VariableResolver;

  beforeEach(() => {
    resolver = new VariableResolver();
  });

  test('should resolve loop metadata variables when loop context is present', () => {
    const context = {
      item: 'test-item',
      loop: {
        index: 0,
        first: true,
        last: false,
        even: true,
        odd: false,
        length: 3,
      },
    };

    expect(resolver.resolve('loop.index', context)).toBe(0);
    expect(resolver.resolve('loop.first', context)).toBe(true);
    expect(resolver.resolve('loop.last', context)).toBe(false);
    expect(resolver.resolve('loop.even', context)).toBe(true);
    expect(resolver.resolve('loop.odd', context)).toBe(false);
    expect(resolver.resolve('loop.length', context)).toBe(3);
  });

  test('should check existence of loop variables', () => {
    const context = {
      item: 'test-item',
      loop: {
        index: 0,
        first: true,
        last: false,
        even: true,
        odd: false,
        length: 3,
      },
    };

    expect(resolver.exists('loop.index', context)).toBe(true);
    expect(resolver.exists('loop.first', context)).toBe(true);
    expect(resolver.exists('loop.last', context)).toBe(true);
    expect(resolver.exists('loop.even', context)).toBe(true);
    expect(resolver.exists('loop.odd', context)).toBe(true);
    expect(resolver.exists('loop.length', context)).toBe(true);
    expect(resolver.exists('loop.unknown', context)).toBe(false);
  });

  test('should handle missing loop variables gracefully', () => {
    const context = { item: 'test-item' }; // No loop context

    expect(resolver.resolve('loop.index', context)).toBe('');
    expect(resolver.resolve('loop.first', context)).toBe('');
    expect(resolver.exists('loop.index', context)).toBe(false);
  });

  test('should handle loop variables in strict mode', () => {
    const strictResolver = new VariableResolver({ allowUndefined: false });
    const context = { item: 'test-item' }; // No loop context

    expect(() => strictResolver.resolve('loop.index', context)).toThrow(
      'Undefined variable: loop.index',
    );
  });
});
