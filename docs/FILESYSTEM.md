# FileSystem and Template Registry

This document explains how to use the FileSystem abstraction and TemplateRegistry in APTL.

## FileSystem Interface

The FileSystem interface provides a generic abstraction for file operations, allowing different implementations for different environments.

### Available Implementations

#### ObjectFileSystem (In-Memory)

Best for:

- Browser environments
- Testing
- Applications with pre-loaded templates
- Rapid prototyping

```typescript
import { ObjectFileSystem } from 'aptl';

// Initialize with templates
const fs = new ObjectFileSystem({
  'templates/greeting.aptl': 'Hello, @{name}!',
  'templates/goodbye.aptl': 'Goodbye, @{name}!',
});

// Read a file
const content = await fs.readFile('templates/greeting.aptl');

// Write a file
await fs.writeFile('templates/new.aptl', 'New template: @{value}');

// Check if exists
const exists = await fs.exists('templates/greeting.aptl'); // true

// List directory
const entries = await fs.readdir('templates');

// Export all files as object
const allFiles = fs.toObject();
```

#### LocalFileSystem (Node.js)

Best for:

- Server-side Node.js applications
- CLI tools
- Build systems
- Development environments

**Note**: Requires `@types/node` to be installed:

```bash
npm install --save-dev @types/node
```

```typescript
// Import separately to avoid TypeScript errors in browser environments
import { LocalFileSystem } from 'aptl/dist/utils/local-filesystem';

// Use current working directory as base
const fs = new LocalFileSystem();

// Or specify a base path
const fs = new LocalFileSystem('/path/to/templates');

// All operations are relative to base path
const content = await fs.readFile('greeting.aptl');

// Watch for changes (optional)
if (fs.watch) {
  const stopWatching = await fs.watch('greeting.aptl', (event, filename) => {
    console.log(`File ${filename} ${event}d`);
  });

  // Stop watching
  stopWatching();
}
```

### FileSystem Methods

All FileSystem implementations support these methods:

```typescript
interface FileSystem {
  // Read file as text
  readFile(path: string): Promise<string>;

  // Write file
  writeFile(path: string, content: string): Promise<void>;

  // Check if exists
  exists(path: string): Promise<boolean>;

  // Get file/directory stats
  stat(path: string): Promise<FileStats>;

  // List directory contents
  readdir(path: string): Promise<FileSystemEntry[]>;

  // Delete file
  unlink(path: string): Promise<void>;

  // Create directory
  mkdir(path: string): Promise<void>;

  // Remove directory
  rmdir(path: string): Promise<void>;

  // Watch for changes (optional - not all implementations support this)
  watch?(
    path: string,
    callback: (eventType: 'change' | 'rename', filename: string) => void,
  ): Promise<() => void>;
}
```

### Error Handling

FileSystem operations throw `FileSystemError` for common issues:

```typescript
import { FileSystemError } from 'aptl';

try {
  await fs.readFile('non-existent.txt');
} catch (error) {
  if (error instanceof FileSystemError) {
    console.log(error.code); // 'ENOENT'
    console.log(error.path); // 'non-existent.txt'
  }
}
```

Common error codes:

- `ENOENT` - File or directory not found
- `EEXIST` - File or directory already exists
- `ENOTDIR` - Not a directory
- `EISDIR` - Is a directory
- `ENOTEMPTY` - Directory not empty
- `EACCES` - Permission denied

## Template Registry

The TemplateRegistry manages template discovery, loading, and caching using a FileSystem.

### Basic Usage

```typescript
import { TemplateRegistry, APTLEngine, ObjectFileSystem } from 'aptl';

// Create file system with templates
const fileSystem = new ObjectFileSystem({
  'templates/greeting.aptl': 'Hello, @{name}!',
  'templates/user/profile.aptl': 'User: @{user.name}\nEmail: @{user.email}',
});

// Create registry
const registry = new TemplateRegistry(new APTLEngine(), {
  fileSystem,
  extensions: ['.aptl'], // default
  cache: true, // default
});

// Load templates from a directory
await registry.loadDirectory('templates');

// Get and render a template
const template = registry.get('greeting');
const result = template.render({ name: 'World' }); // "Hello, World!"

// List all templates
const templateNames = registry.list(); // ['greeting', 'profile']

// Check if template exists
if (registry.has('profile')) {
  const template = registry.get('profile');
  // ...
}
```

### Loading Templates

#### Load from Directory

```typescript
// Load all templates recursively (default)
await registry.loadDirectory('templates');

// Load non-recursively
await registry.loadDirectory('templates', { recursive: false });

// Filter by pattern
await registry.loadDirectory('templates', {
  pattern: /user\//, // Only load templates in 'user' subdirectory
});
```

#### Load Single File

```typescript
await registry.loadFile('templates/greeting.aptl');
```

#### Register Manually

```typescript
// Register from string
registry.register('custom', 'Custom: @{value}');

// Register pre-compiled template
const engine = new APTLEngine();
const compiled = engine.compile('Pre-compiled: @{value}');
registry.register('precompiled', compiled);
```

### Refreshing Templates

The registry tracks loaded directories and can refresh all templates from the filesystem:

```typescript
// Load templates
await registry.loadDirectory('templates');

// ... later, after filesystem changes ...

// Refresh all templates from tracked directories
await registry.refresh();

// This will:
// 1. Clear all templates
// 2. Re-scan all previously loaded directories
// 3. Pick up new files, deleted files, and content changes
```

### Managing Templates

```typescript
// List all template names
const names = registry.list();

// Check if template exists
const exists = registry.has('greeting');

// Unregister a template
const removed = registry.unregister('greeting');

// Clear all templates and tracked directories
registry.clear();

// Get tracked directories
const dirs = registry.getLoadedDirectories();
```

### Working with Different FileSystems

```typescript
// Start with ObjectFileSystem
const objectFS = new ObjectFileSystem({
  'template.aptl': 'Hello @{name}',
});
const registry = new TemplateRegistry(undefined, { fileSystem: objectFS });

// Later, switch to LocalFileSystem (Node.js only)
import { LocalFileSystem } from 'aptl/dist/utils/local-filesystem';
const localFS = new LocalFileSystem('./templates');
registry.setFileSystem(localFS);

// Note: setFileSystem() clears all templates and tracked directories
```

### Advanced Configuration

```typescript
const registry = new TemplateRegistry(
  new APTLEngine({
    strict: true,
    helpers: {
      uppercase: (str: string) => str.toUpperCase(),
    },
  }),
  {
    fileSystem: myFileSystem,
    cache: true,
    extensions: ['.aptl', '.template'],
  },
);
```

## Use Cases

### Browser Application with Pre-loaded Templates

```typescript
import { TemplateRegistry, ObjectFileSystem } from 'aptl';

// Bundle templates at build time
const templates = {
  'chat/user-message.aptl': await import(
    './templates/chat/user-message.aptl?raw'
  ),
  'chat/bot-message.aptl': await import(
    './templates/chat/bot-message.aptl?raw'
  ),
};

const registry = new TemplateRegistry(undefined, {
  fileSystem: new ObjectFileSystem(templates),
});

await registry.loadDirectory('chat');
```

### Node.js Server with Hot Reload

```typescript
import { TemplateRegistry } from 'aptl';
import { LocalFileSystem } from 'aptl/dist/utils/local-filesystem';

const registry = new TemplateRegistry(undefined, {
  fileSystem: new LocalFileSystem('./templates'),
});

await registry.loadDirectory('.');

// Refresh on file changes
setInterval(async () => {
  await registry.refresh();
}, 5000); // Check every 5 seconds
```

### Testing

```typescript
import { TemplateRegistry, ObjectFileSystem } from 'aptl';

describe('My feature', () => {
  let registry: TemplateRegistry;

  beforeEach(async () => {
    const fs = new ObjectFileSystem({
      'test.aptl': 'Test: @{value}',
    });

    registry = new TemplateRegistry(undefined, { fileSystem: fs });
    await registry.loadDirectory('.');
  });

  it('should render template', () => {
    const template = registry.get('test');
    expect(template.render({ value: 'works' })).toBe('Test: works');
  });
});
```

## Creating Custom FileSystem Implementations

You can create custom FileSystem implementations for specialized use cases:

```typescript
import { FileSystem, FileStats, FileSystemEntry } from 'aptl';

class HttpFileSystem implements FileSystem {
  constructor(private baseUrl: string) {}

  async readFile(path: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${path}`);
    return response.text();
  }

  // Implement other required methods...
  async writeFile(path: string, content: string): Promise<void> {
    throw new Error('HTTP filesystem is read-only');
  }

  // ... etc
}

// Use it
const httpFS = new HttpFileSystem('https://example.com/templates');
const registry = new TemplateRegistry(undefined, { fileSystem: httpFS });
```

## Best Practices

1. **Choose the right FileSystem**: Use `ObjectFileSystem` for browsers and testing, `LocalFileSystem` for Node.js
2. **Track directories**: Use `loadDirectory()` instead of individual `loadFile()` calls to enable refresh capability
3. **Handle errors**: Wrap FileSystem operations in try-catch blocks
4. **Cache wisely**: The registry caches compiled templates by default; use `refresh()` when source templates change
5. **Organize templates**: Use directories to organize templates by feature or section
6. **Test with ObjectFileSystem**: It's faster and doesn't require file I/O in tests

## API Reference

See [API.md](./API.md) for complete API documentation.
