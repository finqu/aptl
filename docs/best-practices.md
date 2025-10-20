---
layout: default
title: Best Practices
---

# Best Practices for AI Prompt Engineering with APTL

Guidelines and recommendations for building effective, maintainable AI prompts using APTL.

## Template Organization

Organize your prompts into well-defined sections using logical grouping. This makes prompts easier to understand, modify, and debug:

```aptl
@section identity
  // Agent's identity and role
@end

@section objective
  // What the agent should accomplish
@end

@section guidelines
  // How the agent should behave
@end

@section constraints
  // Limitations and boundaries
@end

@section context
  // Current situation and relevant information
@end
```

Use descriptive, consistent section names for clarity:

✅ **Good:**
```aptl
@section user_context
@section error_handling_guidelines
@section few_shot_examples
```

❌ **Avoid:**
```aptl
@section stuff
@section temp
@section section1
```

Keep your templates focused - one template should serve one clear purpose:

✅ **Good:**
- `code-review-agent.aptl`
- `customer-support-bot.aptl`
- `content-generator.aptl`

❌ **Avoid:**
- `all-agents.aptl` (too broad)
- `misc-templates.aptl` (unfocused)

## Prompt Structure

Follow a standard structure across similar templates for consistency:

```aptl
// 1. Identity - Who is the AI?
@section identity
  You are @{agentName}...
@end

// 2. Capabilities - What can it do?
@section capabilities
  You can help with...
@end

// 3. Guidelines - How should it behave?
@section guidelines
  Follow these principles...
@end

// 4. Examples - Show, don't just tell
@section examples
  @examples
    @case input="..." output="..."
  @end
@end

// 5. Context - Current situation
@section context
  Current context...
@end

// 6. Task - What to do now
@section task
  Your task is...
@end
```

Always begin with a clear identity statement:

```aptl
@section identity
  You are @{agentName}, a @{agentRole} specialized in @{domain}.

  @if expertise
    Your areas of expertise:
    @each area in expertise
      • @{area}
    @end
  @end
@end
```

Be specific about what you want the AI to accomplish. Clearly state your objectives:

✅ **Good:**
```aptl
@section objective
  Your goal is to review the code and provide:
  1. A summary of the main issues
  2. Specific suggestions for improvement
  3. An overall quality score (1-10)
@end
```

❌ **Avoid:**
```aptl
@section objective
  Review the code.
@end
```

## Variable Management

Use meaningful variable names that clearly indicate their purpose:

✅ **Good:**
```aptl
@{user.firstName}
@{product.priceInUSD}
@{setting.maxRetryAttempts}
```

❌ **Avoid:**
```aptl
@{x}
@{temp}
@{data1}
```

Always provide default values for optional variables to ensure graceful fallback behavior:

```aptl
Welcome, @{user.name|"Guest"}!
Timeout: @{config.timeout|30} seconds
Theme: @{preferences.theme|"light"}
```

Check for required data before using it to prevent errors:

```aptl
@if user.name and user.email
  @section identity
    User: @{user.name} (@{user.email})
  @end
@else
  @section error
    Missing required user information
  @end
@end
```

Keep data structures flat when possible, but use logical grouping when it helps clarity:

✅ **Good:**
```typescript
{
  userName: 'Alice',
  userEmail: 'alice@example.com',
  userRole: 'admin'
}
```

✅ **Also Good (when logical grouping helps):**
```typescript
{
  user: {
    name: 'Alice',
    email: 'alice@example.com',
    role: 'admin'
  }
}
```

❌ **Avoid Deep Nesting:**
```typescript
{
  data: {
    user: {
      profile: {
        personal: {
          name: 'Alice'
        }
      }
    }
  }
}
```

## Conditionals and Logic

Keep your template logic simple by moving complex calculations to your data preparation code:

✅ **Good:**
```typescript
// Prepare data
const data = {
  userLevel: calculateUserLevel(user),
  showPremiumFeatures: user.tier === 'premium'
};

// Simple template
const template = `
  @if showPremiumFeatures
    Premium features available
  @end
`;
```

❌ **Avoid:**
```aptl
@if (user.purchaseCount > 10 and user.accountAge > 365 and user.totalSpent > 1000) or user.tier == "vip"
  // Complex condition in template
@end
```

Use `@elif` for multiple conditions to create clear branching logic:

```aptl
@if userLevel == "expert"
  Advanced technical content
@elif userLevel == "intermediate"
  Balanced technical content
@elif userLevel == "beginner"
  Simple explanations
@else
  General content
@end
```

Avoid deeply nested conditionals as they become hard to read and maintain:

✅ **Good:**
```aptl
@if showSection
  @section content
    @if hasItems
      @each item in items
        - @{item.name}
      @end
    @end
  @end
@end
```

❌ **Avoid:**
```aptl
@if condition1
  @if condition2
    @if condition3
      @if condition4
        // Too deep!
      @end
    @end
  @end
@end
```

## Template Inheritance

Create reusable base templates that can be extended by specialized templates:

```aptl
// base-agent.aptl
@section identity(overridable=true)
  You are an AI assistant.
@end

@section guidelines(overridable=true)
  • Be helpful
  • Be accurate
  • Be concise
@end

@section footer
  Maintain professional standards.
@end
```

Use override attributes strategically to control how child templates modify parent sections:

- **`override=true`** - Replace completely
- **`prepend=true`** - Add before parent content
- **`append=true`** - Add after parent content

```aptl
@extends "base-agent.aptl"

// Override identity completely
@section identity(override=true)
  You are a specialized medical assistant.
@end

// Add to existing guidelines
@section guidelines(prepend=true)
  Medical-specific guidelines:
  • Use evidence-based information
  • Recommend professional consultation

@end
```

Mark sections as overridable to make it clear which sections children can customize:

```aptl
@section identity(overridable=true)
  Default identity
@end

@section fixed_policy
  This cannot be overridden
@end
```

## Performance

Compile templates once and render them multiple times for better performance:

```typescript
// ✅ Good: Compile once, render many times
const compiled = await engine.compile(template);

for (const data of dataArray) {
  const output = await compiled.render(data);
  // Use output
}
```

```typescript
// ❌ Avoid: Compiling repeatedly
for (const data of dataArray) {
  const output = await engine.render(template, data);
}
```

Use the template registry to load templates once and reuse them:

```typescript
// ✅ Good: Load templates once
const registry = new TemplateRegistry(engine);
await registry.loadDirectory('./templates');

// Use many times
const template = registry.get('agent-prompt');
const output = await template.render(data);
```

Cache frequently used static data to avoid repeated processing:

```typescript
// Prepare static data once
const staticData = {
  agentName: 'Assistant',
  guidelines: loadGuidelines(),
  examples: loadExamples()
};

// Merge with dynamic data for each request
const output = await template.render({
  ...staticData,
  userInput: request.input,
  context: request.context
});
```

## Testing and Validation

Test your templates with edge cases to ensure robust behavior:

```typescript
// Test with empty data
await template.render({});

// Test with missing optional fields
await template.render({ name: 'Test' });

// Test with maximum data
await template.render(fullDataSet);

// Test with special characters
await template.render({ name: 'User@123<>"' });
```

Validate templates to catch missing variables and other issues:

```typescript
import { VariableResolver } from '@finqu/aptl';

const resolver = new VariableResolver();
const variables = resolver.extractVariables(template);

// Check that all required variables are documented
console.log('Required variables:', variables);

// Test against sample data
const missing = resolver.validateTemplate(template, sampleData);
if (missing.length > 0) {
  console.warn('Missing variables:', missing);
}
```

Use TypeScript interfaces for type safety when rendering templates:

```typescript
interface AgentData {
  agentName: string;
  agentRole: string;
  domain: string;
  credentials?: string[];
  primaryGoal: string;
}

function renderAgent(data: AgentData): Promise<string> {
  return engine.render(agentTemplate, data);
}
```

## Security

Never directly inject untrusted user input - always sanitize data first:

```typescript
// ✅ Good: Sanitize input
import { escapeHtml } from 'some-library';

const safeData = {
  userInput: escapeHtml(rawUserInput),
  userName: sanitize(rawUserName)
};

await engine.render(template, safeData);
```

Validate data types to ensure data matches expected schemas:

```typescript
function validateData(data: any): boolean {
  // Ensure data matches expected schema
  return (
    typeof data.name === 'string' &&
    typeof data.age === 'number' &&
    Array.isArray(data.items)
  );
}

if (validateData(userData)) {
  await engine.render(template, userData);
}
```

Avoid exposing sensitive information in your prompts:

```aptl
// ❌ Avoid exposing sensitive data in prompts
@section context
  User password: @{user.password}
  API key: @{config.apiKey}
@end

// ✅ Good: Only include necessary information
@section context
  User role: @{user.role}
  Access level: @{user.accessLevel}
@end
```

## Maintainability

Add comments to your templates to explain their purpose and logic:

```aptl
// Agent identity and capabilities
@section identity
  You are @{agentName}.
@end

// Context-aware guidelines based on user level
// Beginner: Simple language
// Intermediate: Balanced approach
// Expert: Technical terminology
@section guidelines
  @if userLevel == "beginner"
    // Use simple explanations
    ...
  @end
@end
```

Version your templates to track changes over time:

```aptl
// Version: 2.1.0
// Last updated: 2025-01-15
// Changes: Added support for multi-language

@section identity
  ...
@end
```

Document required data at the top of your templates:

```aptl
// Required data:
// - agentName: string
// - agentRole: string
// - domain: string
//
// Optional data:
// - credentials: string[]
// - secondaryGoals: string[]

@section identity
  You are @{agentName}...
@end
```

Use consistent formatting conventions:

- Indent with 2 spaces
- Use blank lines to separate sections
- Keep line length reasonable (< 100 chars)
- Use consistent naming conventions

## AI Prompt Engineering Specifics

Use few-shot examples effectively to teach desired behavior patterns:

```aptl
@examples
@case input="Long function" output="Break into smaller functions" explanation="Improves readability and testability"
@case input="No error handling" output="Add try-catch blocks" explanation="Prevents crashes and improves UX"
@case input="Magic numbers" output="Use named constants" explanation="Makes code self-documenting"
@end
```

Be explicit about tone and style to ensure appropriate communication:

```aptl
@section tone
  @if audienceType == "technical"
    • Use technical terminology
    • Focus on accuracy and precision
    • Include code examples
  @elif audienceType == "business"
    • Use business terminology
    • Focus on ROI and outcomes
    • Include metrics and KPIs
  @else
    • Use plain language
    • Focus on benefits
    • Include relatable examples
  @end
@end
```

Specify the exact output format you expect from the AI:

```aptl
@section output_format
  Provide your response in this format:

  **Summary**: [One sentence summary]

  **Analysis**:
  - Point 1
  - Point 2
  - Point 3

  **Recommendation**: [Actionable recommendation]

  **Confidence**: [Low/Medium/High]
@end
```

Include clear constraints and limitations to define boundaries:

```aptl
@section constraints
  You must:
  • Keep responses under 500 words
  • Cite sources when making factual claims
  • Acknowledge when uncertain

  You must not:
  • Make medical diagnoses
  • Provide financial advice
  • Share personal opinions on controversial topics
@end
```

[← API Reference](api-reference) | [Back to Home](index)
