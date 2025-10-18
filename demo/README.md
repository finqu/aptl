# APTL Demo - Real-world AI System Prompts

This directory contains a real-world, runnable demo of the APTL (AI Prompt Template Language) engine. It demonstrates how to use APTL to create sophisticated, maintainable AI system prompts for various agent use cases.

## Overview

This demo showcases:

- **Local File System Integration**: Templates stored as `.aptl` files in a real directory structure
- **Template Inheritance**: Using `@extends` to create specialized agent prompts from base templates
- **Snippet Inclusion**: Using `@include` for reusable prompt components
- **Template Registry**: Managing multiple templates and snippets efficiently
- **Real-world Use Cases**: Production-ready AI agent prompts for coding, data analysis, customer support, and more
- **Conditional Logic**: Dynamic content based on context and requirements
- **Modular Architecture**: Base templates, snippets, and specialized agent prompts

## Directory Structure

```
demo/
├── README.md              # This file
├── package.json           # Demo dependencies and scripts
├── demo.js                # Main demo script
├── templates/             # Legacy templates (deprecated)
└── prompts/              # AI System Prompts
    ├── README.md         # Detailed documentation
    ├── base/             # Base templates
    │   └── agent-base.aptl
    ├── snippets/         # Reusable components
    │   ├── ethical-guidelines.aptl
    │   ├── code-review-checklist.aptl
    │   ├── thinking-process.aptl
    │   └── output-format.aptl
    └── templates/        # Complete agent prompts
        ├── coding-assistant.aptl
        ├── data-analyst.aptl
        ├── technical-writer.aptl
        ├── customer-support.aptl
        └── research-assistant.aptl
```

## Prerequisites

- Node.js 16.x or higher
- pnpm package manager

## Installation

1. Navigate to the demo directory:
   ```bash
   cd demo
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

   This will install the `@finqu/aptl` package from the parent directory.

## Running the Demo

Run the demo from the demo directory:

```bash
pnpm demo
```

This runs the JavaScript file directly.

## What the Demo Does

The demo script (`demo.js`) demonstrates real-world AI system prompt generation:

### 1. Coding Assistant Prompt
Renders a complete system prompt for a software development AI agent with:
- Multi-language support (TypeScript, Python, Rust)
- Code review standards (via snippet inclusion)
- Security-focused guidance
- Example interactions for debugging, code review, and optimization

### 2. Data Analysis Assistant Prompt
Generates a system prompt for a data analysis AI agent with:
- Statistical methodology framework
- Visualization guidance
- Data ethics considerations
- A/B testing and exploratory analysis examples

### 3. Technical Writer Assistant Prompt
Creates a system prompt for a documentation AI agent with:
- Writing principles (clarity, structure, completeness)
- Document type templates (API docs, READs, tutorials)
- Audience-aware customization
- Style guide integration

### 4. Customer Support Agent Prompt
Produces a system prompt for a technical support AI agent with:
- Troubleshooting framework
- Empathetic communication patterns
- Escalation criteria
- Common issue database

### 5. Research Assistant Prompt
Generates a system prompt for a research AI agent with:
- Research methodology
- Source evaluation criteria
- Citation formatting
- Critical analysis frameworks

## Key Features Demonstrated

### Template Inheritance (`@extends`)
All agent templates extend `base/agent-base.aptl`:
```aptl
@extends "base/agent-base.aptl"

@section identity(override="true")
// Custom identity for this specific agent
@end
```

### Snippet Inclusion (`@include`)
Reusable components included where needed:
```aptl
@section guidelines
@include "snippets/ethical-guidelines.aptl"
@include "snippets/thinking-process.aptl"
@end
```

### Conditional Logic
Adapts prompts based on context:
```aptl
@if(securityLevel == "high")
⚠️ Always check for security vulnerabilities
@end
```

### Dynamic Lists
Generates content from data:
```aptl
@each capability in capabilities
  • @{capability}
@end
```

## Customization

### Modify Templates

Edit any `.aptl` file in the `prompts/` directory and re-run the demo to see changes immediately.

Example - customize the coding assistant (`prompts/templates/coding-assistant.aptl`):
```aptl
@section security_focus(new="true")
@if(securityLevel == "high")
Security priority guidelines:
⚠️ Always check for:
- SQL injection vulnerabilities
- XSS attacks
- Authentication bypass
// Add your own security checks here
@end
@end
```

### Create New Snippets

1. Create a new `.aptl` file in `prompts/snippets/`
2. Include it in your templates using `@include`

Example - create `prompts/snippets/testing-guidelines.aptl`:
```aptl
Testing best practices:
- Write tests before code (TDD)
- Aim for high coverage on critical paths
- Test edge cases and error conditions
- Use descriptive test names
```

Then include it:
```aptl
@section testing(new="true")
@include "snippets/testing-guidelines.aptl"
@end
```

### Build Custom Agents

Create your own agent template by extending the base:

```aptl
// prompts/templates/my-custom-agent.aptl
@extends "base/agent-base.aptl"

@section identity(override="true")
You are @{agentName}, a specialized assistant for @{domain}.
@end

@section core_capabilities(override="true")
Your capabilities:
@each capability in capabilities
  • @{capability}
@end
@end
```

## APTL Features Demonstrated

### Core Directives

- `@extends` - Template inheritance from base templates
- `@include` - Include reusable snippet files
- `@section` - Define overridable content sections
- `@if/@elif/@else` - Conditional rendering based on context
- `@each` - Iterate through arrays for dynamic lists
- `@{variable|"default"}` - Variable interpolation with fallback defaults

### Advanced Patterns

- **Multi-level inheritance**: Templates can extend templates that extend other templates
- **Section merging**: `override`, `prepend`, `append`, `new`, `overridable` attributes
- **Nested conditionals**: Complex logic trees for sophisticated behavior
- **Cross-file composition**: Snippets included in base templates, inherited by specific agents

### Template Organization

- `base/` - Foundation templates with overridable sections
- `snippets/` - Small, focused, reusable components
- `templates/` - Complete, production-ready agent prompts

## Troubleshooting

### "Cannot find module" errors

Make sure you've run `npm install` in the demo directory.

### TypeScript errors

The demo uses plain JavaScript for simplicity. The APTL package itself is built from TypeScript sources.

### Template not found

Verify the template file exists in `templates/` directory:
```bash
ls -la templates/
```

## Learn More

- [Prompt Templates Documentation](./prompts/README.md) - Detailed guide to the prompt templates
- [APTL Documentation](../README.md) - Main APTL documentation
- [APTL Grammar](../APTL-BNF.md) - Formal grammar specification
- [Main Repository](https://github.com/finqu/aptl) - Source code and issues

## Clean Up

To remove generated files and dependencies:
```bash
pnpm clean
```

This removes:
- `node_modules/` directory

## License

Same as parent project - see [LICENSE](../LICENSE)
