# APTL (AI Prompt Template Language)

> **A modern template engine designed specifically for AI system prompts.**
>
> Stop wrestling with string concatenation and messy JSON. Write clean, maintainable prompt templates with inheritance, conditionals, and type-safe data injection—compile to optimized output for any LLM.

[![npm version](https://img.shields.io/npm/v/@finqu/aptl.svg)](https://www.npmjs.com/package/@finqu/aptl)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why APTL?

Building AI prompts shouldn't feel like writing assembly code. APTL brings modern templating to AI development:

- 🎯 **Purpose-Built for AI** - Designed for LLM system prompts, not HTML pages
- 📝 **Human-Readable** - Clean, indented syntax that makes sense at a glance
- 🏗️ **Template Inheritance** - DRY principles with `@extends` and modular snippets
- 🔄 **Dynamic & Adaptive** - Conditionals, loops, and context-aware rendering
- 🎨 **Multi-Format Output** - Plain text, Markdown, JSON, or structured XML
- 🛡️ **Type-Safe** - Full TypeScript support with detailed error messages
- 📦 **Production-Ready** - Used in production AI systems, not a toy project

---

## Installation

```bash
npm install @finqu/aptl
```

Or with pnpm:
```bash
pnpm add @finqu/aptl
```

---

## Quick Example: From Chaos to Clarity

**Before APTL (the old way):**
```typescript
const systemPrompt =
  "You are " + (agentName || "AI") + ", a " + role + ".\n" +
  (hasCredentials ? "Credentials: " + credentials.join(", ") + "\n" : "") +
  "Your goal is to " + goal + ".\n" +
  (examples ? "Examples:\n" + examples.map(e => `- ${e}`).join("\n") : "");
```

**With APTL (the better way):**
```typescript
import { APTLEngine } from '@finqu/aptl';

const template = `
@section identity(role="system")
  You are @{agentName|"AI"}, a @{agentRole} specialized in @{domain}.

  @if credentials
    Credentials:
    @each credential in credentials
      • @{credential}
    @end
  @end
@end

@section objective
  Your primary goal is to @{primaryGoal}.

  @if examples
    Examples of great responses:
    @each example in examples
      Input: @{example.input}
      Output: @{example.output}
    @end
  @end
@end
`;

const engine = new APTLEngine('gpt-4');
const output = await engine.render(template, {
  agentName: 'CodeAssist Pro',
  agentRole: 'senior software engineer',
  domain: 'full-stack development',
  credentials: ['10+ years experience', 'TypeScript expert'],
  primaryGoal: 'write clean, maintainable code',
  examples: [
    { input: 'Optimize this loop', output: 'Use map() instead of forEach for transformation' },
    { input: 'Fix memory leak', output: 'Remove event listener in cleanup function' }
  ]
});
```

**Output:**
```
You are CodeAssist Pro, a senior software engineer specialized in full-stack development.

Credentials:
  • 10+ years experience
  • TypeScript expert

Your primary goal is to write clean, maintainable code.

Examples of great responses:
  Input: Optimize this loop
  Output: Use map() instead of forEach for transformation

  Input: Fix memory leak
  Output: Remove event listener in cleanup function
```

---

## Core Features

### 🔤 Variables with Default Values

Never crash on missing data—gracefully fallback to defaults:

```aptl
Welcome, @{user.name|"Guest"}!
Timeout: @{config.timeout|30} seconds
Debug mode: @{settings.debug|false}
```

### 📋 Sections with Smart Formatting

Organize prompts into logical sections with automatic formatting:

```aptl
@section identity(role="system", format="markdown")
  # AI Assistant
  You are @{agentName}.
@end

@section guidelines(format="json")
  { "rules": ["Be helpful", "Be concise"] }
@end
```

**Inline syntax** for simple sections:
```aptl
@section title: AI Coding Assistant
@section version: v2.1.0
@section author: @{authorName}
```

### 🔀 Smart Conditionals

Build adaptive prompts that respond to context:

```aptl
@if userLevel == "beginner"
  Explain concepts in simple terms.
@elif userLevel == "expert"
  Use technical terminology freely.
@else
  Balance clarity with precision.
@end

@if hasApiKey and rateLimit > 100
  You have premium API access.
@end
```

**Inline syntax** for simple one-liners:
```aptl
@if isPremium: You have access to premium features.
@if isAdmin: Administrator privileges enabled.
```

### � Switch-Case for Multi-way Branching

Clean pattern matching for multiple conditions:

```aptl
@switch userRole
  @case "admin"
    You have full administrative access.
  @case "moderator"
    You can moderate content and manage users.
  @case "contributor"
    You can create and edit content.
  @default
    You have standard user access.
@end
```

Works with variables, literals, and nested paths:
```aptl
@switch task.status
  @case "pending"
    ⏳ Awaiting review
  @case "approved"
    ✅ Ready to proceed
  @case "rejected"
    ❌ Needs revision
  @default
    ❓ Status unknown
@end
```

### �🔁 Powerful Iteration

Loop through arrays with full context access:

```aptl
@each task in tasks
  @{task.priority} priority: @{task.name}
  Assigned to: @{task.owner}
  @if task.dueDate
    Due: @{task.dueDate}
  @end
@end
```

**Inline syntax** for compact lists:
```aptl
@each item in items: • @{item.name} (@{item.price})
@each user in users: - @{user.name} <@{user.email}>
```

### 🏗️ Template Inheritance

Build sophisticated prompts from reusable components:

**base-agent.aptl:**
```aptl
@section identity(overridable=true)
  You are an AI assistant.
@end

@section guidelines
  Always be helpful and ethical.
@end
```

**coding-assistant.aptl:**
```aptl
@extends "base-agent.aptl"

@section identity(override=true)
  You are @{agentName|"CodeAssist"}, an expert software developer.

  Languages: @{languages|"TypeScript, Python, Rust"}
@end

@section capabilities(new=true)
  @include "snippets/code-review-checklist.aptl"
@end
```

### 📦 Modular Snippets

Share common patterns across templates:

```aptl
@section examples
  @include "snippets/few-shot-examples.aptl"
@end

@section guidelines
  @include "snippets/ethical-guidelines.aptl"
  @include "snippets/output-format.aptl"
@end
```

---

## Real-World Example

See a complete production-ready example in the [`/demo`](./demo) directory:

```bash
cd demo
pnpm install
pnpm demo
```

The demo includes:
- ✅ **5+ production-ready AI agent templates** (coding, data analysis, technical writing, support, research)
- ✅ **Template inheritance** with base templates and specialized agents
- ✅ **Reusable snippets** for ethical guidelines, code review, thinking processes
- ✅ **File system integration** loading `.aptl` files from disk
- ✅ **Complex conditionals** and dynamic content generation

---

## Advanced Features

### Template Registry

Manage templates at scale:

```typescript
import { TemplateRegistry, APTLEngine, LocalFileSystem } from '@finqu/aptl';
import { LocalFileSystem } from '@finqu/aptl/local-filesystem';

const engine = new APTLEngine('gpt-4');
const fileSystem = new LocalFileSystem('./templates');
const registry = new TemplateRegistry(engine, { fileSystem });

// Load all .aptl files from directories
await registry.loadDirectory('base');
await registry.loadDirectory('agents');
await registry.loadDirectory('snippets');

// Get and render a template
const template = registry.get('coding-assistant');
const output = await template.render({
  agentName: 'CodeBot',
  capabilities: ['debugging', 'refactoring', 'code review']
});
```

### Output Formatters

Control how sections render:

```typescript
import { APTLEngine } from '@finqu/aptl';

const engine = new APTLEngine('gpt-4', {
  defaultFormat: 'markdown' // or 'plain', 'json', 'structured'
});
```

Per-section formatting:
```aptl
@section identity format="markdown"
# AI Assistant
Professional coding assistant
@end

@section config format="json"
{ "maxTokens": 4000, "temperature": 0.7 }
@end

@section structure format="structured" title="System Configuration"
CodeAssist Pro

@section role title=false
Software Engineer
@end
@end
```

Output with structured format:
```xml
<structure>
# System Configuration
CodeAssist Pro

Software Engineer
</structure>
```

The `title` attribute customizes or suppresses section headings. When set to `false`, heading levels don't increase for nested sections.

### Advanced Variable Resolution

TypeScript-friendly variable handling:

```typescript
import { VariableResolver } from '@finqu/aptl';

const resolver = new VariableResolver();
const data = {
  user: { name: 'Alice', profile: { email: 'alice@example.com' } },
  items: [{ name: 'First' }, { name: 'Second' }]
};

// Dot notation
resolver.resolve('user.name', data); // 'Alice'
resolver.resolve('user.profile.email', data); // 'alice@example.com'

// Bracket notation
resolver.resolve('items[0].name', data); // 'First'

// With defaults
resolver.resolve('user.age|25', data); // 25 (default)
resolver.resolve('user.name|"Guest"', data); // 'Alice' (existing value)
```

---

## Error Handling

APTL provides detailed, actionable error messages:

```typescript
import { APTLEngine, APTLSyntaxError, APTLRuntimeError } from '@finqu/aptl';

try {
  const engine = new APTLEngine('gpt-4');
  await engine.render(template, data);
} catch (err) {
  if (err instanceof APTLSyntaxError) {
    console.error(`Syntax error at line ${err.line}, column ${err.column}:`);
    console.error(err.message);
  } else if (err instanceof APTLRuntimeError) {
    console.error('Runtime error:', err.message);
    console.error('Context:', err.context);
  }
}
```

---

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type { APTLEngine, Template, DirectiveNode, ASTNode } from '@finqu/aptl';

interface MyPromptData {
  agentName: string;
  capabilities: string[];
  config?: {
    temperature?: number;
    maxTokens?: number;
  };
}

const engine: APTLEngine = new APTLEngine('gpt-4');
const output: string = await engine.render<MyPromptData>(template, data);
```

---

## Use Cases

APTL excels at:

- 🤖 **AI Agent System Prompts** - Define identity, capabilities, and behavior
- 💬 **Conversational AI** - Build context-aware chatbot responses
- 🎯 **Few-Shot Learning** - Manage examples and demonstrations
- 📊 **Dynamic Prompt Generation** - Create prompts based on user data
- 🔧 **Prompt Engineering at Scale** - Version control and maintain prompts as code
- 📝 **Multi-Modal Prompts** - Generate prompts for text, code, and data analysis
- 🏢 **Enterprise AI Applications** - Standardize prompts across teams

---

## Best Practices

1. **Use template inheritance** - Create base templates and specialize via `@extends`
2. **Keep logic simple** - Complex logic belongs in your data, not templates
3. **Leverage defaults** - Use `@{var|"default"}` to handle missing data gracefully
4. **Organize with sections** - Group related content for clarity
5. **Comment liberally** - Future you (and your team) will thank you
6. **Use snippets** - Share common patterns via `@include`
7. **Test with diverse data** - Ensure prompts work across all scenarios
8. **Version control** - Treat `.aptl` files like code (because they are!)

---

## Performance

APTL is built for production:

- ⚡ **Fast compilation** - Templates compile in milliseconds
- 🔄 **Template caching** - Compiled templates are cached automatically
- 📦 **Lightweight** - Minimal dependencies (~108 KB minified)
- 🎯 **Efficient rendering** - Optimized AST traversal
- 🧵 **Async by default** - Non-blocking I/O for file system operations

---

## Documentation

For comprehensive documentation, visit our [GitHub Pages site](https://finqu.github.io/aptl):

- [Getting Started](https://finqu.github.io/aptl/getting-started) - Installation and first steps
- [Syntax Reference](https://finqu.github.io/aptl/syntax-reference) - Complete template syntax
- [Directives](https://finqu.github.io/aptl/directives) - All built-in directives
- [Advanced Features](https://finqu.github.io/aptl/advanced-features) - Inheritance, formatters, and more
- [Examples](https://finqu.github.io/aptl/examples) - Real-world use cases
- [API Reference](https://finqu.github.io/aptl/api-reference) - TypeScript API docs
- [Best Practices](https://finqu.github.io/aptl/best-practices) - Prompt engineering guidelines

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) © 2025 Finqu

---

## Links

- [GitHub Repository](https://github.com/finqu/aptl)
- [NPM Package](https://www.npmjs.com/package/@finqu/aptl)
- [Documentation](https://finqu.github.io/aptl)
- [Report Issues](https://github.com/finqu/aptl/issues)
- [Discussions](https://github.com/finqu/aptl/discussions)
