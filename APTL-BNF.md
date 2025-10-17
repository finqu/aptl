# APTL (AI Prompt Template Language) - BNF Grammar

*Unified `@` syntax for all directives*

---

## Core Grammar

### Template Structure

```bnf
<template>          ::= <statement>*

<statement>         ::= <text>
                      | <variable>
                      | <directive>
                      | <comment>
                      | <newline>
```

### Basic Elements

```bnf
<text>              ::= <text-char>+
<text-char>         ::= <any-char-except-special> | <escaped>
<newline>           ::= "\n" | "\r\n" | "\r"

<escaped>           ::= "\@" | "\/" | "\\" | "\n" | "\t" | "\r"
```

*Special characters that trigger parsing: `@`, `//`, `/*`, newlines*

---

## Variables

```bnf
<variable>          ::= "@{" <variable-path> <default>? "}"

<variable-path>     ::= <identifier> <accessor>*
<accessor>          ::= "." <identifier>
                      | "[" <integer> "]"

<default>           ::= "|" <literal-value>

<identifier>        ::= <letter> (<letter> | <digit> | "_" | "-")*
```

**Examples:**
- `@{user.name}`
- `@{user.profile.email}`
- `@{items[0].name}`
- `@{user.name|"Guest"}`

---

## Directives

### General Directive Syntax

```bnf
<directive>         ::= "@" <directive-name> <whitespace>* <directive-args>? <newline> <directive-body>?

<directive-name>    ::= <identifier>
<directive-args>    ::= <any-text-until-newline>
<directive-body>    ::= <statement>* "@end" <newline>
```

**Note:** Each directive defines its own argument parsing via `parseArguments()` method.

---

## Directive Argument Patterns

### Conditional Arguments

*Used by: `@if`, `@elif`*

```bnf
<conditional-args>  ::= <expression>

<expression>        ::= <or-expression>
<or-expression>     ::= <and-expression> ("or" <and-expression>)*
<and-expression>    ::= <not-expression> ("and" <not-expression>)*
<not-expression>    ::= "not" <primary-expression>
                      | <primary-expression>

<primary-expression>::= <comparison>
                      | <in-expression>
                      | <truthiness>
                      | "(" <expression> ")"

<comparison>        ::= <variable-path> <operator> <operand>
<in-expression>     ::= <operand> "in" <variable-path>
<truthiness>        ::= <variable-path>

<operator>          ::= "==" | "!=" | ">" | "<" | ">=" | "<="
<operand>           ::= <literal-value> | <variable-path>
```

**Examples:**
```aptl
@if user.isActive
@if user.age >= 18
@if status == "approved" or status == "pending"
@if user.isActive and user.isPremium
@if not user.isBlocked
@if (user.age >= 18 and user.hasConsent) or user.isAdmin
@if "premium" in user.roles
```

### Iteration Arguments

*Used by: `@each`*

```bnf
<iteration-args>    ::= <item-name> "in" <variable-path>
                      | <item-name> "," <index-name> "in" <variable-path>

<item-name>         ::= <identifier>
<index-name>        ::= <identifier>
```

**Examples:**
```aptl
@each item in items
  - @{item.name}
@end

@each user, index in users
  @{index}. @{user.name}
@end
```

### Section Arguments

*Used by: `@section`*

```bnf
<section-args>      ::= <section-name> <whitespace>* <attributes>?

<section-name>      ::= <identifier> | <string-literal>

<attributes>        ::= <parenthesized-attrs> | <bare-attrs>
<parenthesized-attrs>::= "(" <attribute-list> ")"
<bare-attrs>        ::= <attribute-list>

<attribute-list>    ::= <attribute> ("," <whitespace>* <attribute>)*
<attribute>         ::= <identifier> "=" <literal-value>
```

**Examples:**
```aptl
@section header
  Content
@end

@section "role"(overridable=true)
  Content
@end

@section "role" (overridable=true, format="json")
  Content
@end

@section "role" overridable=true, format="json"
  Content
@end
```

### Simple Arguments

*Used by: `@extends`, `@include`*

```bnf
<simple-args>       ::= <string-literal> | <identifier>
```

**Examples:**
```aptl
@extends "base.aptl"
@include "header.aptl"
```

### Named Parameters

*Used by: `@examples`, custom directives*

```bnf
<named-params>      ::= <param> ("," <whitespace>* <param>)*

<param>             ::= <positional-param> | <named-param>
<positional-param>  ::= <literal-value>
<named-param>       ::= <identifier> "=" <literal-value>
```

**Examples:**
```aptl
@examples
@case input="Long function" output="Break into smaller functions"
@end
```

---

## Literals

```bnf
<literal-value>     ::= <string-literal> | <number> | <boolean>

<string-literal>    ::= '"' <string-content> '"'
                      | "'" <string-content> "'"
<string-content>    ::= (<char-except-quote> | <escaped-char>)*
<escaped-char>      ::= "\\" <any-char>

<number>            ::= <integer> | <float>
<integer>           ::= "-"? <digit>+
<float>             ::= "-"? <digit>+ "." <digit>+

<boolean>           ::= "true" | "false"
```

---

## Comments

```bnf
<comment>           ::= <line-comment> | <block-comment>

<line-comment>      ::= "//" <any-text-until-newline> <newline>
<block-comment>     ::= "/*" <any-text-until-close> "*/"
```

**Examples:**
```aptl
// This is a line comment

/*
  This is a
  block comment
*/
```

---

## Terminals

```bnf
<letter>            ::= "a".."z" | "A".."Z" | "_"
<digit>             ::= "0".."9"
<whitespace>        ::= " " | "\t"
```

---

## Built-in Directives

### Control Flow

| Directive | Arguments | Body | Description |
|-----------|-----------|------|-------------|
| `@if` | `<expression>` | Yes | Conditional rendering |
| `@elif` | `<expression>` | Yes | Else-if branch |
| `@else` | None | Yes | Else branch |
| `@each` | `<iteration-args>` | Yes | Loop over arrays |

### Template Composition

| Directive | Arguments | Body | Description |
|-----------|-----------|------|-------------|
| `@extends` | `<string-literal>` | No | Inherit from base template |
| `@include` | `<string-literal>` | No | Include another template |
| `@section` | `<section-args>` | Yes | Define/override sections |

### Examples & Documentation

| Directive | Arguments | Body | Description |
|-----------|-----------|------|-------------|
| `@examples` | None | Yes | Define few-shot examples |
| `@case` | `<named-params>` | No | Define an example case |

---

## Complete Examples

### Variable Interpolation
```aptl
Hello, @{user.name|"Guest"}!
Your email: @{user.profile.email}
First item: @{items[0].name}
```

### Conditionals
```aptl
@if user.age >= 18
  Adult content
@elif user.age >= 13
  Teen content
@else
  Child content
@end
```

### Loops
```aptl
@each item in items
  - @{item.name}: @{item.price}
@end

@each user, index in users
  @{index}. @{user.name} (@{user.email})
@end
```

### Sections
```aptl
@section "role" overridable=true
  You are a helpful assistant.
@end

@section code(format="json", lang="javascript")
  { "key": "value" }
@end
```

### Template Inheritance
```aptl
@extends "base.aptl"

@section "content" override=true
  This overrides the parent's content section.
@end

@section "footer" prepend=true
  This prepends to the parent's footer section.
@end
```

### Examples Directive
```aptl
@examples
@case input="Long function" output="Break into smaller functions"
@case input="Repeated code" output="Extract to reusable function"
@case input="Magic numbers" output="Use named constants"
@end
```

### Escaped Characters
```aptl
Email me at user\@example.com
Use \@if to print @if literally
Path: C:\\Users\\Documents
```

---

## Notes

1. **Whitespace Flexibility**: Spaces are allowed between section names and attribute parentheses
2. **Optional Parentheses**: Section attributes can omit parentheses for cleaner syntax
3. **Extensibility**: Custom directives can define their own argument parsing
4. **Model-Specific Rendering**: The engine supports different output formats per model
5. **Template Inheritance**: Sections can be overridden, prepended, or appended when extending templates
