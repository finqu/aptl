# Security

## Path Traversal Prevention

### Overview

The `LocalFileSystem` class implements robust path traversal prevention to protect against directory traversal attacks. This prevents malicious code from accessing files outside the designated base directory.

### Security Measures

#### 1. Base Path Normalization

The base path is normalized and resolved during construction to prevent symlink exploitation:

```typescript
constructor(basePath?: string) {
  // Normalize and resolve the base path to prevent symlink exploitation
  this.basePath = path.resolve(basePath || process.cwd());
}
```

#### 2. Path Resolution Validation

Every file path is validated to ensure it resolves within the base directory:

```typescript
private resolvePath(filePath: string): string {
  // Resolve the path (handles both absolute and relative paths)
  const resolved = path.resolve(this.basePath, filePath);

  // Normalize both paths to ensure consistent comparison
  const normalizedResolved = path.normalize(resolved);
  const normalizedBase = path.normalize(this.basePath);

  // Check if the resolved path is within the base path
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
```

#### 3. Error Propagation

Security errors from `resolvePath()` are properly propagated through all filesystem methods:

```typescript
async readFile(filePath: string): Promise<string> {
  try {
    const resolved = this.resolvePath(filePath);
    return await fs.readFile(resolved, 'utf-8');
  } catch (error: any) {
    // Re-throw security errors from resolvePath
    if (error instanceof FileSystemError) {
      throw error;
    }
    // ... handle other errors
  }
}
```

### Protected Attack Vectors

The implementation protects against:

1. **Relative Path Traversal**: `../../../etc/passwd`
2. **Absolute Paths**: `/etc/passwd`
3. **Mixed Traversal**: `subdir/../../etc/passwd`
4. **Complex Path Manipulation**: Multiple `..` sequences

### Valid Path Examples

These paths are allowed when they resolve within the base directory:

- `file.txt` - Simple relative path
- `subdir/file.txt` - Subdirectory access
- `subdir/../file.txt` - Stays within base (resolves to `file.txt`)
- `./file.txt` - Current directory reference
- `` (empty string) - Resolves to base directory itself

### Testing

Comprehensive security tests are provided in `tests/unit/filesystem/local-filesystem-security.test.ts`:

```bash
pnpm test tests/unit/filesystem/local-filesystem-security.test.ts
```

The test suite covers:
- Various path traversal attack patterns
- Edge cases (URL encoding, empty paths, etc.)
- All filesystem methods (read, write, delete, etc.)
- Validation that legitimate paths work correctly

### Security Best Practices

When using `LocalFileSystem`:

1. **Always specify a base path**: Avoid using the default `process.cwd()` in production
2. **Use the most restrictive base path possible**: Only grant access to directories that are actually needed
3. **Never disable path validation**: The security checks are lightweight and essential
4. **Monitor for security errors**: Log `EACCES` errors with "outside the base directory" messages as potential attack attempts

### Example Usage

```typescript
import { LocalFileSystem } from '@finqu/aptl';

// Create filesystem with restricted base directory
const fs = new LocalFileSystem('/app/templates');

// These will work (within base directory)
await fs.readFile('user-prompt.aptl');
await fs.readFile('subdirectory/config.aptl');

// These will throw security errors
try {
  await fs.readFile('../../../etc/passwd'); // Path traversal
} catch (error) {
  // FileSystemError: Access denied: Path '../../../etc/passwd' resolves outside the base directory
}

try {
  await fs.readFile('/etc/passwd'); // Absolute path outside base
} catch (error) {
  // FileSystemError: Access denied: Path '/etc/passwd' resolves outside the base directory
}
```

### Security Considerations for Different Environments

#### Production Environments

- Use a dedicated directory for templates with minimal permissions
- Consider running the process with restricted user privileges
- Monitor and log security violations

#### Development Environments

- Be aware that `process.cwd()` default may grant broad access
- Use explicit base paths even in development
- Include security tests in your CI/CD pipeline

#### Shared/Multi-tenant Environments

- Each tenant should have its own isolated base directory
- Never share `LocalFileSystem` instances across trust boundaries
- Consider additional access controls at the application layer
