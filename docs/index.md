---
layout: default
title: Home
---

# APTL (AI Prompt Template Language)

> **A modern template engine designed specifically for AI system prompts.**
>
> Stop wrestling with string concatenation and messy JSON. Write clean, maintainable prompt templates with inheritance, conditionals, and type-safe data injection—compile to optimized output for any LLM.

## Why APTL?

Building AI prompts shouldn't feel like writing assembly code. APTL brings modern templating to AI development:

- 🎯 **Purpose-Built for AI** - Designed for LLM system prompts, not HTML pages
- 📝 **Human-Readable** - Clean, indented syntax that makes sense at a glance
- 🏗️ **Template Inheritance** - DRY principles with `@extends` and modular snippets
- 🔄 **Dynamic & Adaptive** - Conditionals, loops, and context-aware rendering
- 🎨 **Multi-Format Output** - Plain text, Markdown, JSON, or structured XML
- 🛡️ **Type-Safe** - Full TypeScript support with detailed error messages
- 📦 **Production-Ready** - Used in production AI systems, not a toy project

## Quick Start

### Installation

```bash
npm install @finqu/aptl
```

Or with pnpm:
```bash
pnpm add @finqu/aptl
```

### Basic Example

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

const data = {
  agentName: 'CodeAssist Pro',
  agentRole: 'senior software engineer',
  domain: 'full-stack development',
  credentials: ['10+ years experience', 'TypeScript expert'],
  primaryGoal: 'write clean, maintainable code',
  examples: [
    { input: 'Optimize this loop', output: 'Use map() for transformations' },
    { input: 'Fix memory leak', output: 'Remove event listener in cleanup' }
  ]
};

const engine = new APTLEngine('gpt-4');
const output = await engine.render(template, data);
console.log(output);
```

## Core Features

### 🔤 Variable Interpolation with Defaults

Never crash on missing data:

```aptl
Hello, @{user.name|"Guest"}!
Timeout: @{config.timeout|30} seconds
Debug: @{settings.debug|false}
```

### 📋 Smart Sections

Organize and format output:

```aptl
@section identity(role="system", format="markdown")
  # AI Assistant
  You are @{agentName}.
@end
```

### 🔀 Adaptive Conditionals

Build context-aware prompts:

```aptl
@if userLevel == "beginner"
  Explain in simple terms.
@elif userLevel == "expert"
  Use technical terminology.
@else
  Balance clarity with precision.
@end
```

### 🔁 Powerful Iteration

Loop with full context:

```aptl
@each task in tasks
  Priority: @{task.priority}
  Task: @{task.name}
  @if task.dueDate
    Due: @{task.dueDate}
  @end
@end
```

### 🏗️ Template Inheritance

Build from reusable bases:

```aptl
@extends "base-agent.aptl"

@section identity(override=true)
  You are @{agentName|"CodeAssist"}.
@end

@section capabilities(new=true)
  @include "snippets/code-review.aptl"
@end
```

### 📝 Comments

Document your templates:

```aptl
// Line comment
/* Block comment */
```

## Documentation

- [Getting Started](getting-started) - Installation and first steps
- [Syntax Reference](syntax-reference) - Complete template syntax guide
- [Directives](directives) - All built-in directives
- [Advanced Features](advanced-features) - Template inheritance, formatters, and more
- [Examples](examples) - Real-world use cases
- [API Reference](api-reference) - TypeScript API documentation
- [Best Practices](best-practices) - AI prompt engineering guidelines

## Use Cases

APTL is perfect for:

- 🤖 **AI Agent System Prompts** - Define agent identity, capabilities, and behavior
- 💬 **Conversational AI** - Build context-aware chatbot responses
- 🎯 **Few-Shot Learning** - Manage examples and demonstrations
- 📊 **Dynamic Prompt Generation** - Create prompts based on user context
- 🔧 **Prompt Engineering at Scale** - Maintain and version control prompts

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/finqu/aptl/blob/main/CONTRIBUTING.md).

## License

[MIT](https://github.com/finqu/aptl/blob/main/LICENSE) © 2025 Finqu

## Links

- [GitHub Repository](https://github.com/finqu/aptl)
- [NPM Package](https://www.npmjs.com/package/@finqu/aptl)
- [Report Issues](https://github.com/finqu/aptl/issues)
