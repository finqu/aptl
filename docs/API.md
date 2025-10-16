# API Documentation for Prompt Template Engine

## Overview

The Prompt Template Engine is designed to facilitate the creation and rendering of human-readable templates with support for simple conditionals and easy data injection. This document outlines the API provided by the engine, including key classes, functions, and usage examples.

## Core Components

### TemplateEngine

- **Class**: `TemplateEngine`
- **Methods**:
  - `render(template: string, data: Record<string, any>): string`
    - Renders the provided template using the supplied data.
    - **Parameters**:
      - `template`: A string representing the template to be rendered.
      - `data`: An object containing the data to inject into the template.
    - **Returns**: A string containing the rendered output.

### Parser

- **Function**: `parse(template: string): ParsedTemplate`
  - Converts a human-readable template into a structured format for processing.
  - **Parameters**:
    - `template`: A string representing the template to parse.
  - **Returns**: A `ParsedTemplate` object containing the structured representation of the template.

### Tokenizer

- **Function**: `tokenize(template: string): Token[]`
  - Breaks down the template string into manageable tokens for the parser.
  - **Parameters**:
    - `template`: A string representing the template to tokenize.
  - **Returns**: An array of `Token` objects representing the individual components of the template.

### Template Registry

- **Class**: `TemplateRegistry`
- **Methods**:
  - `register(template: string): void`
    - Registers a new template for later retrieval.
  - `get(templateName: string): string | null`
    - Retrieves a registered template by name.
    - **Parameters**:
      - `templateName`: The name of the template to retrieve.
    - **Returns**: The template string or `null` if not found.

### Template Validator

- **Function**: `validateTemplate(template: string): boolean`
  - Checks the syntax and structure of the provided template.
  - **Parameters**:
    - `template`: A string representing the template to validate.
  - **Returns**: `true` if the template is valid, `false` otherwise.

## Data Handling

### DataBuilder

- **Class**: `DataBuilder`
- **Methods**:
  - `build(dataSource: any): Record<string, any>`
    - Constructs the data needed for rendering templates based on the provided data source.

### Context Mapper

- **Function**: `mapContext(context: any): Record<string, any>`
  - Transforms the context data into a format suitable for template rendering.
  - **Parameters**:
    - `context`: The context data to map.
  - **Returns**: A mapped context object.

### Variable Resolver

- **Function**: `resolveVariables(data: Record<string, any>): string`
  - Resolves variables in the template with the provided data.
  - **Parameters**:
    - `data`: An object containing the data for variable resolution.
  - **Returns**: A string with resolved variables.

## Conditional Logic

### ConditionalEvaluator

- **Class**: `ConditionalEvaluator`
- **Methods**:
  - `evaluate(expression: string): boolean`
    - Evaluates a conditional expression within templates.
    - **Parameters**:
      - `expression`: A string representing the conditional expression to evaluate.
    - **Returns**: `true` if the condition is met, `false` otherwise.

### Expression Parser

- **Function**: `parseExpression(expression: string): EvaluatedExpression`
  - Parses and evaluates conditional expressions.
  - **Parameters**:
    - `expression`: A string representing the expression to parse.
  - **Returns**: An `EvaluatedExpression` object containing the result of the evaluation.

## Usage Examples

### Basic Rendering

```typescript
import { TemplateEngine } from 'src/core/engine';

const engine = new TemplateEngine();
const template = 'Hello, {{name}}!';
const data = { name: 'World' };
const output = engine.render(template, data);
console.log(output); // Output: Hello, World!
```

### Conditional Rendering

```typescript
import { TemplateEngine } from 'src/core/engine';

const engine = new TemplateEngine();
const template = '{{#if isActive}}Active{{else}}Inactive{{/if}}';
const data = { isActive: true };
const output = engine.render(template, data);
console.log(output); // Output: Active
```

## Conclusion

The Prompt Template Engine provides a robust API for creating and rendering templates with support for conditionals and data injection. For more detailed information on syntax and migration, please refer to the other documentation files in the `docs` directory.
