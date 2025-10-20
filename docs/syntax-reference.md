---
layout: default
title: Syntax Reference
---

# APTL Syntax Reference

A comprehensive guide to APTL's template syntax.

## Variables

Variables interpolate data into your templates using the `@{...}` syntax. At its simplest, you can use `@{name}` to insert a value, but APTL supports much more sophisticated data access patterns.

You can access nested object properties using dot notation, such as `@{user.profile.name}` or `@{settings.theme.color}`. This makes it easy to work with complex data structures without flattening your data model.

```aptl
Hello, @{name}!
User email: @{user.profile.email}
Theme color: @{settings.theme.color}
```

For data structured like this:
```typescript
{
  name: 'Alice',
  user: {
    profile: {
      name: 'Alice',
      email: 'alice@example.com'
    }
  },
  settings: {
    theme: {
      color: 'blue'
    }
  }
}
```

Array elements can be accessed by index using bracket notation. You can use `@{items[0]}` for simple arrays, or combine it with dot notation like `@{users[1].name}` to access properties of array elements. This notation can be mixed freely - for example, `@{users[0].profile.email}` or `@{data.items[2].name}` both work as expected.

```aptl
First item: @{items[0]}
Second user: @{users[1].name}
Nested access: @{users[0].profile.email}
```

Example data:
```typescript
{
  items: ['First', 'Second', 'Third'],
  users: [
    { name: 'Alice', profile: { email: 'alice@example.com' } },
    { name: 'Bob', profile: { email: 'bob@example.com' } }
  ]
}
```

**Default Values**

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

Sections are the primary way to organize and structure your template content. They group related content together and give you fine-grained control over output formatting. Each section can have a name and optional attributes that control how it's rendered.

The most common form is the block syntax, which uses `@section` to open and `@end` to close:

```aptl
@section sectionName
  Content goes here
  It can span multiple lines
@end
```

For simple, single-line sections, APTL provides a more concise inline syntax using a colon (`:`). This is particularly useful for metadata, configuration values, or short descriptions where the block syntax would feel overly verbose:

```aptl
@section title: AI Coding Assistant
@section version: 2.1.0
@section author: @{authorName}
```

Use the inline syntax for single-line content, simple text without complex nesting, or quick metadata. The block syntax is better when you have multi-line content, nested directives or complex logic, or when readability benefits from the clear opening and closing markers.

When your section name contains spaces or special characters, wrap it in quotes (single or double):

```aptl
@section "role"
  You are a helpful assistant
@end

@section "my section"
  Content with spaces in the section name
@end
```

**Section Attributes**

Attributes provide additional configuration for sections and work with both block and inline syntax. The most readable approach uses parentheses around the attributes:

```aptl
@section name(attribute="value")
  Content
@end

@section name(attr1="value1", attr2="value2")
  Content
@end
```

Inline sections can also have attributes:

```aptl
@section title(format="markdown"): # Welcome to APTL
@section config(role="system"): You are an AI assistant
@section metadata(format="json"): { "version": "1.0" }
```

Alternatively, you can omit the parentheses if you prefer:

```aptl
@section name attribute="value"
  Content
@end

@section name attr1="value1", attr2="value2"
  Content
@end
```

Several attributes have special meanings in APTL. The `format` attribute controls the output format and accepts values like "plain", "markdown", "json", or "structured". The `override`, `prepend`, and `append` attributes are used in template inheritance to control how child templates modify parent sections. The `overridable` attribute marks a section as being allowed to be overridden by child templates.

Examples:

```aptl
@section identity
You are an AI assistant.
@end

@section code format="json"
@{anObjectVar}
@end

@section structure format="structured"
Main content

@section nested
Nested content
@end
@end
```

The structured format example above would output:
```xml
<structure>
Main content

## Nested
Nested content
</structure>
```

Template inheritance example:
```aptl
@section header(overridable=true)
Default header
@end
```

## Comments

APTL supports both single-line and multi-line comments to help document your templates.

For single-line comments, use `//` just like in JavaScript or TypeScript. Everything from `//` to the end of the line is treated as a comment and won't appear in the output:

```aptl
// This is a comment
@section main
  // This comment is inside a section
  Content here
@end
```

When you need to comment out multiple lines or write longer explanations, use block comments with `/* ... */` syntax. These can span multiple lines and work anywhere in your template:

```aptl
/*
  This is a multi-line comment
  It can span multiple lines
  Useful for documentation
*/

@section main
  /*
    Block comments work anywhere
  */
  Content
@end
```

## Whitespace and Indentation

APTL automatically removes leading and trailing whitespace from your template output by default, creating clean, compact results. This means that indentation you use in your template files for readability is stripped away unless you explicitly configure the engine to preserve it.

For example, this template:

```aptl
@section main
  Line 1
    Indented line
  Line 3
@end
```

Renders by default as:
```
Line 1
Indented line
Line 3
```

Similarly, blank lines between content are removed by default:

```aptl
@section main
  First paragraph

  Second paragraph (with blank line above)
@end
```

Renders as:
```
First paragraph
Second paragraph (with blank line above)
```

If you need to preserve whitespace, indentation, or blank lines in your output, you can configure the engine's whitespace handling behavior through engine options. This gives you full control over whether to optimize for compact output (the default) or maintain the exact formatting from your template files.

## Escaping

Use backslash `\` to escape special characters when you need them to appear literally in your output.

The most common case is escaping the `@` symbol, which APTL uses to introduce directives and variables. To output a literal `@` character, prefix it with a backslash:

```aptl
Email me at user\@example.com
Use \@section to print @section literally
```

This renders as:
```
Email me at user@example.com
Use @section to print @section literally
```

APTL also supports other standard escape sequences: `\\` for a literal backslash, `\n` for newline, `\t` for tab, `\r` for carriage return, and `\/` for forward slash. For example, when working with file paths on Windows:

```aptl
Path: C:\\Users\\Documents
```

## Expressions

Expressions are used in conditional directives like `@if` and `@elif` to make decisions about what content to include in your templates.

APTL supports standard comparison operators: `==` for equality, `!=` for inequality, `>` for greater than, `<` for less than, `>=` for greater than or equal to, and `<=` for less than or equal to. These work with numbers, strings, and other values:

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

You can combine conditions using logical operators. Use `and` to require multiple conditions to be true, `or` when any condition should match, and `not` to negate a condition:

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

Complex expressions can be grouped with parentheses to control evaluation order:

```aptl
@if (age >= 18 and hasConsent) or isAdmin
  Granted access
@end
```

The special `in` operator checks if a value exists in an array or as a property:

```aptl
@if "admin" in user.roles
  Has admin role
@end

@if value in allowedValues
  Value is allowed
@end
```

Variables are evaluated for truthiness when used directly in conditions. Falsy values include `false`, `null`, `undefined`, `0`, empty strings (`""`), and empty arrays (`[]`). Everything else is truthy:

```aptl
@if user.isActive
  Active
@end

@if items
  Has items
@end
```

## String Literals

String values in APTL can be enclosed in either single or double quotes - whichever you prefer or fits your content better:

```aptl
@section "section name"
@if status == 'active'
@{user.name|"Default"}
```

When you need to include quote characters within a string, escape them with a backslash:

```aptl
@if message == "Hello \"World\""
  Match found
@end
```

## Number Literals

APTL supports both integers and floating-point numbers in expressions and default values:

```aptl
@if age >= 18
@if price <= 99.99
@if count == 0
@{retries|3}
@{temperature|0.7}
```

## Boolean Literals

Use `true` and `false` for boolean values in comparisons:

```aptl
@if isPremium == true
@if isBlocked != false
@{debug|false}
```

## Variable Path Resolution

The variable resolver in APTL is quite flexible and supports multiple ways to access your data.

You can use simple variable names (`name`), dot notation for nested properties (`user.name`, `user.profile.email`), bracket notation for array access (`items[0]`, `users[1]`), or mix them together (`users[0].profile.email`).

When resolving a variable path, APTL checks if the path exists in your data, then traverses it step by step. If any step in the path fails (for example, trying to access a property on `undefined`), the resolver returns `undefined`. If you've provided a default value using the pipe syntax, that default will be used. Otherwise, it falls back to the engine's global default value if configured.
