# AI System Prompts Demo

This directory contains real-world examples of AI system prompts built with APTL, demonstrating how to create sophisticated, maintainable prompt templates for various AI agent use cases.

## Directory Structure

```
prompts/
├── base/              # Base templates to extend
│   └── agent-base.aptl
├── snippets/          # Reusable components
│   ├── ethical-guidelines.aptl
│   ├── code-review-checklist.aptl
│   ├── thinking-process.aptl
│   └── output-format.aptl
└── templates/         # Complete agent prompts
    ├── coding-assistant.aptl
    ├── data-analyst.aptl
    ├── technical-writer.aptl
    ├── customer-support.aptl
    └── research-assistant.aptl
```

## Base Templates

**`base/agent-base.aptl`** - Foundation for all AI agents
- Identity and role definition
- Core capabilities structure
- Ethical guidelines integration
- Constraint definitions
- Overridable sections for customization

## Snippets (Reusable Components)

**`snippets/ethical-guidelines.aptl`** - Core AI ethics and safety principles
- Helpfulness, harmlessness, honesty
- Privacy and confidentiality
- Content policy compliance

**`snippets/code-review-checklist.aptl`** - Code review best practices
- Correctness, readability, performance checks
- Security vulnerability scanning
- Testing and error handling

**`snippets/thinking-process.aptl`** - Problem-solving methodology
- Structured approach to tasks
- Analysis and planning framework
- Verification steps

**`snippets/output-format.aptl`** - Response formatting guidelines
- Structured vs conversational formats
- Technical documentation standards
- Markdown usage patterns

## Agent Templates

### 1. Coding Assistant (`coding-assistant.aptl`)
**Use case:** Software development help, code review, debugging

**Features:**
- Multi-language support
- Code review standards integration
- Security-focused guidance
- Example interactions for common scenarios

**Example data context:**
```javascript
{
  agentName: "CodeAssist",
  languages: ["TypeScript", "Python", "Java"],
  frameworks: "React, FastAPI, Spring Boot",
  tone: "technical",
  securityLevel: "high",
  includeFrameworks: true,
  includeOptimization: true
}
```

### 2. Data Analysis Assistant (`data-analyst.aptl`)
**Use case:** Data analysis, statistical insights, visualization guidance

**Features:**
- Statistical methodology
- Visualization recommendations
- Data ethics considerations
- A/B testing analysis

**Example data context:**
```javascript
{
  agentName: "DataAnalyst AI",
  tools: "Python, SQL, Pandas, R",
  statisticalLevel: "advanced",
  includeVisualization: true,
  includeEthics: true
}
```

### 3. Technical Writer (`technical-writer.aptl`)
**Use case:** Documentation creation, API docs, user guides

**Features:**
- Document type templates (API, README, tutorials)
- Writing principles (clarity, structure, completeness)
- Audience-aware customization
- Style guide integration

**Example data context:**
```javascript
{
  agentName: "DocWriter",
  audience: "beginners",
  style: "Google",
  specialized: "API and SDK"
}
```

### 4. Customer Support (`customer-support.aptl`)
**Use case:** Technical support, troubleshooting, customer assistance

**Features:**
- Troubleshooting framework
- Empathetic communication
- Escalation criteria
- Response templates

**Example data context:**
```javascript
{
  agentName: "SupportBot",
  product: "CloudPlatform Pro",
  productAreas: "Authentication, File Storage, API",
  includeEscalation: true,
  sla: "24 hours",
  commonIssues: [
    {
      title: "Login Issues",
      description: "Users cannot access their account",
      solution: "Clear cookies and cache, reset password if needed",
      preventionTip: "Enable 2FA for better security"
    }
  ]
}
```

### 5. Research Assistant (`research-assistant.aptl`)
**Use case:** Research synthesis, critical analysis, fact-checking

**Features:**
- Research methodology framework
- Source evaluation criteria
- Citation formatting
- Knowledge synthesis patterns

**Example data context:**
```javascript
{
  agentName: "ResearchAI",
  domain: "Computer Science",
  specialized: "Machine Learning, AI Ethics",
  includeCitations: true,
  synthesisStyle: "analytical"
}
```

## Key APTL Features Demonstrated

### 1. Template Inheritance (`@extends`)
All agent templates extend `base/agent-base.aptl` and override specific sections:

```aptl
@extends "base/agent-base.aptl"

@section identity(override="true")
// Custom identity for this agent
@end
```

### 2. Snippet Inclusion (`@include`)
Reusable components are included where needed:

```aptl
@section guidelines
@include "snippets/ethical-guidelines.aptl"
@include "snippets/thinking-process.aptl"
@end
```

### 3. Conditional Logic (`@if/@elif/@else`)
Adapt prompts based on context:

```aptl
@if(tone == "professional")
- Use formal, professional language
@elif(tone == "conversational")
- Use friendly, approachable language
@else
- Adapt to user's style
@end
```

### 4. Iteration (`@each`)
Generate dynamic lists:

```aptl
@each capability in capabilities
  • @{capability}
@end
```

### 5. Variable Interpolation
Insert context-specific data:

```aptl
You are @{agentName|"an AI assistant"} with expertise in @{domain}.
```

## Usage Example

```typescript
import { APTLEngine } from '@finqu/aptl';
import { LocalFileSystem } from '@finqu/aptl/filesystem';

const engine = new APTLEngine();
const fs = new LocalFileSystem();

// Load all prompt templates
await engine.templateRegistry.loadDirectory('./prompts/base', fs);
await engine.templateRegistry.loadDirectory('./prompts/snippets', fs);
await engine.templateRegistry.loadDirectory('./prompts/templates', fs);

// Render a coding assistant prompt
const prompt = await engine.render('coding-assistant', {
  agentName: 'CodeAssist Pro',
  languages: ['TypeScript', 'Python', 'Rust'],
  frameworks: 'React, FastAPI, Tokio',
  tone: 'technical',
  securityLevel: 'high',
  includeFrameworks: true,
  includeOptimization: true,
  knowledgeCutoff: 'October 2024',
  capabilities: [
    'Code generation and refactoring',
    'Bug detection and debugging',
    'Architecture design',
    'Performance optimization'
  ]
});

console.log(prompt);
```

## Design Principles

1. **Modularity**: Snippets are small, focused, and reusable
2. **Extensibility**: Base templates provide structure, specific templates override
3. **Maintainability**: Common patterns centralized in snippets
4. **Flexibility**: Conditional logic adapts to different contexts
5. **Clarity**: Templates are self-documenting with comments

## Customization Tips

1. **Create your own base**: Start with `agent-base.aptl` or create domain-specific bases
2. **Build snippet libraries**: Extract common patterns into reusable snippets
3. **Use conditionals wisely**: Provide sensible defaults with `@{var|"default"}`
4. **Layer complexity**: Simple templates for basic use, conditionals for advanced features
5. **Document contexts**: Comment expected data shapes in templates

## Next Steps

- Explore the templates and understand their structure
- Modify data contexts to see how prompts adapt
- Create your own agent templates for specific use cases
- Build a library of domain-specific snippets
- Experiment with template inheritance patterns
