# APTL (AI Prompt Template Language)

**A modern template engine designed specifically for AI system prompts.**

Stop wrestling with string concatenation and messy JSON. Write clean, maintainable prompt templates with inheritance, conditionals, and type-safe data injection—compile to optimized output for any LLM.

[![npm version](https://img.shields.io/npm/v/@finqu/aptl.svg)](https://www.npmjs.com/package/@finqu/aptl)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why APTL?

Building AI prompts shouldn't feel like writing assembly code. APTL brings modern templating to AI development:

- 🎯 **Purpose-Built for AI** - Designed for LLM system prompts, not HTML pages
- 📝 **Human-Readable** - Clean, indented syntax that makes sense at a glance
- 🏗️ **Template Inheritance** - DRY principles with `@extends` and modular sections
- 🔄 **Dynamic & Adaptive** - Conditionals, loops, and context-aware rendering
- 🛡️ **Type-Safe** - Full TypeScript support with detailed error messages
- 📦 **Production-Ready** - Used in production AI systems at [Finqu](https://finqu.com)

---

## Quick Start

### Installation

```bash
npm install @finqu/aptl
```

### Your First Template

**Before APTL:**
```typescript
const systemPrompt =
  "You are " + (agentName || "AI") + ", a " + role + ".\n" +
  (hasCredentials ? "Credentials: " + credentials.join(", ") + "\n" : "") +
  "Your goal is to " + goal + ".\n" +
  (examples ? "Examples:\n" + examples.map(e => `- ${e}`).join("\n") : "");
```

**With APTL:**
```typescript
import { APTLEngine } from '@finqu/aptl';

const template = `
@section identity
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

console.log(output);
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

## What Makes APTL Different?

### 🔤 Variables with Defaults
Never crash on missing data—gracefully fallback to defaults:
```aptl
Welcome, @{user.name|"Guest"}!
Timeout: @{config.timeout|30} seconds
```

### 🔀 Conditionals & Loops
Build adaptive prompts that respond to context:
```aptl
@if userLevel == "expert"
  Use technical terminology freely.
@end

@each task in tasks
  • @{task.name} - @{task.priority} priority
@end
```

### 🏗️ Template Inheritance
Build sophisticated prompts from reusable components:
```aptl
@extends "base-agent.aptl"

@section identity(override=true)
  You are @{agentName}, an expert software developer.
@end
```

### 📦 Modular Snippets
Share common patterns across templates:
```aptl
@section guidelines
  @include "snippets/ethical-guidelines.aptl"
  @include "snippets/output-format.aptl"
@end
```

---

## Real-World Example

See a complete production-ready example in the [`/demo`](./demo) directory with 5+ AI agent templates including template inheritance, reusable snippets, and dynamic content generation.

---

## Documentation

For comprehensive documentation, examples, and API reference, visit our [documentation site](https://finqu.github.io/aptl):

- [Getting Started Guide](https://finqu.github.io/aptl/getting-started)
- [Complete Syntax Reference](https://finqu.github.io/aptl/syntax-reference)
- [All Directives](https://finqu.github.io/aptl/directives)
- [Advanced Features](https://finqu.github.io/aptl/advanced-features)
- [Real-World Examples](https://finqu.github.io/aptl/examples)
- [API Reference](https://finqu.github.io/aptl/api-reference)

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](./LICENSE) © 2025 [Finqu](https://finqu.com)

---

## Links

- [GitHub Repository](https://github.com/finqu/aptl)
- [NPM Package](https://www.npmjs.com/package/@finqu/aptl)
- [Documentation](https://finqu.github.io/aptl)
- [Finqu Homepage](https://finqu.com)
- [Report Issues](https://github.com/finqu/aptl/issues)
- [Discussions](https://github.com/finqu/aptl/discussions)
