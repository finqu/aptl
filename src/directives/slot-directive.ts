/**
 * Slot Directive
 * Allows child templates to inject content into parent templates
 */

import { Directive, DirectiveContext } from './types';
import { APTLRuntimeError, APTLSyntaxError } from '@/utils/errors';
import { DirectiveNode, NodeType, ASTNode } from '@/core/types';

/**
 * @slot directive
 * Defines a named slot that can be filled by child templates
 *
 * Usage in parent template:
 *   @slot name="header"
 *   Default header content
 *   @end
 *
 * Usage in child template to fill slot:
 *   @slot name="header"
 *   Custom header content
 *   @end
 */
export const slotDirective: Directive = {
    name: 'slot',
    requiresTopLevel: false,
    unique: false,

    validate: (node: DirectiveNode) => {
        // Validate that slot has a name in parsedArgs
        if (!node.parsedArgs || !node.parsedArgs.name) {
            throw new APTLSyntaxError(
                'Slot directive requires a "name" attribute',
                node.line,
                node.column,
            );
        }

        // Validate name format
        const name = node.parsedArgs.name;
        if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
            throw new APTLSyntaxError(
                `Invalid slot name "${name}". Slot names must start with a letter or underscore and contain only letters, numbers, underscores, and hyphens.`,
                node.line,
                node.column,
            );
        }
    },

    handler: (context: DirectiveContext): string => {
        const slotName = context.node.parsedArgs?.name;

        if (!slotName) {
            throw new APTLRuntimeError(
                'Slot directive requires a name',
            );
        }

        // Get the slots map from metadata
        const slots = context.metadata.get('slots') as Map<string, string> | undefined;

        // If we have a slot value from a child template, use it
        if (slots && slots.has(slotName)) {
            return slots.get(slotName)!;
        }

        // Otherwise, render the default content (children of this slot node)
        if (!context.renderTemplate) {
            throw new APTLRuntimeError(
                'Slot directive requires renderTemplate function in context',
            );
        }

        // Render children as default content
        // This would need to be implemented by the compiler
        // For now, we'll return empty string and handle in compiler
        return '';
    },
};
