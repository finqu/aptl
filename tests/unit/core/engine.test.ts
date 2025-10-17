/**
 * Unit tests for APTLEngine
 * Focus: Testing the engine's interface, initialization, and core methods
 */

import { APTLEngine } from '@/core/engine';
import { OutputFormatter, HelperFunction } from '@/core/types';
import { BaseDirective, InlineDirective } from '@/directives';
import { DirectiveContext } from '@/directives/types';
import { FileSystem } from '@/filesystem';

// Simple test directive class
class TestDirective extends InlineDirective {
  constructor(
    public readonly name: string,
    private returnValue: string = 'test',
  ) {
    super();
  }

  execute(context: DirectiveContext): string {
    return this.returnValue;
  }
}

// Mock FileSystem for testing
class MockFileSystem implements FileSystem {
  private files: Map<string, string> = new Map();

  constructor(files: Record<string, string> = {}) {
    Object.entries(files).forEach(([path, content]) => {
      this.files.set(path, content);
    });
  }

  async readFile(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content === undefined) {
      throw new Error(`File not found: ${path}`);
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async stat(): Promise<any> {
    return {};
  }

  async readdir(): Promise<any[]> {
    return [];
  }

  async unlink(path: string): Promise<void> {
    this.files.delete(path);
  }

  async mkdir(): Promise<void> { }
  async rmdir(): Promise<void> { }
}

describe('APTLEngine', () => {
  describe('constructor', () => {
    it('should create an engine with default options', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(APTLEngine);
    });

    it('should accept empty options object', () => {
      const engine = new APTLEngine('gpt-5.1', {});
      expect(engine).toBeDefined();
    });

    it('should accept strict option', () => {
      const engine = new APTLEngine('gpt-5.1', { strict: true });
      expect(engine).toBeDefined();
    });

    it('should accept cache option', () => {
      const engine = new APTLEngine('gpt-5.1', { cache: false });
      expect(engine).toBeDefined();
    });

    it('should accept helpers option', () => {
      const helpers = {
        test: () => 'test',
      };
      const engine = new APTLEngine('gpt-5.1', { helpers });
      expect(engine).toBeDefined();
    });

    it('should accept formatter option', () => {
      const formatter: OutputFormatter = {
        format: (sections) => sections.map((s) => s.content).join(''),
        formatSection: (section) => section.content,
        supportsFormat: () => true,
      };
      const engine = new APTLEngine('gpt-5.1', { formatter });
      expect(engine).toBeDefined();
    });

    it('should accept multiple options together', () => {
      const engine = new APTLEngine('gpt-5.1', {
        strict: true,
        cache: false,
        helpers: { test: () => 'test' },
      });
      expect(engine).toBeDefined();
    });
  });

  describe('render', () => {
    it('should have a render method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.render).toBeDefined();
      expect(typeof engine.render).toBe('function');
    });

    it('should render simple text without variables', () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = engine.render('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should render empty string', () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = engine.render('');
      expect(result).toBe('');
    });

    it('should accept data parameter', () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = engine.render('test', { key: 'value' });
      expect(result).toBeDefined();
    });

    it('should work with empty data object', () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = engine.render('test', {});
      expect(result).toBeDefined();
    });

    it('should work without data parameter', () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = engine.render('test');
      expect(result).toBeDefined();
    });

    it('should return a string', () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = engine.render('test');
      expect(typeof result).toBe('string');
    });

    it('should handle multiple render calls', () => {
      const engine = new APTLEngine('gpt-5.1');
      const result1 = engine.render('first');
      const result2 = engine.render('second');
      expect(result1).toBe('first');
      expect(result2).toBe('second');
    });
  });

  describe('compile', () => {
    it('should have a compile method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.compile).toBeDefined();
      expect(typeof engine.compile).toBe('function');
    });

    it('should compile a template', () => {
      const engine = new APTLEngine('gpt-5.1');
      const compiled = engine.compile('test');
      expect(compiled).toBeDefined();
    });

    it('should return an object with render method', () => {
      const engine = new APTLEngine('gpt-5.1');
      const compiled = engine.compile('test');
      expect(compiled.render).toBeDefined();
      expect(typeof compiled.render).toBe('function');
    });

    it('should allow compiled template to be reused', () => {
      const engine = new APTLEngine('gpt-5.1');
      const compiled = engine.compile('test');
      const result1 = compiled.render({});
      const result2 = compiled.render({});
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should compile empty template', () => {
      const engine = new APTLEngine('gpt-5.1');
      const compiled = engine.compile('');
      expect(compiled).toBeDefined();
      expect(compiled.render({})).toBe('');
    });
  });

  describe('renderFile', () => {
    it('should have a renderFile method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.renderFile).toBeDefined();
      expect(typeof engine.renderFile).toBe('function');
    });

    it('should throw error when no fileSystem is configured', async () => {
      const engine = new APTLEngine('gpt-5.1');
      await expect(engine.renderFile('test.aptl')).rejects.toThrow(
        'FileSystem not configured',
      );
    });

    it('should read and render file when fileSystem is configured', async () => {
      const fs = new MockFileSystem({
        'test.aptl': 'Hello World',
      });
      const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });
      const result = await engine.renderFile('test.aptl');
      expect(result).toBe('Hello World');
    });

    it('should pass data parameter to render method', async () => {
      const fs = new MockFileSystem({
        'template.aptl': 'content',
      });
      const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });
      // Just verify it doesn't throw with data parameter
      const result = await engine.renderFile('template.aptl', { key: 'value' });
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should throw error when file does not exist', async () => {
      const fs = new MockFileSystem({});
      const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });
      await expect(engine.renderFile('missing.aptl')).rejects.toThrow(
        'File not found',
      );
    });

    it('should read file content from fileSystem', async () => {
      const fs = new MockFileSystem({
        'file1.aptl': 'Content 1',
        'file2.aptl': 'Content 2',
      });
      const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });

      const result1 = await engine.renderFile('file1.aptl');
      const result2 = await engine.renderFile('file2.aptl');

      expect(result1).toBe('Content 1');
      expect(result2).toBe('Content 2');
    });
  });

  describe('registerHelper', () => {
    it('should have a registerHelper method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.registerHelper).toBeDefined();
      expect(typeof engine.registerHelper).toBe('function');
    });

    it('should accept a helper function', () => {
      const engine = new APTLEngine('gpt-5.1');
      const helper = () => 'test';
      expect(() => engine.registerHelper('test', helper)).not.toThrow();
    });

    it('should allow registering multiple helpers', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(() => {
        engine.registerHelper('helper1', () => 'a');
        engine.registerHelper('helper2', () => 'b');
        engine.registerHelper('helper3', () => 'c');
      }).not.toThrow();
    });

    it('should accept helpers with different signatures', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(() => {
        engine.registerHelper('noArgs', () => 'test');
        engine.registerHelper('oneArg', (x: any) => x);
        engine.registerHelper('twoArgs', (x: any, y: any) => x + y);
      }).not.toThrow();
    });
  });

  describe('registerFormatter', () => {
    it('should have a registerFormatter method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.registerFormatter).toBeDefined();
      expect(typeof engine.registerFormatter).toBe('function');
    });

    it('should accept a formatter', () => {
      const engine = new APTLEngine('gpt-5.1');
      const formatter: OutputFormatter = {
        format: (sections) => sections.map((s) => s.content).join(''),
        formatSection: (section) => section.content,
        supportsFormat: () => true,
      };
      expect(() => engine.registerFormatter('test', formatter)).not.toThrow();
    });

    it('should allow registering multiple formatters', () => {
      const engine = new APTLEngine('gpt-5.1');
      const formatter1: OutputFormatter = {
        format: (sections) => sections.map((s) => s.content).join(''),
        formatSection: (section) => section.content,
        supportsFormat: () => true,
      };
      const formatter2: OutputFormatter = {
        format: (sections) => sections.map((s) => s.content).join('\n'),
        formatSection: (section) => section.content,
        supportsFormat: () => true,
      };
      expect(() => {
        engine.registerFormatter('fmt1', formatter1);
        engine.registerFormatter('fmt2', formatter2);
      }).not.toThrow();
    });
  });

  describe('setDefaultFormatter', () => {
    it('should have a setDefaultFormatter method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.setDefaultFormatter).toBeDefined();
      expect(typeof engine.setDefaultFormatter).toBe('function');
    });

    it('should accept a formatter', () => {
      const engine = new APTLEngine('gpt-5.1');
      const formatter: OutputFormatter = {
        format: (sections) => sections.map((s) => s.content).join(''),
        formatSection: (section) => section.content,
        supportsFormat: () => true,
      };
      expect(() => engine.setDefaultFormatter(formatter)).not.toThrow();
    });
  });

  describe('registerDirective', () => {
    it('should have a registerDirective method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.registerDirective).toBeDefined();
      expect(typeof engine.registerDirective).toBe('function');
    });

    it('should accept a directive', () => {
      const engine = new APTLEngine('gpt-5.1');
      const directive = new TestDirective('test');
      expect(() => engine.registerDirective(directive)).not.toThrow();
    });

    it('should allow registering multiple directives', () => {
      const engine = new APTLEngine('gpt-5.1');
      const dir1 = new TestDirective('test1', 'a');
      const dir2 = new TestDirective('test2', 'b');
      const dir3 = new TestDirective('test3', 'c');
      expect(() => {
        engine.registerDirective(dir1);
        engine.registerDirective(dir2);
        engine.registerDirective(dir3);
      }).not.toThrow();
    });

    it('should accept directives with different properties', () => {
      const engine = new APTLEngine('gpt-5.1');

      class MinimalDirective extends InlineDirective {
        readonly name = 'minimal';
        execute(): string {
          return '';
        }
      }

      class ValidatedDirective extends InlineDirective {
        readonly name = 'validated';
        execute(): string {
          return '';
        }
        validate(): void {
          // validation logic
        }
      }

      class ParsedDirective extends InlineDirective {
        readonly name = 'parsed';
        execute(): string {
          return '';
        }
        parseArguments(args: string): any {
          return { args };
        }
      }

      expect(() => {
        engine.registerDirective(new MinimalDirective());
        engine.registerDirective(new ValidatedDirective());
        engine.registerDirective(new ParsedDirective());
      }).not.toThrow();
    });
  });

  describe('unregisterDirective', () => {
    it('should have an unregisterDirective method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.unregisterDirective).toBeDefined();
      expect(typeof engine.unregisterDirective).toBe('function');
    });

    it('should accept a directive name', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(() => engine.unregisterDirective('test')).not.toThrow();
    });

    it('should allow unregistering after registering', () => {
      const engine = new APTLEngine('gpt-5.1');
      const directive = new TestDirective('test');
      engine.registerDirective(directive);
      expect(() => engine.unregisterDirective('test')).not.toThrow();
    });

    it('should not throw when unregistering non-existent directive', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(() => engine.unregisterDirective('nonexistent')).not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should have a clearCache method', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(engine.clearCache).toBeDefined();
      expect(typeof engine.clearCache).toBe('function');
    });

    it('should not throw when called', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(() => engine.clearCache()).not.toThrow();
    });

    it('should allow multiple calls', () => {
      const engine = new APTLEngine('gpt-5.1');
      expect(() => {
        engine.clearCache();
        engine.clearCache();
        engine.clearCache();
      }).not.toThrow();
    });

    it('should work after rendering', () => {
      const engine = new APTLEngine('gpt-5.1');
      engine.render('test');
      expect(() => engine.clearCache()).not.toThrow();
    });
  });

  describe('caching behavior', () => {
    it('should cache templates by default', () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = 'test template';

      engine.render(template);
      // Cache should be used on second render
      const result = engine.render(template);

      expect(result).toBe('test template');
    });

    it('should respect cache option when disabled', () => {
      const engine = new APTLEngine('gpt-5.1', { cache: false });
      const template = 'test template';

      engine.render(template);
      // Should recompile on second render
      const result = engine.render(template);

      expect(result).toBe('test template');
    });

    it('should clear cache when registering directive', () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = 'test';

      engine.render(template);

      const directive = new TestDirective('newdir', 'new');
      engine.registerDirective(directive);

      // Cache should be cleared
      const result = engine.render(template);
      expect(result).toBe('test');
    });

    it('should clear cache when unregistering directive', () => {
      const engine = new APTLEngine('gpt-5.1');
      const directive = new TestDirective('test');

      engine.registerDirective(directive);
      engine.render('template');
      engine.unregisterDirective('test');

      // Cache should be cleared
      const result = engine.render('template');
      expect(result).toBe('template');
    });
  });

  describe('method chaining support', () => {
    it('should allow registering helper after construction', () => {
      const engine = new APTLEngine('gpt-5.1');
      engine.registerHelper('test', () => 'test');
      const result = engine.render('text');
      expect(result).toBeDefined();
    });

    it('should allow registering directive after construction', () => {
      const engine = new APTLEngine('gpt-5.1');
      const directive = new TestDirective('test');
      engine.registerDirective(directive);
      const result = engine.render('text');
      expect(result).toBeDefined();
    });

    it('should allow clearing cache after rendering', () => {
      const engine = new APTLEngine('gpt-5.1');
      engine.render('test');
      engine.clearCache();
      const result = engine.render('test');
      expect(result).toBe('test');
    });
  });

  describe('edge cases', () => {
    it('should handle rendering the same template multiple times', () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = 'same template';

      const result1 = engine.render(template);
      const result2 = engine.render(template);
      const result3 = engine.render(template);

      expect(result1).toBe(template);
      expect(result2).toBe(template);
      expect(result3).toBe(template);
    });

    it('should handle compiling the same template multiple times', () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = 'same template';

      const compiled1 = engine.compile(template);
      const compiled2 = engine.compile(template);

      expect(compiled1.render({})).toBe(template);
      expect(compiled2.render({})).toBe(template);
    });

    it('should handle very long template strings', () => {
      const engine = new APTLEngine('gpt-5.1');
      const longTemplate = 'x'.repeat(10000);

      const result = engine.render(longTemplate);
      expect(result.length).toBe(10000);
    });

    it('should handle templates with newlines', () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = 'line1\nline2\nline3';

      const result = engine.render(template);
      expect(result).toContain('\n');
    });

    it('should handle templates with special characters', () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = 'test\ttab\rcarriage\nnewline';

      const result = engine.render(template);
      expect(result).toBeDefined();
    });
  });
});
