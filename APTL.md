# APTL (AI Prompt Template Language) Engine - Implementation Plan

## Language Name & File Extension

- **Language Name**: APTL (AI Prompt Template Language)
- **File Extension**: `.aptl`
- **MIME Type**: `text/x-aptl`

## Project Overview

A standalone template engine specifically designed for building AI system prompts with human-readable syntax that compiles to clean, formatted output without template artifacts.

## Architecture Design

### Core Modules

````typescript
# APTL Engine Implementation Plan

## 1. Core Engine Module (`src/core/`)

### engine.ts
- Main entry point for the template engine
- Orchestrates the parsing, compilation, and rendering pipeline
- Public API:
  ```typescript
  class APTLEngine {
    render(template: string, data: Record<string, any>): string
    renderFile(filePath: string, data: Record<string, any>): Promise<string>
    compile(template: string): CompiledTemplate
    registerHelper(name: string, fn: HelperFunction): void
    setOutputFormatter(formatter: OutputFormatter): void
  }
  ```

### parser.ts
- Parses APTL syntax into an Abstract Syntax Tree (AST)
- Handles:
  - Section blocks with attributes
  - Conditionals (if/elif/else)
  - Iterations (each)
  - Variable interpolation
  - Comments (line and block)
- Validates syntax and provides meaningful error messages

### tokenizer.ts
- Lexical analysis of template strings
- Token types:
  - SECTION_START, SECTION_END
  - IF, ELIF, ELSE, END
  - EACH, IN
  - VARIABLE
  - TEXT
  - COMMENT_LINE, COMMENT_BLOCK
  - INDENT, DEDENT
  - ATTRIBUTE

### compiler.ts
- Transforms AST into executable render functions
- Optimizes template execution
- Handles variable resolution and scope management

### types.ts
- TypeScript interfaces and types:
  ```typescript
  interface Token { type: TokenType; value: string; line: number; column: number }
  interface ASTNode { type: NodeType; children?: ASTNode[]; attributes?: Record<string, any> }
  interface CompiledTemplate { render(data: Record<string, any>): string }
  interface OutputFormatter { format(sections: Section[]): string }
  ```

## 2. Template Management (`src/templates/`)

### template-registry.ts
- Auto-discovers and loads `.aptl` files from specified directories
- Caches compiled templates
- Hot-reload support in development
- API:
  ```typescript
  class TemplateRegistry {
    loadDirectory(path: string, options?: LoadOptions): Promise<void>
    get(name: string): CompiledTemplate
    register(name: string, template: string | CompiledTemplate): void
    reload(name?: string): Promise<void>
    list(): string[]
  }
  ```

### template-validator.ts
- Validates template structure
- Checks for:
  - Unclosed blocks
  - Undefined variables (optional strict mode)
  - Invalid section attributes
  - Proper nesting

## 3. Data Processing (`src/data/`)

### data-builder.ts
- Constructs data objects for template rendering
- Merges multiple data sources
- Handles default values

### context-mapper.ts
- Maps external data structures to template variables
- Transforms complex objects into flat or nested structures as needed

### variable-resolver.ts
- Resolves variable paths (e.g., `user.profile.name`)
- Handles undefined values gracefully
- Supports optional chaining

## 4. Conditionals (`src/conditionals/`)

### conditional-evaluator.ts
- Evaluates conditional expressions
- Supports:
  - Truthiness checks
  - Comparisons (==, !=, <, >, <=, >=)
  - Logical operators (and, or, not)
  - Collection operators (in, not in)

### expression-parser.ts
- Parses conditional expressions into evaluatable format
- Handles operator precedence
- Type coercion rules

## 5. Output Formatting (`src/formatters/`)

### markdown-formatter.ts
- Converts sections to markdown headers
- Handles lists and formatting

### plain-formatter.ts
- Outputs plain text with proper spacing
- Removes all template artifacts

### custom-formatter.ts
- Base class for custom output formats
- Plugin architecture for extensibility

## 6. Helpers (`src/helpers/`)

### built-in-helpers.ts
- String manipulation (capitalize, lowercase, trim)
- Array operations (join, first, last)
- Date formatting
- Number formatting

### helper-registry.ts
- Manages custom helper functions
- Runtime helper resolution

## 7. Utilities (`src/utils/`)

### cache.ts
- Template caching with TTL
- Memory-efficient storage

### errors.ts
- Custom error classes:
  ```typescript
  class APTLSyntaxError extends Error
  class APTLRuntimeError extends Error
  class APTLValidationError extends Error
  ```

### file-loader.ts
- Async file loading
- Watch mode for development

## Implementation Steps

### Phase 1: Core Parsing (Week 1)
1. Implement tokenizer with basic token types
2. Build parser for AST generation
3. Create basic compiler for simple templates
4. Set up test infrastructure

### Phase 2: Template Features (Week 2)
1. Implement section blocks with attributes
2. Add conditional evaluation (if/elif/else)
3. Build iteration support (each)
4. Add variable interpolation

### Phase 3: Data & Context (Week 3)
1. Implement variable resolver with path support
2. Build data builder and context mapper
3. Add helper system
4. Implement expression parser for conditionals

### Phase 4: Output & Registry (Week 4)
1. Create output formatters (markdown, plain)
2. Build template registry with auto-loading
3. Add caching layer
4. Implement hot-reload for development

### Phase 5: Polish & Testing (Week 5)
1. Comprehensive error handling
2. Performance optimizations
3. Documentation and examples
4. Full test coverage

## Testing Strategy

### Unit Tests
- Each module tested independently
- Mock dependencies
- Edge cases and error conditions

### Integration Tests
- Full template rendering scenarios
- Complex nested structures
- Various data inputs

### Performance Tests
- Large template rendering
- Cache effectiveness
- Memory usage

## Example Usage

```typescript
// Initialize engine
const engine = new APTLEngine();
const registry = new TemplateRegistry();

// Load templates
await registry.loadDirectory('./prompts');

// Render template
const result = engine.render(
  registry.get('agent-prompt'),
  {
    agentName: 'Assistant',
    agentRole: 'helpful',
    expertise: {
      areas: [
        { name: 'Programming', description: 'Python, TypeScript' }
      ]
    }
  }
);
```

## Configuration File

```typescript
// aptl.config.ts
export default {
  templateDirs: ['./prompts', './templates'],
  watch: process.env.NODE_ENV === 'development',
  cache: {
    enabled: true,
    ttl: 3600
  },
  output: {
    format: 'markdown',
    removeEmptyLines: true
  },
  strict: false // Allow undefined variables
}
```
````

This plan provides a complete roadmap for implementing the APTL engine with clear separation of concerns, extensibility, and focus on the specific needs of AI prompt generation.
