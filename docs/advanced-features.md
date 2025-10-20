---
layout: default
title: Advanced Features
---

# Advanced Features

Learn about APTL's advanced capabilities for building sophisticated AI prompt templates.


## Template Inheritance

Template inheritance allows you to create reusable base templates that child templates can extend and customize. This is one of APTL's most powerful features for building modular, maintainable prompt templates.

Here's a simple example of a base template that defines the structure:

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

A child template can extend it and customize specific sections:

```aptl
@extends "base.aptl"

@section identity(override=true)
  You are a specialized coding assistant.
@end
```

**Section Merge Strategies**

When a child template extends a parent, you can control how sections are combined using different attributes. To completely replace the parent's section, use `override`:

```aptl
@section name(override=true)
  This replaces everything from the parent
@end
```

To add content before the parent's section, use `prepend`:

```aptl
@section name(prepend=true)
  This comes first
@end
```

This produces: Child content + Parent content

To add content after the parent's section, use `append`:

```aptl
@section name(append=true)
  This comes last
@end
```

This produces: Parent content + Child content

**Multi-Level Inheritance**

APTL supports inheritance chains, allowing you to build complex template hierarchies. Here's how it works across three levels:

```aptl
@section base
  Base content
@end
```

```aptl
@extends "grandparent.aptl"

@section base(append=true)
  Parent addition
@end
```

```aptl
@extends "parent.aptl"

@section base(append=true)
  Child addition
@end
```

This produces:
```
Base content
Parent addition
Child addition
```

## Output Formatters

Control how sections are formatted in the output. APTL provides several built-in formatters that automatically handle section formatting, including intelligent heading level management for nested sections.

**Plain Formatter (Default)**

The plain formatter outputs content without any special formatting:

```aptl
@section name
  Content
@end
```

Output:
```
Content
```

**Markdown Formatter**

The Markdown formatter automatically adds heading markers based on the section name and intelligently tracks heading levels for nested sections:

```aptl
@section documentation(format="markdown")
  This is the main documentation section.

  @section subsection
    This subsection gets the appropriate heading level.
  @end
@end
```

Output:
```markdown
## Documentation

This is the main documentation section.

### Subsection

This subsection gets the appropriate heading level.
```

The formatter automatically increments heading levels for nested sections, ensuring proper Markdown hierarchy.

**JSON Formatter**

Format sections as JSON objects:

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

**Structured Formatter**

The structured formatter wraps the top-level section in XML-style tags while using Markdown headings for nested sections. Section names are capitalized in the output:

```aptl
@section info format="structured"
Main content here.

@section details
Detailed information.
@end
@end
```

Output:
```xml
<info>
Main content here.

## Details
Detailed information.
</info>
```

**Custom Section Titles**

Use the `title` attribute to customize section headings or suppress them entirely:

```aptl
@section api format="structured" title="API Reference"
Core API documentation.
@end
```

Output:
```xml
<api>
# API Reference
Core API documentation.
</api>
```

Set `title=false` to suppress headings without increasing nesting levels:

```aptl
@section docs format="structured"
Documentation

@section intro title=false
Introduction text without a heading

@section details
Detailed content
@end
@end
@end
```

Output:
```xml
<docs>
Documentation

Introduction text without a heading

## Details
Detailed content
</docs>
```

**Mixed Format Example**

You can mix different formatters for different sections. Here's a powerful example combining structured and markdown formats:

```aptl
@section outer format="structured"
Outer content

@section "Middle Content Title" format="markdown"
Middle content

@section inner format="structured"
Inner content
@end
@end
@end
```

Output:
```xml
<outer>
Outer content

## Middle Content Title
Middle content

### Inner
Inner content
</outer>
```

This makes it easy to combine the structure of XML with the readability of Markdown for nested content.

**Setting Default Formatter**

You can configure a default formatter for your engine:

```typescript
import { APTLEngine, MarkdownFormatter } from '@finqu/aptl';

const engine = new APTLEngine('gpt-5', {
  defaultFormatter: new MarkdownFormatter()
});
```

**Custom Formatters**

Create custom output formatters by implementing the `OutputFormatter` interface:

```typescript
import { OutputFormatter } from '@finqu/aptl';

class CustomFormatter implements OutputFormatter {
  formatSection(name: string, content: string, attributes: Record<string, any>): string {
    return `[${name}]\n${content}\n[/${name}]`;
  }

  formatOutput(sections: Array<{ name: string; content: string }>): string {
    return sections.map(s => this.formatSection(s.name, s.content, {})).join('\n\n');
  }
}
```

## Template Registry

Manage and organize multiple templates with the Template Registry. This powerful feature allows you to load templates from directories, register them programmatically, and manage template collections efficiently.

Here's how to set up and use the template registry:

```typescript
import { APTLEngine, TemplateRegistry } from '@finqu/aptl';
import { LocalFileSystem } from '@finqu/aptl/local-filesystem';

const engine = new APTLEngine('gpt-5');
const fileSystem = new LocalFileSystem('./templates');
const registry = new TemplateRegistry(engine, { fileSystem });

// Load templates from directories
await registry.loadDirectory('base');
await registry.loadDirectory('agents');

// Get a template
const template = registry.get('coding-assistant');

// Render it
const output = await template.render({
  agentName: 'CodeBot',
  capabilities: ['debugging', 'refactoring']
});
```

You can also register templates programmatically without loading from files:

```typescript
registry.register('welcome', `
@section greeting
  Welcome, @{user.name}!
@end
`);
```

To see what templates are available, list them:

```typescript
const templateNames = registry.list();
console.log('Available templates:', templateNames);
```

Check if a specific template exists before using it:

```typescript
if (registry.has('my-template')) {
  const template = registry.get('my-template');
  // Use template
}
```

Remove templates when you no longer need them:

```typescript
registry.unregister('template-name');
```

Reload templates from tracked directories to pick up changes:

```typescript
await registry.refresh();
```

**In-Memory File System**

For testing or demos, use the in-memory file system instead of loading from disk:

```typescript
import { ObjectFileSystem } from '@finqu/aptl';

const fileSystem = new ObjectFileSystem({
  'template1.aptl': '@section main\nContent\n@end',
  'template2.aptl': '@section main\nOther content\n@end'
});

const registry = new TemplateRegistry(engine, fileSystem);
```

## Variable Resolution

Advanced variable resolution features for accessing and validating template data.

The variable resolver is the engine that powers APTL's data access, supporting complex paths with dot notation, bracket notation, and default values. Here's how to use it programmatically:

```typescript
import { VariableResolver } from '@finqu/aptl';

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

// With default values (pipe syntax)
resolver.resolve('user.age|25', data); // 25 (uses default)
resolver.resolve('user.profile.name|"Guest"', data); // 'Alice' (value exists)
resolver.resolve('config.timeout|30', data); // 30 (uses default)
resolver.resolve('settings.debug|false', data); // false (uses default)
```

**Default Value Types**

The resolver supports multiple default value types:

- **Strings**: `@{var|"default"}` or `@{var|'default'}`
- **Numbers**: `@{var|42}` or `@{var|3.14}`
- **Booleans**: `@{var|true}` or `@{var|false}`

**Important notes:**
- String defaults require quotes: `|"value"` not `|value`
- Default is only used when variable is `undefined` or `null`
- Empty strings `""` and zero `0` are valid values and won't trigger defaults

**Extract All Variables**

You can extract all variable references from a template string:

```typescript
const template = `
  Hello, @{user.name}!
  Your email: @{user.email}
  Items: @{items[0].name}
`;

const variables = resolver.extractVariables(template);
// ['user.name', 'user.email', 'items[0].name']
```

Check if a variable path exists in your data:

```typescript
const exists = resolver.exists('user.profile.name', data); // true
const missing = resolver.exists('user.invalid.path', data); // false
```

Validate that all variables in a template exist in your data:

```typescript
const template = `@{user.name} - @{user.email}`;
const data = { user: { name: 'Alice' } };

const missingVars = resolver.validateTemplate(template, data);
// ['user.email']
```

## Error Handling

APTL provides specific error types for different failure scenarios, making it easier to handle and debug issues.

**APTLSyntaxError**

This error is thrown when template syntax is invalid:

```typescript
import { APTLSyntaxError } from '@finqu/aptl';

try {
  await engine.render('@if', {});
} catch (err) {
  if (err instanceof APTLSyntaxError) {
    console.error(`Syntax error at line ${err.line}, column ${err.column}`);
    console.error(err.message);
  }
}
```

**APTLRuntimeError**

This error is thrown during template execution:

```typescript
import { APTLRuntimeError } from '@finqu/aptl';

try {
  await engine.render(template, data);
} catch (err) {
  if (err instanceof APTLRuntimeError) {
    console.error('Runtime error:', err.message);
    console.error('Context:', err.context);
  }
}
```

**APTLValidationError**

This error is thrown when template validation fails:

```typescript
import { APTLValidationError } from '@finqu/aptl';

try {
  await engine.render(template, data);
} catch (err) {
  if (err instanceof APTLValidationError) {
    console.error('Validation error:', err.message);
  }
}
```

**Error Recovery**

Here's a pattern for comprehensive error handling:

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

## Custom Directives

Extend APTL with custom directives to add new functionality tailored to your needs. APTL provides three base classes for different directive types, making it easy to create directives that fit seamlessly into the template system.

**Directive Base Classes:**

- **`InlineDirective`** - No body, single-line directives (e.g., `@extends`, `@include`, `@timestamp`)
- **`BlockDirective`** - Has `@end` terminator for multi-line content (e.g., `@section`, `@uppercase`)
- **`ConditionalDirective`** - Block with branching logic (e.g., `@if`, `@each`, `@switch`)

Here's a simple inline directive that outputs the current timestamp:

```typescript
import { InlineDirective, DirectiveContext } from '@finqu/aptl';

class TimestampDirective extends InlineDirective {
  get name(): string {
    return 'timestamp';
  }

  execute(context: DirectiveContext): string {
    return new Date().toISOString();
  }
}
```

Usage in a template:
```aptl
Current time: @timestamp
```

Block directives can process multi-line content. Here's a directive that converts its content to uppercase:

```typescript
import { BlockDirective, DirectiveContext } from '@finqu/aptl';

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

Usage in a template:
```aptl
@uppercase
  this will be uppercase
@end
```

**Registering Custom Directives**

After creating a custom directive, you need to register it with both the directive registry and the tokenizer:

```typescript
import { APTLEngine } from '@finqu/aptl';

const engine = new APTLEngine('gpt-5');
const directive = new TimestampDirective();

// Register with both registry and tokenizer
engine.directiveRegistry.register(directive);
engine.tokenizer.registerDirective(directive.name);
```

**Directive with Arguments**

For more advanced use cases, you can create directives that accept and parse arguments:

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

Usage in a template:
```aptl
@repeat 3
  Repeated line
@end
```

This produces the output:
```
Repeated line
Repeated line
Repeated line
```