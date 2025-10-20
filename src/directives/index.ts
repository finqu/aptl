/**
 * Directives Module
 * Export all directive functionality
 */

export * from './types';
export * from './argument-parsers';
export * from './base-directive';
export { DirectiveRegistry } from './directive-registry';
export { IfDirective } from './if-directive';
export { SwitchDirective } from './switch-directive';
export { EachDirective } from './each-directive';
export { SectionDirective } from './section-directive';
export { IncludeDirective } from './include-directive';
export { ExamplesDirective } from './examples-directive';
export { ExtendsDirective } from './extends-directive';

// Re-export for convenience
import { DirectiveRegistry } from './directive-registry';
import { IfDirective } from './if-directive';
import { SwitchDirective } from './switch-directive';
import { EachDirective } from './each-directive';
import { SectionDirective } from './section-directive';
import { IncludeDirective } from './include-directive';
import { ExamplesDirective } from './examples-directive';
import { ExtendsDirective } from './extends-directive';
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
  registry.register(new SwitchDirective());
  registry.register(new EachDirective());
  registry.register(new SectionDirective());
  registry.register(new IncludeDirective(templateRegistry));
  registry.register(new ExamplesDirective());
  registry.register(new ExtendsDirective(templateRegistry));

  return registry;
}
