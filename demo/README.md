# APTL Demo - Real-world Examples

This directory contains a real-world, runnable demo of the APTL (AI Prompt Template Language) engine. It demonstrates how to use APTL in a Node.js application with actual template files stored on the file system.

## Overview

This demo showcases:

- **Local File System Integration**: Templates stored as `.aptl` files in a real directory structure
- **Template Inheritance**: Using `@extends` to create specialized templates from base templates
- **Template Registry**: Managing multiple templates efficiently
- **Real-world Use Cases**: Practical examples including emails, reports, and AI agent prompts
- **Conditional Logic**: Dynamic content based on data conditions
- **Formatters**: Different output formats (plain text, markdown)

## Directory Structure

```
demo/
├── README.md           # This file
├── package.json        # Demo dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── demo.ts            # Main demo script
└── templates/         # Template files
    ├── base.aptl                # Base template for AI agents
    ├── coding-assistant.aptl    # Extends base.aptl
    ├── email.aptl              # Email template with conditions
    └── report.aptl             # Analytics report template
```

## Prerequisites

- Node.js 16.x or higher
- npm or pnpm package manager

## Installation

1. Navigate to the demo directory:
   ```bash
   cd demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

   This will install the `@finqu/aptl` package from the parent directory.

## Running the Demo

Run the demo from the demo directory:

```bash
npm run demo
```

This runs the JavaScript file directly.

## What the Demo Does

The demo script (`demo.ts`) demonstrates five key scenarios:

### 1. Welcome Email Template
Renders a welcome email for a premium user with personalized features list.

### 2. Notification Email Template
Renders a notification email with multiple activity items.

### 3. Analytics Report Template
Generates a comprehensive analytics report with:
- Executive summary
- Key metrics with comparisons
- Insights and recommendations
- Markdown formatting

### 4. Template Inheritance
Shows how `coding-assistant.aptl` extends `base.aptl` to create a specialized AI agent prompt with:
- Overridden sections
- New sections
- Conditional content
- Security constraints

### 5. Direct File Rendering
Demonstrates rendering templates directly without using the registry.

## Template Files

### base.aptl
A foundation template for AI agents with:
- Identity section
- Capabilities list
- Guidelines with verbosity levels

### coding-assistant.aptl
Extends `base.aptl` to create a specialized coding assistant with:
- Coding-specific capabilities
- Example interactions
- Security constraints
- Code snippet examples

### email.aptl
Multi-purpose email template supporting:
- Welcome emails
- Notification emails
- Password reset emails
- Premium vs. free user content

### report.aptl
Analytics report template with:
- Markdown formatting
- Executive summary
- Key metrics tracking
- Insights and recommendations

## Customization

### Modify Templates

Edit any `.aptl` file in the `templates/` directory and re-run the demo to see changes immediately.

**Note:** Avoid using apostrophes (`'`) in template text as they are treated as string delimiters. Use "do not" instead of "don't", or escape them if needed.

Example - edit `base.aptl`:
```aptl
@section identity
You are an AI assistant designed to help users with @{domain|"general tasks"}.

// Add a new line:
You are powered by the latest AI technology.
@end
```

### Add New Templates

1. Create a new `.aptl` file in `templates/`
2. Add rendering logic in `demo.ts`

Example - create `templates/greeting.aptl`:
```aptl
Hello, @{name}!

@if timeOfDay == "morning"
Good morning! Have a great day ahead.
@elif timeOfDay == "evening"
Good evening! Hope you had a productive day.
@else
Welcome!
@end
```

Then use it in `demo.ts`:
```typescript
const greeting = registry.get('greeting');
const result = greeting.render({
  name: 'Alice',
  timeOfDay: 'morning'
});
console.log(result);
```

### Modify Data

Change the data objects in `demo.ts` to see how templates adapt:

```typescript
// Change user to free tier
user: {
  name: 'Bob Smith',
  isPremium: false  // Changed from true
}
```

## APTL Features Demonstrated

### Directives

- `@extends` - Template inheritance
- `@section` - Content sections with formatting
- `@if/@elif/@else` - Conditional rendering
- `@each` - Loop through arrays
- `@{variable}` - Variable interpolation with defaults

### Formatters

- `format="plain"` - Plain text output (default)
- `format="markdown"` - Markdown formatted output

### Template Registry

- `loadDirectory()` - Load all templates from a directory
- `get()` - Retrieve a template by name
- `render()` - Render a template with data
- `list()` - List all loaded templates

### File System

- `LocalFileSystem` - Read templates from actual files
- Automatic directory scanning
- Path resolution

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

- [APTL Documentation](../README.md)
- [APTL Grammar](../APTL-BNF.md)
- [Main Repository](https://github.com/finqu/aptl)

## Clean Up

To remove generated files and dependencies:
```bash
npm run clean
```

This removes:
- `node_modules/` directory
- `dist/` directory (compiled JavaScript)

## License

Same as parent project - see [LICENSE](../LICENSE)
