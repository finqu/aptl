/**
 * Template Registry Integration Tests
 */

import { TemplateRegistry } from '../../src/templates/template-registry';
import { APTLEngine } from '../../src/core/engine';
import { ObjectFileSystem } from '../../src/filesystem/object-filesystem';
import { FileSystemError } from '../../src/filesystem/filesystem';

describe('TemplateRegistry with ObjectFileSystem', () => {
  let registry: TemplateRegistry;
  let fileSystem: ObjectFileSystem;

  beforeEach(() => {
    // Initialize with some template files
    fileSystem = new ObjectFileSystem({
      'templates/greeting.aptl': 'Hello, @{name}!',
      'templates/user-info.aptl': `
---section: user
Name: @{user.name}
Email: @{user.email}
---
`,
      'templates/nested/detail.aptl': `
---section: details
@if details.active
Status: Active
@else
Status: Inactive
@end
---
`,
      'other/not-template.txt': 'This should not be loaded',
    });

    registry = new TemplateRegistry(new APTLEngine(), { fileSystem });
  });

  describe('loadDirectory', () => {
    it('should load all template files from a directory', async () => {
      await registry.loadDirectory('templates');

      expect(registry.has('greeting')).toBe(true);
      expect(registry.has('user-info')).toBe(true);
      expect(registry.list()).toContain('greeting');
      expect(registry.list()).toContain('user-info');
    });

    it('should recursively load templates from nested directories', async () => {
      await registry.loadDirectory('templates', { recursive: true });

      expect(registry.has('detail')).toBe(true);
    });

    it('should not load non-template files', async () => {
      await registry.loadDirectory('other');

      expect(registry.has('not-template')).toBe(false);
    });

    it('should filter by pattern', async () => {
      await registry.loadDirectory('templates', {
        pattern: /greeting/,
      });

      expect(registry.has('greeting')).toBe(true);
      expect(registry.has('user-info')).toBe(false);
    });
  });

  describe('loadFile', () => {
    it('should load a single template file', async () => {
      await registry.loadFile('templates/greeting.aptl');

      expect(registry.has('greeting')).toBe(true);
    });

    it('should compile the template correctly', async () => {
      await registry.loadFile('templates/greeting.aptl');

      const template = registry.get('greeting');
      const result = template.render({ name: 'World' });

      expect(result).toBe('Hello, World!');
    });
  });

  describe('get', () => {
    it('should retrieve a compiled template', async () => {
      await registry.loadFile('templates/greeting.aptl');

      const template = registry.get('greeting');
      expect(template).toBeDefined();
      expect(typeof template.render).toBe('function');
    });

    it('should throw error for non-existent template', () => {
      expect(() => registry.get('non-existent')).toThrow(
        'Template not found: non-existent',
      );
    });
  });

  describe('register', () => {
    it('should register a template from string', () => {
      registry.register('custom', 'Custom template: @{value}');

      expect(registry.has('custom')).toBe(true);

      const template = registry.get('custom');
      const result = template.render({ value: 'test' });
      expect(result).toBe('Custom template: test');
    });

    it('should register a pre-compiled template', () => {
      const engine = new APTLEngine();
      const compiled = engine.compile('Pre-compiled: @{value}');

      registry.register('precompiled', compiled);

      expect(registry.has('precompiled')).toBe(true);

      const template = registry.get('precompiled');
      const result = template.render({ value: 'test' });
      expect(result).toBe('Pre-compiled: test');
    });
  });

  describe('list', () => {
    it('should list all registered templates', async () => {
      await registry.loadDirectory('templates');

      const templates = registry.list();
      expect(templates).toContain('greeting');
      expect(templates).toContain('user-info');
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should return empty array when no templates registered', () => {
      const templates = registry.list();
      expect(templates).toEqual([]);
    });
  });

  describe('has', () => {
    it('should return true for existing template', async () => {
      await registry.loadFile('templates/greeting.aptl');

      expect(registry.has('greeting')).toBe(true);
    });

    it('should return false for non-existing template', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should remove a template', async () => {
      await registry.loadFile('templates/greeting.aptl');

      expect(registry.has('greeting')).toBe(true);

      const removed = registry.unregister('greeting');

      expect(removed).toBe(true);
      expect(registry.has('greeting')).toBe(false);
    });

    it('should return false when removing non-existent template', () => {
      const removed = registry.unregister('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all templates', async () => {
      await registry.loadDirectory('templates');

      expect(registry.list().length).toBeGreaterThan(0);

      registry.clear();

      expect(registry.list().length).toBe(0);
    });

    it('should clear tracked directories', async () => {
      await registry.loadDirectory('templates');

      expect(registry.getLoadedDirectories().length).toBe(1);

      registry.clear();

      expect(registry.getLoadedDirectories().length).toBe(0);
    });
  });

  describe('refresh', () => {
    it('should reload templates from filesystem', async () => {
      await registry.loadDirectory('templates');

      const initialCount = registry.list().length;
      expect(initialCount).toBeGreaterThan(0);

      // Modify the filesystem
      await fileSystem.writeFile(
        'templates/new-template.aptl',
        'New: @{value}',
      );

      // Refresh should pick up the new file
      await registry.refresh();

      const newCount = registry.list().length;
      expect(newCount).toBe(initialCount + 1);
      expect(registry.has('new-template')).toBe(true);
    });

    it('should update existing templates on refresh', async () => {
      await registry.loadDirectory('templates');

      // Get original template
      const original = registry.get('greeting');
      const originalResult = original.render({ name: 'Alice' });
      expect(originalResult).toBe('Hello, Alice!');

      // Modify the template in the filesystem
      await fileSystem.writeFile('templates/greeting.aptl', 'Hi, @{name}!');

      // Refresh to pick up changes
      await registry.refresh();

      // Get updated template
      const updated = registry.get('greeting');
      const updatedResult = updated.render({ name: 'Bob' });
      expect(updatedResult).toBe('Hi, Bob!');
    });

    it('should handle deleted templates on refresh', async () => {
      await registry.loadDirectory('templates');

      expect(registry.has('greeting')).toBe(true);

      // Delete template from filesystem
      await fileSystem.unlink('templates/greeting.aptl');

      // Refresh should remove the template
      await registry.refresh();

      expect(registry.has('greeting')).toBe(false);
    });

    it('should reload from all tracked directories', async () => {
      await registry.loadDirectory('templates');
      await fileSystem.mkdir('templates2');
      await fileSystem.writeFile('templates2/extra.aptl', 'Extra: @{value}');
      await registry.loadDirectory('templates2');

      expect(registry.getLoadedDirectories()).toContain('templates');
      expect(registry.getLoadedDirectories()).toContain('templates2');

      // Modify both directories
      await fileSystem.writeFile('templates/new1.aptl', 'New1: @{value}');
      await fileSystem.writeFile('templates2/new2.aptl', 'New2: @{value}');

      await registry.refresh();

      expect(registry.has('new1')).toBe(true);
      expect(registry.has('new2')).toBe(true);
    });

    it('should throw error when refreshing by name', async () => {
      await expect(registry.refresh('greeting')).rejects.toThrow(
        'Refreshing individual templates by name is not supported',
      );
    });
  });

  describe('getLoadedDirectories', () => {
    it('should return empty array initially', () => {
      const dirs = registry.getLoadedDirectories();
      expect(dirs).toEqual([]);
    });

    it('should track loaded directories', async () => {
      await registry.loadDirectory('templates');

      const dirs = registry.getLoadedDirectories();
      expect(dirs).toContain('templates');
    });

    it('should track multiple directories', async () => {
      await registry.loadDirectory('templates');
      await registry.loadDirectory('other');

      const dirs = registry.getLoadedDirectories();
      expect(dirs).toContain('templates');
      expect(dirs).toContain('other');
    });
  });

  describe('FileSystem integration', () => {
    it('should use the provided FileSystem', () => {
      const fs = registry.getFileSystem();
      expect(fs).toBe(fileSystem);
    });

    it('should allow changing the FileSystem', async () => {
      const newFs = new ObjectFileSystem({
        'new/template.aptl': 'New: {{value}}',
      });

      registry.setFileSystem(newFs);
      await registry.loadDirectory('new');

      expect(registry.has('template')).toBe(true);
    });
  });
});

describe('ObjectFileSystem', () => {
  let fs: ObjectFileSystem;

  beforeEach(() => {
    fs = new ObjectFileSystem({
      'file.txt': 'content',
      'dir/nested.txt': 'nested content',
    });
  });

  describe('readFile', () => {
    it('should read existing file', async () => {
      const content = await fs.readFile('file.txt');
      expect(content).toBe('content');
    });

    it('should read nested file', async () => {
      const content = await fs.readFile('dir/nested.txt');
      expect(content).toBe('nested content');
    });

    it('should throw error for non-existent file', async () => {
      await expect(fs.readFile('non-existent.txt')).rejects.toThrow(
        FileSystemError,
      );
    });

    it('should throw error when trying to read directory', async () => {
      await expect(fs.readFile('dir')).rejects.toThrow(FileSystemError);
    });
  });

  describe('writeFile', () => {
    it('should write new file', async () => {
      await fs.writeFile('new.txt', 'new content');

      const content = await fs.readFile('new.txt');
      expect(content).toBe('new content');
    });

    it('should overwrite existing file', async () => {
      await fs.writeFile('file.txt', 'updated');

      const content = await fs.readFile('file.txt');
      expect(content).toBe('updated');
    });

    it('should create nested directories automatically', async () => {
      await fs.writeFile('deep/nested/file.txt', 'deep content');

      const content = await fs.readFile('deep/nested/file.txt');
      expect(content).toBe('deep content');
    });
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const exists = await fs.exists('file.txt');
      expect(exists).toBe(true);
    });

    it('should return true for existing directory', async () => {
      const exists = await fs.exists('dir');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent path', async () => {
      const exists = await fs.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('stat', () => {
    it('should return stats for file', async () => {
      const stats = await fs.stat('file.txt');

      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(stats.size).toBe(7); // 'content'.length
      expect(stats.modifiedTime).toBeInstanceOf(Date);
    });

    it('should return stats for directory', async () => {
      const stats = await fs.stat('dir');

      expect(stats.isFile).toBe(false);
      expect(stats.isDirectory).toBe(true);
    });

    it('should throw error for non-existent path', async () => {
      await expect(fs.stat('non-existent')).rejects.toThrow(FileSystemError);
    });
  });

  describe('readdir', () => {
    it('should list directory contents', async () => {
      const entries = await fs.readdir('dir');

      expect(entries).toHaveLength(1);
      expect(entries[0].path).toBe('dir/nested.txt');
      expect(entries[0].isDirectory).toBe(false);
    });

    it('should list root directory', async () => {
      const entries = await fs.readdir('/');

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((e) => e.path === 'file.txt')).toBe(true);
    });

    it('should throw error for non-existent directory', async () => {
      await expect(fs.readdir('non-existent')).rejects.toThrow(FileSystemError);
    });

    it('should throw error when reading file as directory', async () => {
      await expect(fs.readdir('file.txt')).rejects.toThrow(FileSystemError);
    });
  });

  describe('unlink', () => {
    it('should delete file', async () => {
      await fs.unlink('file.txt');

      const exists = await fs.exists('file.txt');
      expect(exists).toBe(false);
    });

    it('should throw error for directory', async () => {
      await expect(fs.unlink('dir')).rejects.toThrow(FileSystemError);
    });

    it('should throw error for non-existent file', async () => {
      await expect(fs.unlink('non-existent')).rejects.toThrow(FileSystemError);
    });
  });

  describe('mkdir', () => {
    it('should create directory', async () => {
      await fs.mkdir('newdir');

      const stats = await fs.stat('newdir');
      expect(stats.isDirectory).toBe(true);
    });

    it('should throw error if directory exists', async () => {
      await fs.mkdir('newdir');

      await expect(fs.mkdir('newdir')).rejects.toThrow(FileSystemError);
    });
  });

  describe('rmdir', () => {
    it('should remove empty directory', async () => {
      await fs.mkdir('emptydir');
      await fs.rmdir('emptydir');

      const exists = await fs.exists('emptydir');
      expect(exists).toBe(false);
    });

    it('should throw error for non-empty directory', async () => {
      await expect(fs.rmdir('dir')).rejects.toThrow(FileSystemError);
    });

    it('should throw error for non-existent directory', async () => {
      await expect(fs.rmdir('non-existent')).rejects.toThrow(FileSystemError);
    });
  });

  describe('toObject', () => {
    it('should convert filesystem to object', () => {
      const obj = fs.toObject();

      expect(obj['file.txt']).toBe('content');
      expect(obj['dir/nested.txt']).toBe('nested content');
    });
  });
});
