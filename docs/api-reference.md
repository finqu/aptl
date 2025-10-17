---
layout: default
title: API Reference
---

# API Reference

Complete TypeScript API documentation for APTL.

## Table of Contents

- [Core Classes](#core-classes)
  - [APTLEngine](#aptlengine)
  - [TemplateRegistry](#templateregistry)
  - [VariableResolver](#variableresolver)
- [Directives](#directives)
  - [InlineDirective](#inlinedirective)
  - [BlockDirective](#blockdirective)
  - [ConditionalDirective](#conditionaldirective)
- [Formatters](#formatters)
  - [OutputFormatter](#outputformatter)
  - [PlainFormatter](#plainformatter)
  - [MarkdownFormatter](#markdownformatter)
  - [JSONFormatter](#jsonformatter)
  - [StructuredFormatter](#structuredformatter)
- [File Systems](#file-systems)
  - [FileSystem](#filesystem)
  - [LocalFileSystem](#localfilesystem)
  - [ObjectFileSystem](#objectfilesystem)
- [Error Types](#error-types)
- [Type Definitions](#type-definitions)

---

## Core Classes

### APTLEngine

The main template engine class.

#### Constructor

```typescript
constructor(modelId: string, options?: EngineOptions)
```

**Parameters:**
- `modelId` - Model identifier (e.g., 'gpt-4', 'claude-3')
- `options` - Optional configuration
  - `debug?: boolean` - Enable debug logging
  - `defaultFormatter?: OutputFormatter` - Default output formatter

**Example:**
```typescript
const engine = new APTLEngine('gpt-4', {
  debug: true,
  defaultFormatter: new MarkdownFormatter()
});
```

#### Methods

##### render()

```typescript
async render(template: string, data: Record<string, any>): Promise<string>
```

Renders a template with the provided data.

**Parameters:**
- `template` - APTL template string
- `data` - Data object for variable interpolation

**Returns:** Rendered output string

**Throws:** `APTLSyntaxError`, `APTLRuntimeError`

**Example:**
```typescript
const output = await engine.render(
  '@section main\nHello, @{name}!\n@end',
  { name: 'World' }
);
```

##### compile()

```typescript
async compile(template: string): Promise<CompiledTemplate>
```

Compiles a template without rendering.

**Parameters:**
- `template` - APTL template string

**Returns:** Compiled template object

**Example:**
```typescript
const compiled = await engine.compile(template);
const output1 = await compiled.render(data1);
const output2 = await compiled.render(data2);
```

#### Properties

- `modelId: string` - Current model identifier
- `directiveRegistry: DirectiveRegistry` - Registry of available directives
- `formatterRegistry: FormatterRegistry` - Registry of output formatters
- `tokenizer: Tokenizer` - Template tokenizer
- `parser: Parser` - Template parser
- `compiler: Compiler` - Template compiler

---

### TemplateRegistry

Manages a collection of templates.

#### Constructor

```typescript
constructor(engine: APTLEngine, fileSystem?: FileSystem)
```

**Parameters:**
- `engine` - APTLEngine instance
- `fileSystem` - Optional file system implementation (defaults to LocalFileSystem)

#### Methods

##### register()

```typescript
register(name: string, template: string | CompiledTemplate): void
```

Register a template.

**Example:**
```typescript
registry.register('welcome', '@section main\nWelcome!\n@end');
```

##### get()

```typescript
get(name: string): CompiledTemplate
```

Retrieve a template by name.

**Throws:** Error if template not found

##### has()

```typescript
has(name: string): boolean
```

Check if a template exists.

##### list()

```typescript
list(): string[]
```

Get all template names.

##### unregister()

```typescript
unregister(name: string): void
```

Remove a template from registry.

##### loadDirectory()

```typescript
async loadDirectory(path: string): Promise<void>
```

Load all `.aptl` files from a directory.

**Example:**
```typescript
await registry.loadDirectory('./templates');
```

##### refresh()

```typescript
async refresh(): Promise<void>
```

Reload templates from all tracked directories.

---

### VariableResolver

Resolves variable paths in data objects.

#### Constructor

```typescript
constructor()
```

#### Methods

##### resolve()

```typescript
resolve(path: string, data: Record<string, any>): any
```

Resolve a variable path to its value.

**Example:**
```typescript
const resolver = new VariableResolver();
resolver.resolve('user.name', { user: { name: 'Alice' } }); // 'Alice'
resolver.resolve('items[0]', { items: ['first'] }); // 'first'
```

##### exists()

```typescript
exists(path: string, data: Record<string, any>): boolean
```

Check if a variable path exists in data.

##### extractVariables()

```typescript
extractVariables(template: string): string[]
```

Extract all variable paths from a template.

**Example:**
```typescript
const vars = resolver.extractVariables('@{user.name} @{user.email}');
// ['user.name', 'user.email']
```

##### validateTemplate()

```typescript
validateTemplate(template: string, data: Record<string, any>): string[]
```

Find missing variables in a template.

**Returns:** Array of missing variable paths

---

## Directives

### InlineDirective

Base class for directives without a body.

#### Abstract Methods

```typescript
abstract get name(): string
abstract execute(context: DirectiveContext): string
```

#### Optional Methods

```typescript
parseArguments(argsString: string): any
async parse?(node: DirectiveNode): Promise<void>
validate?(node: DirectiveNode): void
```

#### Example

```typescript
class MyDirective extends InlineDirective {
  get name() { return 'mydir'; }
  
  execute(context: DirectiveContext): string {
    return 'output';
  }
}
```

---

### BlockDirective

Base class for directives with a body and `@end` terminator.

#### Abstract Methods

```typescript
abstract get name(): string
abstract execute(context: DirectiveContext): string
```

#### Helper Methods

```typescript
protected renderChildren(context: DirectiveContext): string
protected renderNode(node: ASTNode, context: DirectiveContext): string
```

#### Example

```typescript
class UppercaseDirective extends BlockDirective {
  get name() { return 'uppercase'; }
  
  execute(context: DirectiveContext): string {
    const content = this.renderChildren(context);
    return content.toUpperCase();
  }
}
```

---

### ConditionalDirective

Base class for conditional directives with branching.

#### Abstract Methods

```typescript
abstract get name(): string
abstract execute(context: DirectiveContext): string
abstract evaluateCondition(context: DirectiveContext): boolean
```

#### Methods

```typescript
shouldTerminateBody(directiveName: string): boolean
handleChildDirective(name: string, parser: DirectiveParser, children: ASTNode[]): boolean
```

---

## Formatters

### OutputFormatter

Interface for output formatters.

```typescript
interface OutputFormatter {
  formatSection(name: string, content: string, attributes: Record<string, any>): string;
  formatOutput(sections: Array<{ name: string; content: string }>): string;
  supportsFormat?(format: string): boolean;
}
```

---

### PlainFormatter

Default plain text formatter (no special formatting).

```typescript
const formatter = new PlainFormatter();
```

---

### MarkdownFormatter

Formats sections as Markdown headings.

```typescript
const formatter = new MarkdownFormatter();
```

Output:
```markdown
## Section Name

Section content
```

---

### JSONFormatter

Formats output as JSON.

```typescript
const formatter = new JSONFormatter();
```

---

### StructuredFormatter

Formats sections with XML-style tags.

```typescript
const formatter = new StructuredFormatter();
```

Output:
```xml
<section-name>
Section content
</section-name>
```

---

## File Systems

### FileSystem

Interface for file system abstraction.

```typescript
interface FileSystem {
  readFile(path: string): Promise<string>;
  readDirectory(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}
```

---

### LocalFileSystem

Node.js file system implementation.

```typescript
const fs = new LocalFileSystem();
const content = await fs.readFile('./template.aptl');
```

---

### ObjectFileSystem

In-memory file system for testing.

```typescript
const fs = new ObjectFileSystem({
  'template1.aptl': '@section main\nContent\n@end',
  'template2.aptl': '@section main\nOther\n@end'
});
```

---

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

---

### APTLRuntimeError

Thrown during template execution.

```typescript
class APTLRuntimeError extends Error {
  constructor(message: string, context?: any)
  
  context?: any
}
```

---

### APTLValidationError

Thrown for validation errors.

```typescript
class APTLValidationError extends Error {
  constructor(message: string)
}
```

---

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

---

## Usage Examples

### Creating Custom Directive

```typescript
import { BlockDirective, DirectiveContext } from 'aptl';

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
import { OutputFormatter } from 'aptl';

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
const engine = new APTLEngine('gpt-4', {
  defaultFormatter: new CustomFormatter()
});
```

---

[← Examples](examples) | [Next: Best Practices →](best-practices)
