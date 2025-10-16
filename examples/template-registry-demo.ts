/**
 * Template Registry Demo
 * Demonstrates how to use the TemplateRegistry with ObjectFileSystem
 */

import { TemplateRegistry, APTLEngine, ObjectFileSystem } from '../src/index';

async function main() {
  console.log('=== Template Registry Demo ===\n');

  // 1. Create a file system with template files
  const fileSystem = new ObjectFileSystem({
    'templates/greeting.aptl': 'Hello, @{name}! Welcome to @{app}.',
    'templates/email/welcome.aptl': `@section subject
Welcome to @{app}!
@end

@section body
Dear @{user.name},

Thank you for signing up for @{app}. We are excited to have you on board!

@if user.isPremium
As a premium member, you have access to:
@each feature in features
• @{feature}
@end
@else
Upgrade to premium to unlock additional features!
@end

Best regards,
The @{app} Team
@end`,
    'templates/report.aptl': `@section summary
Report for @{period}

Total Users: @{stats.totalUsers}
Active Users: @{stats.activeUsers}
@if stats.growth > 0
Growth: +@{stats.growth}% 📈
@elif stats.growth < 0
Growth: @{stats.growth}% 📉
@else
Growth: No change
@end
@end`,
  });

  // 2. Create template registry
  const registry = new TemplateRegistry(new APTLEngine(), { fileSystem });

  // 3. Load templates from directories
  console.log('Loading templates...');
  await registry.loadDirectory('templates');

  console.log('Loaded templates:', registry.list());
  console.log('Tracked directories:', registry.getLoadedDirectories());
  console.log();

  // 4. Render greeting template
  console.log('--- Greeting Template ---');
  const greeting = registry.get('greeting');
  console.log(
    greeting.render({
      name: 'Alice',
      app: 'APTL',
    }),
  );
  console.log();

  // 5. Render email template for premium user
  console.log('--- Email Template (Premium User) ---');
  const email = registry.get('welcome');
  console.log(
    email.render({
      app: 'APTL',
      user: {
        name: 'Bob',
        isPremium: true,
      },
      features: ['Advanced templates', 'Priority support', 'Custom formatters'],
    }),
  );
  console.log();

  // 6. Render report template
  console.log('--- Report Template ---');
  const report = registry.get('report');
  console.log(
    report.render({
      period: 'Q4 2024',
      stats: {
        totalUsers: 1250,
        activeUsers: 890,
        growth: 15.3,
      },
    }),
  );
  console.log();

  // 7. Add a new template at runtime
  console.log('--- Adding New Template ---');
  await fileSystem.writeFile(
    'templates/goodbye.aptl',
    'Goodbye, @{name}! See you soon.',
  );

  // Refresh to pick up the new template
  await registry.refresh();

  console.log('Templates after refresh:', registry.list());
  const goodbye = registry.get('goodbye');
  console.log(goodbye.render({ name: 'Charlie' }));
  console.log();

  // 8. Update an existing template
  console.log('--- Updating Template ---');
  await fileSystem.writeFile(
    'templates/greeting.aptl',
    'Hi @{name}! Great to see you in @{app}! 👋',
  );

  await registry.refresh();

  const updatedGreeting = registry.get('greeting');
  console.log(
    updatedGreeting.render({
      name: 'Diana',
      app: 'APTL',
    }),
  );
  console.log();

  // 9. Manually register a template
  console.log('--- Manual Registration ---');
  registry.register(
    'custom',
    'This is a @{type} template with value: @{value}',
  );

  const custom = registry.get('custom');
  console.log(custom.render({ type: 'custom', value: 42 }));
  console.log();

  // 10. Check template existence
  console.log('--- Template Management ---');
  console.log('Has "greeting"?', registry.has('greeting'));
  console.log('Has "nonexistent"?', registry.has('nonexistent'));

  // Unregister a template
  registry.unregister('goodbye');
  console.log('Has "goodbye" after unregister?', registry.has('goodbye'));
  console.log();

  // 11. Get filesystem contents
  console.log('--- FileSystem Contents ---');
  const allFiles = fileSystem.toObject();
  console.log('Files in filesystem:', Object.keys(allFiles));
  console.log();

  console.log('=== Demo Complete ===');
}

// Run the demo
main().catch(console.error);
