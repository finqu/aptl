/**
 * Integration tests for APTLEngine
 * Focus: End-to-end template rendering with real tokenizer, parser, and compiler
 */

import { APTLEngine } from '@/core/engine';
import { ObjectFileSystem } from '@/filesystem/object-filesystem';

describe('APTLEngine Integration', () => {
    describe('Basic Text Rendering', () => {
        it('should render plain text without any directives', () => {
            const engine = new APTLEngine();
            const result = engine.render('Hello World');
            expect(result).toBe('Hello World');
        });

        it('should render multiline text', () => {
            const engine = new APTLEngine();
            const template = `Line 1
Line 2
Line 3`;
            const result = engine.render(template);
            expect(result).toBe('Line 1\nLine 2\nLine 3');
        });

        it('should preserve whitespace in text', () => {
            const engine = new APTLEngine();
            const result = engine.render('Hello   World\t\tTest');
            expect(result).toBe('Hello   World\t\tTest');
        });

        it('should handle empty template', () => {
            const engine = new APTLEngine();
            const result = engine.render('');
            expect(result).toBe('');
        });

        it('should handle special characters', () => {
            const engine = new APTLEngine();
            const result = engine.render('Special: !@#$%^&*()_+-=[]{}|;:,.<>?');
            expect(result).toBe('Special: !@#$%^&*()_+-=[]{}|;:,.<>?');
        });
    });

    describe('Variable Rendering', () => {
        it('should render simple variable', () => {
            const engine = new APTLEngine();
            const result = engine.render('Hello @{name}', { name: 'World' });
            expect(result).toBe('Hello World');
        });

        it('should render multiple variables', () => {
            const engine = new APTLEngine();
            const template = '@{greeting} @{name}!';
            const result = engine.render(template, {
                greeting: 'Hello',
                name: 'World',
            });
            expect(result).toBe('Hello World!');
        });

        it('should render nested object properties', () => {
            const engine = new APTLEngine();
            const result = engine.render('@{user.name}', {
                user: { name: 'Alice' },
            });
            expect(result).toBe('Alice');
        });

        it('should render deeply nested properties', () => {
            const engine = new APTLEngine();
            const result = engine.render('@{company.department.employee.name}', {
                company: {
                    department: {
                        employee: { name: 'Bob' },
                    },
                },
            });
            expect(result).toBe('Bob');
        });

        it('should render array elements', () => {
            const engine = new APTLEngine();
            const result = engine.render('@{items.0} and @{items.1}', {
                items: ['apple', 'banana'],
            });
            expect(result).toBe('apple and banana');
        });

        it('should handle undefined variables in non-strict mode', () => {
            const engine = new APTLEngine({ strict: false });
            const result = engine.render('Hello @{missing}', {});
            expect(result).toBe('Hello ');
        });

        it('should render variables with numbers', () => {
            const engine = new APTLEngine();
            const result = engine.render('Count: @{count}', { count: 42 });
            expect(result).toBe('Count: 42');
        });

        it('should render variables with booleans', () => {
            const engine = new APTLEngine();
            const result = engine.render('Active: @{active}', { active: true });
            expect(result).toBe('Active: true');
        });

        it('should render zero values', () => {
            const engine = new APTLEngine();
            const result = engine.render('@{value}', { value: 0 });
            expect(result).toBe('0');
        });

        it('should render empty string values', () => {
            const engine = new APTLEngine();
            // Strings are literals - variables inside strings are NOT interpolated
            const result = engine.render('Value: "@{value}"', { value: '' });
            expect(result).toBe('Value: "@{value}"');
        });

        it('should handle variables in multiline templates', () => {
            const engine = new APTLEngine();
            const template = `Name: @{name}
Age: @{age}
City: @{city}`;
            const result = engine.render(template, {
                name: 'Alice',
                age: 30,
                city: 'NYC',
            });
            expect(result).toBe('Name: Alice\nAge: 30\nCity: NYC');
        });
    });

    describe('Comments', () => {
        it('should ignore line comments', () => {
            const engine = new APTLEngine();
            const template = `Hello
// This is a comment
World`;
            const result = engine.render(template);
            expect(result).toBe('Hello\nWorld');
        });

        it('should ignore block comments', () => {
            const engine = new APTLEngine();
            const template = `Before
/* This is
a block
comment */
After`;
            const result = engine.render(template);
            expect(result).toBe('Before\nAfter');
        });

        it('should handle multiple comments', () => {
            const engine = new APTLEngine();
            const template = `Line 1
// Comment 1
Line 2
// Comment 2
Line 3`;
            const result = engine.render(template);
            expect(result).toBe('Line 1\nLine 2\nLine 3');
        });
    });

    describe('Conditional Rendering (@if)', () => {
        describe('Basic @if', () => {
            it('should render content when condition is true', () => {
                const engine = new APTLEngine();
                const template = `@if(show)
  Content
@end`;
                const result = engine.render(template, { show: true });
                expect(result).toContain('Content');
            });

            it('should not render content when condition is false', () => {
                const engine = new APTLEngine();
                const template = `@if(show)
  Content
@end`;
                const result = engine.render(template, { show: false });
                expect(result).not.toContain('Content');
            });

            it('should handle truthy values', () => {
                const engine = new APTLEngine();
                const template = `@if(value)
  Yes
@end`;
                expect(engine.render(template, { value: 1 })).toContain('Yes');
                expect(engine.render(template, { value: 'text' })).toContain('Yes');
                expect(engine.render(template, { value: {} })).toContain('Yes');
            });

            it('should handle falsy values', () => {
                const engine = new APTLEngine();
                const template = `@if(value)
  Yes
@end`;
                expect(engine.render(template, { value: 0 })).not.toContain('Yes');
                expect(engine.render(template, { value: '' })).not.toContain('Yes');
                expect(engine.render(template, { value: false })).not.toContain('Yes');
                expect(engine.render(template, { value: null })).not.toContain('Yes');
            });
        });

        describe('@if with comparisons', () => {
            it('should support equality comparison', () => {
                const engine = new APTLEngine();
                const template = `@if(status == "active")
  Active
@end`;
                expect(engine.render(template, { status: 'active' })).toContain('Active');
                expect(engine.render(template, { status: 'inactive' })).not.toContain('Active');
            });

            it('should support inequality comparison', () => {
                const engine = new APTLEngine();
                const template = `@if(status != "inactive")
  Not Inactive
@end`;
                expect(engine.render(template, { status: 'active' })).toContain('Not Inactive');
                expect(engine.render(template, { status: 'inactive' })).not.toContain('Not Inactive');
            });

            it('should support greater than comparison', () => {
                const engine = new APTLEngine();
                const template = `@if(count > 5)
  Many
@end`;
                expect(engine.render(template, { count: 10 })).toContain('Many');
                expect(engine.render(template, { count: 3 })).not.toContain('Many');
            });

            it('should support less than comparison', () => {
                const engine = new APTLEngine();
                const template = `@if(count < 5)
  Few
@end`;
                expect(engine.render(template, { count: 3 })).toContain('Few');
                expect(engine.render(template, { count: 10 })).not.toContain('Few');
            });

            it('should support greater than or equal comparison', () => {
                const engine = new APTLEngine();
                const template = `@if(count >= 5)
  Five or more
@end`;
                expect(engine.render(template, { count: 5 })).toContain('Five or more');
                expect(engine.render(template, { count: 6 })).toContain('Five or more');
                expect(engine.render(template, { count: 4 })).not.toContain('Five or more');
            });

            it('should support less than or equal comparison', () => {
                const engine = new APTLEngine();
                const template = `@if(count <= 5)
  Five or less
@end`;
                expect(engine.render(template, { count: 5 })).toContain('Five or less');
                expect(engine.render(template, { count: 4 })).toContain('Five or less');
                expect(engine.render(template, { count: 6 })).not.toContain('Five or less');
            });
        });

        describe('@if with logical operators', () => {
            it('should support AND operator', () => {
                const engine = new APTLEngine();
                const template = `@if(isActive and hasPermission)
  Allowed
@end`;
                expect(
                    engine.render(template, { isActive: true, hasPermission: true }),
                ).toContain('Allowed');
                expect(
                    engine.render(template, { isActive: true, hasPermission: false }),
                ).not.toContain('Allowed');
                expect(
                    engine.render(template, { isActive: false, hasPermission: true }),
                ).not.toContain('Allowed');
            });

            it('should support OR operator', () => {
                const engine = new APTLEngine();
                const template = `@if(isAdmin or isOwner)
  Access Granted
@end`;
                expect(
                    engine.render(template, { isAdmin: true, isOwner: false }),
                ).toContain('Access Granted');
                expect(
                    engine.render(template, { isAdmin: false, isOwner: true }),
                ).toContain('Access Granted');
                expect(
                    engine.render(template, { isAdmin: false, isOwner: false }),
                ).not.toContain('Access Granted');
            });

            it('should support NOT operator', () => {
                const engine = new APTLEngine();
                const template = `@if(not isDeleted)
  Visible
@end`;
                expect(engine.render(template, { isDeleted: false })).toContain('Visible');
                expect(engine.render(template, { isDeleted: true })).not.toContain('Visible');
            });

            it('should support complex logical expressions', () => {
                const engine = new APTLEngine();
                const template = `@if(isActive and (isAdmin or isOwner))
  Full Access
@end`;
                expect(
                    engine.render(template, { isActive: true, isAdmin: true, isOwner: false }),
                ).toContain('Full Access');
                expect(
                    engine.render(template, { isActive: true, isAdmin: false, isOwner: true }),
                ).toContain('Full Access');
                expect(
                    engine.render(template, { isActive: false, isAdmin: true, isOwner: false }),
                ).not.toContain('Full Access');
            });
        });

        describe('@if with @elif and @else', () => {
            it('should render @elif when @if is false and @elif is true', () => {
                const engine = new APTLEngine();
                const template = `@if(status == "draft")
  Draft
@elif(status == "published")
  Published
@end`;
                expect(engine.render(template, { status: 'published' })).toContain('Published');
                expect(engine.render(template, { status: 'published' })).not.toContain('Draft');
            });

            it('should render @else when all conditions are false', () => {
                const engine = new APTLEngine();
                const template = `@if(status == "draft")
  Draft
@elif(status == "published")
  Published
@else
  Unknown
@end`;
                expect(engine.render(template, { status: 'archived' })).toContain('Unknown');
                expect(engine.render(template, { status: 'archived' })).not.toContain('Draft');
                expect(engine.render(template, { status: 'archived' })).not.toContain('Published');
            });

            it('should support multiple @elif clauses', () => {
                const engine = new APTLEngine();
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
                expect(engine.render(template, { grade: 95 })).toContain('A');
                expect(engine.render(template, { grade: 85 })).toContain('B');
                expect(engine.render(template, { grade: 75 })).toContain('C');
                expect(engine.render(template, { grade: 65 })).toContain('D');
                expect(engine.render(template, { grade: 50 })).toContain('F');
            });

            it('should only render the first matching branch', () => {
                const engine = new APTLEngine();
                const template = `@if(value > 5)
  Greater than 5
@elif(value > 3)
  Greater than 3
@elif(value > 1)
  Greater than 1
@end`;
                const result = engine.render(template, { value: 10 });
                expect(result).toContain('Greater than 5');
                expect(result).not.toContain('Greater than 3');
                expect(result).not.toContain('Greater than 1');
            });
        });

        describe('Nested @if', () => {
            it('should support nested if statements', () => {
                const engine = new APTLEngine();
                const template = `@if(isLoggedIn)
  Welcome!
  @if(isAdmin)
    Admin Panel
  @end
@end`;
                expect(
                    engine.render(template, { isLoggedIn: true, isAdmin: true }),
                ).toContain('Admin Panel');
                expect(
                    engine.render(template, { isLoggedIn: true, isAdmin: false }),
                ).not.toContain('Admin Panel');
                expect(
                    engine.render(template, { isLoggedIn: false, isAdmin: true }),
                ).not.toContain('Admin Panel');
            });

            it('should support deeply nested conditionals', () => {
                const engine = new APTLEngine();
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
                    engine.render(template, { level1: true, level2: true, level3: true }),
                ).toContain('Level 3');
                expect(
                    engine.render(template, { level1: true, level2: false, level3: true }),
                ).not.toContain('Level 3');
            });

            it('should support nested if/elif/else', () => {
                const engine = new APTLEngine();
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
                expect(engine.render(template, { outer: true, inner: 1 })).toContain('Inner One');
                expect(engine.render(template, { outer: true, inner: 2 })).toContain('Inner Two');
                expect(engine.render(template, { outer: true, inner: 3 })).toContain('Inner Other');
                expect(engine.render(template, { outer: false, inner: 1 })).toContain('Outer False');
            });
        });

        describe('@if with variables in content', () => {
            it('should render variables inside conditional blocks', () => {
                const engine = new APTLEngine();
                const template = `@if(showGreeting)
  Hello @{name}!
@end`;
                expect(
                    engine.render(template, { showGreeting: true, name: 'Alice' }),
                ).toContain('Hello Alice!');
            });

            it('should not render variables when condition is false', () => {
                const engine = new APTLEngine();
                const template = `@if(show)
  @{message}
@end`;
                expect(engine.render(template, { show: false, message: 'Secret' })).not.toContain(
                    'Secret',
                );
            });

            it('should render different variables in different branches', () => {
                const engine = new APTLEngine();
                const template = `@if(isPremium)
  Premium: @{premiumMessage}
@else
  Free: @{freeMessage}
@end`;
                expect(
                    engine.render(template, {
                        isPremium: true,
                        premiumMessage: 'VIP Access',
                        freeMessage: 'Limited',
                    }),
                ).toContain('Premium: VIP Access');
                expect(
                    engine.render(template, {
                        isPremium: false,
                        premiumMessage: 'VIP Access',
                        freeMessage: 'Limited',
                    }),
                ).toContain('Free: Limited');
            });
        });
    });

    describe('Template Caching', () => {
        it('should cache compiled templates when cache is enabled', () => {
            const engine = new APTLEngine({ cache: true });
            const template = 'Hello @{name}';

            const result1 = engine.render(template, { name: 'Alice' });
            const result2 = engine.render(template, { name: 'Bob' });

            expect(result1).toBe('Hello Alice');
            expect(result2).toBe('Hello Bob');
        });

        it('should not cache when cache is disabled', () => {
            const engine = new APTLEngine({ cache: false });
            const template = 'Hello @{name}';

            const result1 = engine.render(template, { name: 'Alice' });
            const result2 = engine.render(template, { name: 'Bob' });

            expect(result1).toBe('Hello Alice');
            expect(result2).toBe('Hello Bob');
        });

        it('should clear cache when clearCache is called', () => {
            const engine = new APTLEngine({ cache: true });
            const template = 'Hello @{name}';

            engine.render(template, { name: 'Alice' });
            engine.clearCache();
            const result = engine.render(template, { name: 'Bob' });

            expect(result).toBe('Hello Bob');
        });
    });

    describe('File System Integration', () => {
        it('should render templates from ObjectFileSystem', async () => {
            const fs = new ObjectFileSystem({
                '/templates/greeting.aptl': 'Hello @{name}!',
            });

            const engine = new APTLEngine({ fileSystem: fs });
            const result = await engine.renderFile('/templates/greeting.aptl', {
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

            const engine = new APTLEngine({ fileSystem: fs });
            const result1 = await engine.renderFile('/templates/conditional.aptl', {
                show: true,
            });
            const result2 = await engine.renderFile('/templates/conditional.aptl', {
                show: false,
            });

            expect(result1).toContain('Visible');
            expect(result2).toContain('Hidden');
        });

        it('should cache file-based templates', async () => {
            const fs = new ObjectFileSystem({
                '/templates/test.aptl': 'Value: @{value}',
            });

            const engine = new APTLEngine({ fileSystem: fs, cache: true });

            const result1 = await engine.renderFile('/templates/test.aptl', {
                value: 1,
            });
            const result2 = await engine.renderFile('/templates/test.aptl', {
                value: 2,
            });

            expect(result1).toBe('Value: 1');
            expect(result2).toBe('Value: 2');
        });
    });

    describe('Real-world Scenarios', () => {
        it('should render a user profile template', () => {
            const engine = new APTLEngine();
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

            const result = engine.render(template, {
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

        it('should render a notification template', () => {
            const engine = new APTLEngine();
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
                engine.render(template, {
                    notification: { type: 'success', message: 'Operation completed' },
                }),
            ).toContain('✓ Success: Operation completed');

            expect(
                engine.render(template, {
                    notification: { type: 'error', message: 'Something went wrong' },
                }),
            ).toContain('✗ Error: Something went wrong');
        });

        it('should render a complex conditional structure', () => {
            const engine = new APTLEngine();
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

            const result = engine.render(template, {
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
        it('should handle empty data object', () => {
            const engine = new APTLEngine();
            const result = engine.render('Static text', {});
            expect(result).toBe('Static text');
        });

        it('should handle template with only whitespace', () => {
            const engine = new APTLEngine();
            const result = engine.render('   \n  \t  \n   ');
            expect(result).toBe('   \n  \t  \n   ');
        });

        it('should handle consecutive variables', () => {
            const engine = new APTLEngine();
            const result = engine.render('@{a}@{b}@{c}', {
                a: '1',
                b: '2',
                c: '3',
            });
            expect(result).toBe('123');
        });

        it('should handle variables with no spaces', () => {
            const engine = new APTLEngine();
            const result = engine.render('@{name}', { name: 'Test' });
            expect(result).toBe('Test');
        });

        it('should handle conditions with nested properties', () => {
            const engine = new APTLEngine();
            const template = `@if(config.settings.enabled)
  Enabled
@end`;
            const result = engine.render(template, {
                config: { settings: { enabled: true } },
            });
            expect(result).toContain('Enabled');
        });

        it('should handle multiple conditionals in sequence', () => {
            const engine = new APTLEngine();
            const template = `@if(show1)
  Block 1
@end
@if(show2)
  Block 2
@end
@if(show3)
  Block 3
@end`;
            const result = engine.render(template, {
                show1: true,
                show2: false,
                show3: true,
            });
            expect(result).toContain('Block 1');
            expect(result).not.toContain('Block 2');
            expect(result).toContain('Block 3');
        });
    });
});
