import { ObjectFileSystem, FileSystemError } from '@/filesystem';

describe('ObjectFileSystem', () => {
  describe('Construction and Initialization', () => {
    it('should create empty filesystem', async () => {
      const fs = new ObjectFileSystem();
      const entries = await fs.readdir('');
      expect(entries).toEqual([]);
    });

    it('should initialize with files', async () => {
      const fs = new ObjectFileSystem({
        'file.txt': 'content',
        'dir/nested.txt': 'nested content',
      });

      expect(await fs.readFile('file.txt')).toBe('content');
      expect(await fs.readFile('dir/nested.txt')).toBe('nested content');
    });

    it('should create parent directories during initialization', async () => {
      const fs = new ObjectFileSystem({
        'a/b/c/deep.txt': 'deep content',
      });

      expect(await fs.exists('a')).toBe(true);
      expect(await fs.exists('a/b')).toBe(true);
      expect(await fs.exists('a/b/c')).toBe(true);
      expect(await fs.readFile('a/b/c/deep.txt')).toBe('deep content');
    });
  });

  describe('File Operations', () => {
    describe('readFile', () => {
      it('should read existing file', async () => {
        const fs = new ObjectFileSystem({ 'test.txt': 'hello world' });
        expect(await fs.readFile('test.txt')).toBe('hello world');
      });

      it('should throw FileSystemError.notFound for missing file', async () => {
        const fs = new ObjectFileSystem();
        await expect(fs.readFile('missing.txt')).rejects.toThrow(
          FileSystemError,
        );
        await expect(fs.readFile('missing.txt')).rejects.toThrow(
          'File not found',
        );
      });

      it('should throw FileSystemError.isDirectory when reading directory', async () => {
        const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
        await expect(fs.readFile('dir')).rejects.toThrow(FileSystemError);
        await expect(fs.readFile('dir')).rejects.toThrow('Is a directory');
      });

      it('should read files with special characters', async () => {
        const content = 'Special: @{variable} #comment /* code */';
        const fs = new ObjectFileSystem({ 'special.txt': content });
        expect(await fs.readFile('special.txt')).toBe(content);
      });
    });

    describe('writeFile', () => {
      it('should write new file', async () => {
        const fs = new ObjectFileSystem();
        await fs.writeFile('new.txt', 'new content');
        expect(await fs.readFile('new.txt')).toBe('new content');
      });

      it('should overwrite existing file', async () => {
        const fs = new ObjectFileSystem({ 'test.txt': 'old content' });
        await fs.writeFile('test.txt', 'new content');
        expect(await fs.readFile('test.txt')).toBe('new content');
      });

      it('should create parent directories automatically', async () => {
        const fs = new ObjectFileSystem();
        await fs.writeFile('a/b/c/file.txt', 'content');

        expect(await fs.exists('a')).toBe(true);
        expect(await fs.exists('a/b')).toBe(true);
        expect(await fs.exists('a/b/c')).toBe(true);
        expect(await fs.readFile('a/b/c/file.txt')).toBe('content');
      });

      it('should handle empty content', async () => {
        const fs = new ObjectFileSystem();
        await fs.writeFile('empty.txt', '');
        expect(await fs.readFile('empty.txt')).toBe('');
      });

      it('should update modified time', async () => {
        const fs = new ObjectFileSystem();
        await fs.writeFile('test.txt', 'content 1');
        const stat1 = await fs.stat('test.txt');

        // Wait a bit to ensure different timestamp
        await new Promise((resolve) => setTimeout(resolve, 10));

        await fs.writeFile('test.txt', 'content 2');
        const stat2 = await fs.stat('test.txt');

        expect(stat2.modifiedTime.getTime()).toBeGreaterThan(
          stat1.modifiedTime.getTime(),
        );
      });
    });

    describe('exists', () => {
      it('should return true for existing files', async () => {
        const fs = new ObjectFileSystem({ 'file.txt': 'content' });
        expect(await fs.exists('file.txt')).toBe(true);
      });

      it('should return true for existing directories', async () => {
        const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
        expect(await fs.exists('dir')).toBe(true);
      });

      it('should return false for non-existent paths', async () => {
        const fs = new ObjectFileSystem();
        expect(await fs.exists('missing.txt')).toBe(false);
        expect(await fs.exists('missing/dir')).toBe(false);
      });

      it('should handle root directory', async () => {
        const fs = new ObjectFileSystem();
        expect(await fs.exists('')).toBe(true);
        expect(await fs.exists('/')).toBe(true);
      });
    });

    describe('unlink', () => {
      it('should delete existing file', async () => {
        const fs = new ObjectFileSystem({ 'test.txt': 'content' });
        await fs.unlink('test.txt');
        expect(await fs.exists('test.txt')).toBe(false);
      });

      it('should throw FileSystemError.notFound for missing file', async () => {
        const fs = new ObjectFileSystem();
        await expect(fs.unlink('missing.txt')).rejects.toThrow(FileSystemError);
        await expect(fs.unlink('missing.txt')).rejects.toThrow(
          'File not found',
        );
      });

      it('should throw FileSystemError.isDirectory for directories', async () => {
        const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
        await expect(fs.unlink('dir')).rejects.toThrow(FileSystemError);
        await expect(fs.unlink('dir')).rejects.toThrow('Is a directory');
      });

      it('should not affect parent directory', async () => {
        const fs = new ObjectFileSystem({
          'dir/file1.txt': 'content1',
          'dir/file2.txt': 'content2',
        });

        await fs.unlink('dir/file1.txt');

        expect(await fs.exists('dir')).toBe(true);
        expect(await fs.exists('dir/file2.txt')).toBe(true);
      });
    });

    describe('stat', () => {
      it('should return file stats', async () => {
        const fs = new ObjectFileSystem({ 'test.txt': 'hello' });
        const stats = await fs.stat('test.txt');

        expect(stats.isFile).toBe(true);
        expect(stats.isDirectory).toBe(false);
        expect(stats.size).toBe(5);
        expect(stats.modifiedTime).toBeInstanceOf(Date);
      });

      it('should return directory stats', async () => {
        const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
        const stats = await fs.stat('dir');

        expect(stats.isFile).toBe(false);
        expect(stats.isDirectory).toBe(true);
        expect(stats.size).toBe(0);
        expect(stats.modifiedTime).toBeInstanceOf(Date);
      });

      it('should throw FileSystemError.notFound for missing path', async () => {
        const fs = new ObjectFileSystem();
        await expect(fs.stat('missing.txt')).rejects.toThrow(FileSystemError);
        await expect(fs.stat('missing.txt')).rejects.toThrow('File not found');
      });

      it('should calculate correct file size', async () => {
        const fs = new ObjectFileSystem({
          'empty.txt': '',
          'small.txt': 'hi',
          'large.txt': 'a'.repeat(1000),
        });

        expect((await fs.stat('empty.txt')).size).toBe(0);
        expect((await fs.stat('small.txt')).size).toBe(2);
        expect((await fs.stat('large.txt')).size).toBe(1000);
      });
    });
  });

  describe('Directory Operations', () => {
    describe('mkdir', () => {
      it('should create new directory', async () => {
        const fs = new ObjectFileSystem();
        await fs.mkdir('newdir');

        expect(await fs.exists('newdir')).toBe(true);
        const stats = await fs.stat('newdir');
        expect(stats.isDirectory).toBe(true);
      });

      it('should create nested directories', async () => {
        const fs = new ObjectFileSystem();
        await fs.mkdir('a/b/c');

        expect(await fs.exists('a')).toBe(true);
        expect(await fs.exists('a/b')).toBe(true);
        expect(await fs.exists('a/b/c')).toBe(true);
      });

      it('should throw FileSystemError.alreadyExists for existing directory', async () => {
        const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
        await expect(fs.mkdir('dir')).rejects.toThrow(FileSystemError);
        await expect(fs.mkdir('dir')).rejects.toThrow('already exists');
      });

      it('should throw FileSystemError.alreadyExists for existing file', async () => {
        const fs = new ObjectFileSystem({ 'file.txt': 'content' });
        await expect(fs.mkdir('file.txt')).rejects.toThrow(FileSystemError);
        await expect(fs.mkdir('file.txt')).rejects.toThrow('already exists');
      });
    });

    describe('rmdir', () => {
      it('should remove empty directory', async () => {
        const fs = new ObjectFileSystem();
        await fs.mkdir('emptydir');
        await fs.rmdir('emptydir');

        expect(await fs.exists('emptydir')).toBe(false);
      });

      it('should throw error for non-empty directory', async () => {
        const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
        await expect(fs.rmdir('dir')).rejects.toThrow(FileSystemError);
        await expect(fs.rmdir('dir')).rejects.toThrow('not empty');
      });

      it('should throw FileSystemError.notFound for missing directory', async () => {
        const fs = new ObjectFileSystem();
        await expect(fs.rmdir('missing')).rejects.toThrow(FileSystemError);
        await expect(fs.rmdir('missing')).rejects.toThrow('File not found');
      });

      it('should throw FileSystemError.notDirectory for files', async () => {
        const fs = new ObjectFileSystem({ 'file.txt': 'content' });
        await expect(fs.rmdir('file.txt')).rejects.toThrow(FileSystemError);
        await expect(fs.rmdir('file.txt')).rejects.toThrow('Not a directory');
      });
    });

    describe('readdir', () => {
      it('should list directory contents', async () => {
        const fs = new ObjectFileSystem({
          'dir/file1.txt': 'content1',
          'dir/file2.txt': 'content2',
          'dir/subdir/file3.txt': 'content3',
        });

        const entries = await fs.readdir('dir');

        expect(entries).toHaveLength(3);
        expect(entries).toContainEqual({
          path: 'dir/file1.txt',
          isDirectory: false,
        });
        expect(entries).toContainEqual({
          path: 'dir/file2.txt',
          isDirectory: false,
        });
        expect(entries).toContainEqual({
          path: 'dir/subdir',
          isDirectory: true,
        });
      });

      it('should return empty array for empty directory', async () => {
        const fs = new ObjectFileSystem();
        await fs.mkdir('emptydir');

        const entries = await fs.readdir('emptydir');
        expect(entries).toEqual([]);
      });

      it('should list root directory', async () => {
        const fs = new ObjectFileSystem({
          'file1.txt': 'content1',
          'file2.txt': 'content2',
        });

        const entries = await fs.readdir('');

        expect(entries).toHaveLength(2);
        expect(entries).toContainEqual({
          path: 'file1.txt',
          isDirectory: false,
        });
        expect(entries).toContainEqual({
          path: 'file2.txt',
          isDirectory: false,
        });
      });

      it('should throw FileSystemError.notFound for missing directory', async () => {
        const fs = new ObjectFileSystem();
        await expect(fs.readdir('missing')).rejects.toThrow(FileSystemError);
        await expect(fs.readdir('missing')).rejects.toThrow('File not found');
      });

      it('should throw FileSystemError.notDirectory for files', async () => {
        const fs = new ObjectFileSystem({ 'file.txt': 'content' });
        await expect(fs.readdir('file.txt')).rejects.toThrow(FileSystemError);
        await expect(fs.readdir('file.txt')).rejects.toThrow('Not a directory');
      });
    });
  });

  describe('Path Normalization', () => {
    it('should handle leading slashes', async () => {
      const fs = new ObjectFileSystem({ 'file.txt': 'content' });
      expect(await fs.readFile('/file.txt')).toBe('content');
    });

    it('should handle trailing slashes', async () => {
      const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
      expect(await fs.exists('dir/')).toBe(true);
    });

    it('should handle multiple slashes', async () => {
      const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
      expect(await fs.readFile('dir//file.txt')).toBe('content');
      expect(await fs.readFile('//dir///file.txt')).toBe('content');
    });

    it('should handle dot segments', async () => {
      const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
      expect(await fs.readFile('./dir/./file.txt')).toBe('content');
    });

    it('should handle parent directory segments', async () => {
      const fs = new ObjectFileSystem({ 'file.txt': 'content' });
      expect(await fs.readFile('dir/../file.txt')).toBe('content');
    });

    it('should normalize complex paths', async () => {
      const fs = new ObjectFileSystem({ 'a/b/c/file.txt': 'content' });
      expect(await fs.readFile('./a/./b/../b/c/file.txt')).toBe('content');
    });
  });

  describe('toObject', () => {
    it('should export all files as object', () => {
      const initialFiles = {
        'file1.txt': 'content1',
        'dir/file2.txt': 'content2',
        'dir/subdir/file3.txt': 'content3',
      };

      const fs = new ObjectFileSystem(initialFiles);
      const exported = fs.toObject();

      expect(exported).toEqual(initialFiles);
    });

    it('should return empty object for empty filesystem', () => {
      const fs = new ObjectFileSystem();
      expect(fs.toObject()).toEqual({});
    });

    it('should not include directories in export', () => {
      const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });
      const exported = fs.toObject();

      expect(exported).toEqual({ 'dir/file.txt': 'content' });
      expect(Object.keys(exported)).not.toContain('dir');
    });

    it('should reflect file modifications', async () => {
      const fs = new ObjectFileSystem({ 'file.txt': 'old' });
      await fs.writeFile('file.txt', 'new');
      await fs.writeFile('new.txt', 'added');

      const exported = fs.toObject();

      expect(exported).toEqual({
        'file.txt': 'new',
        'new.txt': 'added',
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw FileSystemError with correct code', async () => {
      const fs = new ObjectFileSystem();

      try {
        await fs.readFile('missing.txt');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileSystemError);
        expect((error as FileSystemError).code).toBe('ENOENT');
        expect((error as FileSystemError).path).toBe('missing.txt');
      }
    });

    it('should throw FileSystemError for directory operations', async () => {
      const fs = new ObjectFileSystem({ 'dir/file.txt': 'content' });

      try {
        await fs.readFile('dir');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileSystemError);
        expect((error as FileSystemError).code).toBe('EISDIR');
      }
    });

    it('should throw FileSystemError for file operations on directories', async () => {
      const fs = new ObjectFileSystem({ 'file.txt': 'content' });

      try {
        await fs.readdir('file.txt');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FileSystemError);
        expect((error as FileSystemError).code).toBe('ENOTDIR');
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle template file system operations', async () => {
      const fs = new ObjectFileSystem({
        'templates/base.aptl': '@section{content}',
        'templates/components/header.aptl': '@{title}',
        'templates/components/footer.aptl': '@{copyright}',
      });

      // Read templates
      expect(await fs.readFile('templates/base.aptl')).toBe(
        '@section{content}',
      );

      // List components
      const components = await fs.readdir('templates/components');
      expect(components).toHaveLength(2);

      // Add new template
      await fs.writeFile('templates/components/nav.aptl', '@{links}');
      expect(await fs.exists('templates/components/nav.aptl')).toBe(true);

      // Remove old template
      await fs.unlink('templates/components/footer.aptl');
      expect(await fs.exists('templates/components/footer.aptl')).toBe(false);
    });

    it('should handle concurrent operations', async () => {
      const fs = new ObjectFileSystem();

      // Simulate concurrent writes
      await Promise.all([
        fs.writeFile('file1.txt', 'content1'),
        fs.writeFile('file2.txt', 'content2'),
        fs.writeFile('file3.txt', 'content3'),
      ]);

      expect(await fs.readFile('file1.txt')).toBe('content1');
      expect(await fs.readFile('file2.txt')).toBe('content2');
      expect(await fs.readFile('file3.txt')).toBe('content3');
    });

    it('should handle large file content', async () => {
      const fs = new ObjectFileSystem();
      const largeContent = 'x'.repeat(100000);

      await fs.writeFile('large.txt', largeContent);
      expect(await fs.readFile('large.txt')).toBe(largeContent);

      const stats = await fs.stat('large.txt');
      expect(stats.size).toBe(100000);
    });
  });
});
