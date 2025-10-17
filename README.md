# APTL (AI Prompt Template Language)

> **A modern template engine for authoring AI system prompts.**
>
> Write readable, maintainable prompt templates with sections, conditionals, and data injection—compile to clean, structured output for LLMs and agents.

---

## Why APTL?

APTL is designed for building robust, maintainable AI system prompts. It lets you:

- **Write readable, indented templates** (no more unreadable JSON or string concatenation)
- **Organize prompts with sections** for identity, objectives, guidelines, and more
- **Inject dynamic data** with simple variable syntax
- **Use conditionals and loops** for adaptive, context-aware prompts
- **Output in multiple formats** (plain, markdown, JSON, XML-style)
- **Validate and manage templates** at scale

---

## Installation

```bash
npm install aptl
```

---

## Basic Example: AI System Prompt

```typescript
import { APTLEngine } from 'aptl';

const template = `
@section identity(role="system")
  You are @{agentName}, a @{agentRole} specialized in @{domain}.
  @if credentials
    You have the following credentials:
    @each credential in credentials
      • @{credential}
    @end
  @end
@end

@section objective
  Your primary goal is to @{primaryGoal}.
  @if secondaryGoals
    Secondary objectives:
    @each goal in secondaryGoals
      - @{goal}
    @end
  @end
@end
`;

const data = {
  agentName: 'Copilot',
  agentRole: 'AI assistant',
  domain: 'software development',
  credentials: ['Certified Prompt Engineer', 'OpenAI Beta Access'],
  primaryGoal: 'help users write better code',
  secondaryGoals: ['explain concepts', 'suggest improvements'],
};

const engine = new APTLEngine('gpt-5.1');
console.log(engine.render(template, data));
```

---

## Template Syntax

### Variables

Interpolate data with `@{variable.path}`:

```aptl
Hello, @{user.name}!
Your email: @{user.email}
```

### Sections

Group content and control output formatting:

```aptl
@section identity(role="system")
  You are @{agentName}.
@end

// Spaces between name and attributes are supported for readability
@section "role" (overridable=true)
  Content here
@end

// Parentheses are optional
@section "role" overridable=true, format="json"
  Content here
@end
```

### Conditionals

Show/hide content based on data:

```aptl
@if userType == "premium"
  Welcome, premium user!
@elif userType == "trial"
  You are on a trial account.
@else
  Please upgrade.
@end
```

### Iteration

Loop through arrays:

```aptl
@each feature in features
  - @{feature.name}: @{feature.description}
@end
```

### Comments

```aptl
// Line comment
/* Block comment */
```

---

## Output Formatters

APTL supports multiple output styles for your prompts:

- **Plain text** (default)
- **Markdown** (`@section ... format="markdown"`)
- **JSON** (`format="json"`)
- **Structured/XML** (`format="structured"`)

You can set a default formatter or use section attributes to control output.

---

## Advanced: Variable Resolution

APTL's variable resolver supports:

- Dot and bracket notation: `user.profile.name`, `items[0].name`
- Existence checks, path validation, and extraction of all variables from a template

```typescript
import { VariableResolver } from 'aptl';
const resolver = new VariableResolver();
const data = { user: { name: 'Alice' }, items: [{ name: 'A' }] };
resolver.resolve('user.name', data); // 'Alice'
resolver.resolve('items[0].name', data); // 'A'
```

---

## Template Management

Register and manage templates programmatically:

```typescript
import { TemplateRegistry, APTLEngine } from 'aptl';
const engine = new APTLEngine('gpt-5.1');
const registry = new TemplateRegistry(engine);
registry.register('welcome', '@section main Hello, @{user}!@end');
const tpl = registry.get('welcome');
console.log(tpl.render({ user: 'Jane' }));
```

---

## Error Handling

APTL provides specific error types for robust prompt development:

- `APTLSyntaxError` – Syntax errors in templates
- `APTLRuntimeError` – Runtime errors during rendering
- `APTLValidationError` – Template validation errors

```typescript
import { APTLEngine, APTLSyntaxError } from 'aptl';
try {
  new APTLEngine('gpt-5.1').render('@if', {});
} catch (err) {
  if (err instanceof APTLSyntaxError) {
    console.error('Syntax error:', err.message);
  }
}
```

---

## Best Practices for AI Prompt Engineering

1. **Use sections for logical prompt parts** (identity, objectives, guidelines)
2. **Keep logic simple**—move complexity to your data
3. **Comment templates** for maintainability
4. **Test with diverse data** to ensure robust prompt behavior
5. **Leverage output formatters** for LLM compatibility (Markdown, JSON, etc.)

---

## Documentation

For comprehensive documentation, visit our [GitHub Pages site](https://finqu.github.io/aptl):

- [Getting Started](https://finqu.github.io/aptl/getting-started)
- [Syntax Reference](https://finqu.github.io/aptl/syntax-reference)
- [Directives](https://finqu.github.io/aptl/directives)
- [Advanced Features](https://finqu.github.io/aptl/advanced-features)
- [Examples](https://finqu.github.io/aptl/examples)
- [API Reference](https://finqu.github.io/aptl/api-reference)
- [Best Practices](https://finqu.github.io/aptl/best-practices)

---

## License

[MIT](./LICENSE) © 2025 Finqu

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).
