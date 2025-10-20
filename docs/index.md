---
layout: default
title: Home
toc: false
---

# APTL (AI Prompt Template Language)

A modern template engine designed specifically for AI system prompts

## Example

Write this APTL template:

```aptl
@section identity
  IDENTITY
  You are @{agentName|"AI"}, a @{agentRole} specialized in @{domain}.

  @if credentials
    Credentials:
    @each credential in credentials
      • @{credential}
    @end
  @end
@end

@section objective
  OBJECTIVE
  Your primary goal is to @{primaryGoal}.

  @if examples
    Examples of great responses:
    @each example in examples
      Input: @{example.input}
      Output: @{example.output}
    @end
  @end
@end
```

With this data:

```typescript
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
```

And get this output:

```
IDENTITY
You are CodeAssist Pro, a senior software engineer specialized in full-stack development.

Credentials:
• 10+ years experience
• TypeScript expert


OBJECTIVE
Your primary goal is to write clean, maintainable code.

Examples of great responses:
Input: Optimize this loop
Output: Use map() for transformations
Input: Fix memory leak
Output: Remove event listener in cleanup
```

## Why APTL?

- **Purpose-Built for AI** - Designed for LLM system prompts, not HTML pages
- **Human-Readable** - Clean syntax that makes sense at a glance
- **Template Inheritance** - DRY principles with `@extends` and reusable snippets
- **Dynamic & Adaptive** - Conditionals, loops, and context-aware rendering
- **Type-Safe** - Full TypeScript support with detailed error messages
- **Production-Ready** - Used in production AI systems

## Quick Start

```bash
pnpm add @finqu/aptl
```

```typescript
import { APTLEngine } from '@finqu/aptl';

const engine = new APTLEngine('gpt-5');
const output = await engine.render(template, data);
```


## Documentation

**Learn More:**

- [Getting Started](getting-started) - Installation and first steps
- [Syntax Reference](syntax-reference) - Complete template syntax guide
- [Directives](directives) - All built-in directives (@section, @if, @each, @extends, etc.)
- [Advanced Features](advanced-features) - Template inheritance, formatters, and custom directives
- [Examples](examples) - Real-world use cases and patterns
- [API Reference](api-reference) - TypeScript API documentation
- [Best Practices](best-practices) - AI prompt engineering guidelines

**Common Use Cases:**

- AI agent system prompts (identity, capabilities, behavior)
- Context-aware chatbot responses
- Few-shot learning with examples
- Dynamic prompt generation
- Prompt versioning and maintenance at scale

## Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/finqu/aptl/blob/main/CONTRIBUTING.md).

## License

This project is licensed under the [MIT](https://github.com/finqu/aptl/blob/main/LICENSE) © 2025 Finqu

## Links

- [GitHub Repository](https://github.com/finqu/aptl)
- [NPM Package](https://www.npmjs.com/package/@finqu/aptl)
- [Report Issues](https://github.com/finqu/aptl/issues)
