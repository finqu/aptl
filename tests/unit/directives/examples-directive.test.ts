/**
 * Tests for ExamplesDirective
 */

import { ExamplesDirective } from '@/directives/examples-directive';
import { DirectiveContext } from '@/directives/types';
import { NodeType, DirectiveNode } from '@/core/types';
import { APTLEngine } from '@/core/engine';

describe('ExamplesDirective', () => {
  let directive: ExamplesDirective;

  beforeEach(() => {
    directive = new ExamplesDirective();
  });

  describe('basic functionality', () => {
    it('should have the correct name and configuration', () => {
      expect(directive.name).toBe('examples');
      expect(directive.hasBody).toBe(true);
    });

    it('should handle case as a conditional keyword', () => {
      const keywords = directive.getConditionalKeywords();
      expect(keywords).toContain('case');
    });
  });

  describe('validation', () => {
    it('should not throw for examples without arguments', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'examples',
        rawArgs: '',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).not.toThrow();
    });
  });

  describe('execution with literal values', () => {
    it('should render simple examples with literal input/output', async () => {
      const template = `
Learn from these examples:

@examples
  @case input="What is 5+3?" output="5 + 3 = 8"
  @case input="Calculate 10% of 50" output="10% of 50 = 5"
@end

Now solve: @{problem}
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, { problem: 'What is 2+2?' });

      expect(result).toContain('Input: What is 5+3?');
      expect(result).toContain('Output: 5 + 3 = 8');
      expect(result).toContain('Input: Calculate 10% of 50');
      expect(result).toContain('Output: 10% of 50 = 5');
      expect(result).toContain('Now solve: What is 2+2?');
    });

    it('should handle multiline output with escape sequences', async () => {
      const template = `
@examples
  @case input="Solve x: 2x + 4 = 10" output="2x + 4 = 10\\n2x = 6\\nx = 3"
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {});

      expect(result).toContain('Input: Solve x: 2x + 4 = 10');
      expect(result).toContain('Output: 2x + 4 = 10\n2x = 6\nx = 3');
    });

    it('should separate multiple cases with blank lines', async () => {
      const template = `
@examples
  @case input="First" output="Result 1"
  @case input="Second" output="Result 2"
  @case input="Third" output="Result 3"
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {});

      // Should have two blank lines between cases
      const cases = result.split('\n\n');
      expect(cases.length).toBe(3);
      expect(cases[0]).toContain('First');
      expect(cases[1]).toContain('Second');
      expect(cases[2]).toContain('Third');
    });
  });

  describe('execution with variables', () => {
    it('should resolve variable references in input', async () => {
      const template = `
@examples
  @case input="{userQuery}" output="Sample answer"
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {
        userQuery: 'What is AI?',
      });

      expect(result).toContain('Input: What is AI?');
      expect(result).toContain('Output: Sample answer');
    });

    it('should resolve variable references in output', async () => {
      const template = `
@examples
  @case input="Question" output="{expectedAnswer}"
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {
        expectedAnswer: 'The answer is 42',
      });

      expect(result).toContain('Input: Question');
      expect(result).toContain('Output: The answer is 42');
    });

    it('should resolve variables in both input and output', async () => {
      const template = `
@examples
  @case input="{question}" output="{answer}"
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {
        question: 'What is the capital of France?',
        answer: 'Paris',
      });

      expect(result).toContain('Input: What is the capital of France?');
      expect(result).toContain('Output: Paris');
    });

    it('should render objects as JSON', async () => {
      const template = `
@examples
  @case input="{query}" output="{response}"
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {
        query: 'Get user data',
        response: {
          name: 'John',
          age: 30,
          roles: ['admin', 'user'],
        },
      });

      expect(result).toContain('Input: Get user data');
      expect(result).toContain('Output:');
      expect(result).toContain('"name": "John"');
      expect(result).toContain('"age": 30');
      expect(result).toContain('"roles"');
    });
  });

  describe('mixed literal and variable values', () => {
    it('should handle mix of literals and variables', async () => {
      const template = `
@examples
  @case input="Static question" output="{dynamicAnswer}"
  @case input="{dynamicQuestion}" output="Static answer"
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {
        dynamicAnswer: 'Dynamic result',
        dynamicQuestion: 'Dynamic question text',
      });

      expect(result).toContain('Input: Static question');
      expect(result).toContain('Output: Dynamic result');
      expect(result).toContain('Input: Dynamic question text');
      expect(result).toContain('Output: Static answer');
    });
  });

  describe('empty examples', () => {
    it('should return empty string when no cases are provided', async () => {
      const template = `
@examples
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {});

      expect(result).toBe('');
    });
  });

  describe('integration with full template', () => {
    it('should work in a complete prompt template', async () => {
      const template = `
Learn from these examples:

@examples
  @case input="What is 5+3?" output="5 + 3 = 8"
  @case input="Calculate 10% of 50" output="10% of 50 = 5"
  @case input="Solve x: 2x + 4 = 10" output="2x + 4 = 10\\n2x = 6\\nx = 3"
@end

Now solve: @{problem}
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, { problem: 'What is 7*8?' });

      expect(result).toContain('Learn from these examples:');
      expect(result).toContain('Input: What is 5+3?');
      expect(result).toContain('Output: 5 + 3 = 8');
      expect(result).toContain('Input: Calculate 10% of 50');
      expect(result).toContain('Output: 10% of 50 = 5');
      expect(result).toContain('Input: Solve x: 2x + 4 = 10');
      expect(result).toContain('Output: 2x + 4 = 10\n2x = 6\nx = 3');
      expect(result).toContain('Now solve: What is 7*8?');
    });
  });

  describe('variable resolution edge cases', () => {
    it('should return empty string for undefined variables', async () => {
      const template = `
@examples
  @case input="{undefinedVar}" output="test"
@end
`.trim();

      const engine = new APTLEngine('gpt-4', { preserveWhitespace: true });
      const result = await engine.render(template, {});

      expect(result).toContain('Input: ');
      expect(result).toContain('Output: test');
    });

    it('should handle nested object properties', async () => {
      const template = `
@examples
  @case input="{user.name}" output="{user.response}"
@end
`.trim();

      const engine = new APTLEngine('gpt-4');
      const result = await engine.render(template, {
        user: {
          name: 'Alice',
          response: 'Hello World',
        },
      });

      expect(result).toContain('Input: Alice');
      expect(result).toContain('Output: Hello World');
    });
  });
});
