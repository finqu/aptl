/**
 * Template Registry
 * Auto-discovers and manages template files using a FileSystem abstraction
 */

import {
  CompiledTemplate,
  TemplateRegistryOptions,
  LoadOptions,
} from '@/core/types';
import { FileSystem } from '@/filesystem/filesystem';
import { ObjectFileSystem } from '@/filesystem/object-filesystem';
import { Compiler } from '@/core/compiler';

export interface TemplateRegistryConfig extends TemplateRegistryOptions {
  fileSystem?: FileSystem;
}

export class TemplateRegistry {
  private templates: Map<string, CompiledTemplate>;
  private compiler: Compiler;
  private options: TemplateRegistryConfig;
  private fileSystem: FileSystem;
  private loadedDirectories: Map<string, LoadOptions>;

  constructor(compiler: Compiler, options: TemplateRegistryConfig = {}) {
    this.templates = new Map();
    this.compiler = compiler;
    this.options = {
      cache: true,
      extensions: ['.aptl'],
      ...options,
    };
    // Default to ObjectFileSystem if none provided
    this.fileSystem = options.fileSystem || new ObjectFileSystem();
    this.loadedDirectories = new Map();
  }

  /**
   * Load templates from a directory
   */
  async loadDirectory(dirPath: string, options?: LoadOptions): Promise<void> {
    const { recursive = true, pattern } = options || {};

    // Track this directory for refresh capability
    this.loadedDirectories.set(dirPath, { recursive, pattern });

    await this.loadFromPath(dirPath, recursive, pattern);
  }

  /**
   * Recursively load templates from a path
   */
  private async loadFromPath(
    dirPath: string,
    recursive: boolean,
    pattern?: RegExp,
  ): Promise<void> {
    const entries = await this.fileSystem.readdir(dirPath);

    for (const entry of entries) {
      if (entry.isDirectory && recursive) {
        await this.loadFromPath(entry.path, recursive, pattern);
      } else if (!entry.isDirectory) {
        // Check if file matches extensions
        const matchesExtension = this.options.extensions?.some((ext) =>
          entry.path.endsWith(ext),
        );

        // Check if file matches pattern
        const matchesPattern = pattern ? pattern.test(entry.path) : true;

        if (matchesExtension && matchesPattern) {
          await this.loadFile(entry.path);
        }
      }
    }
  }

  /**
   * Load a single template file
   */
  async loadFile(filePath: string): Promise<void> {
    const content = await this.fileSystem.readFile(filePath);
    const templateName = this.getTemplateName(filePath);

    await this.register(templateName, content);
  }

  /**
   * Extract template name from file path
   */
  private getTemplateName(filePath: string): string {
    // Remove extension and normalize path
    let name = filePath;

    // Remove extensions
    for (const ext of this.options.extensions || []) {
      if (name.endsWith(ext)) {
        name = name.slice(0, -ext.length);
        break;
      }
    }

    // Normalize path separators
    name = name.replace(/\\/g, '/');

    // Remove leading slash if present
    if (name.startsWith('/')) {
      name = name.substring(1);
    }

    return name;
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
  async register(
    name: string,
    template: string | CompiledTemplate,
    gracefully: boolean = false,
  ): Promise<void> {
    if (typeof template === 'string') {
      try {
        this.templates.set(name, await this.compiler.compile(template));
      } catch (error) {
        if (!gracefully) {
          throw error;
        }
      }
    } else {
      this.templates.set(name, template);
    }
  }

  /**
   * Refresh templates by reloading from the filesystem
   * If no name is provided, reloads all previously loaded directories
   */
  async refresh(name?: string): Promise<void> {
    if (name) {
      // Refresh specific template by name (not implemented yet as we'd need to track file paths)
      throw new Error(
        'Refreshing individual templates by name is not supported. Use refresh() without arguments to reload all templates.',
      );
    } else {
      // Clear all templates and reload from tracked directories
      this.templates.clear();

      // Reload all previously loaded directories
      for (const [dirPath, options] of this.loadedDirectories.entries()) {
        await this.loadFromPath(
          dirPath,
          options.recursive ?? true,
          options.pattern,
        );
      }
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
   * Clear all templates and tracked directories
   */
  clear(): void {
    this.templates.clear();
    this.loadedDirectories.clear();
  }

  /**
   * Get the underlying file system
   */
  getFileSystem(): FileSystem {
    return this.fileSystem;
  }

  /**
   * Set a different file system
   * Note: This will clear all templates and tracked directories
   */
  setFileSystem(fileSystem: FileSystem): void {
    this.clear();
    this.fileSystem = fileSystem;
  }

  /**
   * Get the list of tracked directories
   */
  getLoadedDirectories(): string[] {
    return Array.from(this.loadedDirectories.keys());
  }
}
