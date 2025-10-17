/**
 * Directives Module
 * Export all directive functionality
 */

export * from './types';
export * from './argument-parsers';
export * from './base-directive';
export { DirectiveRegistry } from './directive-registry';
export { IfDirective } from './if-directive';
export { EachDirective } from './each-directive';
export { SectionDirective } from './section-directive';

// Re-export for convenience
import { DirectiveRegistry } from './directive-registry';
import { IfDirective } from './if-directive';
import { EachDirective } from './each-directive';
import { SectionDirective } from './section-directive';

/**
 * Create a default directive registry with all built-in directives
 */
export function createDefaultDirectiveRegistry(): DirectiveRegistry {
  const registry = new DirectiveRegistry();

  // Control flow directives - use class-based directives
  registry.register(new IfDirective());
  // NOTE: elif and else are now handled by IfDirective/EachDirective, no separate registration needed
  registry.register(new EachDirective());

  // Section directive - now class-based
  registry.register(new SectionDirective());

  return registry;
}
