---
layout: default
title: Syntax Reference
---

# APTL Syntax Reference

A comprehensive guide to APTL's template syntax.

## Table of Contents

- [Variables](#variables)
- [Sections](#sections)
- [Comments](#comments)
- [Whitespace and Indentation](#whitespace-and-indentation)
- [Escaping](#escaping)
- [Expressions](#expressions)

## Variables

Variables interpolate data into your templates using the `@{...}` syntax.

### Basic Variables

```aptl
@{variableName}
```

Example:
```aptl
Hello, @{name}!
```

### Nested Properties (Dot Notation)

Access nested object properties:

```aptl
@{user.profile.name}
@{settings.theme.color}
```

Example with data:
```typescript
{
  user: {
    profile: {
      name: 'Alice'
    }
  }
}
```

### Array Access (Bracket Notation)

Access array elements by index:

```aptl
@{items[0]}
@{users[1].name}
```

Example:
```typescript
{
  items: ['First', 'Second', 'Third'],
  users: [
    { name: 'Alice' },
    { name: 'Bob' }
  ]
}
```

### Mixed Notation

Combine dot and bracket notation:

```aptl
@{users[0].profile.email}
@{data.items[2].name}
```

### Default Values

**Provide fallback values when variables are undefined or null:**

```aptl
Welcome, @{user.name|"Guest"}!
Timeout: @{config.timeout|30} seconds
Debug mode: @{settings.debug|false}
Theme: @{preferences.theme|"dark"}
```

**Syntax:** `@{variablePath|defaultValue}`

**Supported default value types:**
- **Strings**: `"default"` or `'default'` (quotes required)
- **Numbers**: `42`, `3.14`, `-10`
- **Booleans**: `true`, `false`

**Resolution behavior:**
1. Try to resolve `variablePath` from data
2. If result is `undefined` or `null`, use the pipe default value
3. If no pipe default, fall back to engine's global default
4. If no global default, throw error (or return empty string based on config)

**Examples:**

```aptl
// String defaults
Hello, @{userName|"Anonymous User"}!
Email: @{contact.email|"noreply@example.com"}

// Number defaults
Max retries: @{config.maxRetries|3}
Temperature: @{params.temperature|0.7}
Port: @{server.port|8080}

// Boolean defaults
Debug: @{settings.debug|false}
Verbose: @{options.verbose|true}

// Nested paths with defaults
City: @{user.address.city|"Unknown"}
Score: @{results.tests[0].score|0}
```

**Important notes:**
- Default values are only used when the variable is `undefined` or `null`
- Empty strings (`""`) and zero (`0`) are valid values and won't trigger defaults
- For strings, quotes are **required**: `|"default"` not `|default`
- Whitespace around the pipe is ignored: `@{var | "default"}` works

## Sections

Sections group related content and control output formatting.

### Basic Section (Block Syntax)

```aptl
@section sectionName
  Content goes here
@end
```

### Inline Section Syntax

For simple, single-line sections, use the colon (`:`) syntax:

```aptl
@section title: AI Coding Assistant
@section version: 2.1.0
@section author: @{authorName}
```

**When to use inline syntax:**
- Single-line content
- Simple text without complex nesting
- Quick metadata or short descriptions

**When to use block syntax:**
- Multi-line content
- Nested directives or complex logic
- Better readability for longer content

### Named Sections (String Literals)

Use quotes for section names with spaces or special characters:

```aptl
@section "role"
  Content
@end

@section "my section"
  Content with spaces
@end
```

### Section Attributes

Attributes work with both block and inline syntax.

#### Block Syntax with Parentheses

```aptl
@section name(attribute="value")
  Content
@end

@section name(attr1="value1", attr2="value2")
  Content
@end
```

#### Inline Syntax with Attributes

```aptl
@section title(format="markdown"): # Welcome to APTL
@section config(role="system"): You are an AI assistant
@section metadata(format="json"): { "version": "1.0" }
```

#### Without Parentheses

```aptl
@section name attribute="value"
  Content
@end

@section name attr1="value1", attr2="value2"
  Content
@end
```

### Common Section Attributes

- `role` - Section role (e.g., "system", "user", "assistant")
- `format` - Output format ("plain", "markdown", "json", "structured")
- `override` - Override parent section in template inheritance
- `prepend` - Prepend to parent section content
- `append` - Append to parent section content
- `overridable` - Allow child templates to override this section
- `new` - Create a new section (don't inherit from parent)

Examples:

```aptl
@section identity(role="system")
  You are an AI assistant.
@end

@section code(format="json")
  { "key": "value" }
@end

@section header(overridable=true)
  Default header
@end
```

## Comments

### Line Comments

Use `//` for single-line comments:

```aptl
// This is a comment
@section main
  // This comment is inside a section
  Content here
@end
```

### Block Comments

Use `/* ... */` for multi-line comments:

```aptl
/*
  This is a multi-line comment
  It can span multiple lines
*/

@section main
  /*
    Block comments work anywhere
  */
  Content
@end
```

## Whitespace and Indentation

APTL is indent-aware and preserves meaningful whitespace.

### Indentation

APTL tracks indentation to maintain proper structure:

```aptl
@section main
  Line 1
    Indented line
  Line 3
@end
```

Output preserves the indentation:
```
Line 1
  Indented line
Line 3
```

### Blank Lines

Blank lines are preserved in the output:

```aptl
@section main
  First paragraph

  Second paragraph (with blank line above)
@end
```

### Trailing Whitespace

Trailing whitespace on lines is generally preserved, but you can control this with output formatters.

## Escaping

Use backslash `\` to escape special characters.

### Escaping the @ Symbol

```aptl
Email me at user\@example.com
Use \@section to print @section literally
```

Output:
```
Email me at user@example.com
Use @section to print @section literally
```

### Other Escape Sequences

- `\\` - Backslash
- `\n` - Newline
- `\t` - Tab
- `\r` - Carriage return
- `\/` - Forward slash

Example:
```aptl
Path: C:\\Users\\Documents
```

## Expressions

Expressions are used in conditional directives (`@if`, `@elif`).

### Comparison Operators

- `==` - Equal to
- `!=` - Not equal to
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal to
- `<=` - Less than or equal to

```aptl
@if age >= 18
  Adult
@end

@if status == "active"
  Active user
@end

@if count > 0
  Has items
@end
```

### Logical Operators

- `and` - Logical AND
- `or` - Logical OR
- `not` - Logical NOT

```aptl
@if user.isActive and user.isPremium
  Premium active user
@end

@if status == "pending" or status == "review"
  In progress
@end

@if not user.isBlocked
  User is allowed
@end
```

### Grouping with Parentheses

```aptl
@if (age >= 18 and hasConsent) or isAdmin
  Granted access
@end
```

### In Operator

Check if a value exists in an array or property:

```aptl
@if "admin" in user.roles
  Has admin role
@end

@if value in allowedValues
  Value is allowed
@end
```

### Truthiness

Variables are evaluated for truthiness:

```aptl
@if user.isActive
  Active
@end

@if items
  Has items
@end
```

Falsy values:
- `false`
- `null`
- `undefined`
- `0`
- `""` (empty string)
- `[]` (empty array)

## String Literals

Strings can use single or double quotes:

```aptl
@section "section name"
@if status == 'active'
@{user.name|"Default"}
```

### Escape Sequences in Strings

```aptl
@if message == "Hello \"World\""
  Match found
@end
```

## Number Literals

Both integers and floats are supported:

```aptl
@if age >= 18
@if price <= 99.99
@if count == 0
```

## Boolean Literals

```aptl
@if isPremium == true
@if isBlocked != false
```

## Variable Path Resolution

The variable resolver supports:

1. **Simple variables**: `name`
2. **Dot notation**: `user.name`, `user.profile.email`
3. **Bracket notation**: `items[0]`, `users[1]`
4. **Mixed notation**: `users[0].profile.email`

### Resolution Order

1. Check if the path exists in the data
2. Traverse the path step by step
3. Return `undefined` if any step fails
4. Apply default value if provided and result is `undefined`

---

[← Getting Started](getting-started) | [Next: Directives →](directives)
