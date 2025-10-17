# APTL (AI Prompt Template Language) - AI Coding Agent Instructions

## Project Overview

APTL is a TypeScript template engine specifically designed for authoring AI system prompts. It compiles human-readable templates with sections, conditionals, and data injection into clean, structured output for LLMs.

**Core Architecture:** Four-stage pipeline:

1. **Tokenizer** (`src/core/tokenizer.ts`) - Lexical analysis with indent-aware tokenization
2. **Parser** (`src/core/parser.ts`) - AST generation with directive-specific parsing hooks
3. **Compiler** (`src/core/compiler.ts`) - AST→executable template transformation
4. **Engine** (`src/core/engine.ts`) - Orchestrates the pipeline, manages registries and caching

## Critical Architectural Patterns

### Directive System (Extensible Plugin Architecture)

Directives are the core extension mechanism. Three base classes in `src/directives/base-directive.ts`:

- **`InlineDirective`** - No body (e.g., `@extends "base.aptl"`)
- **`BlockDirective`** - Has `@end` terminator (e.g., `@section name ... @end`)
- **`ConditionalDirective`** - Block with branching (e.g., `@if/@elif/@else`, `@each`)

**Key Implementation Pattern:**

```typescript
// Directives control their own body parsing via hooks
handleChildDirective(name: string, parser: DirectiveParser, children: ASTNode[]): boolean
shouldTerminateBody(directiveName: string): boolean
```

**Template Inheritance Pattern** (`src/directives/extends-directive.ts`):

- `@extends` takes full control via `takesControl: true` property
- Parent template rendered with `__sectionOverrides__` in data context
- Supports multi-level inheritance (grandchild → child → parent)
- Section merging controlled by attributes: `override`, `prepend`, `append`, `new`, `overridable`

### Two-Phase Compilation

1. **Parse Phase** (`async parse?(node: DirectiveNode)`): Load external resources, validate references
   - Used by `@extends` and `@include` to load template files via `TemplateRegistry`
   - Called during `compiler.compile()` before rendering

2. **Execute Phase** (`execute(context: DirectiveContext)`): Render output
   - Receives parsed arguments in `node.parsedArgs`
   - Has access to `renderNode()` for recursive child rendering

### Path Resolution

All file paths use `@/` alias mapping to `src/` (configured in `tsconfig.json`, `jest.config.cjs`, `rolldown.config.js`).

**Example:** `import { APTLEngine } from '@/core/engine'`

### Variable Resolution

`src/data/variable-resolver.ts` supports:

- Dot notation: `user.profile.name`
- Bracket notation: `items[0].name`
- Mixed: `users[0].profile.email`

Variables in templates: `@{user.name|"DefaultName"}`

## Build & Test Workflow

### Build Commands

```bash
pnpm build          # Rolldown → dual CJS/ESM output + TypeScript declarations
./scripts/build.sh  # Same as above (cleans dist/ first)
```

**Output Structure:**

- `dist/cjs/index.cjs` - CommonJS with sourcemaps
- `dist/esm/index.mjs` - ES modules with sourcemaps
- `dist/types/` - TypeScript declarations from `tsconfig.build.json`

### Testing

```bash
pnpm test           # Jest with ts-jest preset
```

**Test Organization:**

- `tests/unit/` - Component-level tests (directives, parsers, formatters)
- `tests/integration/` - End-to-end template rendering tests
- `tests/fixtures/` - Template files for testing

**Pattern:** All tests use async `engine.render()` since directive `parse()` is async.

## Project-Specific Conventions

### Error Handling

Three custom error types (`src/utils/errors.ts`):

```typescript
APTLSyntaxError; // Parse-time errors with line/column info
APTLRuntimeError; // Execution errors with context object
APTLValidationError; // Template validation failures
```

Always include location info when throwing: `throw new APTLSyntaxError(msg, node.line, node.column)`

### Directive Registration

New directives must be registered with both `DirectiveRegistry` AND `Tokenizer`:

```typescript
// In engine.ts constructor
this.directiveRegistry.register(directive);
this.tokenizer.registerDirective(directive.name);
```

The tokenizer needs to recognize directive keywords during lexical analysis.

### Output Formatters

`src/formatters/` implements `OutputFormatter` interface:

- `PlainFormatter` - Default, no markup
- `MarkdownFormatter` - Sections as `## Heading\n\ncontent`
- `JSONFormatter` - Structured JSON output
- `StructuredFormatter` - XML-style tags

Section directive uses formatters via attributes: `@section name(format="markdown")`

### Template Registry & FileSystem Abstraction

`src/templates/template-registry.ts` manages template loading with two filesystem implementations:

- `LocalFileSystem` - Node.js `fs/promises` for disk I/O
- `ObjectFileSystem` - In-memory map for testing/demos (see `examples/template-registry-demo.ts`)

**Loading Pattern:**

```typescript
registry.loadDirectory('templates'); // Loads all .aptl files
registry.refresh(); // Reloads tracked directories
```

Templates auto-register by filename (minus `.aptl` extension).

## Grammar Reference

APTL uses unified `@` syntax for all directives. See `APTL-BNF.md` for formal grammar.

**Key Syntax:**

- Variables: `@{path.to.value|"default"}`
- Directives: `@name args` (inline) or `@name args ... @end` (block)
- Comments: `// line` or `/* block */`
- Escaping: `\@` for literal `@`

## Common Development Tasks

### Adding a New Directive

1. Create class extending `InlineDirective`, `BlockDirective`, or `ConditionalDirective`
2. Implement required methods: `name`, `execute()`, optionally `parse()`, `parseArguments()`, `validate()`
3. Register in `src/directives/index.ts` `createDefaultDirectiveRegistry()`
4. Add tokenizer registration in `engine.ts` constructor
5. Write tests in `tests/unit/directives/`

### Modifying the Parser

Parser uses **recursive descent** with directive-specific hooks. When changing control flow:

- Update `shouldTerminateBody()` in directive class
- Check for impacts on nested directive parsing

### Adding Output Format

1. Implement `OutputFormatter` interface in `src/formatters/`
2. Register in `DefaultFormatterRegistry` (`src/formatters/formatter-registry.ts`)
3. Add `supportsFormat()` check for section attribute matching

## Publishing

Package published to GitHub Packages (`@finqu/aptl`):

```bash
./scripts/version.sh patch         # Bump version
./scripts/version.sh patch --publish # Bump and publish
```

## VSCode Extension

`vscode-extension/` contains APTL syntax highlighting (`.aptl` files). Separate from main package.
