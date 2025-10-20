---
layout: default
title: Directives
---

# Directives Reference

Complete guide to all built-in APTL directives.

## Table of Contents

- [Control Flow](#control-flow)
  - [@if / @elif / @else](#if--elif--else)
  - [@each](#each)
  - [@switch / @case / @default](#switch--case--default)
- [Template Composition](#template-composition)
  - [@section](#section)
  - [@extends](#extends)
  - [@include](#include)
- [Examples & Documentation](#examples--documentation)
  - [@examples](#examples)
  - [@case](#case)

---

## Control Flow

### @if / @elif / @else

Conditional rendering based on expressions.

#### Syntax

**Block syntax:**
```aptl
@if expression
  Content when true
@end

@if expression
  Content when true
@else
  Content when false
@end

@if expression1
  Content when expression1 is true
@elif expression2
  Content when expression2 is true
@else
  Content when all are false
@end
```

**Inline syntax** (for simple one-liners):
```aptl
@if expression: Single line content
```

#### Examples

**Simple condition:**
```aptl
@if user.isActive
  Welcome back!
@end
```

**Inline syntax:**
```aptl
@if isPremium: You have access to premium features
@if isAdmin: Administrator privileges enabled
@if user.hasNotifications: You have new notifications!
```

**With else:**
```aptl
@if user.isPremium
  Premium features available
@else
  Upgrade to access premium features
@end
```

**Multiple conditions:**
```aptl
@if userType == "admin"
  Admin dashboard
@elif userType == "moderator"
  Moderator panel
@elif userType == "user"
  User profile
@else
  Please log in
@end
```

**Complex expressions:**
```aptl
@if user.age >= 18 and user.hasConsent
  Full access granted
@end

@if status == "active" or status == "pending"
  Account is processing
@end

@if not user.isBlocked
  User is allowed
@end
```

#### Supported Operators

- **Comparison**: `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Logical**: `and`, `or`, `not`
- **Membership**: `in`
- **Grouping**: `(` `)`

---

### @each

Iterate over arrays and collections.

#### Syntax

**Block syntax (basic iteration):**
```aptl
@each itemName in arrayPath
  Content with @{itemName}
@end
```

**Block syntax (with index):**
```aptl
@each itemName, indexName in arrayPath
  Content with @{itemName} and @{indexName}
@end
```

**Inline syntax** (for simple lists):
```aptl
@each itemName in arrayPath: Single line with @{itemName}
```

#### Examples

**Simple iteration:**
```aptl
@each feature in features
  - @{feature.name}: @{feature.description}
@end
```

**Inline syntax:**
```aptl
@each item in items: • @{item.name} (@{item.price})
@each user in users: - @{user.name} <@{user.email}>
@each tag in tags: #@{tag}
```

**With index:**
```aptl
@each user, index in users
  @{index}. @{user.name} (@{user.email})
@end
```

**Nested loops:**
```aptl
@each category in categories
  ## @{category.name}
  @each item in category.items
    - @{item.name}
  @end
@end
```

**Accessing parent scope:**
```aptl
@each task in tasks
  Task: @{task.name}
  Owner: @{owner.name}
@end
```

#### Notes

- The array path is resolved from the data context
- Item and index variables are scoped to the loop body
- Parent scope variables remain accessible
- Empty arrays produce no output

---

### @switch / @case / @default

Switch-case conditional rendering for matching a value against multiple cases.

#### Syntax

```aptl
@switch expression
  @case value1
    Content for case 1
  @case value2
    Content for case 2
  @default
    Default content
@end
```

#### Examples

**Basic switch with string values:**
```aptl
@switch status
  @case "pending"
    ⏳ Waiting for approval
  @case "approved"
    ✅ Request approved
  @case "rejected"
    ❌ Request rejected
  @default
    ❓ Unknown status
@end
```

**Switch with numeric values:**
```aptl
@switch priority
  @case 1
    🔴 Critical
  @case 2
    🟡 High
  @case 3
    🟢 Normal
  @default
    ⚪ Low priority
@end
```

**Switch with variables:**
```aptl
@switch userRole
  @case adminRole
    Administrator access
  @case moderatorRole
    Moderator access
  @default
    User access
@end
```

**Switch with nested content:**
```aptl
@switch role
  @case "admin"
    @if isPremium
      👑 Premium Administrator
    @else
      🔧 Administrator
    @end
  @case "user"
    👤 Regular User
  @default
    👥 Guest
@end
```

**Nested switches:**
```aptl
@switch category
  @case "admin"
    @switch level
      @case 1
        Super Admin
      @case 2
        Regular Admin
      @default
        Admin (Level @{level})
    @end
  @default
    Regular User
@end
```

**Switch in a loop:**
```aptl
@each task in tasks
  @{task.name}: @switch task.status
    @case "done"
✓ Complete
    @case "in-progress"
⏳ In Progress
    @case "todo"
☐ To Do
  @end
@end
```

#### Features

- **Strict equality**: Uses `===` comparison (no type coercion)
- **First match wins**: Only the first matching case is rendered
- **Variable or literal values**: Both switch expression and case values can be variables or literals
- **Optional default**: If no case matches and no `@default` is provided, renders nothing
- **Nested variable paths**: Supports `user.role`, `data[0].status`, etc.
- **Supports all types**: Strings, numbers, booleans, null, undefined

#### Supported Value Types

- **String literals**: `@case "approved"`
- **Numeric literals**: `@case 42`
- **Boolean literals**: `@case true` or `@case false`
- **Null/undefined**: `@case null` or `@case undefined`
- **Variables**: `@case someVariable`
- **Nested paths**: `@case user.role`

#### Notes

- Uses strict equality (`===`) - `"0"` and `0` are different
- The first matching case is rendered (subsequent matches are ignored)
- The `@default` case is optional
- Only one case or the default is rendered per switch
- Case values can be literals or variables that resolve at runtime

---

## Template Composition

### @section

Define named sections for organization and template inheritance.

#### Syntax

**Block syntax:**
```aptl
@section name
  Content
@end

@section "name with spaces"
  Content
@end

@section name(attribute="value")
  Content
@end

@section name attribute="value", another="value"
  Content
@end
```

**Inline syntax** (for simple one-liners):
```aptl
@section name: Content goes here
@section title: AI Coding Assistant
@section version: 2.1.0
@section author: @{authorName}
```

**Inline with attributes:**
```aptl
@section title(format="markdown"): # Welcome
@section config(role="system"): You are an assistant
```

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `role` | string | Section role (e.g., "system", "user") |
| `format` | string | Output format ("plain", "markdown", "json", "structured") |
| `override` | boolean | Override parent section completely |
| `prepend` | boolean | Prepend to parent section content |
| `append` | boolean | Append to parent section content |
| `overridable` | boolean | Allow children to override this section |
| `new` | boolean | Create new section (don't inherit) |

#### Examples

**Basic section:**
```aptl
@section identity
  You are a helpful assistant.
@end
```

**Inline sections (for metadata and short content):**
```aptl
@section title: Code Review Assistant
@section version: 3.2.1
@section model: gpt-4
@section temperature: 0.7
```

**Mixing block and inline:**
```aptl
@section title: AI Coding Assistant

@section capabilities
  - Code review
  - Bug detection
  - Refactoring suggestions
@end

@section author: @{authorName}
@section lastUpdated: @{timestamp}
```

**With role:**
```aptl
@section identity(role="system")
  You are an AI assistant.
@end
```

**With format:**
```aptl
@section code(format="json")
  { "example": "data" }
@end

@section documentation(format="markdown")
  ## Heading

  Content here
@end
```

**Template inheritance (override):**
```aptl
@section header(override=true)
  This replaces the parent's header
@end
```

**Template inheritance (prepend):**
```aptl
@section content(prepend=true)
  This goes before the parent's content
@end
```

**Template inheritance (append):**
```aptl
@section footer(append=true)
  This goes after the parent's footer
@end
```

**Overridable section:**
```aptl
@section default(overridable=true)
  Default content that children can override
@end
```

---

### @extends

Inherit from a parent template.

#### Syntax

```aptl
@extends "parent-template.aptl"
```

#### Behavior

- Must be the first directive in the template
- Loads the parent template
- Child sections can override, prepend, or append to parent sections
- Supports multi-level inheritance (grandchild → child → parent)

#### Example

**Parent template (base.aptl):**
```aptl
@section header(overridable=true)
  Default Header
@end

@section content(overridable=true)
  Default content
@end

@section footer
  Copyright 2025
@end
```

**Child template:**
```aptl
@extends "base.aptl"

@section header(override=true)
  Custom Header
@end

@section content(prepend=true)
  Additional content before default

@end
```

**Output:**
```
Custom Header

Additional content before default
Default content

Copyright 2025
```

---

### @include

Include another template inline.

#### Syntax

```aptl
@include "template-name.aptl"
```

#### Behavior

- Loads and renders the specified template
- Included template has access to the current data context
- Can be used anywhere in a template
- Can be used multiple times

#### Example

**header.aptl:**
```aptl
@section header
  # @{site.name}
  @{site.tagline}
@end
```

**main.aptl:**
```aptl
@include "header.aptl"

@section content
  Main content here
@end
```

---

## Examples & Documentation

### @examples

Define a set of few-shot examples for AI prompts.

#### Syntax

```aptl
@examples
  @case argument="value"
  @case argument="value"
@end
```

#### Example

```aptl
@examples
@case input="Long function" output="Break into smaller functions"
@case input="Repeated code" output="Extract to reusable function"
@case input="Magic numbers" output="Use named constants"
@end
```

#### Output

The examples are rendered in a structured format suitable for AI consumption:

```
Examples:

Input: Long function
Output: Break into smaller functions

Input: Repeated code
Output: Extract to reusable function

Input: Magic numbers
Output: Use named constants
```

---

### @case

Define a single example case within an `@examples` block.

#### Syntax

```aptl
@case param1="value1", param2="value2"
```

#### Parameters

The `@case` directive accepts named parameters. Common patterns:

- `input` - Example input
- `output` - Expected output
- `scenario` - Scenario description
- `response` - Expected response
- `explanation` - Why this works

#### Examples

**Basic input/output:**
```aptl
@examples
@case input="Code smell" output="Suggested fix"
@end
```

**With explanation:**
```aptl
@examples
@case input="Example", output="Result", explanation="Because..."
@end
```

---

## Directive Composition

Directives can be nested and combined:

```aptl
@section main
  @if user.isActive
    @each task in user.tasks
      - @{task.name}
      @if task.priority == "high"
        ⚠️ High priority
      @end
    @end
  @end
@end
```

## Custom Directives

APTL supports custom directives. See the [API Reference](api-reference) for details on creating custom directives.

---

[← Syntax Reference](syntax-reference) | [Next: Advanced Features →](advanced-features)
