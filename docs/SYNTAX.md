# Template Syntax Documentation

## Overview

This document outlines the syntax used in the prompt templates for the template engine. It covers variable injection, conditionals, and the overall structure of templates to ensure clarity and ease of use.

## Template Structure

A template consists of a combination of static text and dynamic placeholders. The basic structure is as follows:

```
Hello, {{name}}! Today is {{date}}.
```

In this example, `{{name}}` and `{{date}}` are placeholders that will be replaced with actual values during rendering.

## Variable Injection

Variables can be injected into templates using the double curly braces syntax. Here are some examples:

- **Basic Variable**: `{{variableName}}`
- **Nested Variables**: `{{user.profile.name}}`
- **Default Values**: `{{variableName | defaultValue}}`

### Example

```
Welcome, {{user.name | 'Guest'}}!
```

If `user.name` is not defined, it will default to "Guest".

## Conditionals

Conditionals allow for dynamic content based on certain conditions. The syntax for conditionals is as follows:

```
{{#if condition}}
  Content to display if condition is true.
{{else}}
  Content to display if condition is false.
{{/if}}
```

### Example

```
{{#if user.isLoggedIn}}
  Welcome back, {{user.name}}!
{{else}}
  Please log in.
{{/if}}
```

## Loops

You can iterate over arrays using the `{{#each}}` syntax:

```
{{#each items}}
  - {{this}}
{{/each}}
```

### Example

```
Your shopping list:
{{#each shoppingList}}
  - {{this}}
{{/each}}
```

## Helpers

Helpers are functions that can be used within templates to perform operations on data. They can be used as follows:

```
{{helperName argument1 argument2}}
```

### Example

```
Your total is {{formatCurrency totalAmount}}.
```

## Comments

Comments can be added to templates using the following syntax:

```
{{!-- This is a comment and will not be rendered --}}
```

## Conclusion

This syntax guide provides a foundation for creating human-readable templates with the template engine. By utilizing variable injection, conditionals, loops, and helpers, users can create dynamic and flexible templates tailored to their needs.
