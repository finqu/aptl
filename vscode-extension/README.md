# APTL Language Support for VS Code

Syntax highlighting and language support for AI Prompt Template Language (APTL).

## Features

- **Syntax Highlighting**: Full syntax highlighting for APTL templates
- **Auto-closing**: Automatic closing of brackets, quotes, and template blocks
- **Code Folding**: Fold sections, conditionals, and iterations
- **Indentation**: Smart indentation for APTL blocks
- **Comments**: Line (`//`) and block (`/* */`) comment support

## Supported Syntax

- **Variables**: `@{variable.name}`, `@{name|"default"}`
- **Sections**: `@section name(...) ... @end`
- **Conditionals**: `@if condition ... @else ... @end`
- **Iterations**: `@each item in items ... @end`
- **Directives**: `@directive(params)`
- **Comments**: `// line comment` and `/* block comment */`

## Installation

### From Source

1. Copy this extension folder to your VS Code extensions directory:
   - **macOS/Linux**: `~/.vscode/extensions/`
   - **Windows**: `%USERPROFILE%\.vscode\extensions\`

2. Reload VS Code

### From VSIX (when published)

1. Download the `.vsix` file
2. In VS Code, go to Extensions view (Cmd+Shift+X)
3. Click `...` menu → "Install from VSIX..."
4. Select the downloaded file

## Usage

Simply open any `.aptl` file and the syntax highlighting will be applied automatically.

## Example

```aptl
// User greeting template
@section greeting(style="friendly")
  Hello @{user.name|"Guest"}!

  @if user.isPremium
    Welcome back, premium member!
  @else
    Consider upgrading to premium.
  @end
@end

@section items
  Your items:
  @each item in user.items
    - @{item.name}: @{item.price}
  @end
@end
```

## Development

To modify this extension:

1. Make changes to the grammar in `syntaxes/aptl.tmLanguage.json`
2. Reload VS Code window (Cmd+R / Ctrl+R)
3. Test with `.aptl` files

## License

MIT
