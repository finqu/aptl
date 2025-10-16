/**
 * Template Registry
 * Auto-discovers and manages template files
 */

import {
  CompiledTemplate,
  TemplateRegistryOptions,
  LoadOptions,
} from '../core/types';
import { APTLEngine } from '../core/engine';

export class TemplateRegistry {
  private templates: Map<string, CompiledTemplate>;
  private engine: APTLEngine;
  private options: TemplateRegistryOptions;

  constructor(engine?: APTLEngine, options: TemplateRegistryOptions = {}) {
    this.templates = new Map();
    this.engine = engine || new APTLEngine();
    this.options = {
      watch: false,
      cache: true,
      extensions: ['.aptl'],
      ...options,
    };
  }

  /**
   * Load templates from a directory
   * TODO: Implement directory scanning
   */
  async loadDirectory(path: string, options?: LoadOptions): Promise<void> {
    throw new Error(
      'loadDirectory not yet implemented - requires file system access',
    );
  }

  /**
   * Get a compiled template by name
   */
  get(name: string): CompiledTemplate {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }
    return template;
  }

  /**
   * Register a template
   */
  register(name: string, template: string | CompiledTemplate): void {
    if (typeof template === 'string') {
      this.templates.set(name, this.engine.compile(template));
    } else {
      this.templates.set(name, template);
    }
  }

  /**
   * Reload templates
   * TODO: Implement template reloading
   */
  async reload(name?: string): Promise<void> {
    if (name) {
      // Reload specific template
      throw new Error('reload not yet implemented');
    } else {
      // Reload all templates
      throw new Error('reload not yet implemented');
    }
  }

  /**
   * List all registered template names
   */
  list(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Check if a template exists
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }

  /**
   * Remove a template
   */
  unregister(name: string): boolean {
    return this.templates.delete(name);
  }

  /**
   * Clear all templates
   */
  clear(): void {
    this.templates.clear();
  }
}
