/**
 * Structured (XML-style) Formatter
 * Outputs sections as XML-like structured tags
 */

import { OutputFormatter, Section } from '@/core/types';

export class StructuredFormatter implements OutputFormatter {
  format(sections: Section[]): string {
    return sections.map((section) => this.formatSection(section)).join('\n');
  }

  formatSection(section: Section): string {
    const attrs = this.formatAttributes(section.attributes);
    const openTag = attrs ? `<${section.name} ${attrs}>` : `<${section.name}>`;

    // Handle nested sections if present - render children as markdown
    const content =
      section.children && section.children.length > 0
        ? section.children
            .map((child) => this.formatSectionAsMarkdown(child))
            .join('\n\n')
        : section.content;

    return `${openTag}\n${content}\n</${section.name}>`;
  }

  private formatSectionAsMarkdown(section: Section): string {
    // Format nested sections as markdown with heading
    let result = `## ${section.name}\n\n`;

    if (section.children && section.children.length > 0) {
      result += section.children
        .map((child) => this.formatSectionAsMarkdown(child))
        .join('\n\n');
    } else {
      result += section.content;
    }

    return result;
  }

  supportsFormat(format: string): boolean {
    return format === 'structured' || format === 'xml';
  }

  private formatAttributes(attributes: Record<string, string>): string {
    // Filter out special attributes used for formatting control
    return Object.entries(attributes)
      .filter(([key]) => !['output', 'format'].includes(key))
      .map(([key, value]) => `${key}="${this.escapeXml(value)}"`)
      .join(' ');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
