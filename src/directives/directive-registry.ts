/**
 * Directive Registry
 * Central registry for managing template directives
 */

import { Directive, DirectiveContext, DirectiveType } from './types';
import { BaseDirective } from './base-directive';
import { APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode } from '@/core/types';

/**
 * Helper to check if a directive is class-based
 */
/**
 * Helper function to check if a directive is class-based (BaseDirective) or object-based (Directive)
 */
export function isClassBasedDirective(directive: DirectiveType): directive is BaseDirective {
    return 'execute' in directive && typeof directive.execute === 'function';
}


export class DirectiveRegistry {
    private directives: Map<string, DirectiveType> = new Map();

    /**
     * Register a new directive (class-based or object-based)
     */
    register(directive: DirectiveType): void {
        const name = isClassBasedDirective(directive) ? directive.name : directive.name;

        if (this.directives.has(name)) {
            throw new APTLRuntimeError(
                `Directive '${name}' is already registered`,
            );
        }
        this.directives.set(name, directive);
    }

    /**
     * Get a directive by name
     */
    get(name: string): DirectiveType | undefined {
        return this.directives.get(name);
    }

    /**
     * Check if a directive is registered
     */
    has(name: string): boolean {
        return this.directives.has(name);
    }

    /**
     * Get all registered directive names
     */
    getNames(): string[] {
        return Array.from(this.directives.keys());
    }

    /**
     * Get all directive keywords including conditional keywords (elif, else)
     * This is used by the tokenizer to recognize all valid directive keywords
     */
    getAllKeywords(): string[] {
        const keywords = new Set(this.getNames());

        // Add conditional keywords from ConditionalDirective instances
        for (const directive of this.directives.values()) {
            if (isClassBasedDirective(directive) && 'getConditionalKeywords' in directive) {
                const conditionalKeywords = (directive as any).getConditionalKeywords();
                if (Array.isArray(conditionalKeywords)) {
                    conditionalKeywords.forEach(kw => keywords.add(kw));
                }
            }
        }

        return Array.from(keywords);
    }

    /**
     * Execute a directive
     */
    execute(node: DirectiveNode, context: DirectiveContext): string {
        const directive = this.directives.get(node.name);

        if (!directive) {
            throw new APTLRuntimeError(`Unknown directive: @${node.name}`);
        }

        const isClassBased = isClassBasedDirective(directive);

        // Parse arguments if not already parsed
        if (!node.parsedArgs) {
            try {
                if (isClassBased) {
                    node.parsedArgs = directive.parseArguments(node.rawArgs);
                } else if (directive.parseArguments) {
                    node.parsedArgs = directive.parseArguments(node.rawArgs);
                }
            } catch (error) {
                throw new APTLRuntimeError(
                    `Failed to parse arguments for directive '@${node.name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
                    { directive: node.name, rawArgs: node.rawArgs },
                );
            }
        }

        // Validate
        try {
            if (isClassBased) {
                directive.validate(node);
            } else if (directive.validate) {
                directive.validate(node);
            }
        } catch (error) {
            throw error; // Re-throw validation errors as-is
        }

        // Execute
        try {
            if (isClassBased) {
                return directive.execute(context);
            } else {
                return directive.handler(context);
            }
        } catch (error) {
            throw new APTLRuntimeError(
                `Error executing directive '@${node.name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
                { directive: node.name, rawArgs: node.rawArgs },
            );
        }
    }

    /**
     * Unregister a directive
     */
    unregister(name: string): boolean {
        return this.directives.delete(name);
    }

    /**
     * Clear all directives
     */
    clear(): void {
        this.directives.clear();
    }

    /**
     * Get all directives
     */
    getAll(): DirectiveType[] {
        return Array.from(this.directives.values());
    }
}
