/**
 * Plain Text Formatter
 * Outputs sections as plain text without any special formatting
 */

import { OutputFormatter, Section } from '../core/types';

export class PlainFormatter implements OutputFormatter {
  format(sections: Section[]): string {
    return sections.map((section) => this.formatSection(section)).join('\n\n');
  }

  formatSection(section: Section): string {
    // Handle nested sections if present
    if (section.children && section.children.length > 0) {
      const childContent = section.children
        .map((child) => this.formatSection(child))
        .join('\n\n');
      return section.content
        ? `${section.content}\n\n${childContent}`
        : childContent;
    }

    return section.content;
  }

  supportsFormat(format: string): boolean {
    return format === 'plain' || format === 'text';
  }
}
