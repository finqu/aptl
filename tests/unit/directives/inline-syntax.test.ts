/**
 * Tests for Inline Directive Syntax
 */

import { APTLEngine } from '@/core/engine';
import { APTLSyntaxError } from '@/utils/errors';

describe('Inline Directive Syntax', () => {
  let engine: APTLEngine;

  beforeEach(() => {
    engine = new APTLEngine('gpt-4');
  });

  describe('Inline Section Directive', () => {
    it('should render inline section with single text content', async () => {
      const template = '@section title: AI Assistant Instructions';
      const result = await engine.render(template);
      expect(result).toContain('AI Assistant Instructions');
    });

    it('should render inline section with variable interpolation', async () => {
      const template = '@section greeting: Hello @{name}!';
      const result = await engine.render(template, { name: 'World' });
      expect(result).toContain('Hello World!');
    });

    it('should render inline section with multiple elements on same line', async () => {
      const template =
        '@section user: Name: @{user.name}, Email: @{user.email}';
      const result = await engine.render(template, {
        user: { name: 'Alice', email: 'alice@example.com' },
      });
      expect(result).toContain('Name: Alice');
      expect(result).toContain('Email: alice@example.com');
    });

    it('should render inline section with format attribute', async () => {
      const template = '@section summary(format="markdown"): Brief description';
      const result = await engine.render(template);
      expect(result).toContain('Brief description');
    });

    it('should support multiple inline sections', async () => {
      const template = `@section title: Main Title
@section subtitle: A subtitle
@section body: Content goes here`;

      const result = await engine.render(template);
      expect(result).toContain('Main Title');
      expect(result).toContain('A subtitle');
      expect(result).toContain('Content goes here');
    });
  });

  describe('Inline If Directive', () => {
    it('should render inline if with true condition', async () => {
      const template = '@if(isAdmin): You have admin privileges';
      const result = await engine.render(template, { isAdmin: true });
      expect(result).toContain('You have admin privileges');
    });

    it('should not render inline if with false condition', async () => {
      const template = '@if(isAdmin): You have admin privileges';
      const result = await engine.render(template, { isAdmin: false });
      expect(result).not.toContain('You have admin privileges');
    });

    it('should render inline if with variable interpolation', async () => {
      const template = '@if(user): Welcome @{user.name}!';
      const result = await engine.render(template, {
        user: { name: 'Alice' },
      });
      expect(result).toContain('Welcome Alice!');
    });

    it('should support inline if with complex condition', async () => {
      const template = '@if(score >= 90): Excellent performance!';
      const result = await engine.render(template, { score: 95 });
      expect(result).toContain('Excellent performance!');
    });
  });

  describe('Inline Each Directive', () => {
    it('should render inline each with simple list', async () => {
      const template = '@each(item in items): - @{item}';
      const result = await engine.render(template, {
        items: ['Apple', 'Banana', 'Cherry'],
      });
      expect(result).toContain('- Apple');
      expect(result).toContain('- Banana');
      expect(result).toContain('- Cherry');
    });

    it('should render inline each with object properties', async () => {
      const template = '@each(user in users): @{user.name} (@{user.role})';
      const result = await engine.render(template, {
        users: [
          { name: 'Alice', role: 'Admin' },
          { name: 'Bob', role: 'User' },
        ],
      });
      expect(result).toContain('Alice (Admin)');
      expect(result).toContain('Bob (User)');
    });
  });

  describe('Mixed Inline and Block Syntax', () => {
    it('should support mixing inline and block directives', async () => {
      const template = `@section title: Quick Start

@section content
This is a longer section
with multiple lines
@end

@section footer: Copyright 2024`;

      const result = await engine.render(template);
      expect(result).toContain('Quick Start');
      expect(result).toContain('This is a longer section');
      expect(result).toContain('Copyright 2024');
    });

    it('should support nested inline directives', async () => {
      const template = '@if(show): @section message: @{text}';
      const result = await engine.render(template, {
        show: true,
        text: 'Hello!',
      });
      expect(result).toContain('Hello!');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for inline syntax on directives without body', async () => {
      const template = '@extends "base.aptl": invalid content';
      await expect(engine.render(template)).rejects.toThrow(APTLSyntaxError);
    });

    it('should handle empty inline body gracefully', async () => {
      const template = '@section empty:';
      const result = await engine.render(template);
      // Should not throw, may render empty section
      expect(result).toBeDefined();
    });
  });

  describe('Whitespace Handling', () => {
    it('should handle inline content with whitespace', async () => {
      const template = '@section code: function test() { return 42; }';
      const result = await engine.render(template);
      expect(result).toContain('function test()');
    });

    it('should handle inline content with trailing spaces', async () => {
      const template = '@section text: content with spaces  ';
      const result = await engine.render(template);
      expect(result).toContain('content with spaces');
    });
  });
});
