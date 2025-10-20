---
layout: default
title: API Reference
---

# API Reference

Complete TypeScript API documentation for APTL.

## Core Classes

### APTLEngine

The main template engine class that orchestrates tokenization, parsing, compilation, and rendering of APTL templates.

**Constructor**

```typescript
constructor(modelId: string, options?: EngineOptions)
```

Parameters:
- `modelId` - Model identifier (e.g., 'gpt-5', 'claude-3')
- `options` - Optional configuration
  - `debug?: boolean` - Enable debug logging
  - `defaultFormatter?: OutputFormatter` - Default output formatter

Example:
```typescript
const engine = new APTLEngine('gpt-5', {
  debug: true,
  defaultFormatter: new MarkdownFormatter()
});
```

**render() Method**

```typescript
async render(template: string, data: Record<string, any>): Promise<string>
```

Renders a template with the provided data. This is the most common way to use APTL - provide a template string and data, get back rendered output.

Parameters:
- `template` - APTL template string
- `data` - Data object for variable interpolation

Returns: Rendered output string

Throws: `APTLSyntaxError`, `APTLRuntimeError`

Example:
```typescript
const output = await engine.render(
  '@section main\nHello, @{name}!\n@end',
  { name: 'World' }
);
```

**compile() Method**

```typescript
async compile(template: string): Promise<CompiledTemplate>
```

Compiles a template without rendering it. Use this when you need to render the same template multiple times with different data - compile once, render many times for better performance.

Parameters:
- `template` - APTL template string

Returns: Compiled template object

Example:
```typescript
const compiled = await engine.compile(template);
const output1 = await compiled.render(data1);
const output2 = await compiled.render(data2);
```

**Properties**

- `modelId: string` - Current model identifier
- `directiveRegistry: DirectiveRegistry` - Registry of available directives
- `formatterRegistry: FormatterRegistry` - Registry of output formatters
- `tokenizer: Tokenizer` - Template tokenizer
- `parser: Parser` - Template parser
- `compiler: Compiler` - Template compiler

### TemplateRegistry

Manages a collection of templates, providing convenient loading, registration, and retrieval functionality.

**Constructor**

```typescript
constructor(engine: APTLEngine, fileSystem?: FileSystem)
```

Parameters:
- `engine` - APTLEngine instance
- `fileSystem` - Optional file system implementation (defaults to LocalFileSystem)

**register() Method**

```typescript
register(name: string, template: string | CompiledTemplate): void
```

Register a template by name for later retrieval.

Example:
```typescript
registry.register('welcome', '@section main\nWelcome!\n@end');
```

**get() Method**

```typescript
get(name: string): CompiledTemplate
```

Retrieve a template by name.

Throws: Error if template not found

**has() Method**

```typescript
has(name: string): boolean
```

Check if a template exists in the registry.

**list() Method**

```typescript
list(): string[]
```

Get all registered template names.

**unregister() Method**

```typescript
unregister(name: string): void
```

Remove a template from the registry.

**loadDirectory() Method**

```typescript
async loadDirectory(path: string): Promise<void>
```

Load all `.aptl` files from a directory and register them automatically.

Example:
```typescript
await registry.loadDirectory('./templates');
```

**refresh() Method**

```typescript
async refresh(): Promise<void>
```

Reload templates from all tracked directories to pick up any changes.

### VariableResolver

Resolves variable paths in data objects, supporting dot notation, bracket notation, and default values.

**Constructor**

```typescript
constructor()
```

**resolve() Method**

```typescript
resolve(path: string, data: Record<string, any>): any
```

Resolve a variable path to its value in the provided data object.

Example:
```typescript
const resolver = new VariableResolver();
resolver.resolve('user.name', { user: { name: 'Alice' } }); // 'Alice'
resolver.resolve('items[0]', { items: ['first'] }); // 'first'
```

**exists() Method**

```typescript
exists(path: string, data: Record<string, any>): boolean
```

Check if a variable path exists in the data.

**extractVariables() Method**

```typescript
extractVariables(template: string): string[]
```

Extract all variable paths from a template string.

Example:
```typescript
const vars = resolver.extractVariables('@{user.name} @{user.email}');
// ['user.name', 'user.email']
```

**validateTemplate() Method**

```typescript
validateTemplate(template: string, data: Record<string, any>): string[]
```

Find missing variables in a template by comparing against provided data.

Returns: Array of missing variable paths

## Directives

### InlineDirective

Base class for directives without a body (single-line directives like `@extends`, `@include`).

**Abstract Methods (must be implemented)**

```typescript
abstract get name(): string
abstract execute(context: DirectiveContext): string
```

**Optional Methods**

```typescript
parseArguments(argsString: string): any
async parse?(node: DirectiveNode): Promise<void>
validate?(node: DirectiveNode): void
```

Example implementation:

```typescript
class MyDirective extends InlineDirective {
  get name() { return 'mydir'; }

  execute(context: DirectiveContext): string {
    return 'output';
  }
}
```

### BlockDirective

Base class for directives with a body and `@end` terminator (like `@section`, `@uppercase`).

**Abstract Methods (must be implemented)**

```typescript
abstract get name(): string
abstract execute(context: DirectiveContext): string
```

**Helper Methods**

```typescript
protected renderChildren(context: DirectiveContext): string
protected renderNode(node: ASTNode, context: DirectiveContext): string
```

Example implementation:

```typescript
class UppercaseDirective extends BlockDirective {
  get name() { return 'uppercase'; }

  execute(context: DirectiveContext): string {
    const content = this.renderChildren(context);
    return content.toUpperCase();
  }
}
```

### ConditionalDirective

Base class for conditional directives with branching logic (like `@if`, `@each`, `@switch`).

**Abstract Methods (must be implemented)**

```typescript
abstract get name(): string
abstract execute(context: DirectiveContext): string
abstract evaluateCondition(context: DirectiveContext): boolean
```

**Methods**

```typescript
shouldTerminateBody(directiveName: string): boolean
handleChildDirective(name: string, parser: DirectiveParser, children: ASTNode[]): boolean
```

## Formatters

### OutputFormatter

Interface for output formatters that control how sections are rendered.

```typescript
interface OutputFormatter {
  formatSection(name: string, content: string, attributes: Record<string, any>): string;
  formatOutput(sections: Array<{ name: string; content: string }>): string;
  supportsFormat?(format: string): boolean;
}
```

### PlainFormatter

Default plain text formatter with no special formatting.

```typescript
const formatter = new PlainFormatter();
```

### MarkdownFormatter

Formats sections as Markdown headings with automatic heading level tracking for nested sections.

```typescript
const formatter = new MarkdownFormatter();
```

Output:
```markdown
## Section Name

Section content
```

### JSONFormatter

Formats output as JSON objects.

```typescript
const formatter = new JSONFormatter();
```

### StructuredFormatter

Formats sections with XML-style tags for the top level and Markdown headings for nested sections.

```typescript
const formatter = new StructuredFormatter();
```

Output:
```xml
<section-name>
Section content
</section-name>
```

## File Systems

### FileSystem

Interface for file system abstraction, allowing both disk-based and in-memory file systems.

```typescript
interface FileSystem {
  readFile(path: string): Promise<string>;
  readDirectory(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}
```

### LocalFileSystem

Node.js file system implementation for reading templates from disk.

```typescript
const fs = new LocalFileSystem();
const content = await fs.readFile('./template.aptl');
```

### ObjectFileSystem

In-memory file system for testing and demos, where files are stored as JavaScript objects.

```typescript
const fs = new ObjectFileSystem({
  'template1.aptl': '@section main\nContent\n@end',
  'template2.aptl': '@section main\nOther\n@end'
});
```

## Error Types

### APTLSyntaxError

Thrown for syntax errors in templates.

```typescript
class APTLSyntaxError extends Error {
  constructor(message: string, line?: number, column?: number)

  line?: number
  column?: number
}
```

### APTLRuntimeError

Thrown during template execution.

```typescript
class APTLRuntimeError extends Error {
  constructor(message: string, context?: any)

  context?: any
}
```

### APTLValidationError

Thrown for validation errors.

```typescript
class APTLValidationError extends Error {
  constructor(message: string)
}
```

## Type Definitions

### DirectiveContext

```typescript
interface DirectiveContext {
  data: Record<string, any>;
  modelId: string;
  renderNode: (node: ASTNode, data: Record<string, any>) => string;
}
```

### DirectiveNode

```typescript
interface DirectiveNode extends ASTNode {
  type: 'directive';
  name: string;
  args: string;
  parsedArgs?: any;
  children?: ASTNode[];
  line: number;
  column: number;
}
```

### ASTNode

```typescript
type ASTNode =
  | TextNode
  | VariableNode
  | DirectiveNode
  | CommentNode;
```

### EngineOptions

```typescript
interface EngineOptions {
  debug?: boolean;
  defaultFormatter?: OutputFormatter;
}
```

### CompiledTemplate

```typescript
interface CompiledTemplate {
  render(data: Record<string, any>): Promise<string>;
  ast: ASTNode[];
}
```

## Usage Examples

### Creating Custom Directive

```typescript
import { BlockDirective, DirectiveContext } from '@finqu/aptl';

class RepeatDirective extends BlockDirective {
  get name() {
    return 'repeat';
  }

  parseArguments(argsString: string) {
    return { times: parseInt(argsString, 10) };
  }

  execute(context: DirectiveContext): string {
    const { times } = this.node.parsedArgs;
    const content = this.renderChildren(context);
    return Array(times).fill(content).join('\n');
  }
}

// Register
engine.directiveRegistry.register(new RepeatDirective());
engine.tokenizer.registerDirective('repeat');
```

### Creating Custom Formatter

```typescript
import { OutputFormatter } from '@finqu/aptl';

class CustomFormatter implements OutputFormatter {
  formatSection(name: string, content: string): string {
    return `[${name.toUpperCase()}]\n${content}\n[/END]`;
  }

  formatOutput(sections: Array<{ name: string; content: string }>): string {
    return sections
      .map(s => this.formatSection(s.name, s.content))
      .join('\n\n');
  }
}

// Use
const engine = new APTLEngine('gpt-5', {
  defaultFormatter: new CustomFormatter()
});
```

[← Examples](examples) | [Next: Best Practices →](best-practices)
