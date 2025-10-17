/**
 * Tests for IncludeDirective
 */

import {
  IncludeDirective,
  parseIncludeArgs,
  normalizeTemplatePath,
} from '@/directives/include-directive';
import { DirectiveContext } from '@/directives/types';
import { DirectiveNode, NodeType } from '@/core/types';
import { TemplateRegistry } from '@/templates/template-registry';
import { Compiler } from '@/core/compiler';
import { Parser } from '@/core/parser';
import { Tokenizer } from '@/core/tokenizer';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { ObjectFileSystem } from '@/filesystem/object-filesystem';
import { APTLEngine } from '@/core/engine';
import { DirectiveRegistry } from '@/directives/directive-registry';

describe('IncludeDirective', () => {
  let directive: IncludeDirective;
  let templateRegistry: TemplateRegistry;
  let compiler: Compiler;
  let fileSystem: ObjectFileSystem;

  beforeEach(() => {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    compiler = new Compiler(tokenizer, parser);

    fileSystem = new ObjectFileSystem({
      'partial.aptl': 'Hello from partial!',
      'with-var.aptl': 'Language: @{language}',
      'nested/component.aptl': 'Component output',
      'tools.aptl': 'Tools: @{tools}',
      'query.aptl': 'Query: @{query}, Options: @{options}',
      'user-info.aptl': 'User: @{userName}, Level: @{userLevel}',
      'multi-var.aptl': 'A=@{a}, B=@{b}, C=@{c}',
    });

    templateRegistry = new TemplateRegistry(compiler, { fileSystem });
    directive = new IncludeDirective(templateRegistry);
  });

  describe('parseIncludeArgs', () => {
    it('should parse simple template path', () => {
      const result = parseIncludeArgs('"template"');
      expect(result).toEqual({
        templatePath: 'template',
        variables: null,
        variableNames: [],
      });
    });

    it('should parse template path without quotes', () => {
      const result = parseIncludeArgs('template');
      expect(result).toEqual({
        templatePath: 'template',
        variables: null,
        variableNames: [],
      });
    });

    it('should parse template path with extension', () => {
      const result = parseIncludeArgs('"template.aptl"');
      expect(result).toEqual({
        templatePath: 'template.aptl',
        variables: null,
        variableNames: [],
      });
    });

    it('should parse nested path', () => {
      const result = parseIncludeArgs('"common/guidelines"');
      expect(result).toEqual({
        templatePath: 'common/guidelines',
        variables: null,
        variableNames: [],
      });
    });

    it('should parse with single variable name', () => {
      const result = parseIncludeArgs('"template" with query');
      expect(result).toEqual({
        templatePath: 'template',
        variables: null,
        variableNames: ['query'],
      });
    });

    it('should parse with object reference', () => {
      const result = parseIncludeArgs(
        '"template" with {language: userLanguage}',
      );
      expect(result).toEqual({
        templatePath: 'template',
        variables: null,
        variableNames: ['{language: userLanguage}'],
      });
    });

    it('should parse with multiple variable names', () => {
      const result = parseIncludeArgs('"template" with query, options');
      expect(result).toEqual({
        templatePath: 'template',
        variables: null,
        variableNames: ['query', 'options'],
      });
    });

    it('should parse with literal key-value pair', () => {
      const result = parseIncludeArgs('"template" with options={}');
      expect(result).toEqual({
        templatePath: 'template',
        variables: { options: '{}' },
        variableNames: [],
      });
    });

    it('should parse with mixed variables and literals', () => {
      const result = parseIncludeArgs('"template" with query, options={}');
      expect(result).toEqual({
        templatePath: 'template',
        variables: { options: '{}' },
        variableNames: ['query'],
      });
    });

    it('should parse with quoted literal value', () => {
      const result = parseIncludeArgs('"template" with lang="en"');
      expect(result).toEqual({
        templatePath: 'template',
        variables: { lang: 'en' },
        variableNames: [],
      });
    });

    it('should throw on empty args', () => {
      expect(() => parseIncludeArgs('')).toThrow(APTLSyntaxError);
      expect(() => parseIncludeArgs('  ')).toThrow(APTLSyntaxError);
    });
  });

  describe('normalizeTemplatePath', () => {
    it('should add .aptl extension if not present', () => {
      expect(normalizeTemplatePath('template')).toBe('template.aptl');
      expect(normalizeTemplatePath('common/guidelines')).toBe(
        'common/guidelines.aptl',
      );
    });

    it('should not add extension if already present', () => {
      expect(normalizeTemplatePath('template.aptl')).toBe('template.aptl');
      expect(normalizeTemplatePath('common/guidelines.aptl')).toBe(
        'common/guidelines.aptl',
      );
    });
  });

  describe('validate', () => {
    it('should throw on missing template path', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'include',
        rawArgs: '',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).toThrow(APTLSyntaxError);
    });

    it('should not throw on valid template path', () => {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'include',
        rawArgs: '"template"',
        children: [],
        line: 1,
        column: 1,
      };

      expect(() => directive.validate(node)).not.toThrow();
    });
  });

  describe('execute', () => {
    function createContext(
      rawArgs: string,
      data: Record<string, any> = {},
    ): DirectiveContext {
      const node: DirectiveNode = {
        type: NodeType.DIRECTIVE,
        name: 'include',
        rawArgs,
        children: [],
        line: 1,
        column: 1,
      };

      return {
        node,
        data,
        helpers: {},
        scope: [data],
        metadata: new Map(),
      };
    }

    it('should throw on missing template', async () => {
      const context = createContext('"nonexistent"');

      expect(() => directive.execute(context)).toThrow(APTLRuntimeError);
      expect(() => directive.execute(context)).toThrow('Template not found');
    });
  });

  describe('integration with engine', () => {
    it('should work in a complete template', async () => {
      // Create new file system with additional files
      const integrationFS = new ObjectFileSystem({
        'header.aptl': 'Welcome, @{userName}!',
        'main.aptl': '@include "header" with userName\n\nYour content here.',
      });

      // Create engine with the file system
      const engine = new APTLEngine('gpt-4', { fileSystem: integrationFS });

      const result = await engine.renderFile('main.aptl', {
        userName: 'Alice',
      });

      console.log(result);

      expect(result).toContain('Welcome, Alice!');
      expect(result).toContain('Your content here.');
    });

    it('should work with multiple includes', async () => {
      // Create new file system with additional files
      const multiFS = new ObjectFileSystem({
        'part1.aptl': 'Part 1: @{a}',
        'part2.aptl': 'Part 2: @{b}',
        'combined.aptl': '@include "part1" with a\n@include "part2" with b',
      });

      // Create engine with the file system
      const engine = new APTLEngine('gpt-4', { fileSystem: multiFS });

      const result = await engine.renderFile('combined.aptl', {
        a: 'Alpha',
        b: 'Beta',
      });

      expect(result).toContain('Part 1: Alpha');
      expect(result).toContain('Part 2: Beta');
    });

    it('should include template without extension', async () => {
      const fs = new ObjectFileSystem({
        'common/guidelines.aptl': 'Follow these guidelines: @{guideline}',
        'main.aptl': '@include "common/guidelines" with guideline',
      });

      const engine = new APTLEngine('gpt-4', { fileSystem: fs });
      const result = await engine.renderFile('main.aptl', {
        guideline: 'Be helpful',
      });

      expect(result).toContain('Follow these guidelines: Be helpful');
    });

    it('should pass variables from parent context', async () => {
      const fs = new ObjectFileSystem({
        'partial.aptl': 'Language: @{language}',
        'main.aptl': '@include "partial"',
      });

      const engine = new APTLEngine('gpt-4', { fileSystem: fs });
      const result = await engine.renderFile('main.aptl', {
        language: 'Python',
      });

      expect(result).toContain('Language: Python');
    });

    it('should handle literal values in with clause', async () => {
      const fs = new ObjectFileSystem({
        'partial.aptl': 'Status: @{status}',
        'main.aptl': '@include "partial" with status="active"',
      });

      const engine = new APTLEngine('gpt-4', { fileSystem: fs });
      const result = await engine.renderFile('main.aptl', {});

      expect(result).toContain('Status: active');
    });

    it('should handle mix of variables and literals', async () => {
      const fs = new ObjectFileSystem({
        'partial.aptl': 'Name: @{name}, Role: @{role}',
        'main.aptl': '@include "partial" with name, role="admin"',
      });

      const engine = new APTLEngine('gpt-4', { fileSystem: fs });
      const result = await engine.renderFile('main.aptl', { name: 'Alice' });

      expect(result).toContain('Name: Alice');
      expect(result).toContain('Role: admin');
    });

    it('should handle nested includes', async () => {
      const fs = new ObjectFileSystem({
        'inner.aptl': 'Inner: @{value}',
        'middle.aptl': 'Middle start\n@include "inner" with value\nMiddle end',
        'outer.aptl': 'Outer start\n@include "middle" with value\nOuter end',
      });

      const engine = new APTLEngine('gpt-4', { fileSystem: fs });
      const result = await engine.renderFile('outer.aptl', { value: 'test' });

      expect(result).toContain('Outer start');
      expect(result).toContain('Middle start');
      expect(result).toContain('Inner: test');
      expect(result).toContain('Middle end');
      expect(result).toContain('Outer end');
    });
  });
});
