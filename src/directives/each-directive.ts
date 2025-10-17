/**
 * Each Directive
 * Iteration over arrays and collections
 */

import { Directive, DirectiveContext } from './types';
import { APTLSyntaxError } from '@/utils/errors';
import { DirectiveNode } from '@/core/types';

/**
 * @each directive
 * Iterates over an array or collection
 *
 * Usage:
 *   @each item in items
 *   - @{item.name}
 *   @end
 *
 * Provides loop variables:
 * - loop.index: Current index
 * - loop.first: True if first iteration
 * - loop.last: True if last iteration
 * - loop.even: True if even index
 * - loop.odd: True if odd index
 * - loop.length: Total number of items
 */
export const eachDirective: Directive = {
  name: 'each',
  requiresTopLevel: false,
  unique: false,

  validate: (node: DirectiveNode) => {
    if (!node.rawArgs || node.rawArgs.trim() === '') {
      throw new APTLSyntaxError(
        'Each directive requires iteration syntax: item in array',
        node.line,
        node.column,
      );
    }

    // Validate "item in array" syntax
    const parts = node.rawArgs.split(/\s+in\s+/);
    if (parts.length !== 2) {
      throw new APTLSyntaxError(
        'Each directive requires syntax: @each item in array',
        node.line,
        node.column,
      );
    }

    const itemName = parts[0].trim();
    const arrayPath = parts[1].trim();

    if (!itemName || !arrayPath) {
      throw new APTLSyntaxError(
        'Each directive requires both item name and array path',
        node.line,
        node.column,
      );
    }
  },

  handler: (context: DirectiveContext): string => {
    // The iteration logic will be handled by the compiler
    // This is a placeholder that should not be called directly
    return '';
  },
};
