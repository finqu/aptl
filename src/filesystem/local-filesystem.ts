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

import {
  FileSystem,
  FileStats,
  FileSystemEntry,
  FileSystemError,
} from '@/filesystem';

// Note: These imports will cause TypeScript errors if @types/node is not installed
// This is intentional - LocalFileSystem is optional and only for Node.js environments
/* eslint-disable @typescript-eslint/no-var-requires */
declare const require: any;
declare const process: any;

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

export class LocalFileSystem implements FileSystem {
  private basePath: string;

  /**
   * @param basePath - Optional base path for all operations (defaults to process.cwd())
   */
  constructor(basePath?: string) {
    // Normalize and resolve the base path to prevent symlink exploitation
    this.basePath = path.resolve(basePath || process.cwd());
  }

  /**
   * Resolve a path relative to the base path and validate it's within basePath
   * @throws {FileSystemError} if the resolved path is outside basePath
   */
  private resolvePath(filePath: string): string {
    // Resolve the path (handles both absolute and relative paths)
    const resolved = path.resolve(this.basePath, filePath);

    // Normalize both paths to ensure consistent comparison
    const normalizedResolved = path.normalize(resolved);
    const normalizedBase = path.normalize(this.basePath);

    // Check if the resolved path is within the base path
    // Use path.relative to check if we need to go "up" (..) to reach the resolved path from base
    const relative = path.relative(normalizedBase, normalizedResolved);

    // If relative path starts with '..' or is absolute, it's outside basePath
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new FileSystemError(
        `Access denied: Path '${filePath}' resolves outside the base directory`,
        'EACCES',
        filePath,
      );
    }

    return resolved;
  }

  async readFile(filePath: string): Promise<string> {
    try {
      const resolved = this.resolvePath(filePath);
      return await fs.readFile(resolved, 'utf-8');
    } catch (error: any) {
      // Re-throw security errors from resolvePath
      if (error instanceof FileSystemError) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        throw FileSystemError.notFound(filePath);
      }
      if (error.code === 'EISDIR') {
        throw FileSystemError.isDirectory(filePath);
      }
      if (error.code === 'EACCES') {
        throw FileSystemError.permissionDenied(filePath);
      }
      throw new FileSystemError(
        error.message || 'Failed to read file',
        error.code || 'UNKNOWN',
        filePath,
      );
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const resolved = this.resolvePath(filePath);
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      await fs.writeFile(resolved, content, 'utf-8');
    } catch (error: any) {
      // Re-throw security errors from resolvePath
      if (error instanceof FileSystemError) {
        throw error;
      }
      if (error.code === 'EACCES') {
        throw FileSystemError.permissionDenied(filePath);
      }
      throw new FileSystemError(
        error.message || 'Failed to write file',
        error.code || 'UNKNOWN',
        filePath,
      );
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const resolved = this.resolvePath(filePath);
      await fs.access(resolved);
      return true;
    } catch (error: any) {
      // Re-throw security errors
      if (error instanceof FileSystemError && error.code === 'EACCES') {
        throw error;
      }
      return false;
    }
  }

  async stat(filePath: string): Promise<FileStats> {
    try {
      const resolved = this.resolvePath(filePath);
      const stats = await fs.stat(resolved);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modifiedTime: stats.mtime,
      };
    } catch (error: any) {
      // Re-throw security errors from resolvePath
      if (error instanceof FileSystemError) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        throw FileSystemError.notFound(filePath);
      }
      throw new FileSystemError(
        error.message || 'Failed to stat file',
        error.code || 'UNKNOWN',
        filePath,
      );
    }
  }

  async readdir(dirPath: string): Promise<FileSystemEntry[]> {
    try {
      const resolved = this.resolvePath(dirPath);
      const entries = await fs.readdir(resolved, { withFileTypes: true });

      return entries.map((entry: any) => ({
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
      }));
    } catch (error: any) {
      // Re-throw security errors from resolvePath
      if (error instanceof FileSystemError) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        throw FileSystemError.notFound(dirPath);
      }
      if (error.code === 'ENOTDIR') {
        throw FileSystemError.notDirectory(dirPath);
      }
      throw new FileSystemError(
        error.message || 'Failed to read directory',
        error.code || 'UNKNOWN',
        dirPath,
      );
    }
  }

  async unlink(filePath: string): Promise<void> {
    try {
      const resolved = this.resolvePath(filePath);
      await fs.unlink(resolved);
    } catch (error: any) {
      // Re-throw security errors from resolvePath
      if (error instanceof FileSystemError) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        throw FileSystemError.notFound(filePath);
      }
      if (error.code === 'EISDIR') {
        throw FileSystemError.isDirectory(filePath);
      }
      throw new FileSystemError(
        error.message || 'Failed to delete file',
        error.code || 'UNKNOWN',
        filePath,
      );
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    try {
      const resolved = this.resolvePath(dirPath);
      await fs.mkdir(resolved, { recursive: true });
    } catch (error: any) {
      // Re-throw security errors from resolvePath
      if (error instanceof FileSystemError) {
        throw error;
      }
      if (error.code === 'EEXIST') {
        throw FileSystemError.alreadyExists(dirPath);
      }
      throw new FileSystemError(
        error.message || 'Failed to create directory',
        error.code || 'UNKNOWN',
        dirPath,
      );
    }
  }

  async rmdir(dirPath: string): Promise<void> {
    try {
      const resolved = this.resolvePath(dirPath);
      await fs.rmdir(resolved);
    } catch (error: any) {
      // Re-throw security errors from resolvePath
      if (error instanceof FileSystemError) {
        throw error;
      }
      if (error.code === 'ENOENT') {
        throw FileSystemError.notFound(dirPath);
      }
      if (error.code === 'ENOTDIR') {
        throw FileSystemError.notDirectory(dirPath);
      }
      if (error.code === 'ENOTEMPTY') {
        throw new FileSystemError(
          `Directory not empty: ${dirPath}`,
          'ENOTEMPTY',
          dirPath,
        );
      }
      throw new FileSystemError(
        error.message || 'Failed to remove directory',
        error.code || 'UNKNOWN',
        dirPath,
      );
    }
  }

  /**
   * Watch a file or directory for changes
   */
  async watch(
    filePath: string,
    callback: (eventType: 'change' | 'rename', filename: string) => void,
  ): Promise<() => void> {
    try {
      const resolved = this.resolvePath(filePath);

      const watcher = fsSync.watch(
        resolved,
        { persistent: false },
        (eventType: any, filename: any) => {
          if (filename) {
            callback(eventType as 'change' | 'rename', filename);
          }
        },
      );

      // Return cleanup function
      return () => {
        watcher.close();
      };
    } catch (error: any) {
      // Re-throw security errors from resolvePath
      if (error instanceof FileSystemError) {
        throw error;
      }
      throw error;
    }
  }
}
