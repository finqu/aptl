// AI Prompt Template Language BNF Grammar - Unified @ Syntax

<template>          ::= <statement-list>

<statement-list>    ::= <statement> | <statement> <statement-list>

<statement>         ::= <text> 
                      | <variable>
                      | <directive>
                      | <comment>
                      | <newline>

// Basic elements
<text>              ::= <text-char>+
<text-char>         ::= <any-char-except> "@" | "//" | "/*" | "\n"
                      | <escaped>
<newline>           ::= "\n" | "\r\n" | "\r"
<variable>          ::= "@{" <variable-path> <default>? "}"
<variable-path>     ::= <identifier> <accessor>*
<accessor>          ::= "." <identifier>
<default>           ::= "|" <literal-value>  // e.g., @{name|"Anonymous"}
<identifier>        ::= <letter> (<letter> | <digit> | "_" | "-")*
<escaped>           ::= "\@" | "\/" | "\\" | "\n" | "\t" | "\r"

// Directives - extensible syntax for custom directives
// Each directive defines its own argument syntax via parseArguments()
<directive>         ::= "@" <directive-name> <directive-args>? "\n" <directive-body>?

<directive-name>    ::= <identifier>
<directive-args>    ::= <any-text-until-newline>  // Parsed by directive-specific parser
<directive-body>    ::= <statement-list> "@end" "\n"

// Comments - standard syntax
<comment>           ::= <line-comment> | <block-comment>
<line-comment>      ::= "//" <any-text-until-newline> "\n"
<block-comment>     ::= "/*" <any-text-until-close> "*/"

// Terminal definitions
<letter>            ::= "a".."z" | "A".."Z" | "_"
<digit>             ::= "0".."9"
<literal-value>     ::= <string-literal> | <number> | <boolean>
<string-literal>    ::= '"' <string-content> '"' | "'" <string-content> "'"
<string-content>    ::= (<any-char-except-quote> | <escaped-char>)*
<escaped-char>      ::= "\\" <any-char>
<number>            ::= <integer> | <float>
<integer>           ::= "-"? <digit>+
<float>             ::= "-"? <digit>+ "." <digit>+
<boolean>           ::= "true" | "false"
<whitespace>        ::= " " | "\t"

// ============================================================================
// Common Directive Argument Patterns
// ============================================================================
// These are handled by directive-specific argument parsers, not the tokenizer

// Conditional arguments: @if <condition>
<conditional-args>  ::= <expression>
<expression>        ::= <or-expression>
<or-expression>     ::= <and-expression> | <and-expression> "or" <or-expression>
<and-expression>    ::= <not-expression> | <not-expression> "and" <and-expression>
<not-expression>    ::= "not" <primary-expression> | <primary-expression>
<primary-expression>::= <comparison> | <in-expression> | <truthiness> | "(" <expression> ")"
<comparison>        ::= <variable-path> <operator> <operand>
<in-expression>     ::= <operand> "in" <variable-path>
<truthiness>        ::= <variable-path>
<operand>           ::= <literal-value> | <variable-path>
<operator>          ::= "==" | "!=" | ">" | "<" | ">=" | "<="

// Iteration arguments: @each <item> in <array>
<iteration-args>    ::= <identifier> "in" <variable-path>
                      | <identifier> "," <identifier> "in" <variable-path>

// Section arguments: @section <name> or @section <name>(<attributes>)
<section-args>      ::= <identifier>
                      | <identifier> "(" <attributes> ")"
<attributes>        ::= <attribute> | <attribute> "," <attributes>
<attribute>         ::= <identifier> "=" <string-literal>

// Named parameter arguments: @directive param1, key1=val1, key2="val2"
<named-params>      ::= <param> | <param> "," <named-params>
<param>             ::= <literal-value>              // positional
                      | <identifier> "=" <literal-value>  // named

// ============================================================================
// Examples
// ============================================================================

// Variable interpolation:
//   @{user.name}
//   @{user.name|"Guest"}
//   @{user.profile.email}

// Conditional directive:
//   @if user.isActive
//     Welcome back!
//   @end
//
//   @if user.age >= 18
//     Adult content
//   @elif user.age >= 13
//     Teen content
//   @else
//     Child content
//   @end
//
//   @if user.isActive and user.isPremium
//     Premium features
//   @end
//
//   @if status == "pending" or status == "approved"
//     In progress...
//   @end
//
//   @if not user.isBlocked
//     Welcome!
//   @end
//
//   @if (user.age >= 18 and user.hasConsent) or user.isAdmin
//     Access granted
//   @end
//
//   @if "premium" in user.roles
//     Premium content
//   @end

// Iteration directive:
//   @each item in items
//     - @{item.name}
//   @end
//
//   @each user, index in users
//     @{index}. @{user.name}
//   @end

// Section directive:
//   @section header
//     This is the header
//   @end
//
//   @section code(format="json", lang="javascript")
//     { "key": "value" }
//   @end

// Template extension:
//   @extends "base.aptl"
//   @slot content
//     Page-specific content
//   @end

// Escaped characters:
//   Email me at user\@example.com
//   Use \@if to print @if literally