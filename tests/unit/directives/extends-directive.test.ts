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
  });
});
