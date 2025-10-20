# APTL Documentation Assets

This directory contains custom assets for the APTL documentation site.

## Syntax Highlighting

### Custom Prism.js Language Definition

The APTL syntax highlighting is implemented using Prism.js with a custom language definition:

- **`js/prism-aptl.js`** - Custom Prism.js language definition for APTL syntax
- **`css/prism-aptl.css`** - Custom theme with light/dark mode support

### Features

The syntax highlighting supports all APTL language features:

- **Directives**: `@section`, `@if`, `@each`, `@extends`, `@include`, `@end`
- **Variables**: `@{variable.path|"default"}`
- **Comments**: `// line comments` and `/* block comments */`
- **Keywords**: `in`, `with`, `or`, `and`
- **Strings**: Single and double quoted
- **Named arguments**: `key=value`
- **Constants**: `true`, `false`, numbers
- **Escaped characters**: `\@`, `\n`, etc.

### Usage in Markdown

Use the `aptl` language identifier in code blocks:

````markdown
```aptl
@section example
  Hello, @{name|"World"}!
@end
```
````

### Color Scheme

The theme is based on GitHub's color scheme with automatic dark mode support:

**Light Mode:**
- Directives: Red (`#d73a49`)
- Variables: Blue (`#005cc5`)
- Strings: Green (`#22863a`)
- Comments: Gray (`#6a737d`)

**Dark Mode:**
- Directives: Light red (`#ff7b72`)
- Variables: Light blue (`#79c0ff`)
- Strings: Light green (`#7ee787`)
- Comments: Light gray (`#8b949e`)

### Extending

To modify the syntax highlighting:

1. Edit `js/prism-aptl.js` to change token patterns
2. Edit `css/prism-aptl.css` to change colors and styles
3. Test changes locally with `bundle exec jekyll serve`

### Source

The language definition is based on the VS Code extension TextMate grammar located in:
`vscode-extension/syntaxes/aptl.tmLanguage.json`
