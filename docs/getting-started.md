---
layout: default
title: Getting Started
---

# Getting Started with APTL

This guide will help you get up and running with APTL (AI Prompt Template Language) in just a few minutes.

## Installation

### Prerequisites

- Node.js 14 or higher
- npm or pnpm

### Install via npm

```bash
npm install @finqu/aptl
```

### Install via pnpm

```bash
pnpm add @finqu/aptl
```

## Your First Template

Let's create a simple AI system prompt template:

```typescript
import { APTLEngine } from '@finqu/aptl';

// Create an engine instance
const engine = new APTLEngine('gpt-5');

// Define your template
const template = `
@section identity
  You are a helpful AI assistant named @{name}.
@end

@section task
  Help users with @{task}.
@end
`;

// Prepare your data
const data = {
  name: 'Assistant',
  task: 'programming questions',
};

// Render the template
const output = await engine.render(template, data);
console.log(output);
```

**Output:**

```
You are a helpful AI assistant named Assistant.

Help users with programming questions.
```

## Understanding the Basics

### 1. Variables

Variables use the `@{...}` syntax and support default values:

```aptl
Hello, @{user.name|"Guest"}!
Your role: @{user.role|"Member"}
Level: @{user.level|1}
```

**With data:**
```typescript
{
  user: {
    name: 'Alice',
    role: 'Developer'
    // level is missing - will use default value 1
  }
}
```

**Output:**
```
Hello, Alice!
Your role: Developer
Level: 1
```

### 2. Sections

Sections organize your prompt into logical parts:

```aptl
@section identity
  You are @{agentName}.
@end

@section guidelines
  Follow these rules:
  - Be helpful
  - Be concise
@end
```

### 3. Conditionals

Show or hide content based on conditions:

```aptl
@if user.isPremium
  Welcome to your premium account!
@else
  Upgrade to premium for more features.
@end
```

### 4. Loops

Iterate over arrays:

```aptl
@each item in items
  - @{item.name}
@end
```

## Working with Files

You can load templates from `.aptl` files:

```typescript
import { APTLEngine, TemplateRegistry } from '@finqu/aptl';
import { LocalFileSystem } from '@finqu/aptl/local-filesystem';

const engine = new APTLEngine('gpt-5');
const fileSystem = new LocalFileSystem('./templates');
const registry = new TemplateRegistry(engine, { fileSystem });

// Load templates from directories
await registry.loadDirectory('base');
await registry.loadDirectory('agents');

// Get and render a template
const template = registry.get('coding-assistant');
const output = await template.render({
  agentName: 'CodeBot',
  capabilities: ['debugging', 'refactoring']
});
```

## Troubleshooting

### Syntax Errors

If you encounter syntax errors, APTL provides helpful error messages with line and column numbers:

```typescript
import { APTLSyntaxError } from '@finqu/aptl';

try {
  await engine.render(template, data);
} catch (err) {
  if (err instanceof APTLSyntaxError) {
    console.error(`Syntax error at line ${err.line}, column ${err.column}:`);
    console.error(err.message);
  }
}
```

For stricter template syntax validation during development, enable strict mode:

```typescript
const engine = new APTLEngine('gpt-5.1', {
  strict: true
});
```

This enforces stricter syntax rules, such as requiring directives to be at statement boundaries.

### Variable Not Found

Use default values to handle missing variables:

```aptl
Welcome, @{user.name|"Guest"}!
```

By default, undefined variables without defaults render as empty strings. To catch missing variables and throw errors during development:

```typescript
const engine = new APTLEngine('gpt-5', {
  allowUndefined: false
});
```

With `allowUndefined: false`, undefined variables will throw a runtime error, helping you catch typos and missing data.

## Next Steps

Now that you have the basics, explore more features:

- [Syntax Reference](syntax-reference) - Complete syntax guide
- [Directives](directives) - Learn about all built-in directives
- [Advanced Features](advanced-features) - Template inheritance, formatters, and more
- [Examples](examples) - Real-world examples