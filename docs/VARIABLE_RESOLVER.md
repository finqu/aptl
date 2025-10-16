# Variable Resolver

The Variable Resolver is a core component of the APTL engine that handles variable path resolution in template data contexts. It supports the APTL syntax for variable interpolation using `@{variable}` notation.

## Features

- **Nested Object Access**: Resolve deep object properties using dot notation (`user.profile.name`)
- **Array Access**: Support bracket notation for array indices (`items[0].name`)
- **Mixed Access**: Combine object and array access (`users[0].profile.settings`)
- **Numeric Properties**: Handle numeric property keys (`data.0.value`)
- **Graceful Defaults**: Configurable handling of undefined values
- **Path Validation**: Validate variable path syntax
- **Template Extraction**: Extract all variable paths from APTL templates

## Basic Usage

```typescript
import { VariableResolver } from './src/data/variable-resolver';

const resolver = new VariableResolver();
const data = {
  user: {
    name: 'Alice',
    preferences: {
      theme: 'dark',
    },
  },
  items: [
    { name: 'Task 1', priority: 'high' },
    { name: 'Task 2', priority: 'low' },
  ],
};

// Basic variable resolution
resolver.resolve('user.name', data); // 'Alice'
resolver.resolve('user.preferences.theme', data); // 'dark'
resolver.resolve('items[0].name', data); // 'Task 1'
resolver.resolve('items[1].priority', data); // 'low'
```

## Configuration Options

```typescript
// Default resolver (allows undefined, returns empty string)
const defaultResolver = new VariableResolver();

// Strict resolver (throws errors for undefined variables)
const strictResolver = new VariableResolver({
  allowUndefined: false,
});

// Custom default value
const customResolver = new VariableResolver({
  defaultValue: '[NOT_FOUND]',
});
```

## Path Types Supported

### Dot Notation

- `name` - Simple property
- `user.profile.name` - Nested object properties
- `data.0.value` - Numeric properties

### Bracket Notation

- `items[0]` - Array index access
- `items[0].name` - Array element properties
- `users[1].profile.settings` - Complex nested access

### Mixed Access

- `matrix.0[2]` - Object property with array access
- `categories.todo[0].task` - Complex nested structures

## Methods

### `resolve(path: string, data: object): any`

Resolves a variable path in the data context.

```typescript
resolver.resolve('user.name', data); // Returns the value or default
```

### `exists(path: string, data: object): boolean`

Checks if a path exists and has a defined value.

```typescript
resolver.exists('user.name', data); // true if exists and not null/undefined
```

### `validatePath(path: string): {valid: boolean, error?: string}`

Validates the syntax of a variable path.

```typescript
resolver.validatePath('user.name'); // {valid: true}
resolver.validatePath('user..invalid'); // {valid: false, error: 'Invalid path syntax'}
```

### `extractPaths(template: string): string[]`

Extracts all variable paths from an APTL template.

```typescript
const template = 'Hello @{user.name}! You have @{messages.count} messages.';
resolver.extractPaths(template); // ['user.name', 'messages.count']
```

## APTL Template Integration

The Variable Resolver is designed specifically for APTL templates and recognizes the `@{variable}` syntax:

```aptl
@section greeting
  Hello @{user.profile.name}!

  @if user.preferences.showStats
    You have completed @{stats.tasks.completed} of @{stats.tasks.total} tasks.
  @end

  @each item in user.todoList
    - @{item.name} (Priority: @{item.priority})
  @end
@end
```

All variables in this template would be properly resolved by the Variable Resolver:

- `user.profile.name`
- `stats.tasks.completed`
- `stats.tasks.total`
- `item.name`
- `item.priority`

## Error Handling

### Graceful Defaults (Default Mode)

```typescript
const data = { user: { name: 'Alice' } };

resolver.resolve('user.name', data); // 'Alice'
resolver.resolve('user.email', data); // '' (default)
resolver.resolve('missing.path', data); // '' (default)
```

### Strict Mode

```typescript
const strictResolver = new VariableResolver({ allowUndefined: false });

strictResolver.resolve('user.name', data); // 'Alice'
strictResolver.resolve('missing.path', data); // Throws Error: Undefined variable: missing.path
```

### Custom Defaults

```typescript
const customResolver = new VariableResolver({ defaultValue: '[MISSING]' });

customResolver.resolve('missing.path', data); // '[MISSING]'
```

## Performance Notes

- Path parsing is optimized for common patterns
- Nested array/object access is efficient
- Path validation helps catch syntax errors early
- Template extraction uses regex for fast scanning

## Edge Cases Handled

- Empty paths return default values
- Null and undefined values are handled gracefully
- Array bounds checking prevents errors
- Invalid array indices return defaults
- Malformed bracket notation is detected
- Falsy but defined values (0, false, '') are preserved
