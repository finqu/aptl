/**
 * Variable Scope in Template Inheritance - Integration Tests
 * Tests that variables are properly passed through template inheritance chains
 * and into included templates.
 */

import { APTLEngine } from '@/core/engine';
import { ObjectFileSystem } from '@/filesystem/object-filesystem';

describe('Variable Scope in Template Inheritance', () => {
  let engine: APTLEngine;
  let fileSystem: ObjectFileSystem;

  beforeEach(() => {
    fileSystem = new ObjectFileSystem();
    engine = new APTLEngine('gpt-4', { fileSystem, cache: false });
  });

  describe('Variables in Parent Template Sections', () => {
    it('should resolve variables in parent sections that are not overridden', async () => {
      // This replicates the issue: agentName is used in parent but child doesn't override that section
      await fileSystem.writeFile(
        'base.aptl',
        `@section "identity"(overridable=true)
You are @{agentName|"an AI assistant"} designed to @{primaryPurpose|"help users"}.
@end

@section "capabilities"(overridable=true)
Default capabilities
@end`,
      );

      const childTemplate = `@extends "base.aptl"

@section "capabilities"(override=true)
Custom capabilities for @{agentName}
@end`;

      const data = {
        agentName: 'CodeAssist Pro',
        primaryPurpose: 'assist developers with coding',
      };

      const result = await engine.render(childTemplate, data);

      // Variables in parent sections should be resolved
      expect(result).toContain('You are CodeAssist Pro');
      expect(result).toContain('designed to assist developers with coding');
      // Variables in child sections should also be resolved
      expect(result).toContain('Custom capabilities for CodeAssist Pro');
    });

    it('should resolve variables in parent sections with defaults when data not provided', async () => {
      await fileSystem.writeFile(
        'base.aptl',
        `@section "header"(overridable=true)
Agent: @{agentName|"Default Agent"}
Purpose: @{purpose|"general assistance"}
@end`,
      );

      const childTemplate = `@extends "base.aptl"

@section "content"(new=true)
Additional content
@end`;

      // No data provided - should use defaults
      const result = await engine.render(childTemplate, {});

      expect(result).toContain('Agent: Default Agent');
      expect(result).toContain('Purpose: general assistance');
    });
  });

  describe('Variables in Included Templates within Child Sections', () => {
    it('should resolve variables in included templates from parent data context', async () => {
      // Snippet that uses a variable
      await fileSystem.writeFile(
        'snippet.aptl',
        `Problem-solving approach for @{agentName|"the assistant"}:
1. Understand the problem
2. Analyze the context`,
      );

      await fileSystem.writeFile(
        'base.aptl',
        `@section "identity"(overridable=true)
I am @{agentName|"an assistant"}
@end`,
      );

      const childTemplate = `@extends "base.aptl"

@section "process"(new=true)
@include "snippet"
@end`;

      const data = {
        agentName: 'CodeHelper',
      };

      const result = await engine.render(childTemplate, data);

      // Variable in included snippet should be resolved
      expect(result).toContain('Problem-solving approach for CodeHelper:');
      // Variable in parent section should also be resolved
      expect(result).toContain('I am CodeHelper');
    });

    it('should resolve variables in deeply nested includes within extended templates', async () => {
      await fileSystem.writeFile(
        'inner-snippet.aptl',
        `Created by @{author|"Unknown"}`,
      );

      await fileSystem.writeFile(
        'outer-snippet.aptl',
        `Document info:
@include "inner-snippet"
Version: @{version|"1.0"}`,
      );

      await fileSystem.writeFile(
        'base.aptl',
        `@section "metadata"(overridable=true)
Title: @{title|"Untitled"}
@end`,
      );

      const childTemplate = `@extends "base.aptl"

@section "details"(new=true)
@include "outer-snippet"
@end`;

      const data = {
        title: 'API Guide',
        author: 'Alice',
        version: '2.0',
      };

      const result = await engine.render(childTemplate, data);

      expect(result).toContain('Title: API Guide');
      expect(result).toContain('Created by Alice');
      expect(result).toContain('Version: 2.0');
    });
  });

  describe('Variables with Multi-Level Inheritance', () => {
    it('should pass variables through multiple inheritance levels', async () => {
      await fileSystem.writeFile(
        'grandparent.aptl',
        `@section "level1"(overridable=true)
Level 1: @{name1|"default1"}
@end`,
      );

      await fileSystem.writeFile(
        'parent.aptl',
        `@extends "grandparent.aptl"

@section "level2"(new=true)
Level 2: @{name2|"default2"}
@end`,
      );

      const childTemplate = `@extends "parent.aptl"

@section "level3"(new=true)
Level 3: @{name3|"default3"}
@end`;

      const data = {
        name1: 'Value1',
        name2: 'Value2',
        name3: 'Value3',
      };

      const result = await engine.render(childTemplate, data);

      expect(result).toContain('Level 1: Value1');
      expect(result).toContain('Level 2: Value2');
      expect(result).toContain('Level 3: Value3');
    });

    it('should pass variables to includes in multi-level inheritance', async () => {
      await fileSystem.writeFile(
        'snippet.aptl',
        `Used by: @{user|"anonymous"}`,
      );

      await fileSystem.writeFile(
        'grandparent.aptl',
        `@section "header"(overridable=true)
App: @{appName|"MyApp"}
@end`,
      );

      await fileSystem.writeFile(
        'parent.aptl',
        `@extends "grandparent.aptl"

@section "metadata"(new=true)
@include "snippet"
@end`,
      );

      const childTemplate = `@extends "parent.aptl"

@section "content"(new=true)
Content for @{user}
@end`;

      const data = {
        appName: 'SuperApp',
        user: 'Bob',
      };

      const result = await engine.render(childTemplate, data);

      expect(result).toContain('App: SuperApp');
      expect(result).toContain('Used by: Bob');
      expect(result).toContain('Content for Bob');
    });
  });

  describe('Real-World Demo Scenario', () => {
    it('should handle the exact pattern from demo: base template with variables used in child includes', async () => {
      // Base template - like agent-base.aptl
      await fileSystem.writeFile(
        'agent-base.aptl',
        `@section "identity"(overridable=true)
You are @{agentName|"an AI assistant"} designed to @{primaryPurpose|"help users accomplish their tasks"}.
@end

@section "capabilities"(overridable=true)
Your core capabilities:
@each capability in capabilities
  • @{capability}
@end
@end`,
      );

      // Snippet that references agentName - like thinking-process.aptl
      await fileSystem.writeFile(
        'thinking-process.aptl',
        `Problem-solving approach for @{agentName|"the AI assistant"}:
1. Understand: Clarify the user's request and context
2. Analyze: Break down the problem into components
3. Execute: Provide the answer or solution`,
      );

      // Child template - like coding-assistant.aptl
      const childTemplate = `@extends "agent-base.aptl"

@section "identity"(override=true)
You are @{agentName|"CodeAssist"}, an expert software development assistant.
@end

@section "interaction"(new=true)
@include "thinking-process.aptl"
@end`;

      const data = {
        agentName: 'CodeAssist Pro',
        primaryPurpose: 'assist developers with coding tasks',
        capabilities: ['Code generation', 'Bug detection', 'Code review'],
      };

      const result = await engine.render(childTemplate, data);

      // Check that agentName is resolved in child's override
      expect(result).toContain('You are CodeAssist Pro, an expert');

      // Check that agentName is resolved in the included snippet
      expect(result).toContain('Problem-solving approach for CodeAssist Pro:');

      // Check that the loop in base template works
      expect(result).toContain('• Code generation');
      expect(result).toContain('• Bug detection');
      expect(result).toContain('• Code review');
    });
  });
});
