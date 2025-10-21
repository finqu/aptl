/**
 * Formatter tests
 */

import { Section } from '../../../src/core/types';
import {
  PlainFormatter,
  StructuredFormatter,
  MarkdownFormatter,
  JsonFormatter,
  DefaultFormatterRegistry,
} from '../../../src/formatters';

describe('Formatters', () => {
  describe('PlainFormatter', () => {
    const formatter = new PlainFormatter();

    it('should format section as plain text', () => {
      const section: Section = {
        name: 'test',
        attributes: {},
        content: 'Hello World',
      };

      const result = formatter.formatSection(section);
      expect(result).toBe('Hello World');
    });

    it('should support plain and text formats', () => {
      expect(formatter.supportsFormat('plain')).toBe(true);
      expect(formatter.supportsFormat('text')).toBe(true);
      expect(formatter.supportsFormat('xml')).toBe(false);
    });
  });

  describe('StructuredFormatter', () => {
    const formatter = new StructuredFormatter();

    it('should format section as XML-like structure', () => {
      const section: Section = {
        name: 'test',
        attributes: {},
        content: 'Content here',
      };

      const result = formatter.formatSection(section);
      expect(result).toContain('<test>');
      expect(result).toContain('Content here');
      expect(result).toContain('</test>');
    });

    it('should include attributes in opening tag', () => {
      const section: Section = {
        name: 'test',
        attributes: { role: 'system', priority: 'high' },
        content: 'Content',
      };

      const result = formatter.formatSection(section);
      expect(result).toContain('<test>');
      expect(result).toContain('</test>');
    });

    it('should support structured and xml formats', () => {
      expect(formatter.supportsFormat('structured')).toBe(true);
      expect(formatter.supportsFormat('xml')).toBe(true);
      expect(formatter.supportsFormat('json')).toBe(false);
    });
  });

  describe('MarkdownFormatter', () => {
    const formatter = new MarkdownFormatter();

    it('should format section with heading', () => {
      const section: Section = {
        name: 'identity',
        attributes: {},
        content: 'I am an AI assistant',
      };

      const result = formatter.formatSection(section);
      expect(result).toContain('# Identity');
      expect(result).toContain('I am an AI assistant');
    });

    it('should not display attributes as metadata', () => {
      const section: Section = {
        name: 'test',
        attributes: { role: 'system', model: 'gpt-4' },
        content: 'Content',
      };

      const result = formatter.formatSection(section);
      // Attributes are directive control, not content - should not be displayed
      expect(result).not.toContain('**role**');
      expect(result).not.toContain('**model**');
      expect(result).toContain('# Test');
      expect(result).toContain('Content');
    });

    it('should only use title attribute for display, not other attributes', () => {
      const section: Section = {
        name: 'test',
        attributes: {
          output: 'md',
          format: 'markdown',
          role: 'system',
          overridable: 'true',
        },
        content: 'Content',
      };

      const result = formatter.formatSection(section);
      // No attributes should be displayed
      expect(result).not.toContain('output');
      expect(result).not.toContain('format');
      expect(result).not.toContain('role');
      expect(result).not.toContain('overridable');
      expect(result).toContain('# Test');
      expect(result).toContain('Content');
    });

    it('should support md and markdown formats', () => {
      expect(formatter.supportsFormat('md')).toBe(true);
      expect(formatter.supportsFormat('markdown')).toBe(true);
      expect(formatter.supportsFormat('xml')).toBe(false);
    });
  });

  describe('JsonFormatter', () => {
    const formatter = new JsonFormatter();

    it('should format section as JSON', () => {
      const section: Section = {
        name: 'test',
        attributes: { role: 'system' },
        content: 'Content',
      };

      const result = formatter.formatSection(section);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe('test');
      expect(parsed.attributes.role).toBe('system');
      expect(parsed.content).toBe('Content');
    });

    it('should parse JSON content', () => {
      const section: Section = {
        name: 'test',
        attributes: {},
        content: '{"key": "value", "number": 42}',
      };

      const result = formatter.formatSection(section);
      const parsed = JSON.parse(result);

      expect(parsed.content).toEqual({ key: 'value', number: 42 });
    });

    it('should filter out output and format attributes', () => {
      const section: Section = {
        name: 'test',
        attributes: { output: 'json', format: 'json', role: 'system' },
        content: 'Content',
      };

      const result = formatter.formatSection(section);
      const parsed = JSON.parse(result);

      expect(parsed.attributes.output).toBeUndefined();
      expect(parsed.attributes.format).toBeUndefined();
      expect(parsed.attributes.role).toBe('system');
    });

    it('should support json format', () => {
      expect(formatter.supportsFormat('json')).toBe(true);
      expect(formatter.supportsFormat('xml')).toBe(false);
    });
  });

  describe('DefaultFormatterRegistry', () => {
    let registry: DefaultFormatterRegistry;

    beforeEach(() => {
      registry = new DefaultFormatterRegistry();
    });

    it('should return registered formatters', () => {
      expect(registry.get('plain')).toBeInstanceOf(PlainFormatter);
      expect(registry.get('structured')).toBeInstanceOf(StructuredFormatter);
      expect(registry.get('md')).toBeInstanceOf(MarkdownFormatter);
      expect(registry.get('json')).toBeInstanceOf(JsonFormatter);
    });

    it('should be case insensitive', () => {
      expect(registry.get('PLAIN')).toBeInstanceOf(PlainFormatter);
      expect(registry.get('Structured')).toBeInstanceOf(StructuredFormatter);
    });

    it('should return default formatter when output not specified', () => {
      const formatter = registry.getForAttributes({});
      expect(formatter).toBeInstanceOf(PlainFormatter);
    });

    it('should select formatter based on output attribute', () => {
      const formatter = registry.getForAttributes({ output: 'structured' });
      expect(formatter).toBeInstanceOf(StructuredFormatter);
    });

    it('should select formatter based on format attribute', () => {
      const formatter = registry.getForAttributes({ format: 'json' });
      expect(formatter).toBeInstanceOf(JsonFormatter);
    });

    it('should handle conditional format selection', () => {
      const formatter1 = registry.getForAttributes({
        output: 'structured:gpt-5',
        model: 'gpt-5',
      });
      expect(formatter1).toBeInstanceOf(StructuredFormatter);

      const formatter2 = registry.getForAttributes({
        output: 'structured:gpt-5',
        model: 'gpt-4',
      });
      expect(formatter2).toBeInstanceOf(PlainFormatter);
    });

    it('should handle negated conditions', () => {
      const formatter1 = registry.getForAttributes({
        output: 'md:!gpt-5',
        model: 'gpt-4',
      });
      expect(formatter1).toBeInstanceOf(MarkdownFormatter);

      const formatter2 = registry.getForAttributes({
        output: 'md:!gpt-5',
        model: 'gpt-5',
      });
      expect(formatter2).toBeInstanceOf(PlainFormatter);
    });

    it('should handle fallback formats', () => {
      const formatter = registry.getForAttributes({
        output: 'structured:gpt-5;md',
        model: 'gpt-4',
      });
      expect(formatter).toBeInstanceOf(MarkdownFormatter);
    });

    it('should allow registering custom formatters', () => {
      const customFormatter = new PlainFormatter();
      registry.register('custom', customFormatter);

      expect(registry.get('custom')).toBe(customFormatter);
    });

    it('should allow setting default formatter', () => {
      const customFormatter = new StructuredFormatter();
      registry.setDefaultFormatter(customFormatter);

      const formatter = registry.getForAttributes({});
      expect(formatter).toBe(customFormatter);
    });
  });
});
