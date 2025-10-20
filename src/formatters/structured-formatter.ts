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
    const openTag = `<${section.name}>`;

    // Check if title attribute is present
    const titleAttr = section.attributes.title;
    let titleContent = '';

    if (titleAttr && titleAttr !== 'false') {
      // Use title attribute value as H1 heading
      titleContent = `# ${titleAttr}\n`;
    }

    // Build content: optional title + parent content + nested sections as markdown
    let content = titleContent + section.content;

    if (section.children && section.children.length > 0) {
      const childrenContent = section.children
        .map((child) => this.formatSectionAsMarkdown(child, 2))
        .join('\n\n');

      // If parent has content, add separator before children
      if (content && content.trim()) {
        content = `${content}\n\n${childrenContent}`;
      } else {
        content = childrenContent;
      }
    }

    return `${openTag}\n${content}\n</${section.name}>`;
  }

  private formatSectionAsMarkdown(section: Section, level: number = 2): string {
    // Check if title attribute is present
    const titleAttr = section.attributes.title;
    let result = '';

    if (titleAttr === 'false') {
      // No heading, don't increase level for children
      // Add parent content if present
      if (section.content && section.content.trim()) {
        result += section.content;
      }

      // Add nested children without increasing heading level
      if (section.children && section.children.length > 0) {
        const childrenContent = section.children
          .map((child) => this.formatSectionAsMarkdown(child, level))
          .join('\n\n');

        // Add separator if there was parent content
        if (section.content && section.content.trim()) {
          result += '\n\n' + childrenContent;
        } else {
          result += childrenContent;
        }
      }
    } else {
      // Use title attribute if present, otherwise use section name
      const displayTitle =
        titleAttr ||
        section.name.charAt(0).toUpperCase() + section.name.slice(1);

      const hashes = '#'.repeat(Math.min(level, 6)); // Max heading level is 6
      result = `${hashes} ${displayTitle}\n\n`;

      // Add parent content if present
      if (section.content && section.content.trim()) {
        result += section.content;
      }

      // Add nested children with increased heading level
      if (section.children && section.children.length > 0) {
        const childrenContent = section.children
          .map((child) => this.formatSectionAsMarkdown(child, level + 1))
          .join('\n\n');

        // Add separator if there was parent content
        if (section.content && section.content.trim()) {
          result += '\n\n' + childrenContent;
        } else {
          result += childrenContent;
        }
      }
    }

    return result;
  }

  supportsFormat(format: string): boolean {
    return format === 'structured' || format === 'xml';
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
