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
    const titleAttr = section.attributes.title;
    let result = '';

    // Check if title should be rendered
    if (titleAttr !== 'false') {
      // Use title attribute if present, otherwise use section name
      const displayTitle = titleAttr || this.capitalizeFirst(section.name);
      const heading = this.createHeadingWithTitle(displayTitle, level);
      const metadata = this.formatMetadata(section.attributes);

      result = heading;

      if (metadata) {
        result += `\n${metadata}`;
      }

      result += `\n\n${section.content}`;

      // Handle nested sections with increased level
      if (section.children && section.children.length > 0) {
        const childContent = section.children
          .map((child) => this.formatSection(child, level + 1))
          .join('\n\n');
        result += `\n\n${childContent}`;
      }
    } else {
      // No heading, just content
      result = section.content;

      // Handle nested sections without increasing level
      if (section.children && section.children.length > 0) {
        const childContent = section.children
          .map((child) => this.formatSection(child, level))
          .join('\n\n');
        if (section.content && section.content.trim()) {
          result += `\n\n${childContent}`;
        } else {
          result = childContent;
        }
      }
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

  private createHeadingWithTitle(title: string, level: number): string {
    const actualLevel = Math.min(level, 6);
    const hashes = '#'.repeat(actualLevel);
    return `${hashes} ${title}`;
  }

  private formatMetadata(attributes: Record<string, string>): string {
    // Filter out special attributes
    const metadata = Object.entries(attributes)
      .filter(([key]) => !['output', 'format', 'title'].includes(key))
      .map(([key, value]) => `- **${key}**: ${value}`)
      .join('\n');

    return metadata ? `\n${metadata}` : '';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
