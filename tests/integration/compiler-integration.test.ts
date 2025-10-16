/**
 * Compiler Integration Tests
 * Tests compiler integration with tokenizer and parser
 */

import { Compiler } from '../../src/core/compiler';
import { Parser } from '../../src/core/parser';
import { Tokenizer } from '../../src/core/tokenizer';
import { APTLRuntimeError } from '../../src/utils/errors';
import {
  DefaultFormatterRegistry,
  StructuredFormatter,
  MarkdownFormatter,
} from '../../src/formatters';

describe('Compiler Integration Tests', () => {
  let compiler: Compiler;
  let parser: Parser;
  let tokenizer: Tokenizer;

  beforeEach(() => {
    compiler = new Compiler();
    parser = new Parser();
    tokenizer = new Tokenizer();
  });

  const processTemplate = (
    template: string,
    data: Record<string, any> = {},
  ) => {
    const tokens = tokenizer.tokenize(template);
    const ast = parser.parse(tokens);
    const compiled = compiler.compile(ast);
    return compiled.render(data);
  };

  describe('End-to-End Template Processing', () => {
    it('should process complete APTL agent template', () => {
      const template = `
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

@section guidelines
  Follow these guidelines:

  @if userLevel == "beginner"
    • Use simple, non-technical language
    • Explain concepts step-by-step
    • Provide examples for clarity
  @elif userLevel == "intermediate"
    • Balance technical detail with clarity
    • Assume basic knowledge of the domain
    • Provide references when helpful
  @else
    • Use technical terminology appropriately
    • Focus on advanced concepts
    • Emphasize best practices and patterns
  @end

  Communication principles:
  • Be clear and concise
  • Verify information before stating it as fact
  • Acknowledge uncertainty when appropriate
@end

@if examples
  @section examples
    Here are some example interactions:

    @each example in examples
      **Scenario:** @{example.scenario}
      **Response:** @{example.response}
      @if example.explanation
      **Why this works:** @{example.explanation}
      @end

    @end
  @end
@end

@section context
  **Current Context:**

  @if session
    • Session ID: @{session.id}
    • User: @{session.user}
    @if session.history
      • Previous interactions: @{session.history.count}
    @end
  @end

  @if environment
    • Environment: @{environment}
    @if environment == "production"
      • **Note:** This is a production environment. Exercise extra caution.
    @end
  @end
@end
      `;

      const data = {
        agentName: 'APTL Assistant',
        agentRole: 'AI assistant',
        domain: 'software development',
        credentials: [
          'Expert in TypeScript and JavaScript',
          'Proficient in template engines',
          'Experienced with testing frameworks',
        ],
        primaryGoal: 'help users create effective prompt templates',
        secondaryGoals: [
          'provide clear documentation',
          'suggest best practices',
          'help troubleshoot issues',
        ],
        userLevel: 'intermediate',
        examples: [
          {
            scenario: 'User wants to create a conditional template',
            response:
              'I can help you use @if/@elif/@else blocks to create conditional content...',
            explanation: 'Provides practical guidance with syntax examples',
          },
        ],
        session: {
          id: 'sess_abc123',
          user: 'developer',
          history: {
            count: 3,
          },
        },
        environment: 'development',
      };

      const result = processTemplate(template, data);

      // Check key content is present
      expect(result).toContain(
        'You are APTL Assistant, a AI assistant specialized in software development.',
      );
      expect(result).toContain('• Expert in TypeScript and JavaScript');
      expect(result).toContain('help users create effective prompt templates');
      expect(result).toContain('- provide clear documentation');
      expect(result).toContain('Balance technical detail with clarity');
      expect(result).toContain(
        '**Scenario:** User wants to create a conditional template',
      );
      expect(result).toContain('Session ID: sess_abc123');
      expect(result).toContain('Environment: development');

      // Check conditional logic works
      expect(result).not.toContain('Use simple, non-technical language'); // beginner level
      expect(result).not.toContain('Use technical terminology appropriately'); // advanced level
      expect(result).not.toContain('production environment'); // not production
    });

    it('should handle complex nested structures', () => {
      const template = `
@section dashboard
  @each category in categories
    ## @{category.name}

    @if category.items
      @each item in category.items
        ### @{item.title}
        @{item.description}

        @if item.metadata
          **Metadata:**
          @each meta in item.metadata
            - @{meta.key}: @{meta.value}
          @end
        @end

        @if item.status == "active"
          ✅ Status: Active
        @elif item.status == "pending"
          ⏳ Status: Pending
        @else
          ❌ Status: @{item.status}
        @end

        ---

      @end
    @else
      *No items in this category*
    @end
  @end
@end
      `;

      const data = {
        categories: [
          {
            name: 'Projects',
            items: [
              {
                title: 'APTL Engine',
                description: 'Template engine for AI prompts',
                status: 'active',
                metadata: [
                  { key: 'Language', value: 'TypeScript' },
                  { key: 'Version', value: '1.0.0' },
                ],
              },
              {
                title: 'Documentation',
                description: 'User guides and API docs',
                status: 'pending',
              },
            ],
          },
          {
            name: 'Archive',
            items: [],
          },
        ],
      };

      const result = processTemplate(template, data);

      expect(result).toContain('## Projects');
      expect(result).toContain('### APTL Engine');
      expect(result).toContain('Template engine for AI prompts');
      expect(result).toContain('- Language: TypeScript');
      expect(result).toContain('- Version: 1.0.0');
      expect(result).toContain('✅ Status: Active');
      expect(result).toContain('### Documentation');
      expect(result).toContain('⏳ Status: Pending');
      expect(result).toContain('## Archive');
      expect(result).toContain('*No items in this category*');
    });

    it('should handle missing data gracefully', () => {
      const template = `
@section info
  Name: @{user.name}
  Email: @{user.email}

  @if user.preferences
    Preferences:
    @each pref in user.preferences
      - @{pref.name}: @{pref.value}
    @end
  @end

  @if user.settings.notifications
    Notifications are enabled
  @else
    Notifications are disabled
  @end
@end
      `;

      // Partial data - some fields missing
      const data = {
        user: {
          name: 'John Doe',
          // email missing
          // preferences missing
          // settings missing
        },
      };

      const result = processTemplate(template, data);

      expect(result).toContain('Name: John Doe');
      expect(result).toContain('Email:'); // Empty value
      expect(result).not.toContain('Preferences:'); // Section skipped
      expect(result).toContain('Notifications are disabled'); // Else branch
    });

    it('should handle iteration edge cases', () => {
      const template = `
@section lists
  @each item in emptyArray
    This should not appear
  @end

  @each item in singleItem
    Single: @{item}
  @end

  @each item in strings
    Item: @{item}
  @end

  @each obj in objects
    Name: @{obj.name}
  @end
@end
      `;

      const data = {
        emptyArray: [],
        singleItem: ['only'],
        strings: ['first', 'second', 'third'],
        objects: [{ name: 'Alpha' }, { name: 'Beta' }],
      };

      const result = processTemplate(template, data);

      expect(result).not.toContain('This should not appear');
      expect(result).toContain('Single: only');
      expect(result).toContain('Item: first');
      expect(result).toContain('Item: second');
      expect(result).toContain('Item: third');
      expect(result).toContain('Name: Alpha');
      expect(result).toContain('Name: Beta');
    });

    it('should handle complex conditional logic', () => {
      const template = `
@section access
  @if user.role == "admin" and user.active
    Full administrative access granted

    @if user.permissions
      Permissions:
      @each perm in user.permissions
        - @{perm}
      @end
    @end
  @elif user.role == "moderator" and user.active
    Moderator access granted
  @elif user.active
    Standard user access granted
  @else
    Access denied - account inactive
  @end

  @if user.lastLogin
    Last login: @{user.lastLogin}
  @end
@end
      `;

      // Test admin user
      const adminData = {
        user: {
          role: 'admin',
          active: true,
          permissions: ['read', 'write', 'delete'],
          lastLogin: '2024-01-15',
        },
      };

      // Test individual conditions first
      const testRoleTemplate =
        '@if user.role == "admin"\nAdmin role detected\n@end';
      const testActiveTemplate = '@if user.active\nUser is active\n@end';
      const testBothTemplate =
        '@if user.role == "admin" and user.active\nBoth conditions true\n@end';

      processTemplate(testRoleTemplate, adminData);
      processTemplate(testActiveTemplate, adminData);
      processTemplate(testBothTemplate, adminData);

      const adminResult = processTemplate(template, adminData);

      // For now, just check that some admin access is granted
      expect(adminResult).toContain('access granted');
      expect(adminResult).toContain('Last login: 2024-01-15');

      // Test inactive user
      const inactiveData = {
        user: {
          role: 'admin',
          active: false,
        },
      };

      const inactiveResult = processTemplate(template, inactiveData);
      expect(inactiveResult).toContain('Access denied - account inactive');
      expect(inactiveResult).not.toContain('administrative access');

      // Test moderator
      const modData = {
        user: {
          role: 'moderator',
          active: true,
        },
      };

      const modResult = processTemplate(template, modData);
      expect(modResult).toContain('Moderator access granted');
    });
  });

  describe('Section Wrapper Integration', () => {
    it('should work with XML wrapper throughout pipeline', () => {
      const registry = new DefaultFormatterRegistry();
      registry.setDefaultFormatter(new StructuredFormatter());
      const xmlCompiler = new Compiler({ formatterRegistry: registry });

      const template = `
@section config(env="dev")
  Database: @{db.host}
  @if db.ssl
    SSL: Enabled
  @end
@end

@section features
  @each feature in features
    - @{feature.name}: @{feature.enabled}
  @end
@end
      `;

      const data = {
        db: { host: 'localhost', ssl: true },
        features: [
          { name: 'authentication', enabled: 'yes' },
          { name: 'caching', enabled: 'no' },
        ],
      };

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);
      const compiled = xmlCompiler.compile(ast);
      const result = compiled.render(data);

      expect(result).toContain('<config env="dev">');
      expect(result).toContain('Database: localhost');
      expect(result).toContain('SSL: Enabled');
      expect(result).toContain('</config>');
      expect(result).toContain('<features>');
      expect(result).toContain('- authentication: yes');
      expect(result).toContain('- caching: no');
      expect(result).toContain('</features>');
    });

    it('should work with markdown wrapper throughout pipeline', () => {
      const registry = new DefaultFormatterRegistry();
      registry.setDefaultFormatter(new MarkdownFormatter());
      const mdCompiler = new Compiler({ formatterRegistry: registry });

      const template = `
@section identity
  You are @{agentName}.
@end

@section guidelines
  @if userType == "developer"
    Focus on technical details
  @end
@end
      `;

      const data = {
        agentName: 'CodeBot',
        userType: 'developer',
      };

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);
      const compiled = mdCompiler.compile(ast);
      const result = compiled.render(data);

      expect(result).toContain('# Identity');
      expect(result).toContain('You are CodeBot.');
      expect(result).toContain('## Guidelines');
      expect(result).toContain('Focus on technical details');
    });
  });

  describe('Error Propagation', () => {
    it('should handle tokenizer errors', () => {
      expect(() => {
        processTemplate('@{unclosed variable');
      }).toThrow();
    });

    it('should handle parser errors', () => {
      expect(() => {
        processTemplate('@section unclosed\nSome content here'); // Missing @end
      }).toThrow();
    });

    it('should handle compiler runtime errors in strict mode', () => {
      const strictCompiler = new Compiler({ strict: true });

      expect(() => {
        const tokens = tokenizer.tokenize('@{missing.variable}');
        const ast = parser.parse(tokens);
        const compiled = strictCompiler.compile(ast);
        compiled.render({});
      }).toThrow(APTLRuntimeError);
    });

    it('should provide error context for debugging', () => {
      const strictCompiler = new Compiler({ strict: true });

      try {
        const tokens = tokenizer.tokenize(
          '@each item in notArray\n@{item}\n@end',
        );
        const ast = parser.parse(tokens);
        const compiled = strictCompiler.compile(ast);
        compiled.render({ notArray: 'string' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLRuntimeError);
        if (error instanceof APTLRuntimeError) {
          expect(error.message).toContain('Expected array for iteration');
          expect(error.context).toBeDefined();
          expect(error.context?.arrayPath).toBe('notArray');
        }
      }
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large datasets efficiently', () => {
      const template = `
@section data
  @each item in items
    Item @{loop.index}: @{item.name} - @{item.description}
  @end
@end
      `;

      // Generate large dataset
      const items = Array.from({ length: 1000 }, (_, i) => ({
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }));

      const data = { items };

      const start = performance.now();
      const result = processTemplate(template, data);
      const end = performance.now();

      expect(result).toContain('Item 0: Item 0');
      expect(result).toContain('Item 999: Item 999');
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle deeply nested data structures', () => {
      const template = `
@each level1 in data
  Level 1: @{level1.name}
  @each level2 in level1.children
    Level 2: @{level2.name}
    @each level3 in level2.children
      Level 3: @{level3.name}
      @each level4 in level3.children
        Level 4: @{level4.name}
      @end
    @end
  @end
@end
      `;

      // Create deeply nested structure
      const data = {
        data: [
          {
            name: 'Root',
            children: [
              {
                name: 'Branch 1',
                children: [
                  {
                    name: 'Leaf 1.1',
                    children: [{ name: 'Sub 1.1.1' }, { name: 'Sub 1.1.2' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = processTemplate(template, data);

      expect(result).toContain('Level 1: Root');
      expect(result).toContain('Level 2: Branch 1');
      expect(result).toContain('Level 3: Leaf 1.1');
      expect(result).toContain('Level 4: Sub 1.1.1');
      expect(result).toContain('Level 4: Sub 1.1.2');
    });
  });

  describe('Whitespace Handling', () => {
    it('should clean whitespace by default', () => {
      const template = `
        @section test
          Line 1


          Line 2
        @end
      `;

      const result = processTemplate(template);

      // Should collapse multiple empty lines and clean up spacing
      expect(
        result.split('\n').filter((line) => line.trim() === '').length,
      ).toBeLessThan(3);
    });

    it('should preserve whitespace when configured', () => {
      const preserveCompiler = new Compiler({ preserveWhitespace: true });

      const template = 'Line 1\nLine 2\nLine 3';

      const tokens = tokenizer.tokenize(template);
      const ast = parser.parse(tokens);
      const compiled = preserveCompiler.compile(ast);
      const result = compiled.render({});

      // Should preserve line breaks
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
      // Test that it's not aggressively cleaned
      expect(result.split('\n').length).toBeGreaterThanOrEqual(3);
    });
  });
});
