/**
 * Integration test for @section directive with model-based conditional rendering
 * Tests the full engine flow with section directives
 */

import { APTLEngine } from '@/core/engine';

describe('Section Directive Integration', () => {
  describe('basic section rendering', () => {
    it('should render simple section without model attribute', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section intro
Welcome to the system
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Welcome to the system');
    });

    it('should render multiple sections', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section intro
Introduction
@end

@section body
Main content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Introduction');
      expect(result).toContain('Main content');
    });
  });

  describe('model-based conditional rendering', () => {
    it('should render section only for matching model', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section intro(model="gpt-5.1")
This is for GPT-5.1
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('This is for GPT-5.1');
    });

    it('should not render section for non-matching model', async () => {
      const engine = new APTLEngine('claude-4');
      const template = `
@section intro(model="gpt-5.1")
This is for GPT-5.1
@end
            `.trim();

      const result = await engine.render(template);
      expect(result.trim()).toBe('');
    });

    it('should render with model-specific format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section data(model="gpt-5.1/structured")
Structured data for GPT
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Structured data for GPT');
    });

    it('should use default format for unmatched model', async () => {
      const engine = new APTLEngine('claude-4');
      const template = `
@section data(model="gpt-5.1/structured, md")
Default markdown format
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Default markdown format');
    });

    it('should not render when no match and no default', async () => {
      const engine = new APTLEngine('claude-4');
      const template = `
@section data(model="gpt-5.1/structured")
This should not render
@end
            `.trim();

      const result = await engine.render(template);
      expect(result.trim()).toBe('');
    });

    it('should handle multiple model configurations', async () => {
      const engine1 = new APTLEngine('gpt-5.1');
      const engine2 = new APTLEngine('claude-4');
      const engine3 = new APTLEngine('llama-3');

      const template = `
@section data(model="gpt-5.1/structured, claude-4/json, md")
Model-specific content
@end
            `.trim();

      const result1 = await engine1.render(template);
      const result2 = await engine2.render(template);
      const result3 = await engine3.render(template);

      // All should render
      expect(result1).toContain('Model-specific content');
      expect(result2).toContain('Model-specific content');
      expect(result3).toContain('Model-specific content');
    });
  });

  describe('combined with variables', () => {
    it('should render section with variables', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section greeting(model="gpt-5.1")
Hello, @{name}!
@end
            `.trim();

      const result = await engine.render(template, { name: 'Alice' });
      expect(result).toContain('Hello, Alice!');
    });

    it('should not render section with variables for non-matching model', async () => {
      const engine = new APTLEngine('claude-4');
      const template = `
@section greeting(model="gpt-5.1")
Hello, @{name}!
@end
            `.trim();

      const result = await engine.render(template, { name: 'Alice' });
      expect(result.trim()).toBe('');
    });
  });

  describe('combined with if directive', () => {
    it('should work with nested if directive', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section content(model="gpt-5.1")
@if isActive
Active user content
@else
Inactive user content
@end
@end
            `.trim();

      const result1 = await engine.render(template, { isActive: true });
      expect(result1).toContain('Active user content');
      expect(result1).not.toContain('Inactive user content');

      const result2 = await engine.render(template, { isActive: false });
      expect(result2).toContain('Inactive user content');
      expect(result2).not.toContain('Active user content');
    });

    it('should not render section with if directive for non-matching model', async () => {
      const engine = new APTLEngine('claude-4');
      const template = `
@section content(model="gpt-5.1")
@if isActive
Active user content
@end
@end
            `.trim();

      const result = await engine.render(template, { isActive: true });
      expect(result.trim()).toBe('');
    });
  });

  describe('combined with each directive', () => {
    it('should work with nested each directive', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section list(model="gpt-5.1")
@each item in items
- @{item}
@end
@end
            `.trim();

      const result = await engine.render(template, {
        items: ['apple', 'banana', 'cherry'],
      });
      expect(result).toContain('- apple');
      expect(result).toContain('- banana');
      expect(result).toContain('- cherry');
    });

    it('should not render section with each directive for non-matching model', async () => {
      const engine = new APTLEngine('claude-4');
      const template = `
@section list(model="gpt-5.1")
@each item in items
- @{item}
@end
@end
            `.trim();

      const result = await engine.render(template, {
        items: ['apple', 'banana'],
      });
      expect(result.trim()).toBe('');
    });
  });

  describe('multiple sections with different models', () => {
    it('should render only matching sections', async () => {
      const template = `
@section gpt_only(model="gpt-5.1")
GPT-5.1 content
@end

@section claude_only(model="claude-4")
Claude-4 content
@end

@section common
Common content
@end
            `.trim();

      const engine1 = new APTLEngine('gpt-5.1');
      const result1 = await engine1.render(template);
      expect(result1).toContain('GPT-5.1 content');
      expect(result1).not.toContain('Claude-4 content');
      expect(result1).toContain('Common content');

      const engine2 = new APTLEngine('claude-4');
      const result2 = await engine2.render(template);
      expect(result2).not.toContain('GPT-5.1 content');
      expect(result2).toContain('Claude-4 content');
      expect(result2).toContain('Common content');
    });

    it('should handle complex model configurations', async () => {
      const template = `
@section structured(model="gpt-5.1/structured, claude-4/json")
Structured data
@end

@section markdown(model="gpt-5.1/md, claude-4/md")
Markdown content
@end

@section default(model="gpt-5.1/text, md")
Default content
@end
            `.trim();

      const engine1 = new APTLEngine('gpt-5.1');
      const result1 = await engine1.render(template);
      expect(result1).toContain('Structured data');
      expect(result1).toContain('Markdown content');
      expect(result1).toContain('Default content');

      const engine2 = new APTLEngine('claude-4');
      const result2 = await engine2.render(template);
      expect(result2).toContain('Structured data');
      expect(result2).toContain('Markdown content');
      // claude-4 matches default section with "md" format (the default fallback)
      expect(result2).toContain('Default content');

      const engine3 = new APTLEngine('llama-3');
      const result3 = await engine3.render(template);
      // llama-3 doesn't match structured or markdown, but has default for the third
      expect(result3).not.toContain('Structured data');
      expect(result3).not.toContain('Markdown content');
      expect(result3).toContain('Default content');
    });
  });

  describe('edge cases', () => {
    it('should handle empty model attribute', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section test(model="")
Content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Content');
    });

    it('should handle section without children', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section empty(model="gpt-5.1")
@end
            `.trim();

      const result = await engine.render(template);
      expect(result.trim()).toBe('');
    });

    it('should handle whitespace in model attribute', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section test(model="  gpt-5.1 / structured  ,  claude-4 / json  ,  md  ")
Content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Content');
    });
  });
});
