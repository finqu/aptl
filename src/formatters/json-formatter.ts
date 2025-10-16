/**
 * JSON Formatter
 * Outputs sections as formatted JSON
 */

import { OutputFormatter, Section } from '../core/types';

export class JsonFormatter implements OutputFormatter {
  format(sections: Section[]): string {
    const formatted = sections.map((section) => this.sectionToObject(section));
    return JSON.stringify(formatted, null, 2);
  }

  formatSection(section: Section): string {
    const obj = this.sectionToObject(section);
    return JSON.stringify(obj, null, 2);
  }

  supportsFormat(format: string): boolean {
    return format === 'json';
  }

  private sectionToObject(section: Section): any {
    const obj: any = {
      name: section.name,
    };

    // Add attributes if present
    if (Object.keys(section.attributes).length > 0) {
      const filteredAttrs = Object.fromEntries(
        Object.entries(section.attributes).filter(
          ([key]) => !['output', 'format'].includes(key),
        ),
      );
      if (Object.keys(filteredAttrs).length > 0) {
        obj.attributes = filteredAttrs;
      }
    }

    // Try to parse content as JSON, otherwise use as string
    try {
      obj.content = JSON.parse(section.content);
    } catch {
      obj.content = section.content;
    }

    // Add nested sections if present
    if (section.children && section.children.length > 0) {
      obj.children = section.children.map((child) =>
        this.sectionToObject(child),
      );
    }

    return obj;
  }
}
