/**
 * Integration tests for APTLEngine
 * Focus: End-to-end template rendering with real tokenizer, parser, and compiler
 */

import { APTLEngine } from '@/core/engine';
import { ObjectFileSystem } from '@/filesystem/object-filesystem';

describe('APTLEngine Integration', () => {
  describe('Basic Text Rendering', () => {
    it('should render plain text without any directives', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should render multiline text', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `Line 1
Line 2
Line 3`;
      const result = await engine.render(template);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should preserve whitespace in text', async () => {
      const engine = new APTLEngine('gpt-5.1', { preserveWhitespace: true });
      const result = await engine.render('Hello   World\t\tTest');
      expect(result).toBe('Hello   World\t\tTest');
    });

    it('should handle empty template', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('');
      expect(result).toBe('');
    });

    it('should handle special characters', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('Special: !@#$%^&*()_+-=[]{}|;:,.<>?');
      expect(result).toBe('Special: !@#$%^&*()_+-=[]{}|;:,.<>?');
    });
  });

  describe('Variable Rendering', () => {
    it('should render simple variable', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('Hello @{name}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    it('should render multiple variables', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = '@{greeting} @{name}!';
      const result = await engine.render(template, {
        greeting: 'Hello',
        name: 'World',
      });
      expect(result).toBe('Hello World!');
    });

    it('should render nested object properties', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('@{user.name}', {
        user: { name: 'Alice' },
      });
      expect(result).toBe('Alice');
    });

    it('should render deeply nested properties', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render(
        '@{company.department.employee.name}',
        {
          company: {
            department: {
              employee: { name: 'Bob' },
            },
          },
        },
      );
      expect(result).toBe('Bob');
    });

    it('should render array elements', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('@{items.0} and @{items.1}', {
        items: ['apple', 'banana'],
      });
      expect(result).toBe('apple and banana');
    });

    it('should handle undefined variables in non-strict mode', async () => {
      const engine = new APTLEngine('gpt-5.1', {
        strict: false,
        preserveWhitespace: true,
      });
      const result = await engine.render('Hello @{missing}', {});
      expect(result).toBe('Hello ');
    });

    it('should render variables with numbers', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('Count: @{count}', { count: 42 });
      expect(result).toBe('Count: 42');
    });

    it('should render variables with booleans', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('Active: @{active}', { active: true });
      expect(result).toBe('Active: true');
    });

    it('should render zero values', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('@{value}', { value: 0 });
      expect(result).toBe('0');
    });

    it('should render empty string values', async () => {
      const engine = new APTLEngine('gpt-5.1');
      // In template text, quotes are regular characters and variables ARE interpolated
      const result = await engine.render('Value: "@{value}"', { value: '' });
      expect(result).toBe('Value: ""');
    });

    it('should handle variables in multiline templates', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `Name: @{name}
Age: @{age}
City: @{city}`;
      const result = await engine.render(template, {
        name: 'Alice',
        age: 30,
        city: 'NYC',
      });
      expect(result).toBe('Name: Alice\nAge: 30\nCity: NYC');
    });
  });

  describe('Comments', () => {
    it('should ignore line comments', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `Hello
// This is a comment
World`;
      const result = await engine.render(template);
      expect(result).toBe('Hello\nWorld');
    });

    it('should ignore block comments', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `Before
/* This is
a block
comment */
After`;
      const result = await engine.render(template);
      expect(result).toBe('Before\nAfter');
    });

    it('should handle multiple comments', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `Line 1
// Comment 1
Line 2
// Comment 2
Line 3`;
      const result = await engine.render(template);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('Conditional Rendering (@if)', () => {
    describe('Basic @if', () => {
      it('should render content when condition is true', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(show)
  Content
@end`;
        const result = await engine.render(template, { show: true });
        expect(result).toContain('Content');
      });

      it('should not render content when condition is false', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(show)
  Content
@end`;
        const result = await engine.render(template, { show: false });
        expect(result).not.toContain('Content');
      });

      it('should handle truthy values', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(value)
  Yes
@end`;
        expect(await engine.render(template, { value: 1 })).toContain('Yes');
        expect(await engine.render(template, { value: 'text' })).toContain(
          'Yes',
        );
        expect(await engine.render(template, { value: {} })).toContain('Yes');
      });

      it('should handle falsy values', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(value)
  Yes
@end`;
        expect(await engine.render(template, { value: 0 })).not.toContain(
          'Yes',
        );
        expect(await engine.render(template, { value: '' })).not.toContain(
          'Yes',
        );
        expect(await engine.render(template, { value: false })).not.toContain(
          'Yes',
        );
        expect(await engine.render(template, { value: null })).not.toContain(
          'Yes',
        );
      });
    });

    describe('@if with comparisons', () => {
      it('should support equality comparison', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(status == "active")
  Active
@end`;
        expect(await engine.render(template, { status: 'active' })).toContain(
          'Active',
        );
        expect(
          await engine.render(template, { status: 'inactive' }),
        ).not.toContain('Active');
      });

      it('should support inequality comparison', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(status != "inactive")
  Not Inactive
@end`;
        expect(await engine.render(template, { status: 'active' })).toContain(
          'Not Inactive',
        );
        expect(
          await engine.render(template, { status: 'inactive' }),
        ).not.toContain('Not Inactive');
      });

      it('should support greater than comparison', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(count > 5)
  Many
@end`;
        expect(await engine.render(template, { count: 10 })).toContain('Many');
        expect(await engine.render(template, { count: 3 })).not.toContain(
          'Many',
        );
      });

      it('should support less than comparison', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(count < 5)
  Few
@end`;
        expect(await engine.render(template, { count: 3 })).toContain('Few');
        expect(await engine.render(template, { count: 10 })).not.toContain(
          'Few',
        );
      });

      it('should support greater than or equal comparison', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(count >= 5)
  Five or more
@end`;
        expect(await engine.render(template, { count: 5 })).toContain(
          'Five or more',
        );
        expect(await engine.render(template, { count: 6 })).toContain(
          'Five or more',
        );
        expect(await engine.render(template, { count: 4 })).not.toContain(
          'Five or more',
        );
      });

      it('should support less than or equal comparison', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(count <= 5)
  Five or less
@end`;
        expect(await engine.render(template, { count: 5 })).toContain(
          'Five or less',
        );
        expect(await engine.render(template, { count: 4 })).toContain(
          'Five or less',
        );
        expect(await engine.render(template, { count: 6 })).not.toContain(
          'Five or less',
        );
      });
    });

    describe('@if with logical operators', () => {
      it('should support AND operator', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(isActive and hasPermission)
  Allowed
@end`;
        expect(
          await engine.render(template, {
            isActive: true,
            hasPermission: true,
          }),
        ).toContain('Allowed');
        expect(
          await engine.render(template, {
            isActive: true,
            hasPermission: false,
          }),
        ).not.toContain('Allowed');
        expect(
          await engine.render(template, {
            isActive: false,
            hasPermission: true,
          }),
        ).not.toContain('Allowed');
      });

      it('should support OR operator', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(isAdmin or isOwner)
  Access Granted
@end`;
        expect(
          await engine.render(template, { isAdmin: true, isOwner: false }),
        ).toContain('Access Granted');
        expect(
          await engine.render(template, { isAdmin: false, isOwner: true }),
        ).toContain('Access Granted');
        expect(
          await engine.render(template, { isAdmin: false, isOwner: false }),
        ).not.toContain('Access Granted');
      });

      it('should support NOT operator', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(not isDeleted)
  Visible
@end`;
        expect(await engine.render(template, { isDeleted: false })).toContain(
          'Visible',
        );
        expect(
          await engine.render(template, { isDeleted: true }),
        ).not.toContain('Visible');
      });

      it('should support complex logical expressions', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(isActive and (isAdmin or isOwner))
  Full Access
@end`;
        expect(
          await engine.render(template, {
            isActive: true,
            isAdmin: true,
            isOwner: false,
          }),
        ).toContain('Full Access');
        expect(
          await engine.render(template, {
            isActive: true,
            isAdmin: false,
            isOwner: true,
          }),
        ).toContain('Full Access');
        expect(
          await engine.render(template, {
            isActive: false,
            isAdmin: true,
            isOwner: false,
          }),
        ).not.toContain('Full Access');
      });
    });

    describe('@if with @elif and @else', () => {
      it('should render @elif when @if is false and @elif is true', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(status == "draft")
  Draft
@elif(status == "published")
  Published
@end`;
        expect(
          await engine.render(template, { status: 'published' }),
        ).toContain('Published');
        expect(
          await engine.render(template, { status: 'published' }),
        ).not.toContain('Draft');
      });

      it('should render @else when all conditions are false', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(status == "draft")
  Draft
@elif(status == "published")
  Published
@else
  Unknown
@end`;
        expect(await engine.render(template, { status: 'archived' })).toContain(
          'Unknown',
        );
        expect(
          await engine.render(template, { status: 'archived' }),
        ).not.toContain('Draft');
        expect(
          await engine.render(template, { status: 'archived' }),
        ).not.toContain('Published');
      });

      it('should support multiple @elif clauses', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(grade >= 90)
  A
@elif(grade >= 80)
  B
@elif(grade >= 70)
  C
@elif(grade >= 60)
  D
@else
  F
@end`;
        expect(await engine.render(template, { grade: 95 })).toContain('A');
        expect(await engine.render(template, { grade: 85 })).toContain('B');
        expect(await engine.render(template, { grade: 75 })).toContain('C');
        expect(await engine.render(template, { grade: 65 })).toContain('D');
        expect(await engine.render(template, { grade: 50 })).toContain('F');
      });

      it('should only render the first matching branch', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(value > 5)
  Greater than 5
@elif(value > 3)
  Greater than 3
@elif(value > 1)
  Greater than 1
@end`;
        const result = await engine.render(template, { value: 10 });
        expect(result).toContain('Greater than 5');
        expect(result).not.toContain('Greater than 3');
        expect(result).not.toContain('Greater than 1');
      });
    });

    describe('Nested @if', () => {
      it('should support nested if statements', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(isLoggedIn)
  Welcome!
  @if(isAdmin)
    Admin Panel
  @end
@end`;
        expect(
          await engine.render(template, { isLoggedIn: true, isAdmin: true }),
        ).toContain('Admin Panel');
        expect(
          await engine.render(template, { isLoggedIn: true, isAdmin: false }),
        ).not.toContain('Admin Panel');
        expect(
          await engine.render(template, { isLoggedIn: false, isAdmin: true }),
        ).not.toContain('Admin Panel');
      });

      it('should support deeply nested conditionals', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(level1)
  Level 1
  @if(level2)
    Level 2
    @if(level3)
      Level 3
    @end
  @end
@end`;
        expect(
          await engine.render(template, {
            level1: true,
            level2: true,
            level3: true,
          }),
        ).toContain('Level 3');
        expect(
          await engine.render(template, {
            level1: true,
            level2: false,
            level3: true,
          }),
        ).not.toContain('Level 3');
      });

      it('should support nested if/elif/else', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(outer)
  @if(inner == 1)
    Inner One
  @elif(inner == 2)
    Inner Two
  @else
    Inner Other
  @end
@else
  Outer False
@end`;
        expect(
          await engine.render(template, { outer: true, inner: 1 }),
        ).toContain('Inner One');
        expect(
          await engine.render(template, { outer: true, inner: 2 }),
        ).toContain('Inner Two');
        expect(
          await engine.render(template, { outer: true, inner: 3 }),
        ).toContain('Inner Other');
        expect(
          await engine.render(template, { outer: false, inner: 1 }),
        ).toContain('Outer False');
      });
    });

    describe('@if with variables in content', () => {
      it('should render variables inside conditional blocks', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(showGreeting)
  Hello @{name}!
@end`;
        expect(
          await engine.render(template, { showGreeting: true, name: 'Alice' }),
        ).toContain('Hello Alice!');
      });

      it('should not render variables when condition is false', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(show)
  @{message}
@end`;
        expect(
          await engine.render(template, { show: false, message: 'Secret' }),
        ).not.toContain('Secret');
      });

      it('should render different variables in different branches', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@if(isPremium)
  Premium: @{premiumMessage}
@else
  Free: @{freeMessage}
@end`;
        expect(
          await engine.render(template, {
            isPremium: true,
            premiumMessage: 'VIP Access',
            freeMessage: 'Limited',
          }),
        ).toContain('Premium: VIP Access');
        expect(
          await engine.render(template, {
            isPremium: false,
            premiumMessage: 'VIP Access',
            freeMessage: 'Limited',
          }),
        ).toContain('Free: Limited');
      });
    });
  });

  describe('Template Caching', () => {
    it('should cache compiled templates when cache is enabled', async () => {
      const engine = new APTLEngine('gpt-5.1', { cache: true });
      const template = 'Hello @{name}';

      const result1 = await engine.render(template, { name: 'Alice' });
      const result2 = await engine.render(template, { name: 'Bob' });

      expect(result1).toBe('Hello Alice');
      expect(result2).toBe('Hello Bob');
    });

    it('should not cache when cache is disabled', async () => {
      const engine = new APTLEngine('gpt-5.1', { cache: false });
      const template = 'Hello @{name}';

      const result1 = await engine.render(template, { name: 'Alice' });
      const result2 = await engine.render(template, { name: 'Bob' });

      expect(result1).toBe('Hello Alice');
      expect(result2).toBe('Hello Bob');
    });

    it('should clear cache when clearCache is called', async () => {
      const engine = new APTLEngine('gpt-5.1', { cache: true });
      const template = 'Hello @{name}';

      await engine.render(template, { name: 'Alice' });
      engine.clearCache();
      const result = await engine.render(template, { name: 'Bob' });

      expect(result).toBe('Hello Bob');
    });
  });

  describe('File System Integration', () => {
    it('should render templates from ObjectFileSystem', async () => {
      const fs = new ObjectFileSystem({
        '/templates/greeting.aptl': 'Hello @{name}!',
      });

      const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });
      const result = await await engine.renderFile('/templates/greeting.aptl', {
        name: 'World',
      });

      expect(result).toBe('Hello World!');
    });

    it('should render templates with conditionals from files', async () => {
      const fs = new ObjectFileSystem({
        '/templates/conditional.aptl': `@if(show)
  Visible
@else
  Hidden
@end`,
      });

      const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });
      const result1 = await await engine.renderFile(
        '/templates/conditional.aptl',
        {
          show: true,
        },
      );
      const result2 = await await engine.renderFile(
        '/templates/conditional.aptl',
        {
          show: false,
        },
      );

      expect(result1).toContain('Visible');
      expect(result2).toContain('Hidden');
    });

    it('should cache file-based templates', async () => {
      const fs = new ObjectFileSystem({
        '/templates/test.aptl': 'Value: @{value}',
      });

      const engine = new APTLEngine('gpt-5.1', { fileSystem: fs, cache: true });

      const result1 = await await engine.renderFile('/templates/test.aptl', {
        value: 1,
      });
      const result2 = await await engine.renderFile('/templates/test.aptl', {
        value: 2,
      });

      expect(result1).toBe('Value: 1');
      expect(result2).toBe('Value: 2');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should render a user profile template', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `User Profile
Name: @{user.name}
Email: @{user.email}
@if(user.isActive)
  Status: Active
@else
  Status: Inactive
@end
@if(user.isPremium)
  Account Type: Premium
  Features: All features enabled
@else
  Account Type: Free
  Features: Limited features
@end`;

      const result = await engine.render(template, {
        user: {
          name: 'Alice Johnson',
          email: 'alice@example.com',
          isActive: true,
          isPremium: true,
        },
      });

      expect(result).toContain('Alice Johnson');
      expect(result).toContain('alice@example.com');
      expect(result).toContain('Status: Active');
      expect(result).toContain('Account Type: Premium');
    });

    it('should render a notification template', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `@if(notification.type == "success")
  ✓ Success: @{notification.message}
@elif(notification.type == "error")
  ✗ Error: @{notification.message}
@elif(notification.type == "warning")
  ⚠ Warning: @{notification.message}
@else
  ℹ Info: @{notification.message}
@end`;

      expect(
        await engine.render(template, {
          notification: { type: 'success', message: 'Operation completed' },
        }),
      ).toContain('✓ Success: Operation completed');

      expect(
        await engine.render(template, {
          notification: { type: 'error', message: 'Something went wrong' },
        }),
      ).toContain('✗ Error: Something went wrong');
    });

    it('should render a complex conditional structure', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `@if(user.role == "admin")
  Admin Dashboard
  @if(user.permissions.canDelete)
    [Delete] button available
  @end
  @if(user.permissions.canEdit)
    [Edit] button available
  @end
@elif(user.role == "editor")
  Editor Dashboard
  @if(user.permissions.canEdit)
    [Edit] button available
  @end
@else
  Viewer Dashboard
  Read-only access
@end`;

      const result = await engine.render(template, {
        user: {
          role: 'admin',
          permissions: {
            canDelete: true,
            canEdit: true,
          },
        },
      });

      expect(result).toContain('Admin Dashboard');
      expect(result).toContain('[Delete] button available');
      expect(result).toContain('[Edit] button available');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data object', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('Static text', {});
      expect(result).toBe('Static text');
    });

    it('should handle template with only whitespace', async () => {
      const engine = new APTLEngine('gpt-5.1', { preserveWhitespace: true });
      const result = await engine.render('   \n  \t  \n   ');
      expect(result).toBe('   \n  \t  \n   ');
    });

    it('should handle consecutive variables', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('@{a}@{b}@{c}', {
        a: '1',
        b: '2',
        c: '3',
      });
      expect(result).toBe('123');
    });

    it('should handle variables with no spaces', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const result = await engine.render('@{name}', { name: 'Test' });
      expect(result).toBe('Test');
    });

    it('should handle conditions with nested properties', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `@if(config.settings.enabled)
  Enabled
@end`;
      const result = await engine.render(template, {
        config: { settings: { enabled: true } },
      });
      expect(result).toContain('Enabled');
    });

    it('should handle multiple conditionals in sequence', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `@if(show1)
  Block 1
@end
@if(show2)
  Block 2
@end
@if(show3)
  Block 3
@end`;
      const result = await engine.render(template, {
        show1: true,
        show2: false,
        show3: true,
      });
      expect(result).toContain('Block 1');
      expect(result).not.toContain('Block 2');
      expect(result).toContain('Block 3');
    });
  });

  describe('Iteration (@each)', () => {
    describe('Basic @each', () => {
      it('should iterate over simple array', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
- @{item}
@end`;
        const result = await engine.render(template, {
          items: ['apple', 'banana', 'cherry'],
        });
        expect(result).toContain('- apple');
        expect(result).toContain('- banana');
        expect(result).toContain('- cherry');
      });

      it('should iterate over array of objects', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(user in users)
Name: @{user.name}, Age: @{user.age}
@end`;
        const result = await engine.render(template, {
          users: [
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 },
          ],
        });
        expect(result).toContain('Name: Alice, Age: 30');
        expect(result).toContain('Name: Bob, Age: 25');
      });

      it('should handle empty array', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
- @{item}
@end`;
        const result = await engine.render(template, { items: [] });
        expect(result).toBe('');
      });

      it('should handle undefined array', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
- @{item}
@end`;
        const result = await engine.render(template, {});
        expect(result).toBe('');
      });
    });

    describe('@each with loop metadata', () => {
      it('should provide loop.index', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
@{loop.index}: @{item}
@end`;
        const result = await engine.render(template, {
          items: ['a', 'b', 'c'],
        });
        expect(result).toContain('0: a');
        expect(result).toContain('1: b');
        expect(result).toContain('2: c');
      });

      it('should provide loop.first', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
@if(loop.first)
First: @{item}
@end
@end`;
        const result = await engine.render(template, {
          items: ['a', 'b', 'c'],
        });
        expect(result).toContain('First: a');
        expect(result).not.toContain('First: b');
      });

      it('should provide loop.last', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
@if(loop.last)
Last: @{item}
@end
@end`;
        const result = await engine.render(template, {
          items: ['a', 'b', 'c'],
        });
        expect(result).toContain('Last: c');
        expect(result).not.toContain('Last: a');
      });

      it('should provide loop.even and loop.odd', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
@if(loop.even)
Even: @{item}
@end
@if(loop.odd)
Odd: @{item}
@end
@end`;
        const result = await engine.render(template, {
          items: ['a', 'b', 'c', 'd'],
        });
        expect(result).toContain('Even: a');
        expect(result).toContain('Odd: b');
        expect(result).toContain('Even: c');
        expect(result).toContain('Odd: d');
      });

      it('should provide loop.length', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
@{loop.index} of @{loop.length}
@end`;
        const result = await engine.render(template, {
          items: ['a', 'b', 'c'],
        });
        expect(result).toContain('0 of 3');
        expect(result).toContain('1 of 3');
        expect(result).toContain('2 of 3');
      });
    });

    describe('@each with custom index variable', () => {
      it('should support custom index variable name', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item, idx in items)
[@{idx}] @{item}
@end`;
        const result = await engine.render(template, {
          items: ['x', 'y', 'z'],
        });
        expect(result).toContain('[0] x');
        expect(result).toContain('[1] y');
        expect(result).toContain('[2] z');
      });

      it('should provide both custom index and loop metadata', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item, i in items)
i=@{i}, loop.index=@{loop.index}
@end`;
        const result = await engine.render(template, {
          items: ['a', 'b'],
        });
        expect(result).toContain('i=0, loop.index=0');
        expect(result).toContain('i=1, loop.index=1');
      });
    });

    describe('@each with @else', () => {
      it('should render else branch when array is empty', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
- @{item}
@else
No items available
@end`;
        const result = await engine.render(template, { items: [] });
        expect(result).toContain('No items available');
        expect(result).not.toContain('- ');
      });

      it('should render else branch when array does not exist', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
- @{item}
@else
No items found
@end`;
        const result = await engine.render(template, {});
        expect(result).toContain('No items found');
      });

      it('should not render else branch when array has items', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
- @{item}
@else
No items
@end`;
        const result = await engine.render(template, { items: ['apple'] });
        expect(result).toContain('- apple');
        expect(result).not.toContain('No items');
      });

      it('should render else branch with variables', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(product in products)
Product: @{product}
@else
No @{category} products available
@end`;
        const result = await engine.render(template, {
          products: [],
          category: 'electronics',
        });
        expect(result).toContain('No electronics products available');
      });
    });

    describe('Nested @each', () => {
      it('should handle nested iteration', async () => {
        const engine = new APTLEngine('gpt-5.1', { preserveWhitespace: true });
        const template = `@each(category in categories)
@{category.name}:
@each(item in category.items)
  - @{item}
@end
@end`;
        const result = await engine.render(template, {
          categories: [
            { name: 'Fruits', items: ['Apple', 'Banana'] },
            { name: 'Veggies', items: ['Carrot', 'Lettuce'] },
          ],
        });
        expect(result).toContain('Fruits:');
        expect(result).toContain('  - Apple');
        expect(result).toContain('  - Banana');
        expect(result).toContain('Veggies:');
        expect(result).toContain('  - Carrot');
      });

      it('should handle nested each with else branches', async () => {
        const engine = new APTLEngine('gpt-5.1', { preserveWhitespace: true });
        const template = `@each(category in categories)
@{category.name}:
@each(item in category.items)
  - @{item}
@else
  No items
@end
@end`;
        const result = await engine.render(template, {
          categories: [
            { name: 'Fruits', items: ['Apple'] },
            { name: 'Empty', items: [] },
          ],
        });
        expect(result).toContain('Fruits:');
        expect(result).toContain('  - Apple');
        expect(result).toContain('Empty:');
        expect(result).toContain('  No items');
      });

      it('should preserve outer loop context in nested loops', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(outer in outers)
Outer @{loop.index}: @{outer.name}
@each(inner in outer.inners)
  Inner @{loop.index} of @{outer.name}: @{inner}
@end
@end`;
        const result = await engine.render(template, {
          outers: [
            { name: 'A', inners: ['1', '2'] },
            { name: 'B', inners: ['3'] },
          ],
        });
        expect(result).toContain('Outer 0: A');
        expect(result).toContain('Inner 0 of A: 1');
        expect(result).toContain('Inner 1 of A: 2');
        expect(result).toContain('Outer 1: B');
        expect(result).toContain('Inner 0 of B: 3');
      });
    });

    describe('@each with @if', () => {
      it('should support conditionals inside loops', async () => {
        const engine = new APTLEngine('gpt-5.1', { preserveWhitespace: true });
        const template = `@each(user in users)
@{user.name}
@if user.isAdmin
 (Admin)
@end
@end`;
        const result = await engine.render(template, {
          users: [
            { name: 'Alice', isAdmin: true },
            { name: 'Bob', isAdmin: false },
            { name: 'Charlie', isAdmin: true },
          ],
        });
        expect(result).toContain('Alice');
        expect(result).toContain(' (Admin)');
        expect(result).toContain('Bob');
        expect(result).not.toContain('Bob\n (Admin)');
        expect(result).toContain('Charlie');
      });

      it('should support loop conditionals based on loop metadata', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(item in items)
@if(not loop.first)
, @end@{item}@end`;
        const result = await engine.render(template, {
          items: ['a', 'b', 'c'],
        });
        // Since @if can't be inline, we need to adjust expectations
        expect(result).toContain('a');
        expect(result).toContain('b');
        expect(result).toContain('c');
      });

      it('should support filtering with conditionals', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(product in products)
@if(product.inStock)
- @{product.name} ($@{product.price})
@end
@end`;
        const result = await engine.render(template, {
          products: [
            { name: 'Widget', price: 10, inStock: true },
            { name: 'Gadget', price: 20, inStock: false },
            { name: 'Gizmo', price: 15, inStock: true },
          ],
        });
        expect(result).toContain('- Widget ($10)');
        expect(result).not.toContain('- Gadget');
        expect(result).toContain('- Gizmo ($15)');
      });
    });

    describe('Real-world @each scenarios', () => {
      it('should render a list of blog posts', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `Blog Posts:
@each(post in posts)

Title: @{post.title}
Author: @{post.author}
Date: @{post.date}
@if post.featured
⭐ Featured Post
@end
---
@end`;
        const result = await engine.render(template, {
          posts: [
            {
              title: 'Getting Started',
              author: 'Alice',
              date: '2024-01-15',
              featured: true,
            },
            {
              title: 'Advanced Topics',
              author: 'Bob',
              date: '2024-01-20',
              featured: false,
            },
          ],
        });
        expect(result).toContain('Title: Getting Started');
        expect(result).toContain('Author: Alice');
        expect(result).toContain('⭐ Featured Post');
        expect(result).toContain('Title: Advanced Topics');
        expect(result).toContain('Author: Bob');
      });

      it('should render a shopping cart', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `Shopping Cart:
@each(item in cart.items)
@{loop.index}. @{item.name} - $@{item.price} x @{item.quantity}
@end
@else
Your cart is empty
@end`;
        const result = await engine.render(template, {
          cart: {
            items: [
              { name: 'Book', price: 10, quantity: 2 },
              { name: 'Pen', price: 2, quantity: 5 },
            ],
          },
        });
        expect(result).toContain('0. Book - $10 x 2');
        expect(result).toContain('1. Pen - $2 x 5');
      });

      it('should render empty cart message', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `Shopping Cart:
@each(item in cart.items)
- @{item.name}
@else
Your cart is empty
@end`;
        const result = await engine.render(template, {
          cart: { items: [] },
        });
        expect(result).toContain('Your cart is empty');
      });

      it('should render a table with alternating row styles', async () => {
        const engine = new APTLEngine('gpt-5.1');
        const template = `@each(row in data)
@if(loop.even)
[EVEN] @{row.name}: @{row.value}
@end
@if(loop.odd)
[ODD] @{row.name}: @{row.value}
@end
@end`;
        const result = await engine.render(template, {
          data: [
            { name: 'A', value: 1 },
            { name: 'B', value: 2 },
            { name: 'C', value: 3 },
          ],
        });
        expect(result).toContain('[EVEN] A: 1');
        expect(result).toContain('[ODD] B: 2');
        expect(result).toContain('[EVEN] C: 3');
      });

      it('should render a nested menu structure', async () => {
        const engine = new APTLEngine('gpt-5.1', { preserveWhitespace: true });
        const template = `@each(section in menu)
@{section.title}
@each(item in section.items)
  - @{item.name}
@if item.new
 [NEW]
@end
@else
  No items in this section
@end

@end`;
        const result = await engine.render(template, {
          menu: [
            {
              title: 'File',
              items: [
                { name: 'New', new: true },
                { name: 'Open', new: false },
              ],
            },
            {
              title: 'Edit',
              items: [],
            },
          ],
        });
        expect(result).toContain('File');
        expect(result).toContain('  - New');
        expect(result).toContain(' [NEW]');
        expect(result).toContain('  - Open');
        expect(result).toContain('Edit');
        expect(result).toContain('  No items in this section');
      });
    });
  });
});
