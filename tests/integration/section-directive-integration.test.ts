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

@section markdown model="gpt-5.1/md, claude-4/md"
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

  describe('format attribute without model', () => {
    it('should render section with structured format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section test format="structured"
content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('<test>');
      expect(result).toContain('content');
      expect(result).toContain('</test>');
    });

    it('should render nested sections with structured format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section test format="structured"
content

@section nested format="structured"
content2
@end
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('<test>');
      expect(result).toContain('content');
      expect(result).toContain('## Nested');
      expect(result).toContain('content2');
      expect(result).toContain('</test>');
    });

    it('should render section with markdown format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section intro format="markdown"
Introduction text
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('## Intro');
      expect(result).toContain('Introduction text');
    });

    it('should render section with json format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section data format="json"
Some content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('"data"');
      expect(result).toContain('Some content');
    });

    it('should render section with plain format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section test format="plain"
Plain content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Plain content');
      // Plain format should not add extra markup
      expect(result).not.toContain('<test>');
      expect(result).not.toContain('## Test');
    });

    it('should handle format attribute without parentheses', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section test format="structured"
content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('<test>');
      expect(result).toContain('content');
      expect(result).toContain('</test>');
    });

    it('should handle deeply nested sections with structured format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section outer format="structured"
Outer content

@section middle format="structured"
Middle content

@section inner format="structured"
Inner content
@end
@end
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('<outer>');
      expect(result).toContain('Outer content');
      expect(result).toContain('## Middle');
      expect(result).toContain('Middle content');
      expect(result).toContain('### Inner');
      expect(result).toContain('Inner content');
      expect(result).toContain('</outer>');
    });
  });

  it('should handle deeply nested sections with mixed format', async () => {
    const engine = new APTLEngine('gpt-5.1');
    const template = `
@section outer format="structured"
  Outer content

  @section "Middle Content Title" format="markdown"
    Middle content

    @section inner format="structured"
      Inner content
    @end
  @end
@end
            `.trim();

    const result = await engine.render(template);
    expect(result).toContain('<outer>');
    expect(result).toContain('Outer content');
    expect(result).toContain('## Middle Content Title');
    expect(result).toContain('Middle content');
    expect(result).toContain('### Inner');
    expect(result).toContain('Inner content');
    expect(result).toContain('</outer>');
  });

  describe('title attribute', () => {
    it('should render section with custom title in structured format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section first format="structured" title="Example"
content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('<first>');
      expect(result).toContain('# Example');
      expect(result).toContain('content');
      expect(result).toContain('</first>');
    });

    it('should not render heading when title is false', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section outer format="structured"
Outer content

@section middle format="markdown" title=false
Middle content

@section inner format="structured"
Inner content
@end
@end
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('<outer>');
      expect(result).toContain('Outer content');
      expect(result).toContain('Middle content');
      expect(result).not.toContain('## Middle');
      expect(result).toContain('## Inner');
      expect(result).toContain('Inner content');
      expect(result).toContain('</outer>');
    });

    it('should use custom title in markdown format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section intro format="markdown" title="Welcome to APTL"
This is the introduction
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('## Welcome to APTL');
      expect(result).toContain('This is the introduction');
      expect(result).not.toContain('## Intro');
    });

    it('should not increase heading level when title is false', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section outer format="structured"
Outer

@section middle title=false
Middle

@section inner
Inner
@end
@end
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('<outer>');
      expect(result).toContain('Outer');
      expect(result).toContain('Middle');
      expect(result).not.toContain('## Middle');
      // Inner should be ## (level 2) not ### (level 3) because middle has no heading
      expect(result).toContain('## Inner');
      expect(result).not.toContain('### Inner');
      expect(result).toContain('Inner');
      expect(result).toContain('</outer>');
    });

    it('should handle complex nested structure with mixed titles', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section root format="structured" title="Root Section"
Root content

@section child1 title="First Child"
Child 1 content

@section grandchild title=false
Grandchild content
@end
@end

@section child2 title=false
Child 2 content

@section grandchild2 title="Grandchild Two"
Grandchild 2 content
@end
@end
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('<root>');
      expect(result).toContain('# Root Section');
      expect(result).toContain('Root content');
      expect(result).toContain('## First Child');
      expect(result).toContain('Child 1 content');
      expect(result).toContain('Grandchild content');
      expect(result).not.toContain('### Grandchild');
      expect(result).toContain('Child 2 content');
      expect(result).not.toContain('## Child2');
      expect(result).toContain('## Grandchild Two');
      expect(result).toContain('Grandchild 2 content');
      expect(result).toContain('</root>');
    });
  });

  describe('edge cases', () => {
    it('should handle section without parentheses around attributes', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section test model="gpt-5.1"
Content without parentheses
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Content without parentheses');
    });

    it('should render section without format attribute correctly', async () => {
      const engine = new APTLEngine('gpt-5.1');

      // Test complex nested template with sections that don't use format attribute
      // Uses APTL inline syntax with colon `:` for inline @if directives
      const template = `
@section context overridable=true
@if relatedGoalContext
@each ctx in relatedGoalContext
- @{ctx.contextType}/@{ctx.contextKey}: @{ctx.contextValue}@if(ctx.similarity): (relevance: @{ctx.similarity})
@end
@end
@if userRequestContext
@each ctx in userRequestContext
- @{ctx.contextType}/@{ctx.contextKey}: @{ctx.contextValue}@if(ctx.similarity): (relevance: @{ctx.similarity})
@end
@end
@end
            `.trim();

      const data = {
        relatedGoalContext: [
          {
            contextType: 'goal',
            contextKey: 'feature',
            contextValue: 'authentication',
            similarity: 0.95,
          },
          {
            contextType: 'task',
            contextKey: 'implement',
            contextValue: 'login',
            similarity: 0.88,
          },
        ],
        userRequestContext: [
          {
            contextType: 'user',
            contextKey: 'preference',
            contextValue: 'dark-mode',
          },
        ],
      };

      const result = await engine.render(template, data);

      // Should render the content without any formatter markup
      expect(result).toContain(
        '- goal/feature: authentication (relevance: 0.95)',
      );
      expect(result).toContain('- task/implement: login (relevance: 0.88)');
      expect(result).toContain('- user/preference: dark-mode');

      // Should NOT have formatter markup like <context> tags or ## headings
      expect(result).not.toContain('<context>');
      expect(result).not.toContain('## ');
      expect(result).not.toContain('</context>');
    });

    it('should handle section with overridable attribute but no format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section header overridable=true
Default Header Content
@end

@section body
Main content here
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Default Header Content');
      expect(result).toContain('Main content here');

      // Should not have any formatter markup
      expect(result).not.toContain('<header>');
      expect(result).not.toContain('## Header');
    });

    it('should handle section with multiple attributes but no format', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section config overridable=true, model="gpt-5.1"
Configuration content
@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toContain('Configuration content');
      expect(result).not.toContain('<config>');
      expect(result).not.toContain('## Config');
    });

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

    it('should handle empty section with only whitespace', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section empty(model="gpt-5.1")





@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toBe('');
    });

    it('should handle empty section with only whitespace with multiple empty sections', async () => {
      const engine = new APTLEngine('gpt-5.1');
      const template = `
@section empty(model="gpt-5.1")





@end

@section emptyToo(model="gpt-5.1")





@end
            `.trim();

      const result = await engine.render(template);
      expect(result).toBe('');
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

    it('should handle section override with format attribute', async () => {
      const { APTLEngine, ObjectFileSystem } = await import('@/index');

      const fs = new ObjectFileSystem({
        'base.aptl': `
@section identity overridable=true, format="md"
  Identity spec from base
@end
`,
        'child.aptl': `
@extends "base"

@section identity
  Identity spec from child (override)
@end
`,
      });

      const engine = new APTLEngine('gpt-5.1', { fileSystem: fs });

      const result = await engine.renderFile('child.aptl');

      // Should contain the child's content (override), not the base content
      expect(result).toContain('Identity spec from child (override)');
      expect(result).not.toContain('Identity spec from base');

      // Should still be formatted with markdown
      expect(result).toContain('## Identity');
    });
  });
});

describe('line breaks between sections', () => {
  it('should preserve line breaks between consecutive sections with format attribute', async () => {
    const engine = new APTLEngine('gpt-5.1');
    const template = `@section one format="structured"
Content 1
@end

@section two format="structured": Content2



@section three format="structured"
Content 3
@end`;

    const result = await engine.render(template);

    // Each formatted section should be followed by a blank line
    // This ensures proper spacing between consecutive formatted sections
    expect(result).toContain('</one>\n\n<two>');
    expect(result).toContain('</two>\n\n<three>');
  });

  it('should preserve line breaks between mixed sections (formatted and non-formatted)', async () => {
    const engine = new APTLEngine('gpt-5.1');
    const template = `@section capabilities overridable=true
Help merchants succeed
@end

@section approach overridable=true, format="structured"
## Platform Guidance
- Instructions
@end

@section guidelines overridable=true
## Available Analytics
Access to: sales, revenue
@end`;

    const result = await engine.render(template);

    // Check that there's a blank line between capabilities and approach
    expect(result).toContain('Help merchants succeed\n\n<approach>');
    // Check that there's a blank line between approach and guidelines
    expect(result).toContain('</approach>\n\n## Available Analytics');
  });

  it('should handle multiple consecutive formatted sections correctly', async () => {
    const engine = new APTLEngine('gpt-5.1');
    const template = `@section first format="markdown"
First section content
@end

@section second format="json"
Second section content
@end

@section third format="plain"
Third section content
@end`;

    const result = await engine.render(template);
    const lines = result.split('\n');

    // Count empty lines - there should be blank lines between sections
    const emptyLines = lines.filter((line) => line === '').length;
    expect(emptyLines).toBeGreaterThanOrEqual(2); // At least 2 blank lines between 3 sections
  });
});
