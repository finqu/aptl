/**
 * Security tests for LocalFileSystem path traversal prevention
 */

import { LocalFileSystem } from '@/filesystem/local-filesystem';
import { FileSystemError } from '@/filesystem';

describe('LocalFileSystem Security', () => {
  let fs: LocalFileSystem;
  const testBasePath = '/tmp/aptl-test';

  beforeEach(() => {
    fs = new LocalFileSystem(testBasePath);
  });

  describe('Path Traversal Prevention', () => {
    it('should reject path traversal with ../', async () => {
      const error = await fs.readFile('../etc/passwd').catch((e) => e);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.code).toBe('EACCES');
      expect(error.message).toMatch(
        /Access denied.*outside the base directory/,
      );
    });

    it('should reject multiple levels of path traversal', async () => {
      await expect(fs.readFile('../../etc/passwd')).rejects.toThrow(
        FileSystemError,
      );
      await expect(fs.readFile('../../../etc/passwd')).rejects.toThrow(
        FileSystemError,
      );
    });

    it('should reject path traversal in subdirectories', async () => {
      await expect(fs.readFile('subdir/../../etc/passwd')).rejects.toThrow(
        FileSystemError,
      );
    });

    it('should reject absolute paths outside basePath', async () => {
      const error = await fs.readFile('/etc/passwd').catch((e) => e);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.code).toBe('EACCES');
      expect(error.message).toMatch(
        /Access denied.*outside the base directory/,
      );
    });

    it('should allow valid relative paths within basePath', async () => {
      // This will fail with ENOENT (file not found) rather than security error
      // which proves the path validation passed
      const error = await fs.readFile('valid/file.txt').catch((e) => e);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.code).toBe('ENOENT');
      expect(error.message).not.toMatch(
        /Access denied.*outside the base directory/,
      );
    });

    it('should allow paths with .. that stay within basePath', async () => {
      // subdir/../file.txt resolves to file.txt which is within basePath
      const error = await fs.readFile('subdir/../file.txt').catch((e) => e);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.code).toBe('ENOENT');
      expect(error.message).not.toMatch(
        /Access denied.*outside the base directory/,
      );
    });

    it('should prevent path traversal in writeFile', async () => {
      const error = await fs
        .writeFile('../etc/malicious', 'content')
        .catch((e) => e);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.code).toBe('EACCES');
      expect(error.message).toMatch(
        /Access denied.*outside the base directory/,
      );
    });

    it('should prevent path traversal in exists', async () => {
      const error = await fs.exists('../etc/passwd').catch((e) => e);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.code).toBe('EACCES');
    });

    it('should prevent path traversal in stat', async () => {
      await expect(fs.stat('../etc/passwd')).rejects.toThrow(
        /Access denied.*outside the base directory/,
      );
    });

    it('should prevent path traversal in readdir', async () => {
      await expect(fs.readdir('../etc')).rejects.toThrow(
        /Access denied.*outside the base directory/,
      );
    });

    it('should prevent path traversal in unlink', async () => {
      await expect(fs.unlink('../etc/passwd')).rejects.toThrow(
        /Access denied.*outside the base directory/,
      );
    });

    it('should prevent path traversal in mkdir', async () => {
      await expect(fs.mkdir('../etc/malicious')).rejects.toThrow(
        /Access denied.*outside the base directory/,
      );
    });

    it('should prevent path traversal in rmdir', async () => {
      await expect(fs.rmdir('../etc')).rejects.toThrow(
        /Access denied.*outside the base directory/,
      );
    });

    it('should prevent path traversal in watch', async () => {
      await expect(fs.watch('../etc/passwd', () => {})).rejects.toThrow(
        /Access denied.*outside the base directory/,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle URL-encoded path traversal attempts', async () => {
      await expect(fs.readFile('%2e%2e%2fetc%2fpasswd')).rejects.toThrow(
        FileSystemError,
      );
    });

    it('should handle empty path', async () => {
      // Empty path should resolve to basePath itself, which is valid
      const error = await fs.readFile('').catch((e) => e);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.code).toBe('ENOENT');
      expect(error.message).not.toMatch(
        /Access denied.*outside the base directory/,
      );
    });

    it('should handle current directory reference', async () => {
      const error = await fs.readFile('./file.txt').catch((e) => e);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.code).toBe('ENOENT');
      expect(error.message).not.toMatch(
        /Access denied.*outside the base directory/,
      );
    });

    it('should normalize basePath in constructor', () => {
      const fsWithRelativeBase = new LocalFileSystem('./relative/path');
      // Should not throw during construction
      expect(fsWithRelativeBase).toBeInstanceOf(LocalFileSystem);
    });
  });
});
