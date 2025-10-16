// AI Prompt Template Language BNF Grammar - Unified @ Syntax

<template>          ::= <statement-list>

<statement-list>    ::= <statement> | <statement> <statement-list>

<statement>         ::= <text> 
                      | <variable>
                      | <section>
                      | <conditional>
                      | <iteration>
                      | <directive>
                      | <comment>
                      | <blank-line>

// Basic elements
<text>              ::= (<any-char-except> "@" | "//" | "/*")+
                      | "@" <not-keyword-char>  // allows @ in text if not followed by keyword
<blank-line>        ::= "\n\n"
<variable>          ::= "@{" <identifier> <accessor>? <default>? "}"
<accessor>          ::= "." <identifier> <accessor>?
<default>           ::= "|" <value>  // e.g., @{name|"Anonymous"}
<identifier>        ::= <letter> <alphanumeric>*
<escaped>           ::= "\@" | "\/" | "\\"  // produces literal @, /, \

// Sections
<section>           ::= "@section" <section-name> <section-attributes>? "\n"
                        <indented-content>
                        "@end"

<section-name>      ::= <identifier>
<section-attributes>::= "(" <attribute-list> ")"
<attribute-list>    ::= <attribute> | <attribute> "," <attribute-list>
<attribute>         ::= <identifier> "=" <string-literal>

// Conditionals
<conditional>       ::= "@if" <condition> "\n"
                        <indented-content>
                        <else-clause>?
                        "@end"

<else-clause>       ::= "@else" "\n" <indented-content>
                      | "@elif" <condition> "\n" <indented-content> <else-clause>?

<condition>         ::= <variable-ref>
                      | <comparison>
                      | <logical-expression>
                      | "not" <condition>

<comparison>        ::= <variable-ref> <comparison-op> <value>
<comparison-op>     ::= "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not in"
<logical-expression>::= <condition> <logical-op> <condition>
<logical-op>        ::= "and" | "or"

// Iterations
<iteration>         ::= "@each" <identifier> "in" <variable-ref> "\n"
                        <indented-content>
                        "@end"

<variable-ref>      ::= <identifier> <accessor>?

// Directives - extensible syntax for custom directives
<directive>         ::= <inline-directive> | <block-directive>

<inline-directive>  ::= "@" <directive-name> <directive-params>? "\n"

<block-directive>   ::= "@" <directive-name> <directive-params>? "\n"
                        <indented-content>
                        "@end"

<directive-name>    ::= <identifier>
<directive-params>  ::= "(" <param-list>? ")"
<param-list>        ::= <param> | <param> "," <param-list>
<param>             ::= <positional-param> | <named-param>
<positional-param>  ::= <value>
<named-param>       ::= <identifier> "=" <value>
<value>             ::= <string-literal> | <number> | <boolean> | <variable-ref>

// Indentation handling
<indented-content>  ::= <indent> <statement-list> <dedent>
<indent>            ::= "  " // 2 spaces per level
<dedent>            ::= // decrease indentation level

// Comments - standard syntax
<comment>           ::= <line-comment> | <block-comment>
<line-comment>      ::= "//" <any-text-until-newline>
<block-comment>     ::= "/*" <any-text-until-close> "*/"

// Terminal definitions
<letter>            ::= "a".."z" | "A".."Z" | "_"
<alphanumeric>      ::= <letter> | <digit>
<digit>             ::= "0".."9"
<string-literal>    ::= '"' <string-content> '"' | "'" <string-content> "'"
<string-content>    ::= <any-char-except-quote>* | <escaped-char>*
<escaped-char>      ::= "\\" <any-char>
<number>            ::= <integer> | <float>
<integer>           ::= <digit>+
<float>             ::= <digit>+ "." <digit>+
<boolean>           ::= "true" | "false"
<whitespace>        ::= " " | "\t"
<newline>           ::= "\n" | "\r\n" | "\r"
<optional-ws>       ::= <whitespace>*

// Examples
// Variable:       @{user.name}
// With default:   @{user.name|"Guest"}
// With accessor:  @{user.profile.email}
// Section:        @section header(style="bold")
//                   Content here
//                 @end
// Conditional:    @if user.age >= 18
//                   Adult content
//                 @else
//                   Minor content
//                 @end
// Iteration:      @each item in items
//                   - @{item.name}
//                 @end
// Directive:      @include("template.aptl")
// Escaped:        Email me at user\@example.com