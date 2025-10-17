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
import {
  DirectiveRegistry,
  createDefaultDirectiveRegistry,
  BaseDirective,
} from '@/directives';
import { FileSystem } from '@/filesystem';

export class APTLEngine {
  private tokenizer: Tokenizer;
  private parser: Parser;
  private compiler: Compiler;
  private options: APTLOptions;
  private helpers: Record<string, HelperFunction>;
  private formatterRegistry: FormatterRegistry;
  private directiveRegistry: DirectiveRegistry;
  private cache: Map<string, CompiledTemplate>;
  private fileSystem?: FileSystem;
  private model: string;

  constructor(model: string, options: APTLOptions = {}) {
    this.options = {
      strict: false,
      cache: true,
      ...options,
    };

    // Store model information
    this.model = model;

    // Store file system if provided
    this.fileSystem = options.fileSystem;

    // Initialize directive registry with default directives (extends, slot, if, each, section)
    this.directiveRegistry = createDefaultDirectiveRegistry();

    // Get list of all directive keywords for tokenizer (including elif/else from conditional directives)
    // Exclude 'end' which is handled specially
    const directiveNames = this.directiveRegistry
      .getAllKeywords()
      .filter((name: string) => name !== 'end');

    this.tokenizer = new Tokenizer();

    // Register all directive keywords with the tokenizer
    for (const name of directiveNames) {
      this.tokenizer.registerDirective(name);
    }

    this.parser = new Parser(this.directiveRegistry);
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
      directiveRegistry: this.directiveRegistry,
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

    // Inject model information into data if available
    const renderData = this.model ? { ...data, model: this.model } : data;

    return compiled.render(renderData);
  }

  /**
   * Render a template file with the provided data
   * Note: Requires file system implementation
   */
  async renderFile(
    filePath: string,
    data: Record<string, any> = {},
  ): Promise<string> {
    if (!this.fileSystem) {
      throw new Error(
        'FileSystem not configured. Pass a fileSystem option to the APTLEngine constructor to use renderFile().',
      );
    }

    // Read the template file
    const template = await this.fileSystem.readFile(filePath);

    // Render using the standard render method
    return this.render(template, data);
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
   * Register a custom directive
   */
  registerDirective(directive: BaseDirective): void {
    this.directiveRegistry.register(directive);

    // Also register the directive name with the tokenizer
    this.tokenizer.registerDirective(directive.name);

    // Clear cache since directives might affect rendering
    this.clearCache();
  }

  /**
   * Unregister a directive
   */
  unregisterDirective(name: string): void {
    this.directiveRegistry.unregister(name);
    this.tokenizer.unregisterDirective(name);
    this.clearCache();
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
