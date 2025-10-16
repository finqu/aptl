/**
 * Variable Resolver Integration Tests
 * Tests the variable resolver with realistic APTL template scenarios
 */

import { VariableResolver } from '../../src/data/variable-resolver';

describe('VariableResolver Integration Tests', () => {
  let resolver: VariableResolver;

  beforeEach(() => {
    resolver = new VariableResolver();
  });

  describe('Real-world APTL Template Scenarios', () => {
    it('should handle agent prompt template variables', () => {
      const templateData = {
        agentName: 'Assistant',
        agentRole: 'helpful AI assistant',
        domain: 'software development',
        credentials: [
          'Certified in TypeScript development',
          'Expert in Node.js and React',
          'Experienced with testing frameworks',
        ],
        primaryGoal: 'help users write better code',
        secondaryGoals: [
          'provide clear explanations',
          'suggest best practices',
          'identify potential issues',
        ],
        userLevel: 'intermediate',
        examples: [
          {
            scenario: 'User asks for code review',
            response: "I'll analyze your code for potential improvements...",
            explanation:
              'Provides constructive feedback with specific suggestions',
          },
        ],
        constraints: [
          'Always provide working code examples',
          'Explain the reasoning behind suggestions',
          'Be encouraging and supportive',
        ],
        session: {
          id: 'sess_12345',
          user: 'john_doe',
          history: {
            count: 5,
          },
        },
        environment: 'production',
      };

      // Test basic variables
      expect(resolver.resolve('agentName', templateData)).toBe('Assistant');
      expect(resolver.resolve('agentRole', templateData)).toBe(
        'helpful AI assistant',
      );
      expect(resolver.resolve('domain', templateData)).toBe(
        'software development',
      );

      // Test nested object access
      expect(resolver.resolve('session.id', templateData)).toBe('sess_12345');
      expect(resolver.resolve('session.user', templateData)).toBe('john_doe');
      expect(resolver.resolve('session.history.count', templateData)).toBe(5);

      // Test array access
      expect(resolver.resolve('credentials[0]', templateData)).toBe(
        'Certified in TypeScript development',
      );
      expect(resolver.resolve('secondaryGoals[1]', templateData)).toBe(
        'suggest best practices',
      );
      expect(resolver.resolve('constraints[2]', templateData)).toBe(
        'Be encouraging and supportive',
      );

      // Test nested array object access
      expect(resolver.resolve('examples[0].scenario', templateData)).toBe(
        'User asks for code review',
      );
      expect(resolver.resolve('examples[0].response', templateData)).toBe(
        "I'll analyze your code for potential improvements...",
      );
      expect(resolver.resolve('examples[0].explanation', templateData)).toBe(
        'Provides constructive feedback with specific suggestions',
      );
    });

    it('should handle conditional template variables', () => {
      const conditionalsData = {
        user: {
          isLoggedIn: true,
          profile: {
            name: 'Alice',
            preferences: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        features: {
          advanced: false,
          beta: true,
        },
        system: {
          maintenance: false,
          version: '2.1.0',
        },
      };

      expect(resolver.resolve('user.isLoggedIn', conditionalsData)).toBe(true);
      expect(resolver.resolve('user.profile.name', conditionalsData)).toBe(
        'Alice',
      );
      expect(
        resolver.resolve('user.profile.preferences.theme', conditionalsData),
      ).toBe('dark');
      expect(resolver.resolve('features.advanced', conditionalsData)).toBe(
        false,
      );
      expect(resolver.resolve('features.beta', conditionalsData)).toBe(true);
      expect(resolver.resolve('system.maintenance', conditionalsData)).toBe(
        false,
      );
      expect(resolver.resolve('system.version', conditionalsData)).toBe(
        '2.1.0',
      );
    });

    it('should handle iteration template variables', () => {
      const iterationData = {
        items: [
          { id: 1, name: 'Task 1', priority: 'high', tags: ['urgent', 'bug'] },
          { id: 2, name: 'Task 2', priority: 'medium', tags: ['feature'] },
          {
            id: 3,
            name: 'Task 3',
            priority: 'low',
            tags: ['documentation', 'cleanup'],
          },
        ],
        categories: {
          todo: ['Item A', 'Item B'],
          inProgress: ['Item C'],
          done: ['Item D', 'Item E', 'Item F'],
        },
      };

      // Test array iteration access
      expect(resolver.resolve('items[0].name', iterationData)).toBe('Task 1');
      expect(resolver.resolve('items[1].priority', iterationData)).toBe(
        'medium',
      );
      expect(resolver.resolve('items[2].tags[0]', iterationData)).toBe(
        'documentation',
      );
      expect(resolver.resolve('items[2].tags[1]', iterationData)).toBe(
        'cleanup',
      );

      // Test nested object with arrays
      expect(resolver.resolve('categories.todo[0]', iterationData)).toBe(
        'Item A',
      );
      expect(resolver.resolve('categories.inProgress[0]', iterationData)).toBe(
        'Item C',
      );
      expect(resolver.resolve('categories.done[2]', iterationData)).toBe(
        'Item F',
      );
    });

    it('should extract all variables from a complex template', () => {
      const complexTemplate = `
        @section identity(role="system")
          You are @{agentName}, a @{agentRole} specialized in @{domain}.

          @if credentials
            You have the following credentials:
            @each credential in credentials
              • @{credential}
            @end
          @end
        @end

        @section objective
          Your primary goal is to @{primaryGoal}.

          @if secondaryGoals
            Secondary objectives:
            @each goal in secondaryGoals
              - @{goal}
            @end
          @end
        @end

        @if userLevel == "beginner"
          • Use simple, non-technical language
        @elif userLevel == "intermediate"
          • Balance technical detail with clarity
        @else
          • Use technical terminology appropriately
        @end

        @if session
          • Session ID: @{session.id}
          • User: @{session.user}
          @if session.history
            • Previous interactions: @{session.history.count}
          @end
        @end

        @if environment == "production"
          • **Note:** This is a production environment.
        @end
      `;

      const extractedPaths = resolver.extractPaths(complexTemplate);

      expect(extractedPaths).toEqual([
        'agentName',
        'agentRole',
        'domain',
        'credential',
        'primaryGoal',
        'goal',
        'session.id',
        'session.user',
        'session.history.count',
      ]);
    });

    it('should handle missing values gracefully in template context', () => {
      const incompleteData = {
        agentName: 'Helper',
        user: {
          profile: {
            name: 'Bob',
          },
        },
        items: [{ name: 'First Item' }],
      };

      // Existing values should resolve
      expect(resolver.resolve('agentName', incompleteData)).toBe('Helper');
      expect(resolver.resolve('user.profile.name', incompleteData)).toBe('Bob');
      expect(resolver.resolve('items[0].name', incompleteData)).toBe(
        'First Item',
      );

      // Missing values should return default
      expect(resolver.resolve('agentRole', incompleteData)).toBe('');
      expect(resolver.resolve('user.preferences.theme', incompleteData)).toBe(
        '',
      );
      expect(resolver.resolve('items[1].name', incompleteData)).toBe('');
      expect(resolver.resolve('session.id', incompleteData)).toBe('');
    });

    it('should validate paths used in templates', () => {
      const validPaths = [
        'agentName',
        'user.profile.name',
        'items[0].name',
        'data.0.value',
        'categories.todo[1]',
      ];

      const invalidPaths = [
        '',
        'user..name',
        'items[].name',
        'items[0.name',
        'items0].name',
      ];

      validPaths.forEach((path) => {
        expect(resolver.validatePath(path)).toEqual({ valid: true });
      });

      invalidPaths.forEach((path) => {
        expect(resolver.validatePath(path).valid).toBe(false);
      });
    });

    it('should work with strict mode for template validation', () => {
      const strictResolver = new VariableResolver({ allowUndefined: false });
      const templateData = {
        name: 'Test',
        user: { id: 123 },
      };

      // Valid paths should work
      expect(strictResolver.resolve('name', templateData)).toBe('Test');
      expect(strictResolver.resolve('user.id', templateData)).toBe(123);

      // Invalid paths should throw
      expect(() => strictResolver.resolve('missing', templateData)).toThrow(
        'Undefined variable: missing',
      );
      expect(() =>
        strictResolver.resolve('user.missing', templateData),
      ).toThrow('Undefined variable: user.missing');
    });

    it('should handle custom default values for template rendering', () => {
      const customResolver = new VariableResolver({
        defaultValue: '[MISSING]',
      });
      const templateData = {
        title: 'My Template',
        user: { name: 'Alice' },
      };

      // Existing values
      expect(customResolver.resolve('title', templateData)).toBe('My Template');
      expect(customResolver.resolve('user.name', templateData)).toBe('Alice');

      // Missing values should use custom default
      expect(customResolver.resolve('subtitle', templateData)).toBe(
        '[MISSING]',
      );
      expect(customResolver.resolve('user.email', templateData)).toBe(
        '[MISSING]',
      );
    });
  });
});
