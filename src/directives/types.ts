/**
 * Directive Type Definitions
 */

import { RenderContext, DirectiveNode, Token } from '@/core/types';
import type { BaseDirective } from './base-directive';

/**
 * Directive execution context
 */
export interface DirectiveContext extends RenderContext {
    /**
     * The AST node associated with this directive
     */
    node: DirectiveNode;

    /**
     * Custom metadata for directive-specific data
     * Each directive can store and retrieve its own data here
     */
    metadata: Map<string, any>;

    /**
     * Compile and render a template string
     */
    renderTemplate?: (template: string, data?: Record<string, any>) => string;
}

/**
 * Directive handler function
 * Note: Currently only synchronous handlers are supported
 */
export type DirectiveHandler = (context: DirectiveContext) => string;

/**
 * Directive argument parser function
 * Takes raw argument string and returns parsed arguments object
 * Can also take an array of tokens if tokenization is needed
 */
export type DirectiveArgumentParser = (rawArgs: string, tokens?: Token[]) => any;

/**
 * Directive definition
 */
export interface Directive {
    /**
     * Directive name (e.g., 'extends', 'slot', 'if', 'each')
     */
    name: string;

    /**
     * Whether this directive must appear at the top of the template
     */
    requiresTopLevel?: boolean;

    /**
     * Whether this directive can only appear once per template
     */
    unique?: boolean;

    /**
     * Handler function for processing this directive
     */
    handler: DirectiveHandler;

    /**
     * Optional argument parser - if provided, will be used to parse rawArgs into parsedArgs
     * This allows directives to define custom argument syntax
     */
    parseArguments?: DirectiveArgumentParser;

    /**
     * Validation function (optional)
     */
    validate?: (node: DirectiveNode) => void;

    /**
     * Whether this directive expects a body (children nodes)
     * Defaults to true
     */
    hasBody?: boolean;

    /**
     * Directive names that should terminate body parsing (in addition to @end)
     * Used for directives like elif/else that share an @end with their parent
     * Example: elif should stop when it sees 'elif', 'else', or 'end'
     */
    bodyTerminators?: string[];
}

/**
 * Type for directives - can be either legacy object-based or new class-based
 */
export type DirectiveType = Directive | BaseDirective;
