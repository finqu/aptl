/**
 * Example demonstrating section directive with model-based conditional rendering
 */

import { APTLEngine } from '../src/core/engine';

// Create engines for different models
const gptEngine = new APTLEngine('gpt-5.1');
const claudeEngine = new APTLEngine('claude-4');
const llamaEngine = new APTLEngine('llama-3');

// Template with model-specific sections
const template = `
# AI Assistant Output

@section gpt_only(model="gpt-5.1")
## GPT-5.1 Specific Content
This section only appears for GPT-5.1 model.
Current model: @{model}
@end

@section claude_only(model="claude-4")
## Claude-4 Specific Content
This section only appears for Claude-4 model.
Current model: @{model}
@end

@section structured(model="gpt-5.1/structured, claude-4/json, md")
## Structured Output
This section uses different formats based on the model:
- GPT-5.1: structured format
- Claude-4: json format
- Others: markdown (default)
Current model: @{model}
User: @{user.name}
@end

@section common
## Common Section
This section appears for all models.
Current model: @{model}
@end
`.trim();

const userData = {
  user: {
    name: 'Alice',
    email: 'alice@example.com',
  },
};

console.log('='.repeat(80));
console.log('SECTION DIRECTIVE DEMO - Model-Based Conditional Rendering');
console.log('='.repeat(80));

console.log('\n\n--- Rendering with GPT-5.1 ---\n');
const gptResult = gptEngine.render(template, userData);
console.log(gptResult);

console.log('\n\n--- Rendering with Claude-4 ---\n');
const claudeResult = claudeEngine.render(template, userData);
console.log(claudeResult);

console.log('\n\n--- Rendering with Llama-3 ---\n');
const llamaResult = llamaEngine.render(template, userData);
console.log(llamaResult);

console.log('\n\n='.repeat(80));
console.log('Demo completed successfully!');
console.log('='.repeat(80));
