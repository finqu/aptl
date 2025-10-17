---
layout: default
title: Home
---

# APTL (AI Prompt Template Language)

> **A modern template engine for authoring AI system prompts.**
>
> Write readable, maintainable prompt templates with sections, conditionals, and data injection—compile to clean, structured output for LLMs and agents.

## Why APTL?

APTL is designed for building robust, maintainable AI system prompts. It lets you:

- ✨ **Write readable, indented templates** (no more unreadable JSON or string concatenation)
- 📦 **Organize prompts with sections** for identity, objectives, guidelines, and more
- 🔄 **Inject dynamic data** with simple variable syntax
- ⚡ **Use conditionals and loops** for adaptive, context-aware prompts
- 🎨 **Output in multiple formats** (plain, markdown, JSON, XML-style)
- ✅ **Validate and manage templates** at scale

## Quick Start

### Installation

```bash
npm install @finqu/aptl
```

### Basic Example

```typescript
import { APTLEngine } from 'aptl';

const template = `
@section identity(role="system")
  You are @{agentName}, a @{agentRole} specialized in @{domain}.
@end

@section objective
  Your primary goal is to @{primaryGoal}.
@end
`;

const data = {
  agentName: 'Copilot',
  agentRole: 'AI assistant',
  domain: 'software development',
  primaryGoal: 'help users write better code',
};

const engine = new APTLEngine('gpt-5.1');
const output = await engine.render(template, data);
console.log(output);
```

## Core Features

### 🔤 Variable Interpolation

```aptl
Hello, @{user.name}!
Your email: @{user.email}
```

### 📋 Sections

```aptl
@section identity(role="system")
  You are @{agentName}.
@end
```

### 🔀 Conditionals

```aptl
@if userType == "premium"
  Welcome, premium user!
@else
  Please upgrade.
@end
```

### 🔁 Iteration

```aptl
@each feature in features
  - @{feature.name}: @{feature.description}
@end
```

### 📝 Comments

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
