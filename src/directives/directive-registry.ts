/**
 * Directive Registry
 * Central registry for managing template directives
 */

import { DirectiveContext, DirectiveType } from './types';
import { BaseDirective } from './base-directive';
import { APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode } from '@/core/types';

export class DirectiveRegistry {
  private directives: Map<string, BaseDirective> = new Map();

  /**
   * Register a new directive (class-based only)
   */
  register(directive: BaseDirective): void {
    const name = directive.name;

    if (this.directives.has(name)) {
      throw new APTLRuntimeError(`Directive '${name}' is already registered`);
    }
    this.directives.set(name, directive);
  }

  /**
   * Get a directive by name
   */
  get(name: string): BaseDirective | undefined {
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
      if ('getConditionalKeywords' in directive) {
        const conditionalKeywords = (directive as any).getConditionalKeywords();
        if (Array.isArray(conditionalKeywords)) {
          conditionalKeywords.forEach((kw) => keywords.add(kw));
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

    // Parse arguments if not already parsed
    if (!node.parsedArgs) {
      try {
        node.parsedArgs = directive.parseArguments(node.rawArgs);
      } catch (error) {
        throw new APTLRuntimeError(
          `Failed to parse arguments for directive '@${node.name}': ${error instanceof Error ? error.message : 'Unknown error'}`,
          { directive: node.name, rawArgs: node.rawArgs },
        );
      }
    }

    // Validate
    try {
      directive.validate(node);
    } catch (error) {
      throw error; // Re-throw validation errors as-is
    }

    // Execute
    try {
      return directive.execute(context);
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
  getAll(): BaseDirective[] {
    return Array.from(this.directives.values());
  }
}
