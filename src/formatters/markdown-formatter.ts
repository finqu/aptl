/**
 * Markdown Formatter
 * Outputs sections as markdown with headings
 */

import { OutputFormatter, Section } from '@/core/types';

export class MarkdownFormatter implements OutputFormatter {
  format(sections: Section[]): string {
    return sections.map((section) => this.formatSection(section)).join('\n\n');
  }

  formatSection(section: Section, level: number = 2): string {
    const heading = this.createHeading(section.name, level);
    const metadata = this.formatMetadata(section.attributes);

    let result = heading;

    if (metadata) {
      result += `\n${metadata}`;
    }

    result += `\n\n${section.content}`;

    // Handle nested sections
    if (section.children && section.children.length > 0) {
      const childContent = section.children
        .map((child) => this.formatSection(child, level + 1))
        .join('\n\n');
      result += `\n\n${childContent}`;
    }

    return result;
  }

  supportsFormat(format: string): boolean {
    return format === 'md' || format === 'markdown';
  }

  private createHeading(name: string, level: number): string {
    const actualLevel = Math.min(level, 6);
    const hashes = '#'.repeat(actualLevel);
    const formattedName = this.capitalizeFirst(name);
    return `${hashes} ${formattedName}`;
  }

  private formatMetadata(attributes: Record<string, string>): string {
    // Filter out special attributes
    const metadata = Object.entries(attributes)
      .filter(([key]) => !['output', 'format'].includes(key))
      .map(([key, value]) => `- **${key}**: ${value}`)
      .join('\n');

    return metadata ? `\n${metadata}` : '';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
