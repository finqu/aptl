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
export { IncludeDirective } from './include-directive';
export { ExamplesDirective } from './examples-directive';

// Re-export for convenience
import { DirectiveRegistry } from './directive-registry';
import { IfDirective } from './if-directive';
import { EachDirective } from './each-directive';
import { SectionDirective } from './section-directive';
import { IncludeDirective } from './include-directive';
import { ExamplesDirective } from './examples-directive';
import { TemplateRegistry } from '@/templates/template-registry';
import { Compiler } from '@/core/compiler';
import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';

/**
 * Create a default directive registry with all built-in directives
 */
export function createDefaultDirectiveRegistry(
  tokenizer: Tokenizer,
  parser: Parser,
  compiler: Compiler,
  templateRegistry: TemplateRegistry,
): DirectiveRegistry {
  const registry = new DirectiveRegistry();

  registry.register(new IfDirective());
  registry.register(new EachDirective());
  registry.register(new SectionDirective());
  registry.register(new IncludeDirective(templateRegistry));
  registry.register(new ExamplesDirective());

  return registry;
}
