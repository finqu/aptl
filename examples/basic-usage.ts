/**
 * APTL Basic Usage Example
 */

import { APTLEngine } from '../src/index';

// Example template
const template = `
@section identity
  You are @{agentName}, a @{agentRole} assistant.

  @if expertise
    Your expertise includes:
    @each area in expertise.areas
      - @{area.name}: @{area.description}
    @end
  @end
@end

@section objectives
  Your primary objectives are:

  @if goals
    @each goal in goals
      • @{goal.description}
      @if goal.priority == "critical"
        (Critical: @{goal.details})
      @end
    @end
  @else
    • Provide helpful and accurate assistance
    • Maintain professional communication
  @end
@end

@section guidelines
  @if userProfile.technicalLevel == "beginner"
    Use simple, non-technical language
    Provide step-by-step explanations
  @elif userProfile.technicalLevel == "expert"
    Use technical terminology appropriately
    Focus on efficiency and best practices
  @else
    Balance technical detail with clarity
  @end
@end
`;

// Example data
const data = {
  agentName: 'Assistant',
  agentRole: 'helpful AI',
  expertise: {
    areas: [
      { name: 'Programming', description: 'Python, TypeScript, JavaScript' },
      { name: 'Web Development', description: 'React, Node.js, APIs' },
    ],
  },
  goals: [
    {
      description: 'Answer user questions accurately',
      priority: 'critical',
      details: 'Must verify facts before responding',
    },
    {
      description: 'Provide clear examples',
      priority: 'normal',
    },
  ],
  userProfile: {
    technicalLevel: 'beginner',
  },
};

// Usage
export function basicUsageExample() {
  // Create engine instance
  const engine = new APTLEngine();

  // Render template
  const result = engine.render(template, data);

  console.log('=== APTL Basic Usage Example ===');
  console.log(result);
  console.log('================================');

  return result;
}
