/**
 * Variable Resolver Demo
 * Demonstrates the APTL variable resolution capabilities
 */

import { VariableResolver } from '../src/data/variable-resolver';

// Create resolver instances
const defaultResolver = new VariableResolver();
const strictResolver = new VariableResolver({ allowUndefined: false });
const customDefaultResolver = new VariableResolver({
  defaultValue: '[NOT_FOUND]',
});

// Sample data for demonstration
const demoData = {
  agentName: 'APTL Assistant',
  agentRole: 'template engine helper',
  domain: 'prompt template processing',
  user: {
    profile: {
      name: 'John Developer',
      level: 'intermediate',
      preferences: {
        theme: 'dark',
        notifications: true,
      },
    },
    session: {
      id: 'sess_abc123',
      history: {
        count: 7,
      },
    },
  },
  items: [
    { name: 'First Task', priority: 'high', tags: ['urgent', 'bug'] },
    { name: 'Second Task', priority: 'medium', tags: ['feature'] },
    { name: 'Third Task', priority: 'low', tags: ['documentation'] },
  ],
  features: {
    advanced: false,
    beta: true,
    experimental: null,
  },
  metadata: {
    0: { type: 'system', value: 'config' },
    1: { type: 'user', value: 'data' },
  },
};

console.log('🔍 APTL Variable Resolver Demo\n');

// Basic variable resolution
console.log('📋 Basic Variables:');
console.log(`  agentName: "${defaultResolver.resolve('agentName', demoData)}"`);
console.log(`  agentRole: "${defaultResolver.resolve('agentRole', demoData)}"`);
console.log(`  domain: "${defaultResolver.resolve('domain', demoData)}"`);
console.log();

// Nested object access
console.log('🔗 Nested Object Access:');
console.log(
  `  user.profile.name: "${defaultResolver.resolve('user.profile.name', demoData)}"`,
);
console.log(
  `  user.profile.level: "${defaultResolver.resolve('user.profile.level', demoData)}"`,
);
console.log(
  `  user.session.id: "${defaultResolver.resolve('user.session.id', demoData)}"`,
);
console.log(
  `  user.session.history.count: ${defaultResolver.resolve('user.session.history.count', demoData)}`,
);
console.log();

// Array access with bracket notation
console.log('📚 Array Access:');
console.log(
  `  items[0].name: "${defaultResolver.resolve('items[0].name', demoData)}"`,
);
console.log(
  `  items[1].priority: "${defaultResolver.resolve('items[1].priority', demoData)}"`,
);
console.log(
  `  items[2].tags[0]: "${defaultResolver.resolve('items[2].tags[0]', demoData)}"`,
);
console.log();

// Numeric property access
console.log('🔢 Numeric Property Access:');
console.log(
  `  metadata.0.type: "${defaultResolver.resolve('metadata.0.type', demoData)}"`,
);
console.log(
  `  metadata.1.value: "${defaultResolver.resolve('metadata.1.value', demoData)}"`,
);
console.log();

// Handling falsy values
console.log('⚡ Falsy Values:');
console.log(
  `  features.advanced (false): ${defaultResolver.resolve('features.advanced', demoData)}`,
);
console.log(
  `  features.beta (true): ${defaultResolver.resolve('features.beta', demoData)}`,
);
console.log(
  `  features.experimental (null): "${defaultResolver.resolve('features.experimental', demoData)}"`,
);
console.log();

// Missing values with different resolvers
console.log('❓ Missing Values:');
console.log(
  `  Default resolver (missing): "${defaultResolver.resolve('missing', demoData)}"`,
);
console.log(
  `  Custom default resolver (missing): "${customDefaultResolver.resolve('missing', demoData)}"`,
);
try {
  strictResolver.resolve('missing', demoData);
} catch (error) {
  console.log(
    `  Strict resolver (missing): Error - ${error instanceof Error ? error.message : 'Unknown error'}`,
  );
}
console.log();

// Path validation
console.log('✅ Path Validation:');
const testPaths = [
  'user.profile.name',
  'items[0].name',
  'user..invalid',
  'items[].empty',
  'items[0.unclosed',
];

testPaths.forEach((path) => {
  const validation = defaultResolver.validatePath(path);
  console.log(
    `  "${path}": ${validation.valid ? '✓ Valid' : '✗ Invalid - ' + validation.error}`,
  );
});
console.log();

// Path existence checking
console.log('🔍 Path Existence:');
const checkPaths = [
  'user.profile.name',
  'items[0].name',
  'missing.path',
  'features.experimental',
  'features.advanced',
];

checkPaths.forEach((path) => {
  const exists = defaultResolver.exists(path, demoData);
  console.log(`  "${path}": ${exists ? '✓ Exists' : '✗ Does not exist'}`);
});
console.log();

// Extract variables from template
console.log('📝 Template Variable Extraction:');
const sampleTemplate = `
@section identity
  You are @{agentName}, a @{agentRole}.
  User: @{user.profile.name} (Level: @{user.profile.level})
  Session: @{user.session.id}
@end

@if items
  Tasks:
  @each item in items
    - @{item.name} (Priority: @{item.priority})
  @end
@end
`;

const extractedPaths = defaultResolver.extractPaths(sampleTemplate);
console.log('  Extracted variable paths:');
extractedPaths.forEach((path) => {
  console.log(`    - @{${path}}`);
});

console.log('\n✨ Demo completed!');

export { demoData, defaultResolver };
