/**
 * FileSystem Interface
 * Provides a generic abstraction for file system operations
 * Allows for different implementations (in-memory, local fs, virtual, etc.)
 */

export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modifiedTime: Date;
}

export interface FileSystemEntry {
  path: string;
  isDirectory: boolean;
}

/**
 * Abstract FileSystem interface
 * Implementations should be agnostic to the content type (templates, configs, etc.)
 */
export interface FileSystem {
  /**
   * Read a file as text
   */
  readFile(path: string): Promise<string>;

  /**
   * Write a file
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Check if a file or directory exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file/directory stats
   */
  stat(path: string): Promise<FileStats>;

  /**
   * List directory contents
   */
  readdir(path: string): Promise<FileSystemEntry[]>;

  /**
   * Delete a file
   */
  unlink(path: string): Promise<void>;

  /**
   * Create a directory
   */
  mkdir(path: string): Promise<void>;

  /**
   * Remove a directory
   */
  rmdir(path: string): Promise<void>;

  /**
   * Watch a file or directory for changes (optional)
   * Returns a function to stop watching
   */
  watch?(
    path: string,
    callback: (eventType: 'change' | 'rename', filename: string) => void,
  ): Promise<() => void>;
}

/**
 * FileSystem error types
 */
export class FileSystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public path?: string,
  ) {
    super(message);
    this.name = 'FileSystemError';
  }

  static notFound(path: string): FileSystemError {
    return new FileSystemError(`File not found: ${path}`, 'ENOENT', path);
  }

  static alreadyExists(path: string): FileSystemError {
    return new FileSystemError(`File already exists: ${path}`, 'EEXIST', path);
  }

  static notDirectory(path: string): FileSystemError {
    return new FileSystemError(`Not a directory: ${path}`, 'ENOTDIR', path);
  }

  static isDirectory(path: string): FileSystemError {
    return new FileSystemError(`Is a directory: ${path}`, 'EISDIR', path);
  }

  static permissionDenied(path: string): FileSystemError {
    return new FileSystemError(`Permission denied: ${path}`, 'EACCES', path);
  }
}
