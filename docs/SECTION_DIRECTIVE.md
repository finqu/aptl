# Section Directive - Model-Based Conditional Rendering

## Overview

The section directive now supports conditional rendering based on the model attribute. This allows templates to render different content or formats depending on the AI model being used.

## Syntax

The model attribute supports the following syntax patterns:

1. **Model-only**: `model="gpt-5.1"` - Renders only for gpt-5.1 model
2. **Model with format**: `model="gpt-5.1/structured"` - Renders structured data only for gpt-5.1
3. **Model with format and default**: `model="gpt-5.1/structured, md"` - Renders structured data for gpt-5.1, markdown for other models
4. **Multiple models with formats**: `model="gpt-5.1/structured, claude-4/json, md"` - Renders structured data for gpt-5.1, json for claude-4, markdown for all other models

## Usage Examples

### Basic Model Filtering

```aptl
@section intro(model="gpt-5.1")
This content only appears when using GPT-5.1 model.
@end
```

### Model-Specific Formats

```aptl
@section data(model="gpt-5.1/structured")
Structured data output for GPT-5.1
@end
```

### Multiple Models with Fallback

```aptl
@section output(model="gpt-5.1/structured, claude-4/json, md")
This section uses:
- Structured format for GPT-5.1
- JSON format for Claude-4
- Markdown format for all other models
@end
```

### Combined with Other Directives

```aptl
@section user_info(model="gpt-5.1")
@if user.isActive
Active user: @{user.name}
@else
Inactive user: @{user.name}
@end
@end
```

## Implementation Details

### Model Attribute Parsing

The `parseModelAttribute` function parses the model attribute string and extracts:
- A list of model configurations (model name and optional format)
- An optional default format for unmatched models

### Model Matching

The `matchModel` function determines whether a section should render by:
1. Checking for exact model name matches
2. Returning the associated format if matched
3. Using the default format if no match is found
4. Returning null if no match and no default (section won't render)

### Rendering Flow

1. The section directive handler parses the model attribute
2. It gets the current model from `context.data.model` (injected by the engine)
3. It matches the current model against the configurations
4. If a match is found, the section's children are rendered
5. If no match and no default, the section returns an empty string

## Test Coverage

### Unit Tests (29 tests)
- `parseModelAttribute` function tests (7 tests)
- `matchModel` function tests (6 tests)
- `parseArguments` tests (4 tests)
- `validate` tests (4 tests)
- Handler tests for model-based rendering (8 tests)

### Integration Tests (19 tests)
- Basic section rendering (2 tests)
- Model-based conditional rendering (6 tests)
- Combined with variables (2 tests)
- Combined with if directive (2 tests)
- Combined with each directive (2 tests)
- Multiple sections with different models (2 tests)
- Edge cases (3 tests)

All 797 tests in the suite pass successfully.

## Key Features

1. **Flexible Syntax**: Supports multiple model configurations with formats
2. **Fallback Support**: Default format for unmatched models
3. **Composable**: Works seamlessly with variables, if directives, and each directives
4. **Well-Tested**: Comprehensive unit and integration tests
5. **Type-Safe**: Full TypeScript support with exported interfaces

## API

### Exported Functions

```typescript
export function parseModelAttribute(modelAttr: string): {
  configs: ModelConfig[];
  defaultFormat?: string;
}

export function matchModel(
  currentModel: string,
  configs: ModelConfig[],
  defaultFormat?: string
): string | null
```

### Interfaces

```typescript
export interface ModelConfig {
  model: string;
  format?: string;
}
```
