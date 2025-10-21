/**
 * Markdown Formatter
 * Outputs sections as markdown with headings
 */

import { OutputFormatter, Section } from '@/core/types';

export class MarkdownFormatter implements OutputFormatter {
  format(sections: Section[]): string {
    return sections.map((section) => this.formatSection(section)).join('\n\n');
  }

  formatSection(section: Section, level: number = 1): string {
    const titleAttr = section.attributes.title;
    let result = '';

    // Use __level attribute if present (set by section directive for proper nesting)
    // Otherwise use the provided level parameter
    // __level is the nesting depth: 0 = root, 1 = first child, etc.
    // We add 1 to convert to markdown heading level: level 0 → #, level 1 → ##, etc.
    const actualLevel = section.attributes.__level
      ? parseInt(section.attributes.__level, 10) + 1
      : level;

    // Check if title should be rendered
    if (titleAttr !== 'false') {
      // Use title attribute if present, otherwise use section name
      const displayTitle = titleAttr || this.capitalizeFirst(section.name);
      const heading = this.createHeadingWithTitle(displayTitle, actualLevel);

      result = heading + `\n${section.content}`;

      // Handle nested sections with increased level
      if (section.children && section.children.length > 0) {
        const childContent = section.children
          .map((child) => this.formatSection(child, actualLevel + 1))
          .join('\n\n');
        result += `\n\n${childContent}`;
      }
    } else {
      // No heading, just content
      result = section.content;

      // Handle nested sections without increasing level
      if (section.children && section.children.length > 0) {
        const childContent = section.children
          .map((child) => this.formatSection(child, actualLevel))
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
    const actualLevel = Math.max(1, Math.min(level, 6));
    const hashes = '#'.repeat(actualLevel);
    const formattedName = this.capitalizeFirst(name);
    return `${hashes} ${formattedName}`;
  }

  private createHeadingWithTitle(title: string, level: number): string {
    const actualLevel = Math.max(1, Math.min(level, 6));
    const hashes = '#'.repeat(actualLevel);
    return `${hashes} ${title}`;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
