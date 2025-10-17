import { TemplateRegistry } from '@/templates/template-registry';
import { APTLEngine } from '@/core/engine';
import { ObjectFileSystem } from '@/filesystem/object-filesystem';
import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';
import { Compiler } from '@/core/compiler';

describe('TemplateRegistry', () => {
  let compiler: Compiler;

  beforeEach(() => {
    compiler = new Compiler(new Tokenizer(), new Parser());
  });

  describe('Construction', () => {
    it('should create registry with default engine', () => {
      const registry = new TemplateRegistry(compiler);
      expect(registry).toBeInstanceOf(TemplateRegistry);
      expect(registry.list()).toEqual([]);
    });

    it('should create registry with custom engine', () => {
      const engine = new APTLEngine('gpt-5.1');
      const registry = new TemplateRegistry(compiler);
      expect(registry).toBeInstanceOf(TemplateRegistry);
    });

    it('should create registry with options', () => {
      const registry = new TemplateRegistry(compiler, {
        cache: true,
        extensions: ['.aptl', '.tpl'],
      });
      expect(registry).toBeInstanceOf(TemplateRegistry);
    });

    it('should use ObjectFileSystem by default', () => {
      const registry = new TemplateRegistry(compiler);
      const fs = registry.getFileSystem();
      expect(fs).toBeInstanceOf(ObjectFileSystem);
    });

    it('should accept custom file system', () => {
      const customFs = new ObjectFileSystem({ 'test.aptl': '@{name}' });
      const registry = new TemplateRegistry(compiler, {
        fileSystem: customFs,
      });
      expect(registry.getFileSystem()).toBe(customFs);
    });
  });

  describe('Template Registration', () => {
    it('should register template from string', async () => {
      const registry = new TemplateRegistry(compiler);
      await registry.register('test', '@{name}');

      expect(registry.has('test')).toBe(true);
      expect(registry.list()).toContain('test');
    });

    it('should register compiled template', async () => {
      const registry = new TemplateRegistry(compiler);
      const engine = new APTLEngine('gpt-5.1');
      const compiled = await engine.compile('@{name}');

      registry.register('test', compiled);

      expect(registry.has('test')).toBe(true);
    });

    it('should overwrite existing template', async () => {
      const registry = new TemplateRegistry(compiler);
      await registry.register('test', '@{old}');
      await registry.register('test', '@{new}');

      const template = registry.get('test');
      const result = template.render({ new: 'value' });
      expect(result).toBe('value');
    });

    it('should register multiple templates', async () => {
      const registry = new TemplateRegistry(compiler);
      await registry.register('template1', '@{name}');
      await registry.register('template2', '@{title}');
      await registry.register('template3', '@{content}');

      expect(registry.list()).toHaveLength(3);
      expect(registry.list()).toEqual(
        expect.arrayContaining(['template1', 'template2', 'template3']),
      );
    });
  });

  describe('Template Retrieval', () => {
    it('should get registered template', async () => {
      const registry = new TemplateRegistry(compiler);
      await registry.register('greeting', 'Hello @{name}!');

      const template = registry.get('greeting');
      expect(template).toBeDefined();
      expect(template.render({ name: 'World' })).toBe('Hello World!');
    });

    it('should throw error for non-existent template', () => {
      const registry = new TemplateRegistry(compiler);
      expect(() => registry.get('missing')).toThrow(
        'Template not found: missing',
      );
    });

    it('should check template existence', async () => {
      const registry = new TemplateRegistry(compiler);
      await registry.register('exists', '@{test}');

      expect(registry.has('exists')).toBe(true);
      expect(registry.has('missing')).toBe(false);
    });
  });

  describe('Template Unregistration', () => {
    it('should unregister template', async () => {
      const registry = new TemplateRegistry(compiler);
      await registry.register('temp', '@{test}');

      expect(registry.has('temp')).toBe(true);
      const result = registry.unregister('temp');
      expect(result).toBe(true);
      expect(registry.has('temp')).toBe(false);
    });

    it('should return false when unregistering non-existent template', () => {
      const registry = new TemplateRegistry(compiler);
      const result = registry.unregister('missing');
      expect(result).toBe(false);
    });

    it('should not affect other templates', async () => {
      const registry = new TemplateRegistry(compiler);
      await registry.register('keep', '@{keep}');
      await registry.register('remove', '@{remove}');

      registry.unregister('remove');

      expect(registry.has('keep')).toBe(true);
      expect(registry.has('remove')).toBe(false);
      expect(registry.list()).toEqual(['keep']);
    });
  });

  describe('List Templates', () => {
    it('should list all template names', async () => {
      const registry = new TemplateRegistry(compiler);
      await registry.register('a', '@{a}');
      await registry.register('b', '@{b}');
      await registry.register('c', '@{c}');

      const names = registry.list();
      expect(names).toHaveLength(3);
      expect(names).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    });

    it('should return empty array when no templates', async () => {
      const registry = new TemplateRegistry(compiler);
      expect(registry.list()).toEqual([]);
    });
  });

  describe('Clear Registry', () => {
    it('should clear all templates', () => {
      const registry = new TemplateRegistry(compiler);
      registry.register('t1', '@{t1}');
      registry.register('t2', '@{t2}');

      registry.clear();

      expect(registry.list()).toEqual([]);
      expect(registry.has('t1')).toBe(false);
      expect(registry.has('t2')).toBe(false);
    });

    it('should clear loaded directories tracking', async () => {
      const fs = new ObjectFileSystem({
        'templates/test.aptl': '@{test}',
      });
      const registry = new TemplateRegistry(compiler, { fileSystem: fs });

      await registry.loadDirectory('templates');
      expect(registry.getLoadedDirectories()).toContain('templates');

      registry.clear();

      expect(registry.getLoadedDirectories()).toEqual([]);
    });
  });

  describe('Loading from FileSystem', () => {
    describe('loadFile', () => {
      it('should load single template file', async () => {
        const fs = new ObjectFileSystem({
          'templates/greeting.aptl': 'Hello @{name}!',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadFile('templates/greeting.aptl');

        expect(registry.has('templates/greeting')).toBe(true);
        const template = registry.get('templates/greeting');
        expect(template.render({ name: 'World' })).toBe('Hello World!');
      });

      it('should extract template name from file path', async () => {
        const fs = new ObjectFileSystem({
          'path/to/templates/mytemplate.aptl': '@{content}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadFile('path/to/templates/mytemplate.aptl');

        expect(registry.has('path/to/templates/mytemplate')).toBe(true);
      });

      it('should handle templates in root directory', async () => {
        const fs = new ObjectFileSystem({
          'template.aptl': '@{value}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadFile('template.aptl');

        expect(registry.has('template')).toBe(true);
      });

      it('should handle custom extensions', async () => {
        const fs = new ObjectFileSystem({
          'template.tpl': '@{custom}',
        });
        const registry = new TemplateRegistry(compiler, {
          fileSystem: fs,
          extensions: ['.tpl'],
        });

        await registry.loadFile('template.tpl');

        expect(registry.has('template')).toBe(true);
      });
    });

    describe('loadDirectory', () => {
      it('should load all templates from directory', async () => {
        const fs = new ObjectFileSystem({
          'templates/header.aptl': '@{title}',
          'templates/footer.aptl': '@{copyright}',
          'templates/content.aptl': '@{body}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates');

        expect(registry.list()).toHaveLength(3);
        expect(registry.has('templates/header')).toBe(true);
        expect(registry.has('templates/footer')).toBe(true);
        expect(registry.has('templates/content')).toBe(true);
      });

      it('should load templates recursively by default', async () => {
        const fs = new ObjectFileSystem({
          'templates/base.aptl': '@{base}',
          'templates/components/header.aptl': '@{header}',
          'templates/components/footer.aptl': '@{footer}',
          'templates/components/nav/main.aptl': '@{nav}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates');

        expect(registry.list()).toHaveLength(4);
        expect(registry.has('templates/base')).toBe(true);
        expect(registry.has('templates/components/header')).toBe(true);
        expect(registry.has('templates/components/footer')).toBe(true);
        expect(registry.has('templates/components/nav/main')).toBe(true);
      });

      it('should not recurse when recursive is false', async () => {
        const fs = new ObjectFileSystem({
          'templates/root.aptl': '@{root}',
          'templates/subdir/nested.aptl': '@{nested}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates', { recursive: false });

        expect(registry.has('templates/root')).toBe(true);
        expect(registry.has('templates/subdir/nested')).toBe(false);
      });

      it('should filter by pattern', async () => {
        const fs = new ObjectFileSystem({
          'templates/component-header.aptl': '@{header}',
          'templates/component-footer.aptl': '@{footer}',
          'templates/page-home.aptl': '@{home}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates', {
          pattern: /component-/,
        });

        expect(registry.list()).toHaveLength(2);
        expect(registry.has('templates/component-header')).toBe(true);
        expect(registry.has('templates/component-footer')).toBe(true);
        expect(registry.has('templates/page-home')).toBe(false);
      });

      it('should only load files with matching extensions', async () => {
        const fs = new ObjectFileSystem({
          'templates/valid.aptl': '@{valid}',
          'templates/readme.md': '# README',
          'templates/config.json': '{}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates');

        expect(registry.list()).toHaveLength(1);
        expect(registry.has('templates/valid')).toBe(true);
      });

      it('should handle multiple custom extensions', async () => {
        const fs = new ObjectFileSystem({
          'templates/file1.aptl': '@{file1}',
          'templates/file2.tpl': '@{file2}',
          'templates/file3.txt': '@{file3}',
        });
        const registry = new TemplateRegistry(compiler, {
          fileSystem: fs,
          extensions: ['.aptl', '.tpl'],
        });

        await registry.loadDirectory('templates');

        expect(registry.list()).toHaveLength(2);
        expect(registry.has('templates/file1')).toBe(true);
        expect(registry.has('templates/file2')).toBe(true);
        expect(registry.has('templates/file3')).toBe(false);
      });

      it('should track loaded directories', async () => {
        const fs = new ObjectFileSystem({
          'dir1/test1.aptl': '@{test1}',
          'dir2/test2.aptl': '@{test2}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('dir1');
        await registry.loadDirectory('dir2');

        const dirs = registry.getLoadedDirectories();
        expect(dirs).toHaveLength(2);
        expect(dirs).toContain('dir1');
        expect(dirs).toContain('dir2');
      });

      it('should handle empty directories', async () => {
        const fs = new ObjectFileSystem();
        await fs.mkdir('empty');
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('empty');

        expect(registry.list()).toEqual([]);
      });
    });

    describe('refresh', () => {
      it('should reload all templates from tracked directories', async () => {
        const fs = new ObjectFileSystem({
          'templates/test.aptl': '@{old}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates');
        let template = registry.get('templates/test');
        expect(template.render({ old: 'old value' })).toBe('old value');

        // Modify file in filesystem
        await fs.writeFile('templates/test.aptl', '@{new}');

        await registry.refresh();

        template = registry.get('templates/test');
        expect(template.render({ new: 'new value' })).toBe('new value');
      });

      it('should reload multiple directories', async () => {
        const fs = new ObjectFileSystem({
          'dir1/test1.aptl': '@{old1}',
          'dir2/test2.aptl': '@{old2}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('dir1');
        await registry.loadDirectory('dir2');

        // Modify files
        await fs.writeFile('dir1/test1.aptl', '@{new1}');
        await fs.writeFile('dir2/test2.aptl', '@{new2}');

        await registry.refresh();

        expect(registry.get('dir1/test1').render({ new1: 'val1' })).toBe(
          'val1',
        );
        expect(registry.get('dir2/test2').render({ new2: 'val2' })).toBe(
          'val2',
        );
      });

      it('should clear old templates before reloading', async () => {
        const fs = new ObjectFileSystem({
          'templates/keep.aptl': '@{keep}',
          'templates/remove.aptl': '@{remove}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates');
        expect(registry.has('templates/keep')).toBe(true);
        expect(registry.has('templates/remove')).toBe(true);

        // Remove one file from filesystem
        await fs.unlink('templates/remove.aptl');

        await registry.refresh();

        expect(registry.has('templates/keep')).toBe(true);
        expect(registry.has('templates/remove')).toBe(false);
      });

      it('should handle new files added to directory', async () => {
        const fs = new ObjectFileSystem({
          'templates/existing.aptl': '@{existing}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates');
        expect(registry.list()).toHaveLength(1);

        // Add new file
        await fs.writeFile('templates/newfile.aptl', '@{new}');

        await registry.refresh();

        expect(registry.list()).toHaveLength(2);
        expect(registry.has('templates/existing')).toBe(true);
        expect(registry.has('templates/newfile')).toBe(true);
      });

      it('should preserve directory load options on refresh', async () => {
        const fs = new ObjectFileSystem({
          'templates/component-a.aptl': '@{a}',
          'templates/component-b.aptl': '@{b}',
          'templates/page-home.aptl': '@{home}',
        });
        const registry = new TemplateRegistry(compiler, { fileSystem: fs });

        await registry.loadDirectory('templates', { pattern: /component-/ });
        expect(registry.list()).toHaveLength(2);

        // Add another component file
        await fs.writeFile('templates/component-c.aptl', '@{c}');

        await registry.refresh();

        expect(registry.list()).toHaveLength(3);
        expect(registry.has('templates/component-a')).toBe(true);
        expect(registry.has('templates/component-b')).toBe(true);
        expect(registry.has('templates/component-c')).toBe(true);
        expect(registry.has('templates/page-home')).toBe(false); // Still filtered
      });

      it('should throw error when trying to refresh by name', async () => {
        const registry = new TemplateRegistry(compiler);
        await expect(registry.refresh('test')).rejects.toThrow(
          'Refreshing individual templates by name is not supported',
        );
      });
    });
  });

  describe('FileSystem Management', () => {
    it('should return current file system', () => {
      const fs = new ObjectFileSystem();
      const registry = new TemplateRegistry(compiler, { fileSystem: fs });

      expect(registry.getFileSystem()).toBe(fs);
    });

    it('should set new file system', () => {
      const registry = new TemplateRegistry(compiler);
      const newFs = new ObjectFileSystem({ 'test.aptl': '@{test}' });

      registry.setFileSystem(newFs);

      expect(registry.getFileSystem()).toBe(newFs);
    });

    it('should clear templates when setting new file system', async () => {
      const fs1 = new ObjectFileSystem({ 'test1.aptl': '@{test1}' });
      const registry = new TemplateRegistry(compiler, { fileSystem: fs1 });

      await registry.loadFile('test1.aptl');
      expect(registry.has('test1')).toBe(true);

      const fs2 = new ObjectFileSystem({ 'test2.aptl': '@{test2}' });
      registry.setFileSystem(fs2);

      expect(registry.has('test1')).toBe(false);
      expect(registry.list()).toEqual([]);
    });

    it('should clear loaded directories when setting new file system', async () => {
      const fs1 = new ObjectFileSystem({ 'dir/test.aptl': '@{test}' });
      const registry = new TemplateRegistry(compiler, { fileSystem: fs1 });

      await registry.loadDirectory('dir');
      expect(registry.getLoadedDirectories()).toContain('dir');

      const fs2 = new ObjectFileSystem();
      registry.setFileSystem(fs2);

      expect(registry.getLoadedDirectories()).toEqual([]);
    });
  });

  describe('Template Name Extraction', () => {
    it('should extract name from simple path', async () => {
      const fs = new ObjectFileSystem({ 'template.aptl': '@{test}' });
      const registry = new TemplateRegistry(compiler, { fileSystem: fs });

      await registry.loadFile('template.aptl');
      expect(registry.has('template')).toBe(true);
    });

    it('should extract name from nested path', async () => {
      const fs = new ObjectFileSystem({
        'dir/subdir/mytemplate.aptl': '@{test}',
      });
      const registry = new TemplateRegistry(compiler, { fileSystem: fs });

      await registry.loadFile('dir/subdir/mytemplate.aptl');
      expect(registry.has('dir/subdir/mytemplate')).toBe(true);
    });

    it('should handle paths with backslashes', async () => {
      const fs = new ObjectFileSystem({ 'dir\\template.aptl': '@{test}' });
      const registry = new TemplateRegistry(compiler, { fileSystem: fs });

      await registry.loadFile('dir\\template.aptl');
      expect(registry.has('dir/template')).toBe(true);
    });

    it('should remove extension from name', async () => {
      const fs = new ObjectFileSystem({
        'template.aptl': '@{test1}',
        'other.tpl': '@{test2}',
      });
      const registry = new TemplateRegistry(compiler, {
        fileSystem: fs,
        extensions: ['.aptl', '.tpl'],
      });

      await registry.loadFile('template.aptl');
      await registry.loadFile('other.tpl');

      expect(registry.has('template')).toBe(true);
      expect(registry.has('other')).toBe(true);
      expect(registry.has('template.aptl')).toBe(false);
      expect(registry.has('other.tpl')).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should manage email template library', async () => {
      const fs = new ObjectFileSystem({
        'emails/welcome.aptl': 'Welcome @{username}!',
        'emails/reset-password.aptl': 'Reset: @{resetLink}',
        'emails/notification.aptl': 'You have @{count} new messages',
        'emails/components/header.aptl': '@{companyName} Email',
        'emails/components/footer.aptl': '© @{year} @{companyName}',
      });

      const registry = new TemplateRegistry(compiler, { fileSystem: fs });
      await registry.loadDirectory('emails');

      expect(registry.list()).toHaveLength(5);

      // Use templates
      const welcome = registry.get('emails/welcome');
      expect(welcome.render({ username: 'John' })).toBe('Welcome John!');

      const notification = registry.get('emails/notification');
      expect(notification.render({ count: 5 })).toBe('You have 5 new messages');
    });

    it('should handle component library with pattern filtering', async () => {
      const fs = new ObjectFileSystem({
        'components/btn-primary.aptl': '@{label}',
        'components/btn-secondary.aptl': '@{label}',
        'components/input-text.aptl': '@{placeholder}',
        'components/input-password.aptl': '@{placeholder}',
        'pages/home.aptl': '@{content}',
      });

      const registry = new TemplateRegistry(compiler, { fileSystem: fs });

      // Load only button components
      await registry.loadDirectory('components', { pattern: /btn-/ });

      expect(registry.list()).toHaveLength(2);
      expect(registry.has('components/btn-primary')).toBe(true);
      expect(registry.has('components/btn-secondary')).toBe(true);
      expect(registry.has('components/input-text')).toBe(false);
    });

    it('should support template hot-reload workflow', async () => {
      const fs = new ObjectFileSystem({
        'templates/greeting.aptl': 'Hello @{name}',
      });

      const registry = new TemplateRegistry(compiler, { fileSystem: fs });
      await registry.loadDirectory('templates');

      // Initial render
      let result = registry.get('templates/greeting').render({ name: 'Alice' });
      expect(result).toBe('Hello Alice');

      // Developer edits template
      await fs.writeFile('templates/greeting.aptl', 'Hi there, @{name}!');

      // Refresh to reload
      await registry.refresh();

      // New render with updated template
      result = registry.get('templates/greeting').render({ name: 'Alice' });
      expect(result).toBe('Hi there, Alice!');
    });

    it('should handle mixed extension project', async () => {
      const fs = new ObjectFileSystem({
        'templates/page.aptl': '@{page}',
        'templates/component.tpl': '@{component}',
        'templates/partial.html': '@{partial}',
      });

      const registry = new TemplateRegistry(compiler, {
        fileSystem: fs,
        extensions: ['.aptl', '.tpl', '.html'],
      });

      await registry.loadDirectory('templates');

      expect(registry.list()).toHaveLength(3);
      expect(registry.has('templates/page')).toBe(true);
      expect(registry.has('templates/component')).toBe(true);
      expect(registry.has('templates/partial')).toBe(true);
    });

    it('should support dynamic template registration', async () => {
      const registry = new TemplateRegistry(compiler);

      // Pre-register some templates
      await registry.register('default', 'Default: @{value}');

      // Dynamically add more at runtime
      await registry.register('custom', 'Custom: @{value}');
      await registry.register('special', 'Special: @{value}');

      expect(registry.list()).toHaveLength(3);

      // Use any of them
      expect(registry.get('default').render({ value: 'test' })).toBe(
        'Default: test',
      );
      expect(registry.get('custom').render({ value: 'test' })).toBe(
        'Custom: test',
      );
    });

    it('should handle concurrent template loading', async () => {
      const fs = new ObjectFileSystem({
        'dir1/a.aptl': '@{a}',
        'dir1/b.aptl': '@{b}',
        'dir2/c.aptl': '@{c}',
        'dir2/d.aptl': '@{d}',
      });

      const registry = new TemplateRegistry(compiler, { fileSystem: fs });

      // Load directories concurrently
      await Promise.all([
        registry.loadDirectory('dir1'),
        registry.loadDirectory('dir2'),
      ]);

      console.log(registry.list());
      expect(registry.list()).toHaveLength(4);
      expect(registry.has('dir1/a')).toBe(true);
      expect(registry.has('dir1/b')).toBe(true);
      expect(registry.has('dir2/c')).toBe(true);
      expect(registry.has('dir2/d')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle template with same name in different directories', async () => {
      const fs = new ObjectFileSystem({
        'dir1/template.aptl': '@{version1}',
        'dir2/template.aptl': '@{version2}',
      });

      const registry = new TemplateRegistry(compiler, { fileSystem: fs });

      await registry.loadDirectory('dir1');
      await registry.loadDirectory('dir2');

      // Later directory overwrites earlier one
      const template = registry.get('dir2/template');
      expect(template.render({ version2: 'v2' })).toBe('v2');
    });

    it('should handle files without extension', async () => {
      const fs = new ObjectFileSystem({
        'templates/noext': '@{test}',
      });

      const registry = new TemplateRegistry(compiler, {
        fileSystem: fs,
        extensions: [],
      });

      await registry.loadDirectory('templates');

      // Won't be loaded because it doesn't match any extension
      expect(registry.list()).toEqual([]);
    });

    it('should handle deeply nested directory structures', async () => {
      const fs = new ObjectFileSystem({
        'a/b/c/d/e/f/deep.aptl': '@{deep}',
      });

      const registry = new TemplateRegistry(compiler, { fileSystem: fs });
      await registry.loadDirectory('a');

      expect(registry.has('a/b/c/d/e/f/deep')).toBe(true);
    });

    it('should handle special characters in filenames', async () => {
      const fs = new ObjectFileSystem({
        'templates/file-with-dash.aptl': '@{dash}',
        'templates/file_with_underscore.aptl': '@{underscore}',
        'templates/file.with.dots.aptl': '@{dots}',
      });

      const registry = new TemplateRegistry(compiler, { fileSystem: fs });
      await registry.loadDirectory('templates');

      expect(registry.has('templates/file-with-dash')).toBe(true);
      expect(registry.has('templates/file_with_underscore')).toBe(true);
      expect(registry.has('templates/file.with.dots')).toBe(true);
    });

    it('should handle templates that compile with errors gracefully', () => {
      const registry = new TemplateRegistry(compiler);

      // This should still register even if template has issues
      // The engine will handle errors during render
      registry.register('problematic', '@if{unclosed', true);

      expect(registry.has('problematic')).toBe(false);
    });
  });
});
