/**
 * ObjectFileSystem
 * In-memory file system implementation using JavaScript objects
 * Useful for testing, browser environments, and simple use cases
 */

import {
  FileSystem,
  FileStats,
  FileSystemEntry,
  FileSystemError,
} from '@/filesystem';

interface FileNode {
  type: 'file';
  content: string;
  modifiedTime: Date;
}

interface DirectoryNode {
  type: 'directory';
  children: Map<string, FileNode | DirectoryNode>;
  modifiedTime: Date;
}

type Node = FileNode | DirectoryNode;

export class ObjectFileSystem implements FileSystem {
  private root: DirectoryNode;

  constructor(initialFiles: Record<string, string> = {}) {
    this.root = {
      type: 'directory',
      children: new Map(),
      modifiedTime: new Date(),
    };

    // Initialize with provided files
    for (const [path, content] of Object.entries(initialFiles)) {
      this.writeFileSync(path, content);
    }
  }

  /**
   * Normalize path (remove leading/trailing slashes, handle relative paths)
   */
  private normalizePath(path: string): string[] {
    return path
      .split('/')
      .filter((part) => part && part !== '.')
      .reduce((acc: string[], part) => {
        if (part === '..') {
          acc.pop();
        } else {
          acc.push(part);
        }
        return acc;
      }, []);
  }

  /**
   * Navigate to a node in the tree
   */
  private getNode(path: string): Node | undefined {
    const parts = this.normalizePath(path);
    if (parts.length === 0) return this.root;

    let current: Node = this.root;

    for (const part of parts) {
      if (current.type !== 'directory') {
        return undefined;
      }

      const next = current.children.get(part);
      if (!next) {
        return undefined;
      }

      current = next;
    }

    return current;
  }

  /**
   * Get parent directory node and create if needed
   */
  private ensureParentDirectory(path: string): DirectoryNode {
    const parts = this.normalizePath(path);
    const parentParts = parts.slice(0, -1);

    let current: DirectoryNode = this.root;

    for (const part of parentParts) {
      let next = current.children.get(part);

      if (!next) {
        next = {
          type: 'directory',
          children: new Map(),
          modifiedTime: new Date(),
        };
        current.children.set(part, next);
      }

      if (next.type !== 'directory') {
        throw FileSystemError.notDirectory(parentParts.join('/'));
      }

      current = next;
    }

    return current;
  }

  async readFile(path: string): Promise<string> {
    const node = this.getNode(path);

    if (!node) {
      throw FileSystemError.notFound(path);
    }

    if (node.type !== 'file') {
      throw FileSystemError.isDirectory(path);
    }

    return node.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.writeFileSync(path, content);
  }

  /**
   * Synchronous write for initialization
   */
  private writeFileSync(path: string, content: string): void {
    const parts = this.normalizePath(path);
    const filename = parts[parts.length - 1];
    const parent = this.ensureParentDirectory(path);

    parent.children.set(filename, {
      type: 'file',
      content,
      modifiedTime: new Date(),
    });
  }

  async exists(path: string): Promise<boolean> {
    return this.getNode(path) !== undefined;
  }

  async stat(path: string): Promise<FileStats> {
    const node = this.getNode(path);

    if (!node) {
      throw FileSystemError.notFound(path);
    }

    return {
      isFile: node.type === 'file',
      isDirectory: node.type === 'directory',
      size: node.type === 'file' ? node.content.length : 0,
      modifiedTime: node.modifiedTime,
    };
  }

  async readdir(path: string): Promise<FileSystemEntry[]> {
    const node = this.getNode(path);

    if (!node) {
      throw FileSystemError.notFound(path);
    }

    if (node.type !== 'directory') {
      throw FileSystemError.notDirectory(path);
    }

    const basePath = this.normalizePath(path).join('/');
    const entries: FileSystemEntry[] = [];

    for (const [name, child] of node.children) {
      entries.push({
        path: basePath ? `${basePath}/${name}` : name,
        isDirectory: child.type === 'directory',
      });
    }

    return entries;
  }

  async unlink(path: string): Promise<void> {
    const parts = this.normalizePath(path);
    const filename = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parent = this.getNode(parentPath || '/');

    if (!parent || parent.type !== 'directory') {
      throw FileSystemError.notFound(path);
    }

    const node = parent.children.get(filename);

    if (!node) {
      throw FileSystemError.notFound(path);
    }

    if (node.type === 'directory') {
      throw FileSystemError.isDirectory(path);
    }

    parent.children.delete(filename);
  }

  async mkdir(path: string): Promise<void> {
    const parts = this.normalizePath(path);
    const dirname = parts[parts.length - 1];
    const parent = this.ensureParentDirectory(path);

    if (parent.children.has(dirname)) {
      throw FileSystemError.alreadyExists(path);
    }

    parent.children.set(dirname, {
      type: 'directory',
      children: new Map(),
      modifiedTime: new Date(),
    });
  }

  async rmdir(path: string): Promise<void> {
    const node = this.getNode(path);

    if (!node) {
      throw FileSystemError.notFound(path);
    }

    if (node.type !== 'directory') {
      throw FileSystemError.notDirectory(path);
    }

    if (node.children.size > 0) {
      throw new FileSystemError(
        `Directory not empty: ${path}`,
        'ENOTEMPTY',
        path,
      );
    }

    const parts = this.normalizePath(path);
    const dirname = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parent = this.getNode(parentPath || '/');

    if (parent && parent.type === 'directory') {
      parent.children.delete(dirname);
    }
  }

  /**
   * Get all files as a plain object (useful for debugging/testing)
   */
  toObject(): Record<string, string> {
    const result: Record<string, string> = {};

    const traverse = (node: Node, path: string) => {
      if (node.type === 'file') {
        result[path] = node.content;
      } else {
        for (const [name, child] of node.children) {
          const childPath = path ? `${path}/${name}` : name;
          traverse(child, childPath);
        }
      }
    };

    traverse(this.root, '');
    return result;
  }
}
