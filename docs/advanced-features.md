---
layout: default
title: Advanced Features
---

# Advanced Features

Learn about APTL's advanced capabilities for building sophisticated AI prompt templates.

## Table of Contents

- [Template Inheritance](#template-inheritance)
- [Output Formatters](#output-formatters)
- [Template Registry](#template-registry)
- [Variable Resolution](#variable-resolution)
- [Error Handling](#error-handling)
- [Custom Directives](#custom-directives)

---

## Template Inheritance

Template inheritance allows you to create reusable base templates that child templates can extend and customize.

### Basic Inheritance

**Base template (base.aptl):**
```aptl
@section identity(overridable=true)
  You are an AI assistant.
@end

@section guidelines(overridable=true)
  - Be helpful
  - Be concise
@end

@section footer
  End of prompt
@end
```

**Child template:**
```aptl
@extends "base.aptl"

@section identity(override=true)
  You are a specialized coding assistant.
@end
```

### Section Merge Strategies

#### Override

Completely replace the parent's section:

```aptl
@section name(override=true)
  This replaces everything from the parent
@end
```

#### Prepend

Add content before the parent's section:

```aptl
@section name(prepend=true)
  This comes first
@end
```

**Result:** Child content + Parent content

#### Append

Add content after the parent's section:

```aptl
@section name(append=true)
  This comes last
@end
```

**Result:** Parent content + Child content

#### New Section

Create a new section that doesn't exist in parent:

```aptl
@section newSection(new=true)
  This is a brand new section
@end
```

### Multi-Level Inheritance

APTL supports inheritance chains:

**grandparent.aptl:**
```aptl
@section base
  Base content
@end
```

**parent.aptl:**
```aptl
@extends "grandparent.aptl"

@section base(append=true)
  Parent addition
@end
```

**child.aptl:**
```aptl
@extends "parent.aptl"

@section base(append=true)
  Child addition
@end
```

**Output:**
```
Base content
Parent addition
Child addition
```

---

## Output Formatters

Control how sections are formatted in the output.

### Available Formatters

#### Plain (Default)

No special formatting:

```aptl
@section name
  Content
@end
```

Output:
```
Content
```

#### Markdown

Format as Markdown:

```aptl
@section documentation(format="markdown")
  Content here
@end
```

Output:
```markdown
## Documentation

Content here
```

#### JSON

Format as JSON:

```aptl
@section data(format="json")
  Content
@end
```

Output:
```json
{
  "data": "Content"
}
```

#### Structured

Format with XML-style tags:

```aptl
@section info(format="structured")
  Content
@end
```

Output:
```xml
<info>
Content
</info>
```

### Setting Default Formatter

```typescript
import { APTLEngine, MarkdownFormatter } from 'aptl';

const engine = new APTLEngine('gpt-5.1', {
  defaultFormatter: new MarkdownFormatter()
});
```

### Custom Formatters

Create custom output formatters:

```typescript
import { OutputFormatter } from 'aptl';

class CustomFormatter implements OutputFormatter {
  formatSection(name: string, content: string, attributes: Record<string, any>): string {
    return `[${name}]\n${content}\n[/${name}]`;
  }
  
  formatOutput(sections: Array<{ name: string; content: string }>): string {
    return sections.map(s => this.formatSection(s.name, s.content, {})).join('\n\n');
  }
}
```

---

## Template Registry

Manage and organize multiple templates.

### Basic Usage

```typescript
import { APTLEngine, TemplateRegistry, LocalFileSystem } from 'aptl';

const engine = new APTLEngine('gpt-5.1');
const fileSystem = new LocalFileSystem();
const registry = new TemplateRegistry(engine, fileSystem);

// Load templates from a directory
await registry.loadDirectory('./templates');

// Get a template
const template = registry.get('agent-prompt');

// Render it
const output = await template.render({
  agentName: 'Copilot',
  domain: 'coding'
});
```

### Register Templates Programmatically

```typescript
registry.register('welcome', `
@section greeting
  Welcome, @{user.name}!
@end
`);
```

### List Templates

```typescript
const templateNames = registry.list();
console.log('Available templates:', templateNames);
```

### Check Template Existence

```typescript
if (registry.has('my-template')) {
  const template = registry.get('my-template');
  // Use template
}
```

### Unregister Templates

```typescript
registry.unregister('template-name');
```

### Refresh Templates

Reload templates from tracked directories:

```typescript
await registry.refresh();
```

### In-Memory File System

For testing or demos, use the in-memory file system:

```typescript
import { ObjectFileSystem } from 'aptl';

const fileSystem = new ObjectFileSystem({
  'template1.aptl': '@section main\nContent\n@end',
  'template2.aptl': '@section main\nOther content\n@end'
});

const registry = new TemplateRegistry(engine, fileSystem);
```

---

## Variable Resolution

Advanced variable resolution features.

### Path Resolution

The variable resolver supports complex paths:

```typescript
import { VariableResolver } from 'aptl';

const resolver = new VariableResolver();
const data = {
  user: {
    profile: {
      name: 'Alice',
      contacts: ['email@example.com', 'phone']
    }
  },
  items: [
    { name: 'Item 1', price: 10 },
    { name: 'Item 2', price: 20 }
  ]
};

// Dot notation
resolver.resolve('user.profile.name', data); // 'Alice'

// Bracket notation
resolver.resolve('items[0].name', data); // 'Item 1'

// Mixed notation
resolver.resolve('user.profile.contacts[0]', data); // 'email@example.com'
```

### Extract All Variables

Extract all variable references from a template:

```typescript
const template = `
  Hello, @{user.name}!
  Your email: @{user.email}
  Items: @{items[0].name}
`;

const variables = resolver.extractVariables(template);
// ['user.name', 'user.email', 'items[0].name']
```

### Check Variable Existence

```typescript
const exists = resolver.exists('user.profile.name', data); // true
const missing = resolver.exists('user.invalid.path', data); // false
```

### Validate Template Variables

Check if all variables in a template exist in data:

```typescript
const template = `@{user.name} - @{user.email}`;
const data = { user: { name: 'Alice' } };

const missingVars = resolver.validateTemplate(template, data);
// ['user.email']
```

---

## Error Handling

APTL provides specific error types for different failure scenarios.

### Error Types

#### APTLSyntaxError

Thrown when template syntax is invalid:

```typescript
import { APTLSyntaxError } from 'aptl';

try {
  await engine.render('@if', {});
} catch (err) {
  if (err instanceof APTLSyntaxError) {
    console.error(`Syntax error at line ${err.line}, column ${err.column}`);
    console.error(err.message);
  }
}
```

#### APTLRuntimeError

Thrown during template execution:

```typescript
import { APTLRuntimeError } from 'aptl';

try {
  await engine.render(template, data);
} catch (err) {
  if (err instanceof APTLRuntimeError) {
    console.error('Runtime error:', err.message);
    console.error('Context:', err.context);
  }
}
```

#### APTLValidationError

Thrown when template validation fails:

```typescript
import { APTLValidationError } from 'aptl';

try {
  await engine.render(template, data);
} catch (err) {
  if (err instanceof APTLValidationError) {
    console.error('Validation error:', err.message);
  }
}
```

### Error Recovery

```typescript
try {
  const output = await engine.render(template, data);
  return output;
} catch (err) {
  if (err instanceof APTLSyntaxError) {
    // Handle syntax errors
    return 'Template has syntax errors';
  } else if (err instanceof APTLRuntimeError) {
    // Handle runtime errors
    return 'Error executing template';
  } else {
    // Handle other errors
    throw err;
  }
}
```

---

## Custom Directives

Extend APTL with custom directives.

### Directive Base Classes

- **`InlineDirective`** - No body (e.g., `@extends`, `@include`)
- **`BlockDirective`** - Has `@end` terminator (e.g., `@section`)
- **`ConditionalDirective`** - Block with branching (e.g., `@if`, `@each`)

### Creating a Simple Inline Directive

```typescript
import { InlineDirective, DirectiveContext } from 'aptl';

class TimestampDirective extends InlineDirective {
  get name(): string {
    return 'timestamp';
  }

  execute(context: DirectiveContext): string {
    return new Date().toISOString();
  }
}
```

Usage:
```aptl
Current time: @timestamp
```

### Creating a Block Directive

```typescript
import { BlockDirective, DirectiveContext } from 'aptl';

class UppercaseDirective extends BlockDirective {
  get name(): string {
    return 'uppercase';
  }

  execute(context: DirectiveContext): string {
    const content = this.renderChildren(context);
    return content.toUpperCase();
  }
}
```

Usage:
```aptl
@uppercase
  this will be uppercase
@end
```

### Registering Custom Directives

```typescript
import { APTLEngine } from 'aptl';

const engine = new APTLEngine('gpt-5.1');
const directive = new TimestampDirective();

// Register with both registry and tokenizer
engine.directiveRegistry.register(directive);
engine.tokenizer.registerDirective(directive.name);
```

### Advanced: Directive with Arguments

```typescript
class RepeatDirective extends BlockDirective {
  get name(): string {
    return 'repeat';
  }

  parseArguments(argsString: string): any {
    const count = parseInt(argsString.trim(), 10);
    return { count };
  }

  execute(context: DirectiveContext): string {
    const { count } = this.node.parsedArgs;
    const content = this.renderChildren(context);
    return Array(count).fill(content).join('\n');
  }
}
```

Usage:
```aptl
@repeat 3
  Repeated line
@end
```

Output:
```
Repeated line
Repeated line
Repeated line
```

---

[← Directives](directives) | [Next: Examples →](examples)
