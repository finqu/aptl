/**
 * Formatter Registry
 * Manages and selects output formatters based on section attributes
 */

import { OutputFormatter, FormatterRegistry, Section } from '../core/types';
import { PlainFormatter } from './plain-formatter';
import { StructuredFormatter } from './structured-formatter';
import { MarkdownFormatter } from './markdown-formatter';
import { JsonFormatter } from './json-formatter';

export class DefaultFormatterRegistry implements FormatterRegistry {
  private formatters: Map<string, OutputFormatter> = new Map();
  private defaultFormatter: OutputFormatter;

  constructor() {
    // Register built-in formatters
    this.defaultFormatter = new PlainFormatter();
    this.register('plain', this.defaultFormatter);
    this.register('text', this.defaultFormatter);
    this.register('structured', new StructuredFormatter());
    this.register('xml', new StructuredFormatter());
    this.register('md', new MarkdownFormatter());
    this.register('markdown', new MarkdownFormatter());
    this.register('json', new JsonFormatter());
  }

  /**
   * Register a custom formatter
   */
  register(name: string, formatter: OutputFormatter): void {
    this.formatters.set(name.toLowerCase(), formatter);
  }

  /**
   * Get a formatter by name
   */
  get(name: string): OutputFormatter | undefined {
    return this.formatters.get(name.toLowerCase());
  }

  /**
   * Get the appropriate formatter based on section attributes
   * Supports complex output specifications like:
   * - "structured" - simple format name
   * - "structured:gpt-5" - conditional format based on model
   * - "structured:gpt-5;md" - fallback formats
   */
  getForAttributes(attributes: Record<string, string>): OutputFormatter {
    const output = attributes.output || attributes.format;

    if (!output) {
      return this.defaultFormatter;
    }

    // Handle complex output specifications like "structured:gpt-5;md"
    const formats = this.parseOutputSpec(output, attributes);

    for (const format of formats) {
      const formatter = this.get(format);
      if (formatter) {
        return formatter;
      }
    }

    return this.defaultFormatter;
  }

  /**
   * Set the default formatter
   */
  setDefaultFormatter(formatter: OutputFormatter): void {
    this.defaultFormatter = formatter;
  }

  /**
   * Parse output specification string into a list of format names
   * Examples:
   * - "structured" -> ["structured"]
   * - "structured:gpt-5;md" -> ["structured"] (if model=gpt-5) or ["md"] (if not)
   * - "json:special;xml:default;plain" -> ["json"] or ["xml"] or ["plain"]
   */
  private parseOutputSpec(
    spec: string,
    attributes: Record<string, string>,
  ): string[] {
    const formats: string[] = [];

    // Split by semicolon for multiple format options
    const parts = spec.split(';');

    for (const part of parts) {
      const trimmedPart = part.trim();

      if (trimmedPart.includes(':')) {
        // Conditional format: "format:condition"
        const [format, condition] = trimmedPart.split(':').map((s) => s.trim());

        if (this.evaluateCondition(condition, attributes)) {
          formats.push(format);
        }
      } else {
        // Simple format name
        formats.push(trimmedPart);
      }
    }

    return formats;
  }

  /**
   * Evaluate a simple condition against attributes
   * Supports:
   * - "value" - check if attribute equals value (checks all attributes)
   * - "!value" - check if attribute does not equal value
   * - Future: could support more complex conditions
   */
  private evaluateCondition(
    condition: string,
    attributes: Record<string, string>,
  ): boolean {
    // Handle negation
    if (condition.startsWith('!')) {
      const value = condition.substring(1);
      return !Object.values(attributes).includes(value);
    }

    // Check if any attribute matches the condition
    return Object.values(attributes).includes(condition);
  }
}

// Export formatters for direct use
export { PlainFormatter } from './plain-formatter';
export { StructuredFormatter } from './structured-formatter';
export { MarkdownFormatter } from './markdown-formatter';
export { JsonFormatter } from './json-formatter';
