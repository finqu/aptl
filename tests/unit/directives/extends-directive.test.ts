/**
 * Tests for @extends directive
 */

import { APTLEngine } from '@/core/engine';
import { ObjectFileSystem } from '@/filesystem/object-filesystem';

describe('ExtendsDirective', () => {
  let engine: APTLEngine;
  let fileSystem: ObjectFileSystem;

  beforeEach(() => {
    fileSystem = new ObjectFileSystem();
    engine = new APTLEngine('test-model', {
      fileSystem,
      cache: false,
    });
  });

  describe('Basic Inheritance', () => {
    it('should extend a parent template and override sections', async () => {
      // Setup base template
      await fileSystem.writeFile(
        'base.aptl',
        `@section "greeting"(overridable=true)
Hello
@end

@section "content"
Base content
@end`,
      );

      // Setup child template
      const child = `@extends "base.aptl"

@section "greeting"(override=true)
Hi there!
@end`;

      const result = await engine.render(child);

      expect(result).toContain('Hi there!');
      expect(result).toContain('Base content');
      expect(result).not.toContain('Hello');
    });

    it('should preserve parent sections when not overridden', async () => {
      await fileSystem.writeFile(
        'base.aptl',
        `@section "header"
Header
@end

@section "footer"
Footer
@end`,
      );

      const child = `@extends "base.aptl"`;

      const result = await engine.render(child);

      expect(result).toContain('Header');
      expect(result).toContain('Footer');
    });
  });

  describe('Section Modifiers', () => {
    it('should prepend content to parent section', async () => {
      await fileSystem.writeFile(
        'base.aptl',
        `@section "style"(overridable=true)
Write clean code.
@end`,
      );

      const child = `@extends "base.aptl"

@section "style"(prepend=true)
Follow PEP 8 conventions.
@end`;

      const result = await engine.render(child);

      expect(result).toContain('Follow PEP 8 conventions');
      expect(result).toContain('Write clean code');
      // Check order: prepend should come first
      expect(result.indexOf('Follow PEP 8')).toBeLessThan(
        result.indexOf('Write clean code'),
      );
    });

    it('should append content to parent section', async () => {
      await fileSystem.writeFile(
        'base.aptl',
        `@section "rules"(overridable=true)
- Be helpful
@end`,
      );

      const child = `@extends "base.aptl"

@section "rules"(append=true)
- Be accurate
@end`;

      const result = await engine.render(child);

      expect(result).toContain('- Be helpful');
      expect(result).toContain('- Be accurate');
      // Check order: append should come after
      expect(result.indexOf('Be helpful')).toBeLessThan(
        result.indexOf('Be accurate'),
      );
    });

    it('should add new sections not in parent', async () => {
      await fileSystem.writeFile(
        'base.aptl',
        `@section "role"
You are an assistant.
@end`,
      );

      const child = `@extends "base.aptl"

@section "libraries"(new=true)
Preferred libraries: pandas, numpy
@end`;

      const result = await engine.render(child);

      expect(result).toContain('You are an assistant');
      expect(result).toContain('Preferred libraries: pandas, numpy');
    });
  });

  describe('Complex Inheritance Example', () => {
    it('should handle the complex example from the spec', async () => {
      // Base template
      await fileSystem.writeFile(
        'base-coder.aptl',
        `@section "role"(overridable=true)
You are a coding assistant.
@end

@section "languages"
You can help with: @{supportedLanguages}
@end

@section "style"(overridable=true)
Write clean, readable code.
@end

@section "footer"
Always test your code before providing it.
@end`,
      );

      // Child template
      const child = `@extends "base-coder.aptl"

@section "role"(override=true)
You are a Python expert specializing in data science.
@end

@section "style"(prepend=true)
Follow PEP 8 conventions strictly.
@end

@section "libraries"(new=true)
Preferred libraries: pandas, numpy, scikit-learn
@end`;

      const data = {
        supportedLanguages: 'Python, SQL, R',
      };

      const result = await engine.render(child, data);

      // Check role was overridden
      expect(result).toContain(
        'You are a Python expert specializing in data science',
      );
      expect(result).not.toContain('You are a coding assistant');

      // Check languages section remains
      expect(result).toContain('You can help with: Python, SQL, R');

      // Check style was prepended
      expect(result).toContain('Follow PEP 8 conventions strictly');
      expect(result).toContain('Write clean, readable code');
      expect(result.indexOf('Follow PEP 8')).toBeLessThan(
        result.indexOf('Write clean'),
      );

      // Check new libraries section
      expect(result).toContain(
        'Preferred libraries: pandas, numpy, scikit-learn',
      );

      // Check footer remains
      expect(result).toContain('Always test your code before providing it');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when extending non-existent template', async () => {
      const child = `@extends "non-existent.aptl"

@section "test"
Test
@end`;

      await expect(engine.render(child)).rejects.toThrow();
    });

    it('should throw error when overriding non-overridable section', async () => {
      // Create a strict engine for this test to ensure errors are thrown
      const strictEngine = new APTLEngine('test-model', {
        fileSystem,
        cache: false,
        strict: true,
      });

      await fileSystem.writeFile(
        'base.aptl',
        `@section "locked"
Cannot override
@end`,
      );

      const child = `@extends "base.aptl"

@section "locked"(override=true)
Try to override
@end`;

      await expect(strictEngine.render(child)).rejects.toThrow(
        /not marked as overridable/,
      );
    });
  });

  describe('Multiple Levels of Inheritance', () => {
    it('should support multiple levels of template inheritance', async () => {
      // Grandparent
      await fileSystem.writeFile(
        'grandparent.aptl',
        `@section "base"(overridable=true)
Grandparent
@end`,
      );

      // Parent extends grandparent
      await fileSystem.writeFile(
        'parent.aptl',
        `@extends "grandparent.aptl"

@section "base"(override=true)
Parent
@end`,
      );

      // Child extends parent
      const child = `@extends "parent.aptl"

@section "base"(override=true)
Child
@end`;

      const result = await engine.render(child);

      expect(result).toContain('Child');
      expect(result).not.toContain('Parent');
      expect(result).not.toContain('Grandparent');
    });
  });

  describe('Nested Section Override', () => {
    it('should properly override nested sections in parent template', async () => {
      // Parent template with nested sections
      await fileSystem.writeFile(
        'parent.aptl',
        `@section identity overridable=true, format="md", title="Role & Objective"
  You are a general AI assistant.

  @section objective overridable=true, format="md"
    Your goal is to help users achieve their goals.
  @end
@end`,
      );

      // Child template overriding both parent and nested sections
      const child = `@extends "parent.aptl"

@section identity
  You are a specialized AI assistant focused on task orchestration. Your mission is to analyze and decompose complex requests into clear, structured execution plans.
@end

@section objective
  Coordinate complex tasks by:
  - Analyzing user intent and extracting goals
  - Breaking down requests into actionable steps
  - Identifying required context and dependencies
  - Routing steps to appropriate agents
  - Ensuring logical execution order
@end`;

      const result = await engine.render(child);

      // Should contain the child's identity override
      expect(result).toContain(
        'You are a specialized AI assistant focused on task orchestration',
      );

      // Should contain the child's objective override
      expect(result).toContain('Coordinate complex tasks by:');
      expect(result).toContain('- Analyzing user intent and extracting goals');

      // Should NOT contain the parent's nested objective section
      expect(result).not.toContain(
        'Your goal is to help users achieve their goals',
      );

      // Should NOT contain the parent's identity content
      expect(result).not.toContain('You are a general AI assistant');

      // Should have proper markdown formatting for the outer section
      expect(result).toContain('# Role & Objective');

      // The child's objective section should NOT appear as a separate heading
      // since it's overriding the nested section in the parent
      const objectiveHeadings = result.match(/## Objective/g);
      expect(objectiveHeadings).toBeNull(); // Should not have "## Objective" heading
    });

    it('should preserve nested sections when parent nested section is not overridden', async () => {
      // Parent template with nested sections
      await fileSystem.writeFile(
        'parent2.aptl',
        `@section outer overridable=true, format="md"
  Outer content

  @section inner overridable=true, format="md"
    Inner content
  @end
@end`,
      );

      // Child only overrides outer, not inner
      const child = `@extends "parent2.aptl"

@section outer
  New outer content
@end`;

      const result = await engine.render(child);

      // Should contain the child's outer override
      expect(result).toContain('New outer content');

      // Should still contain the parent's inner section
      expect(result).toContain('## Inner');
      expect(result).toContain('Inner content');

      // Should NOT contain the parent's outer content
      expect(result).not.toContain('Outer content');
    });

    it('should maintain correct heading levels when child adds new formatted sections', async () => {
      // Parent template with formatted sections
      await fileSystem.writeFile(
        'parent3.aptl',
        `@section identity overridable=true, format="md", title="Role & Objective"
  You are a general AI assistant.

  @section objective overridable=true, format="md"
    Your goal is to help users achieve their goals.
  @end
@end

@section body overridable=true
  // Placeholder for body content
@end`,
      );

      // Child overrides sections and adds new formatted sections within body
      const child = `@extends "parent3.aptl"

@section identity
  You are a specialized task orchestration assistant.
@end

@section objective
  Coordinate complex tasks by analyzing user intent and breaking down requests.
@end

@section body
  @section instructions format="md"
    - Analyze user requests
    - Break down into steps
    - Route to appropriate handlers
  @end

  @section examples format="md"
    Example workflow processes
  @end
@end`;

      const result = await engine.render(child);

      // Should have correct heading levels
      expect(result).toContain('# Role & Objective');

      // Child's objective should not have a heading (as tested before)
      const objectiveHeadings = result.match(/## Objective/g);
      expect(objectiveHeadings).toBeNull();

      // New sections in body should be top-level headings (# not ##)
      // because body is not formatted, so its children should start at level 1
      expect(result).toContain('# Instructions');
      expect(result).toContain('# Examples');

      // Should NOT have second-level headings for instructions/examples
      expect(result).not.toContain('## Instructions');
      expect(result).not.toContain('## Examples');
    });

    it('should append to parent section with nested sections in correct order', async () => {
      // This tests that when a child uses append=true on a section that contains
      // nested sections with @include directives and conditional content,
      // the appended content appears at the END of the parent section content,
      // not in the middle of it

      const includeTest = `@section included-section format="md", title="Included Section"
This is included content.
@end`;

      await fileSystem.writeFile('include-test.aptl', includeTest);

      const base = `@section context format="md", overridable=true
  @section platform-context format="md", title="Platform Context"
    The merchant uses the Finqu platform.
  @end

  @include "include-test.aptl"

  @section user-context format="md", title="User Context", overridable=true
    User preferences and settings.
  @end

  @if includeOptional
    Optional content here.
  @end
@end`;

      const child = `@extends "base"

@section user-context, prepend=true
  @section bazbar format="md", title="Bazbar"
    Customized user preferences based on recent activity.
  @end
@end

@section context, append=true
  @section additional-context format="md", title="Additional Context"
    @section foobar format="md", title="Foobar"
      This should appear at the END of the context section.
    @end
  @end
@end`;

      const expectedResult = `# Context
## Platform Context
The merchant uses the Finqu platform.

## Included Section
This is included content.

## User Context
### Bazbar
Customized user preferences based on recent activity.

User preferences and settings.

Optional content here.

## Additional Context

### Foobar
This should appear at the END of the context section.
`;

      await fileSystem.writeFile('base.aptl', base);

      const result = await engine.render(child, {
        includeOptional: true,
      });

      expect(result).toBe(expectedResult);
      // Find the positions of each section in the output
      const platformPos = result.indexOf('## Platform Context');
      const userPos = result.indexOf('## User Context');
      const optionalPos = result.indexOf('Optional content here');
      const additionalPos = result.indexOf('## Additional Context');

      // Verify all sections are present
      expect(platformPos).toBeGreaterThan(-1);
      expect(userPos).toBeGreaterThan(-1);
      expect(optionalPos).toBeGreaterThan(-1);
      expect(additionalPos).toBeGreaterThan(-1);

      // Verify the order: Platform -> User -> Optional -> Additional
      // The appended content should come AFTER all parent content
      expect(userPos).toBeGreaterThan(platformPos);
      expect(optionalPos).toBeGreaterThan(userPos);
      expect(additionalPos).toBeGreaterThan(optionalPos);

      // Additional context should be the last section in the context
      const contextSectionEnd = result.length;
      const distanceToEnd = contextSectionEnd - additionalPos;

      // Should be closer to the end than to the platform context
      const distanceToStart = additionalPos - platformPos;
      expect(distanceToEnd).toBeLessThan(distanceToStart);
    });

    it('should handle complex inheritance with conditional content inside appended sections', async () => {
      // Parent template with includes and conditionals
      await fileSystem.writeFile(
        'snippets/general-boundaries.aptl',
        `- Always maintain a professional and helpful tone.
- Respect user privacy and data security.`,
      );

      await fileSystem.writeFile(
        'base-platform.aptl',
        `@section identity overridable=true, format="md", title="Role"
  You are an AI assistant helping merchants on the Finqu commerce platform.
@end

@section capabilities overridable=true, format="md", title="Capabilities"
  // Placeholder for role-specific capabilities
@end

@section instructions overridable=true, format="md", title="Instructions"
  Follow the user's instructions carefully and provide accurate, relevant, and helpful responses.
@end

@section boundaries overridable=true, format="md", title="Boundaries"
  @include "snippets/general-boundaries.aptl"

  @if executionMode
    @if executionMode.isLastStep
      - Do not ask follow-up questions unless absolutely critical information is missing.
    @else
      - Never ask questions or offer options, try to complete the task and pass concrete outputs to the next workflow step.
    @end
  @end
@end`,
      );

      // Child template extending and overriding sections
      const child = `@extends "base-platform.aptl"

@section identity
  You are an assistant working as part of a workflow to help merchants on the Finqu commerce platform. You are an expert content strategist and copywriter for e-commerce. You help merchants create compelling content that drives engagement and conversions.
@end

@section capabilities
  - Write persuasive product descriptions, blog posts, email campaigns, and social media content.
  - Optimize content for SEO to improve search engine rankings and visibility by utilizing the given SEO tools.
  - Optimize store navigation for better user experience and conversions.
  - Maintain brand consistency through intelligent inference from existing content.
@end

@section instructions
  1. Think about the given task so that you fully understand what is being asked.
  2. Analyze merchant brand voice and content style from existing materials.
  3. Use your expertise to determine the best approach to complete the content task.
  4. Utilize available SEO tools to gather necessary information for optimization.
  5. Craft the content that addresses the request in merchant brand context.
  6. Validate your content to ensure it is engaging, SEO-optimized, and aligned with brand voice. Reiterate if necessary.
@end

@section boundaries append=true
  - Do not perform tasks outside of content creation, optimization, and strategy.
  - Never write custom forms or code snippets.
@end`;

      // Test with executionMode.isLastStep = true
      const resultLastStep = await engine.render(child, {
        executionMode: {
          isLastStep: true,
        },
      });

      // Verify identity override
      expect(resultLastStep).toContain(
        'You are an assistant working as part of a workflow',
      );
      expect(resultLastStep).toContain(
        'expert content strategist and copywriter',
      );
      expect(resultLastStep).not.toContain(
        'You are an AI assistant helping merchants on the Finqu',
      );

      // Verify capabilities override
      expect(resultLastStep).toContain(
        '- Write persuasive product descriptions',
      );
      expect(resultLastStep).toContain('- Optimize content for SEO');
      expect(resultLastStep).not.toContain(
        '// Placeholder for role-specific capabilities',
      );

      // Verify instructions override
      expect(resultLastStep).toContain('1. Think about the given task');
      expect(resultLastStep).toContain('2. Analyze merchant brand voice');
      expect(resultLastStep).not.toContain(
        "Follow the user's instructions carefully",
      );

      // Verify boundaries append - should have BOTH parent content (with conditional) AND child content
      expect(resultLastStep).toContain(
        '- Always maintain a professional and helpful tone',
      );
      expect(resultLastStep).toContain(
        '- Respect user privacy and data security',
      );
      expect(resultLastStep).toContain(
        '- Do not ask follow-up questions unless absolutely critical information is missing',
      );
      expect(resultLastStep).toContain(
        '- Do not perform tasks outside of content creation',
      );
      expect(resultLastStep).toContain(
        '- Never write custom forms or code snippets',
      );

      // Should NOT contain the else branch
      expect(resultLastStep).not.toContain(
        '- Never ask questions or offer options',
      );

      // Verify order: parent content should come before appended child content
      const parentBoundaryPos = resultLastStep.indexOf(
        '- Always maintain a professional',
      );
      const conditionalBoundaryPos = resultLastStep.indexOf(
        '- Do not ask follow-up questions',
      );
      const childBoundaryPos = resultLastStep.indexOf(
        '- Do not perform tasks outside',
      );

      expect(conditionalBoundaryPos).toBeGreaterThan(parentBoundaryPos);
      expect(childBoundaryPos).toBeGreaterThan(conditionalBoundaryPos);

      // Test with executionMode.isLastStep = false
      const resultNotLastStep = await engine.render(child, {
        executionMode: {
          isLastStep: false,
        },
      });

      // Should have the else branch instead
      expect(resultNotLastStep).toContain(
        '- Never ask questions or offer options',
      );
      expect(resultNotLastStep).toContain(
        'try to complete the task and pass concrete outputs',
      );
      expect(resultNotLastStep).not.toContain(
        '- Do not ask follow-up questions unless absolutely critical',
      );

      // Test without executionMode (conditional should not render)
      const resultNoMode = await engine.render(child, {});

      // Should still have parent and child boundaries, but NOT the conditional content
      expect(resultNoMode).toContain(
        '- Always maintain a professional and helpful tone',
      );
      expect(resultNoMode).toContain(
        '- Do not perform tasks outside of content creation',
      );
      expect(resultNoMode).not.toContain('- Do not ask follow-up questions');
      expect(resultNoMode).not.toContain(
        '- Never ask questions or offer options',
      );
    });
  });
});
