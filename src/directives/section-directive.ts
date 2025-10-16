/**
 * Section Directive
 * Defines output sections with formatting
 */

import { Directive, DirectiveContext } from './types';
import { APTLSyntaxError } from '@/utils/errors';
import { DirectiveNode } from '@/core/types';

/**
 * @section directive
 * Defines a named section with optional formatting attributes
 *
 * Usage:
 *   @section intro
 *   This is the introduction
 *   @end
 *
 *   @section code(format="markdown")
 *   ```javascript
 *   console.log('hello');
 *   ```
 *   @end
 */
export const sectionDirective: Directive = {
    name: 'section',
    requiresTopLevel: false,
    unique: false,

    validate: (node: DirectiveNode) => {
        // Section name should be in rawArgs or parsedArgs
        const hasName = (node.rawArgs && node.rawArgs.trim() !== '') ||
            (node.parsedArgs && node.parsedArgs.name);

        if (!hasName) {
            throw new APTLSyntaxError(
                'Section directive requires a name',
                node.line,
                node.column,
            );
        }
    },

    handler: (context: DirectiveContext): string => {
        // Section formatting will be handled by the compiler
        // This is a placeholder that should not be called directly
        return '';
    },
};
