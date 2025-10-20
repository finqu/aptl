/**
 * Switch Directive Tests
 * Test @switch, @case, and @default directives
 */

import { APTLEngine } from '@/core/engine';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';

describe('SwitchDirective', () => {
  let engine: APTLEngine;

  beforeEach(() => {
    engine = new APTLEngine('test-model');
  });

  describe('Basic switch-case', () => {
    it('should render matching case with string literal', async () => {
      const template = `
@switch "approved"
  @case "pending"
    Waiting for approval
  @case "approved"
    Request approved
  @case "rejected"
    Request rejected
@end
`.trim();

      const result = await engine.render(template);
      expect(result.trim()).toBe('Request approved');
    });

    it('should render matching case with variable', async () => {
      const template = `
@switch status
  @case "pending"
    Waiting for approval
  @case "approved"
    Request approved
  @case "rejected"
    Request rejected
@end
`.trim();

      const result = await engine.render(template, { status: 'approved' });
      expect(result.trim()).toBe('Request approved');
    });

    it('should render matching case with numeric literal', async () => {
      const template = `
@switch 2
  @case 1
    First
  @case 2
    Second
  @case 3
    Third
@end
`.trim();

      const result = await engine.render(template);
      expect(result.trim()).toBe('Second');
    });

    it('should render matching case with numeric variable', async () => {
      const template = `
@switch count
  @case 1
    First
  @case 2
    Second
  @case 3
    Third
@end
`.trim();

      const result = await engine.render(template, { count: 2 });
      expect(result.trim()).toBe('Second');
    });

    it('should render matching case with boolean literal', async () => {
      const template = `
@switch true
  @case false
    Disabled
  @case true
    Enabled
@end
`.trim();

      const result = await engine.render(template);
      expect(result.trim()).toBe('Enabled');
    });

    it('should render matching case with boolean variable', async () => {
      const template = `
@switch isActive
  @case false
    Disabled
  @case true
    Enabled
@end
`.trim();

      const result = await engine.render(template, { isActive: true });
      expect(result.trim()).toBe('Enabled');
    });
  });

  describe('Default case', () => {
    it('should render default case when no match', async () => {
      const template = `
@switch status
  @case "pending"
    Waiting for approval
  @case "approved"
    Request approved
  @default
    Unknown status
@end
`.trim();

      const result = await engine.render(template, { status: 'cancelled' });
      expect(result.trim()).toBe('Unknown status');
    });

    it('should not render default when there is a match', async () => {
      const template = `
@switch status
  @case "pending"
    Waiting for approval
  @case "approved"
    Request approved
  @default
    Unknown status
@end
`.trim();

      const result = await engine.render(template, { status: 'approved' });
      expect(result.trim()).toBe('Request approved');
    });

    it('should render nothing when no match and no default', async () => {
      const template = `
@switch status
  @case "pending"
    Waiting for approval
  @case "approved"
    Request approved
@end
`.trim();

      const result = await engine.render(template, { status: 'cancelled' });
      expect(result.trim()).toBe('');
    });
  });

  describe('Variable resolution in cases', () => {
    it('should compare switch variable with case variable', async () => {
      const template = `
@switch userRole
  @case adminRole
    You are an admin
  @case userRole
    You are a regular user
  @default
    Unknown role
@end
`.trim();

      const result = await engine.render(template, {
        userRole: 'moderator',
        adminRole: 'admin',
      });
      expect(result.trim()).toBe('You are a regular user');
    });

    it('should resolve nested variable paths', async () => {
      const template = `
@switch user.role
  @case "admin"
    Admin access
  @case "user"
    User access
  @default
    Guest access
@end
`.trim();

      const result = await engine.render(template, {
        user: { role: 'admin' },
      });
      expect(result.trim()).toBe('Admin access');
    });
  });

  describe('First match wins', () => {
    it('should render only the first matching case', async () => {
      const template = `
@switch value
  @case 1
    First match
  @case 1
    Second match
  @default
    Default
@end
`.trim();

      const result = await engine.render(template, { value: 1 });
      expect(result.trim()).toBe('First match');
    });
  });

  describe('Complex content in cases', () => {
    it('should render multi-line content in case', async () => {
      const template = `
@switch status
  @case "approved"
    Your request has been approved.
    You can now proceed with the next steps.
  @default
    Status unknown
@end
`.trim();

      const result = await engine.render(template, { status: 'approved' });
      expect(result).toContain('Your request has been approved');
      expect(result).toContain('You can now proceed with the next steps');
    });

    it('should render nested directives in case', async () => {
      const template = `
@switch role
  @case "admin"
    @if hasPremium
      Premium Admin
    @else
      Regular Admin
    @end
  @default
    User
@end
`.trim();

      const result = await engine.render(template, {
        role: 'admin',
        hasPremium: true,
      });
      expect(result.trim()).toBe('Premium Admin');
    });

    it('should render variables in case content', async () => {
      const template = `
@switch status
  @case "approved"
    Approved by @{approver}
  @case "rejected"
    Rejected by @{approver}
@end
`.trim();

      const result = await engine.render(template, {
        status: 'approved',
        approver: 'John Doe',
      });
      expect(result.trim()).toBe('Approved by John Doe');
    });
  });

  describe('Edge cases', () => {
    it('should handle null values', async () => {
      const template = `
@switch value
  @case null
    Value is null
  @default
    Value is not null
@end
`.trim();

      const result = await engine.render(template, { value: null });
      expect(result.trim()).toBe('Value is null');
    });

    it('should use strict equality (not coercion)', async () => {
      const template = `
@switch value
  @case "0"
    String zero
  @case 0
    Numeric zero
  @default
    Other
@end
`.trim();

      const result1 = await engine.render(template, { value: '0' });
      expect(result1.trim()).toBe('String zero');

      const result2 = await engine.render(template, { value: 0 });
      expect(result2.trim()).toBe('Numeric zero');
    });

    it('should handle empty string', async () => {
      const template = `
@switch value
  @case ""
    Empty string
  @default
    Not empty
@end
`.trim();

      const result = await engine.render(template, { value: '' });
      expect(result.trim()).toBe('Empty string');
    });
  });

  describe('Validation', () => {
    it('should throw error when switch has no argument', async () => {
      // Create a strict mode engine for validation tests
      const strictEngine = new APTLEngine('test-model', { strict: true });

      const template = `
@switch
  @case "test"
    Test
@end
`.trim();

      // In strict mode, validation errors are wrapped in APTLRuntimeError
      await expect(strictEngine.render(template)).rejects.toThrow(
        APTLRuntimeError,
      );
      await expect(strictEngine.render(template)).rejects.toThrow(
        'Switch directive requires a value or variable argument',
      );
    });

    it('should throw error when case has no argument', async () => {
      const template = `
@switch status
  @case
    Test
@end
`.trim();

      await expect(engine.render(template)).rejects.toThrow(APTLSyntaxError);
      await expect(engine.render(template)).rejects.toThrow(
        'Case directive requires a value argument',
      );
    });

    it('should throw error when default has arguments', async () => {
      const template = `
@switch status
  @default "something"
    Test
@end
`.trim();

      await expect(engine.render(template)).rejects.toThrow(APTLSyntaxError);
      await expect(engine.render(template)).rejects.toThrow(
        '@default directive does not accept arguments',
      );
    });
  });

  describe('Integration with other features', () => {
    it('should work with nested switches', async () => {
      const template = `
@switch category
  @case "admin"
    @switch level
      @case 1
        Admin Level 1
      @case 2
        Admin Level 2
      @default
        Admin (unknown level)
    @end
  @default
    Regular User
@end
`.trim();

      const result = await engine.render(template, {
        category: 'admin',
        level: 2,
      });
      expect(result.trim()).toBe('Admin Level 2');
    });

    it('should work inside loops', async () => {
      const template = `
@each item in items
  @switch item.status
    @case "active"
      ✓ @{item.name}
    @case "inactive"
      ✗ @{item.name}
    @default
      ? @{item.name}
  @end
@end
`.trim();

      const result = await engine.render(template, {
        items: [
          { name: 'Item 1', status: 'active' },
          { name: 'Item 2', status: 'inactive' },
          { name: 'Item 3', status: 'pending' },
        ],
      });

      expect(result).toContain('✓ Item 1');
      expect(result).toContain('✗ Item 2');
      expect(result).toContain('? Item 3');
    });
  });
});
