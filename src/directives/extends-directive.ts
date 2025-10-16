/**
 * Extends Directive
 * Allows templates to extend parent templates with slot overrides
 */

import { Directive, DirectiveContext } from './types';
import { APTLRuntimeError, APTLSyntaxError } from '@/utils/errors';
import { DirectiveNode } from '@/core/types';

/**
 * @extends directive
 * Extends a parent template and allows overriding its slots
 *
 * Usage:
 *   @extends "base.aptl"
 *
 *   @slot name="header"
 *   Custom header
 *   @end
 *
 *   @slot name="content"
 *   Custom content
 *   @end
 *
 * Requirements:
 * - Must be the first directive in the template (except comments/whitespace)
 * - Can only appear once per template
 * - Requires a template path argument
 */
export const extendsDirective: Directive = {
  name: 'extends',
  requiresTopLevel: true,
  unique: true,

  validate: (node: DirectiveNode) => {
    // Validate that extends has a template path argument
    if (!node.rawArgs || node.rawArgs.trim() === '') {
      throw new APTLSyntaxError(
        'Extends directive requires a template path argument',
        node.line,
        node.column,
      );
    }

    // Validate that the path is a string (remove quotes if present)
    const path = node.rawArgs.trim();
    if (
      !(
        (path.startsWith('"') && path.endsWith('"')) ||
        (path.startsWith("'") && path.endsWith("'"))
      )
    ) {
      throw new APTLSyntaxError(
        'Extends directive path must be a quoted string',
        node.line,
        node.column,
      );
    }
  },

  handler: (context: DirectiveContext): string => {
    if (!context.renderTemplate) {
      throw new APTLRuntimeError(
        'Extends directive requires renderTemplate function in context',
      );
    }

    // Extract template path from args (remove quotes)
    const path = context.node.rawArgs.trim().slice(1, -1);

    // Get the template loader from metadata
    const loadTemplate = context.metadata.get('loadTemplate') as
      | ((path: string) => string)
      | undefined;

    if (!loadTemplate) {
      throw new APTLRuntimeError(
        'Extends directive requires a template loader function',
        { path },
      );
    }

    // Load the parent template
    let parentTemplate: string;
    try {
      parentTemplate = loadTemplate(path);
    } catch (error) {
      throw new APTLRuntimeError(
        `Failed to load parent template "${path}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        { path },
      );
    }

    // The actual slot merging will be handled by the compiler
    // Store the parent template in metadata for compiler to use
    context.metadata.set('parentTemplate', parentTemplate);
    context.metadata.set('parentTemplatePath', path);

    return '';
  },
};
