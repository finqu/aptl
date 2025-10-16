/**
 * APTL Engine
 * Main entry point for the template engine
 */

import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Compiler } from './compiler';
import {
  APTLOptions,
  CompiledTemplate,
  OutputFormatter,
  HelperFunction,
  FormatterRegistry,
} from './types';
import { DefaultFormatterRegistry } from '@/formatters/formatter-registry';

export class APTLEngine {
  private tokenizer: Tokenizer;
  private parser: Parser;
  private compiler: Compiler;
  private options: APTLOptions;
  private helpers: Record<string, HelperFunction>;
  private formatterRegistry: FormatterRegistry;
  private cache: Map<string, CompiledTemplate>;

  constructor(options: APTLOptions = {}) {
    this.options = {
      strict: false,
      cache: true,
      ...options,
    };

    this.tokenizer = new Tokenizer();
    this.parser = new Parser();
    this.helpers = options.helpers || {};

    // Initialize formatter registry
    this.formatterRegistry = new DefaultFormatterRegistry();

    // If a custom formatter is provided, register it as default
    if (options.formatter) {
      this.formatterRegistry.setDefaultFormatter(options.formatter);
    }

    this.compiler = new Compiler({
      strict: this.options.strict,
      helpers: this.helpers,
      formatterRegistry: this.formatterRegistry,
    });

    this.cache = new Map();
  }

  /**
   * Render a template string with the provided data
   */
  render(template: string, data: Record<string, any> = {}): string {
    // Check cache
    const cacheKey = this.getCacheKey(template);
    let compiled = this.cache.get(cacheKey);

    if (!compiled) {
      compiled = this.compile(template);

      if (this.options.cache) {
        this.cache.set(cacheKey, compiled);
      }
    }

    return compiled.render(data);
  }

  /**
   * Render a template file with the provided data
   * Note: Requires file system implementation
   */
  async renderFile(
    filePath: string,
    data: Record<string, any> = {},
  ): Promise<string> {
    // TODO: Implement file reading - requires fs module or custom file loader
    throw new Error(
      'renderFile not yet implemented - use render() with file contents',
    );
  }

  /**
   * Compile a template string into an executable template
   */
  compile(template: string): CompiledTemplate {
    // Tokenize
    const tokens = this.tokenizer.tokenize(template);

    // Parse into AST
    const ast = this.parser.parse(tokens);

    // Compile into executable template
    return this.compiler.compile(ast);
  }

  /**
   * Register a helper function
   */
  registerHelper(name: string, fn: HelperFunction): void {
    this.helpers[name] = fn;
  }

  /**
   * Register a custom output formatter
   */
  registerFormatter(name: string, formatter: OutputFormatter): void {
    this.formatterRegistry.register(name, formatter);
  }

  /**
   * Set the default output formatter
   */
  setDefaultFormatter(formatter: OutputFormatter): void {
    this.formatterRegistry.setDefaultFormatter(formatter);
  }

  /**
   * Clear the template cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  private getCacheKey(template: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < template.length; i++) {
      const char = template.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}
