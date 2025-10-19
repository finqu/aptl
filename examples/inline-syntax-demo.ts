// Example: Using Inline Directive Syntax in APTL
// This demonstrates the new inline syntax feature

import { APTLEngine } from '@finqu/aptl';

const template = `
@section title: AI Task Manager Assistant
@section version: 1.0.0
@section model: gpt-4-turbo

@section identity(role="system")
You are @{assistantName|"TaskBot"}, an intelligent task management assistant.

@if userTier == "premium": ⭐ Premium features enabled
@if userTier == "free": 💡 Upgrade to premium for advanced features

Your capabilities:
@each capability in capabilities: • @{capability}

@section guidelines
Core principles:
1. Prioritize user productivity
2. Provide clear, actionable advice
3. Track progress and celebrate wins

@if showExamples
  Example interactions:
  @each example in examples: - "@{example.input}" → "@{example.output}"
@end

@section footer: Powered by @{company|"APTL"} | Last updated: @{timestamp}
`;

// Example 1: Free tier user
const freeUserData = {
  assistantName: 'TaskBot Pro',
  userTier: 'free',
  capabilities: [
    'Create and organize tasks',
    'Set reminders',
    'Track progress',
  ],
  showExamples: true,
  examples: [
    { input: 'Add task', output: 'Task added successfully!' },
    { input: 'Show high priority', output: 'Here are your urgent tasks...' },
  ],
  company: 'APTL Systems',
  timestamp: new Date().toISOString(),
};

// Example 2: Premium user
const premiumUserData = {
  assistantName: 'TaskBot Elite',
  userTier: 'premium',
  capabilities: [
    'Create and organize tasks',
    'Set reminders',
    'Track progress',
    'AI-powered prioritization',
    'Smart scheduling',
    'Team collaboration',
  ],
  showExamples: false,
  company: 'APTL Systems',
  timestamp: new Date().toISOString(),
};

async function demo() {
  const engine = new APTLEngine('gpt-4');

  console.log('=== Free Tier User ===\n');
  const freeOutput = await engine.render(template, freeUserData);
  console.log(freeOutput);

  console.log('\n\n=== Premium User ===\n');
  const premiumOutput = await engine.render(template, premiumUserData);
  console.log(premiumOutput);
}

demo().catch(console.error);
