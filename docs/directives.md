---
layout: default
title: Directives
---

# Directives Reference

Complete guide to all built-in APTL directives.

## Control Flow

### @if / @elif / @else

Conditional rendering based on expressions.

The `@if` directive allows you to conditionally include content based on expressions. You can use the block syntax for multi-line content, wrapping it between `@if` and `@end`. For simple conditions with single-line content, the inline syntax using a colon (`:`) provides a more compact alternative.

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

For simple one-liners, use the inline syntax:

```aptl
@if expression: Single line content
```

**Examples**

Here's a simple condition checking if a user is active:

```aptl
@if user.isActive
  Welcome back!
@end
```

The inline syntax is perfect for short messages:

```aptl
@if isPremium: You have access to premium features
@if isAdmin: Administrator privileges enabled
@if user.hasNotifications: You have new notifications!
```

You can provide alternative content with `@else`:

```aptl
@if user.isPremium
  Premium features available
@else
  Upgrade to access premium features
@end
```

Chain multiple conditions using `@elif` to check different cases:

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

Complex expressions can combine multiple conditions with logical operators:

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

**Supported Operators**

- **Comparison**: `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Logical**: `and`, `or`, `not`
- **Membership**: `in`
- **Grouping**: `(` `)`


### @each

Iterate over arrays and collections.

The `@each` directive lets you loop through arrays and render content for each item. You can access the item value and loop metadata through the automatically provided `loop` variable. Like other directives, it supports both block and inline syntax.

For basic iteration, specify the item name and the array path:

```aptl
@each itemName in arrayPath
  Content with @{itemName}
@end
```

For simple lists, the inline syntax provides a compact alternative:

```aptl
@each itemName in arrayPath: Single line with @{itemName}
```

**Examples**

Here's a simple iteration over an array of features:

```aptl
@each feature in features
  - @{feature.name}: @{feature.description}
@end
```

The inline syntax works great for generating compact lists:

```aptl
@each item in items: • @{item.name} (@{item.price})
@each user in users: - @{user.name} <@{user.email}>
@each tag in tags: #@{tag}
```

Access the index through the `loop` variable:

```aptl
@each user in users
  @{loop.index}. @{user.name} (@{user.email})
@end
```

**Loop Metadata**

Within each iteration, APTL automatically provides a `loop` variable with useful metadata about the current iteration:

- `loop.index` - The current iteration index (0-based)
- `loop.first` - `true` if this is the first iteration
- `loop.last` - `true` if this is the last iteration
- `loop.even` - `true` if the index is even
- `loop.odd` - `true` if the index is odd
- `loop.length` - Total number of items being iterated

Examples using loop metadata:

```aptl
@each user in users
  @if loop.first
    === User List ===
  @end

  @{loop.index}. @{user.name}

  @if loop.last
    === End of List ===
  @end
@end
```

```aptl
@each item in items
  @if loop.even
    <div class="even">@{item.name}</div>
  @else
    <div class="odd">@{item.name}</div>
  @end
@end
```

```aptl
@each task in tasks
  Task @{loop.index + 1} of @{loop.length}: @{task.name}
@end
```

Loops can be nested to handle hierarchical data:

```aptl
@each category in categories
  ## @{category.name}
  @each item in category.items
    - @{item.name}
  @end
@end
```

Variables from the parent scope remain accessible within loops:

```aptl
@each task in tasks
  Task: @{task.name}
  Owner: @{owner.name}
@end
```

**Notes:**
- The array path is resolved from the data context
- Item and index variables are scoped to the loop body
- Parent scope variables remain accessible
- Empty arrays produce no output


### @switch / @case / @default

Switch-case conditional rendering for matching a value against multiple cases.

The `@switch` directive provides a clean way to handle multiple conditional branches based on a single value. It evaluates an expression and renders the content of the first matching `@case`, or the `@default` if no cases match.

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

**Examples**

Here's a basic switch statement using string values to display different status messages:

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

The switch directive works equally well with numeric values:

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

Case values can be variables that resolve at runtime:

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

You can nest other directives within case blocks:

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

Switch statements can be nested for more complex logic:

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

The switch directive works well within loops for processing collections:

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

**Features:**
- **Strict equality**: Uses `===` comparison (no type coercion)
- **First match wins**: Only the first matching case is rendered
- **Variable or literal values**: Both switch expression and case values can be variables or literals
- **Optional default**: If no case matches and no `@default` is provided, renders nothing
- **Nested variable paths**: Supports `user.role`, `data[0].status`, etc.
- **Supports all types**: Strings, numbers, booleans, null, undefined

**Supported Value Types:**
- **String literals**: `@case "approved"`
- **Numeric literals**: `@case 42`
- **Boolean literals**: `@case true` or `@case false`
- **Null/undefined**: `@case null` or `@case undefined`
- **Variables**: `@case someVariable`
- **Nested paths**: `@case user.role`

**Notes:**
- Uses strict equality (`===`) - `"0"` and `0` are different
- The first matching case is rendered (subsequent matches are ignored)
- The `@default` case is optional
- Only one case or the default is rendered per switch
- Case values can be literals or variables that resolve at runtime


## Template Composition

### @section

Define named sections for organization and template inheritance.

The `@section` directive is fundamental to organizing your templates. It creates named blocks of content that can be referenced, formatted, and overridden in template inheritance scenarios. Sections support both block and inline syntax, along with attributes that control rendering and inheritance behavior.

Use the block syntax for multi-line content:

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

For simple one-liners like metadata or configuration values, the inline syntax is more concise:

```aptl
@section name: Content goes here
@section title: AI Coding Assistant
@section version: 2.1.0
@section author: @{authorName}
```

Inline sections can also include attributes:

```aptl
@section title(format="markdown"): # Welcome
@section config(role="system"): You are an assistant
```

**Attributes**

| Attribute | Type | Description |
|-----------|------|-------------|
| `role` | string | Section role (e.g., "system", "user") |
| `format` | string | Output format ("plain", "markdown", "json", "structured") |
| `override` | boolean | Override parent section completely |
| `prepend` | boolean | Prepend to parent section content |
| `append` | boolean | Append to parent section content |
| `overridable` | boolean | Allow children to override this section |
| `new` | boolean | Create new section (don't inherit) |

**Examples**

Here's a basic section defining an AI assistant's identity:

```aptl
@section identity
  You are a helpful assistant.
@end
```

Inline sections are perfect for metadata and short content:

```aptl
@section title: Code Review Assistant
@section version: 3.2.1
@section model: gpt-5
@section temperature: 0.7
```

You can mix block and inline syntax based on your content:

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

The `format` attribute controls how section content is rendered:

```aptl
@section code format="json"
{ "example": "data" }
@end

@section documentation format="markdown"
## Heading

Content here
@end

@section structure format="structured"
Main content

@section details
Detailed information
@end
@end
```

The structured format example above outputs:
```xml
<structure>
Main content

## Details
Detailed information
</structure>
```

**Custom Section Titles**

The `title` attribute allows you to override the section name in the output, or suppress the heading entirely:

```aptl
@section first format="structured" title="Example"
content
@end
```

Output:
```xml
<first>
# Example
content
</first>
```

Set `title=false` to suppress the heading and prevent heading level increase for nested sections:

```aptl
@section outer format="structured"
Outer content

@section middle format="markdown" title=false
Middle content

@section inner format="structured"
Inner content
@end
@end
@end
```

Output:
```xml
<outer>
Outer content

Middle content

## Inner
Inner content
</outer>
```

Notice that when `title=false` is used, the nested `inner` section becomes `##` (level 2) instead of `###` (level 3), because the `middle` section doesn't contribute a heading level.

**Mixed Format Example**

You can mix different formatters for different sections. Here's a powerful example combining structured and markdown formats:

```aptl
@section api format="structured"
API Documentation

@section "Endpoint Details" format="markdown"
Use POST /api/users to create a new user

@section example format="json"
{ "name": "Alice", "role": "admin" }
@end
@end
@end
```

Output:
```xml
<api>
API Documentation

## Endpoint Details
Use POST /api/users to create a new user

### Example
{ "name": "Alice", "role": "admin" }
</api>
```

**Template Inheritance**

In template inheritance, you can completely replace a parent section with `override`:

```aptl
@section header(override=true)
  This replaces the parent's header
@end
```

Use `prepend` to add content before the parent's content:

```aptl
@section content(prepend=true)
  This goes before the parent's content
@end
```

Or use `append` to add content after:

```aptl
@section footer(append=true)
  This goes after the parent's footer
@end
```

Mark sections as `overridable` in parent templates to allow child templates to modify them:

```aptl
@section default(overridable=true)
  Default content that children can override
@end
```

---

### @extends

Inherit from a parent template.

The `@extends` directive enables template inheritance, allowing you to build upon a base template by overriding, prepending, or appending to its sections. This must be the first directive in your template.

```aptl
@extends "parent-template.aptl"
```

**Behavior:**
- Must be the first directive in the template
- Loads the parent template
- Child sections can override, prepend, or append to parent sections
- Supports multi-level inheritance (grandchild → child → parent)

**Example**

Here's a parent template that defines the base structure:

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

A child template can extend it and customize specific sections:

```aptl
@extends "base.aptl"

@section header(override=true)
  Custom Header
@end

@section content(prepend=true)
  Additional content before default

@end
```

This produces the following output:

```
Custom Header

Additional content before default
Default content

Copyright 2025
```

---

### @include

Include another template inline.

The `@include` directive loads and renders another template at the current position. The included template has access to the same data context and can be used anywhere in your template, even multiple times.

```aptl
@include "template-name.aptl"
```

**Behavior:**
- Loads and renders the specified template
- Included template has access to the current data context
- Can be used anywhere in a template
- Can be used multiple times

**Example**

Here's a reusable header template:

```aptl
@section header
  # @{site.name}
  @{site.tagline}
@end
```

You can include it in your main template:

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

The `@examples` directive creates a structured collection of example cases, particularly useful for few-shot prompting with AI models. Each example is defined using a `@case` directive within the `@examples` block.

```aptl
@examples
  @case argument="value"
  @case argument="value"
@end
```

**Example**

Here's how to define a set of code review examples:

```aptl
@examples
@case input="Long function" output="Break into smaller functions"
@case input="Repeated code" output="Extract to reusable function"
@case input="Magic numbers" output="Use named constants"
@end
```

This renders in a structured format suitable for AI consumption:

```
Examples:

Input: Long function
Output: Break into smaller functions

Input: Repeated code
Output: Extract to reusable function

Input: Magic numbers
Output: Use named constants
```

### @case

Define a single example case within an `@examples` block.

The `@case` directive (when used inside `@examples`) defines individual example cases with named parameters. This is different from the `@case` used in `@switch` statements.

```aptl
@case param1="value1", param2="value2"
```

**Parameters**

The `@case` directive accepts named parameters. Common patterns include:

- `input` - Example input
- `output` - Expected output
- `scenario` - Scenario description
- `response` - Expected response
- `explanation` - Why this works

**Examples**

Basic input/output examples:

```aptl
@examples
@case input="Code smell" output="Suggested fix"
@end
```

You can add explanations to provide additional context:

```aptl
@examples
@case input="Example", output="Result", explanation="Because..."
@end
```

---

## Directive Composition

Directives can be nested and combined to create complex template logic:

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