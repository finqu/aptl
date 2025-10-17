/**
 * Directives Module
 * Export all directive functionality
 */

export * from './types';
export * from './argument-parsers';
export * from './base-directive';
export { DirectiveRegistry } from './directive-registry';
export { extendsDirective } from './extends-directive';
export { slotDirective } from './slot-directive';
export { ifDirective, elifDirective, elseDirective } from './if-directive';
export { IfDirective } from './if-directive-class';
export { eachDirective } from './each-directive';
export { EachDirective } from './each-directive-class';
export { sectionDirective } from './section-directive';

// Re-export for convenience
import { DirectiveRegistry } from './directive-registry';
import { extendsDirective } from './extends-directive';
import { slotDirective } from './slot-directive';
import { IfDirective } from './if-directive-class';
import { EachDirective } from './each-directive-class';
import { sectionDirective } from './section-directive';

/**
 * Create a default directive registry with all built-in directives
 */
export function createDefaultDirectiveRegistry(): DirectiveRegistry {
  const registry = new DirectiveRegistry();

  // Template extension directives
  registry.register(extendsDirective);
  registry.register(slotDirective);

  // Control flow directives - use class-based directives
  registry.register(new IfDirective());
  // NOTE: elif and else are now handled by IfDirective/EachDirective, no separate registration needed
  registry.register(new EachDirective());

  // Section directive
  registry.register(sectionDirective);

  return registry;
}
