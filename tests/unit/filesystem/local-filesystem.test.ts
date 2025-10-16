import { LocalFileSystem } from '@/filesystem/local-filesystem';
import { FileSystemError } from '@/filesystem';

/**
 * LocalFileSystem Tests
 *
 * Note: LocalFileSystem is an optional Node.js-specific implementation
 * that requires @types/node to be installed. These tests are minimal
 * because full testing requires Node.js file system modules.
 *
 * For comprehensive filesystem testing, see object-filesystem.test.ts
 * which tests the in-memory implementation that shares the same interface.
 *
 * Integration tests with actual file I/O should be in tests/integration/
 */
describe('LocalFileSystem', () => {
    describe('Construction', () => {
        it('should create filesystem instance', () => {
            // Just verify the class can be instantiated
            // We can't test actual file operations without @types/node
            const fs = new LocalFileSystem('/tmp');
            expect(fs).toBeInstanceOf(LocalFileSystem);
        });

        it('should accept base path parameter', () => {
            const fs = new LocalFileSystem('/some/path');
            expect(fs).toBeInstanceOf(LocalFileSystem);
        });

        it('should work without base path', () => {
            const fs = new LocalFileSystem();
            expect(fs).toBeInstanceOf(LocalFileSystem);
        });
    });

    describe('FileSystemError', () => {
        it('should create not found error', () => {
            const error = FileSystemError.notFound('/path/to/file.txt');
            expect(error).toBeInstanceOf(FileSystemError);
            expect(error.code).toBe('ENOENT');
            expect(error.path).toBe('/path/to/file.txt');
            expect(error.message).toContain('File not found');
        });

        it('should create already exists error', () => {
            const error = FileSystemError.alreadyExists('/path/to/file.txt');
            expect(error).toBeInstanceOf(FileSystemError);
            expect(error.code).toBe('EEXIST');
            expect(error.path).toBe('/path/to/file.txt');
            expect(error.message).toContain('already exists');
        });

        it('should create not directory error', () => {
            const error = FileSystemError.notDirectory('/path/to/file.txt');
            expect(error).toBeInstanceOf(FileSystemError);
            expect(error.code).toBe('ENOTDIR');
            expect(error.path).toBe('/path/to/file.txt');
            expect(error.message).toContain('Not a directory');
        });

        it('should create is directory error', () => {
            const error = FileSystemError.isDirectory('/path/to/dir');
            expect(error).toBeInstanceOf(FileSystemError);
            expect(error.code).toBe('EISDIR');
            expect(error.path).toBe('/path/to/dir');
            expect(error.message).toContain('Is a directory');
        });

        it('should create permission denied error', () => {
            const error = FileSystemError.permissionDenied('/path/to/file.txt');
            expect(error).toBeInstanceOf(FileSystemError);
            expect(error.code).toBe('EACCES');
            expect(error.path).toBe('/path/to/file.txt');
            expect(error.message).toContain('Permission denied');
        });

        it('should have correct error name', () => {
            const error = new FileSystemError('Test error', 'TEST', '/test/path');
            expect(error.name).toBe('FileSystemError');
        });

        it('should store all error properties', () => {
            const error = new FileSystemError('Test message', 'TESTCODE', '/test/path');
            expect(error.message).toBe('Test message');
            expect(error.code).toBe('TESTCODE');
            expect(error.path).toBe('/test/path');
        });
    });
});

/**
 * TODO: Add comprehensive LocalFileSystem tests when @types/node is available
 *
 * Tests should cover:
 * - File operations (read, write, exists, unlink, stat)
 * - Directory operations (mkdir, rmdir, readdir)
 * - Path resolution (relative, absolute)
 * - Error handling (ENOENT, EISDIR, ENOTDIR, EACCES)
 * - Watch functionality
 * - Real-world scenarios
 *
 * Reference: object-filesystem.test.ts for test structure
 */
