/**
 * LocalFileSystem
 * Node.js file system implementation using fs/promises
 * For server-side and Node.js environments
 *
 * Note: This module is optional and requires Node.js environment with @types/node installed.
 * For browser/non-Node environments, use ObjectFileSystem instead.
 *
 * Installation: npm install --save-dev @types/node
 */
import { FileSystemError, } from '@/filesystem';
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
export class LocalFileSystem {
    /**
     * @param basePath - Optional base path for all operations (defaults to process.cwd())
     */
    constructor(basePath) {
        this.basePath = basePath || process.cwd();
    }
    /**
     * Resolve a path relative to the base path
     */
    resolvePath(filePath) {
        return path.isAbsolute(filePath)
            ? filePath
            : path.join(this.basePath, filePath);
    }
    async readFile(filePath) {
        try {
            const resolved = this.resolvePath(filePath);
            return await fs.readFile(resolved, 'utf-8');
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw FileSystemError.notFound(filePath);
            }
            if (error.code === 'EISDIR') {
                throw FileSystemError.isDirectory(filePath);
            }
            if (error.code === 'EACCES') {
                throw FileSystemError.permissionDenied(filePath);
            }
            throw new FileSystemError(error.message || 'Failed to read file', error.code || 'UNKNOWN', filePath);
        }
    }
    async writeFile(filePath, content) {
        try {
            const resolved = this.resolvePath(filePath);
            // Ensure parent directory exists
            await fs.mkdir(path.dirname(resolved), { recursive: true });
            await fs.writeFile(resolved, content, 'utf-8');
        }
        catch (error) {
            if (error.code === 'EACCES') {
                throw FileSystemError.permissionDenied(filePath);
            }
            throw new FileSystemError(error.message || 'Failed to write file', error.code || 'UNKNOWN', filePath);
        }
    }
    async exists(filePath) {
        try {
            const resolved = this.resolvePath(filePath);
            await fs.access(resolved);
            return true;
        }
        catch {
            return false;
        }
    }
    async stat(filePath) {
        try {
            const resolved = this.resolvePath(filePath);
            const stats = await fs.stat(resolved);
            return {
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modifiedTime: stats.mtime,
            };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw FileSystemError.notFound(filePath);
            }
            throw new FileSystemError(error.message || 'Failed to stat file', error.code || 'UNKNOWN', filePath);
        }
    }
    async readdir(dirPath) {
        try {
            const resolved = this.resolvePath(dirPath);
            const entries = await fs.readdir(resolved, { withFileTypes: true });
            return entries.map((entry) => ({
                path: path.join(dirPath, entry.name),
                isDirectory: entry.isDirectory(),
            }));
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw FileSystemError.notFound(dirPath);
            }
            if (error.code === 'ENOTDIR') {
                throw FileSystemError.notDirectory(dirPath);
            }
            throw new FileSystemError(error.message || 'Failed to read directory', error.code || 'UNKNOWN', dirPath);
        }
    }
    async unlink(filePath) {
        try {
            const resolved = this.resolvePath(filePath);
            await fs.unlink(resolved);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw FileSystemError.notFound(filePath);
            }
            if (error.code === 'EISDIR') {
                throw FileSystemError.isDirectory(filePath);
            }
            throw new FileSystemError(error.message || 'Failed to delete file', error.code || 'UNKNOWN', filePath);
        }
    }
    async mkdir(dirPath) {
        try {
            const resolved = this.resolvePath(dirPath);
            await fs.mkdir(resolved, { recursive: true });
        }
        catch (error) {
            if (error.code === 'EEXIST') {
                throw FileSystemError.alreadyExists(dirPath);
            }
            throw new FileSystemError(error.message || 'Failed to create directory', error.code || 'UNKNOWN', dirPath);
        }
    }
    async rmdir(dirPath) {
        try {
            const resolved = this.resolvePath(dirPath);
            await fs.rmdir(resolved);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw FileSystemError.notFound(dirPath);
            }
            if (error.code === 'ENOTDIR') {
                throw FileSystemError.notDirectory(dirPath);
            }
            if (error.code === 'ENOTEMPTY') {
                throw new FileSystemError(`Directory not empty: ${dirPath}`, 'ENOTEMPTY', dirPath);
            }
            throw new FileSystemError(error.message || 'Failed to remove directory', error.code || 'UNKNOWN', dirPath);
        }
    }
    /**
     * Watch a file or directory for changes
     */
    async watch(filePath, callback) {
        const resolved = this.resolvePath(filePath);
        const watcher = fsSync.watch(resolved, { persistent: false }, (eventType, filename) => {
            if (filename) {
                callback(eventType, filename);
            }
        });
        // Return cleanup function
        return () => {
            watcher.close();
        };
    }
}
