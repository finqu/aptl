# Migration Guide for the Prompt Template Engine

## Overview

This document provides guidance for migrating from the old prompt template engine to the new version. The new engine introduces a more human-readable template syntax, improved data injection methods, and a standalone rendering engine that separates the base prompt and data build logic.

## Key Changes

### 1. Template Syntax

- The new engine uses a simplified syntax for templates, making them easier to read and write.
- Conditionals are now expressed in a more intuitive manner, allowing for straightforward logic within templates.

### 2. Data Injection

- Data injection has been streamlined. Instead of manually resolving variables, you can now use the `DataBuilder` class to construct the necessary data structure for rendering.
- Example:
  ```typescript
  const dataBuilder = new DataBuilder();
  const data = dataBuilder.build(agentRole);
  ```

### 3. Rendering Engine

- The rendering logic has been separated from the template definition. The `TemplateEngine` class is now responsible for rendering templates, while the `TemplateRegistry` manages template storage.
- Example of rendering a template:
  ```typescript
  const engine = new TemplateEngine();
  const output = engine.render(templateString, data);
  ```

### 4. Conditional Logic

- Conditional expressions are now evaluated using the `ConditionalEvaluator` class, which provides a clear interface for handling complex conditions.
- Example:
  ```typescript
  const evaluator = new ConditionalEvaluator();
  const result = evaluator.evaluate(conditionExpression);
  ```

## Migration Steps

1. **Update Template Files**
   - Review and update your existing template files to conform to the new syntax. Pay special attention to conditionals and variable placeholders.

2. **Refactor Data Handling**
   - Replace any direct variable resolution logic with the new `DataBuilder` class to ensure proper data structure for rendering.

3. **Adjust Rendering Logic**
   - Modify your rendering calls to utilize the new `TemplateEngine` class. Ensure that you are passing the correct template and data.

4. **Test Your Templates**
   - Run your existing tests against the new engine to identify any issues. Utilize the provided examples in the `src/examples` directory for reference.

5. **Review Documentation**
   - Familiarize yourself with the updated API documentation in `docs/API.md` and the syntax guide in `docs/SYNTAX.md` to fully leverage the new features.

## Conclusion

Migrating to the new prompt template engine will enhance your template management and rendering capabilities. By following the steps outlined in this guide, you can ensure a smooth transition to the improved system. If you encounter any issues, please refer to the documentation or reach out for support.
