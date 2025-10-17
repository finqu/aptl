---
layout: default
title: Best Practices
---

# Best Practices for AI Prompt Engineering with APTL

Guidelines and recommendations for building effective, maintainable AI prompts using APTL.

## Table of Contents

- [Template Organization](#template-organization)
- [Prompt Structure](#prompt-structure)
- [Variable Management](#variable-management)
- [Conditionals and Logic](#conditionals-and-logic)
- [Template Inheritance](#template-inheritance)
- [Performance](#performance)
- [Testing and Validation](#testing-and-validation)
- [Security](#security)
- [Maintainability](#maintainability)

---

## Template Organization

### Use Sections for Logical Grouping

Organize your prompts into well-defined sections:

```aptl
@section identity(role="system")
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

**Why:** This makes prompts easier to understand, modify, and debug.

### Name Sections Clearly

Use descriptive, consistent section names:

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

### Keep Templates Focused

One template should serve one clear purpose.

✅ **Good:**
- `code-review-agent.aptl`
- `customer-support-bot.aptl`
- `content-generator.aptl`

❌ **Avoid:**
- `all-agents.aptl` (too broad)
- `misc-templates.aptl` (unfocused)

---

## Prompt Structure

### Follow a Consistent Pattern

Use a standard structure across similar templates:

```aptl
// 1. Identity - Who is the AI?
@section identity(role="system")
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

### Start with Identity

Always begin with a clear identity statement:

```aptl
@section identity(role="system")
  You are @{agentName}, a @{agentRole} specialized in @{domain}.
  
  @if expertise
    Your areas of expertise:
    @each area in expertise
      • @{area}
    @end
  @end
@end
```

### Be Specific About Objectives

Clearly state what you want the AI to accomplish:

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

---

## Variable Management

### Use Meaningful Variable Names

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

### Always Provide Defaults

Use default values for optional variables:

```aptl
Welcome, @{user.name|"Guest"}!
Timeout: @{config.timeout|30} seconds
Theme: @{preferences.theme|"light"}
```

### Validate Required Variables

Check for required data before using it:

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

### Keep Data Structures Flat When Possible

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

---

## Conditionals and Logic

### Keep Logic Simple

Move complex logic to your data preparation, not your templates.

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

### Use @elif for Multiple Conditions

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

### Avoid Deeply Nested Conditionals

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

---

## Template Inheritance

### Create Reusable Base Templates

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

### Use Override Strategically

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

### Mark Sections as Overridable

Make it clear which sections children can customize:

```aptl
@section identity(overridable=true)
  Default identity
@end

@section fixed_policy
  This cannot be overridden
@end
```

---

## Performance

### Compile Templates Once

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

### Use Template Registry

```typescript
// ✅ Good: Load templates once
const registry = new TemplateRegistry(engine);
await registry.loadDirectory('./templates');

// Use many times
const template = registry.get('agent-prompt');
const output = await template.render(data);
```

### Cache Frequently Used Data

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

---

## Testing and Validation

### Test with Edge Cases

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

### Validate Templates

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

### Use Type Safety

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

---

## Security

### Sanitize User Input

Never directly inject untrusted user input:

```typescript
// ✅ Good: Sanitize input
import { escapeHtml } from 'some-library';

const safeData = {
  userInput: escapeHtml(rawUserInput),
  userName: sanitize(rawUserName)
};

await engine.render(template, safeData);
```

### Validate Data Types

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

### Avoid Exposing Sensitive Information

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

---

## Maintainability

### Comment Your Templates

```aptl
// Agent identity and capabilities
@section identity(role="system")
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

### Version Your Templates

```aptl
// Version: 2.1.0
// Last updated: 2025-01-15
// Changes: Added support for multi-language

@section identity
  ...
@end
```

### Document Required Data

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

### Use Consistent Formatting

- Indent with 2 spaces
- Use blank lines to separate sections
- Keep line length reasonable (< 100 chars)
- Use consistent naming conventions

---

## AI Prompt Engineering Specifics

### Use Few-Shot Examples Effectively

```aptl
@examples
@case input="Long function" output="Break into smaller functions" explanation="Improves readability and testability"
@case input="No error handling" output="Add try-catch blocks" explanation="Prevents crashes and improves UX"
@case input="Magic numbers" output="Use named constants" explanation="Makes code self-documenting"
@end
```

### Be Explicit About Tone and Style

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

### Specify Output Format

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

### Include Constraints and Limitations

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

---

[← API Reference](api-reference) | [Back to Home](index)
