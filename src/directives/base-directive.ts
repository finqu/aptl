/**
 * Base Directive Classes
 * Provides abstract base classes for different directive types
 */

import { DirectiveNode, ASTNode } from '@/core/types';
import { DirectiveContext } from './types';

/**
 * Parser interface for directive body parsing
 * Minimal interface that directives need from the parser
 */
export interface DirectiveParser {
    /**
     * Parse a single statement (text, variable, directive, etc.)
     */
    parseStatement(): ASTNode | null;

    /**
     * Parse a directive node
     */
    parseDirective(): DirectiveNode;

    /**
     * Peek at the next token without consuming it
     */
    peek(): { type: string; value: string; line: number; column: number };

    /**
     * Advance to the next token and return it
     */
    advance(): { type: string; value: string; line: number; column: number };

    /**
     * Check if we're at the end of input
     */
    isAtEnd(): boolean;
}

/**
 * Base Directive Class
 * All directives must extend this class
 */
export abstract class BaseDirective {
    /**
     * Directive name (e.g., 'if', 'section', 'extends')
     */
    abstract readonly name: string;

    /**
     * Whether this directive must appear at the top of the template
     */
    readonly requiresTopLevel: boolean = false;

    /**
     * Whether this directive can only appear once per template
     */
    readonly unique: boolean = false;

    /**
     * Whether this directive has a body (children nodes)
     */
    abstract readonly hasBody: boolean;

    /**
     * Main execution method - called by compiler to render the directive
     */
    abstract execute(context: DirectiveContext): string;

    /**
     * Validate the directive node (optional override)
     * Throw an error if validation fails
     */
    validate(node: DirectiveNode): void {
        // Default: no validation
    }

    /**
     * Parse directive arguments (optional override)
     * Default: return raw args as-is
     */
    parseArguments(rawArgs: string): any {
        return rawArgs;
    }

    /**
     * Called during parsing to determine when to stop body parsing
     * Override this to customize termination logic
     */
    shouldTerminateBody(directiveName: string): boolean {
        // By default, only 'end' terminates the body
        return directiveName === 'end';
    }

    /**
     * Called when a directive is encountered while parsing this directive's body
     * Return true if the directive was handled, false to let parser handle it normally
     *
     * @param directiveName - Name of the encountered directive
     * @param parser - Parser instance for parsing additional content
     * @param children - Current children array (can be modified)
     */
    handleChildDirective(
        directiveName: string,
        parser: DirectiveParser,
        children: ASTNode[],
    ): boolean {
        // By default, don't handle any child directives specially
        return false;
    }
}

/**
 * Inline Directive
 * Directives without a body (single line)
 * Example: @extends("base.aptl")
 */
export abstract class InlineDirective extends BaseDirective {
    readonly hasBody = false;
}

/**
 * Block Directive
 * Directives with a body that ends with @end
 * Example: @section("header") ... @end
 */
export abstract class BlockDirective extends BaseDirective {
    readonly hasBody = true;

    // Block directives terminate at @end by default
    shouldTerminateBody(directiveName: string): boolean {
        return directiveName === 'end';
    }
}

/**
 * Conditional Directive
 * Special block directive for conditional rendering with branches (if/elif/else)
 * Handles complex branching with sibling directives
 */
export abstract class ConditionalDirective extends BlockDirective {
    /**
     * Define which directive names are part of this conditional chain
     * Example: ['elif', 'else'] for an if directive
     */
    abstract getConditionalKeywords(): string[];

    shouldTerminateBody(directiveName: string): boolean {
        // DON'T terminate at conditional siblings - we handle them in handleChildDirective
        // Only terminate at @end
        return directiveName === 'end';
    }

    handleChildDirective(
        directiveName: string,
        parser: DirectiveParser,
        children: ASTNode[],
    ): boolean {
        // If it's one of our conditional keywords (elif, else)
        if (this.getConditionalKeywords().includes(directiveName)) {
            // Parse it as a directive node and add to our children
            const childNode = parser.parseDirective();
            children.push(childNode);
            return true; // We handled it
        }
        return false; // Not our keyword, let parser handle normally
    }
}
