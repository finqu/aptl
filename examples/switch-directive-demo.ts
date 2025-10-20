/**
 * Switch Directive Demo
 * Demonstrates @switch, @case, and @default directives
 */

import { APTLEngine } from '../src/core/engine';

async function main() {
  const engine = new APTLEngine('gpt-4');

  console.log('=== Switch Directive Demo ===\n');

  // Example 1: Basic switch with string literals
  console.log('1. Basic switch with status:');
  const template1 = `
@switch "approved"
  @case "pending"
    ⏳ Waiting for approval
  @case "approved"
    ✅ Request approved
  @case "rejected"
    ❌ Request rejected
@end
`.trim();
  console.log(await engine.render(template1));
  console.log();

  // Example 2: Switch with variable
  console.log('2. Switch with variable (status):');
  const template2 = `
@switch status
  @case "pending"
    ⏳ Waiting for approval
  @case "approved"
    ✅ Request approved
  @case "rejected"
    ❌ Request rejected
  @default
    ❓ Unknown status
@end
`.trim();
  console.log(await engine.render(template2, { status: 'approved' }));
  console.log();

  // Example 3: Switch with numeric values
  console.log('3. Switch with priority levels:');
  const template3 = `
@switch priority
  @case 1
    🔴 Critical
  @case 2
    🟡 High
  @case 3
    🟢 Normal
  @default
    ⚪ Low
@end
`.trim();
  console.log(await engine.render(template3, { priority: 1 }));
  console.log();

  // Example 4: Switch with default case
  console.log('4. Switch with default (unknown status):');
  console.log(await engine.render(template2, { status: 'cancelled' }));
  console.log();

  // Example 5: Switch with nested content
  console.log('5. Switch with nested directives:');
  const template5 = `
@switch role
  @case "admin"
    @if isPremium
      👑 Premium Administrator
    @else
      🔧 Administrator
    @end
  @case "moderator"
    👮 Moderator
  @default
    👤 Regular User
@end
`.trim();
  console.log(
    await engine.render(template5, { role: 'admin', isPremium: true }),
  );
  console.log();

  // Example 6: Switch inside a loop
  console.log('6. Switch inside a loop:');
  const template6 = `
@each task in tasks
  Task: @{task.name} - @switch task.status
    @case "done"
✓
    @case "in-progress"
⏳
    @case "todo"
☐
  @end
@end
`.trim();
  const tasks = [
    { name: 'Setup', status: 'done' },
    { name: 'Development', status: 'in-progress' },
    { name: 'Testing', status: 'todo' },
  ];
  console.log(await engine.render(template6, { tasks }));
  console.log();

  // Example 7: Nested switches
  console.log('7. Nested switches:');
  const template7 = `
@switch category
  @case "admin"
    @switch level
      @case 1
        Super Admin
      @case 2
        Admin
      @default
        Admin (Level @{level})
    @end
  @case "user"
    Regular User
  @default
    Guest
@end
`.trim();
  console.log(await engine.render(template7, { category: 'admin', level: 1 }));
  console.log();
}

main().catch(console.error);
