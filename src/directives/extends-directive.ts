/**
 * Extends Directive
 * Implements template inheritance - extends a parent template and overrides/augments its sections
 *
 * This directive takes complete control of the template rendering when present.
 */

import { InlineDirective } from './base-directive';
import { DirectiveContext } from './types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode, NodeType, ASTNode } from '@/core/types';
import { TemplateRegistry } from '@/templates/template-registry';
import { parseSectionArgs } from './argument-parsers';

export interface SectionInfo {
  name: string;
  node: DirectiveNode;
  overridable?: boolean;
  override?: boolean;
  prepend?: boolean;
  append?: boolean;
  isNew?: boolean;
}

/**
 * Parse @extends directive arguments
 * Syntax: @extends "base-template"
 */
export function parseExtendsArgs(rawArgs: string): {
  templatePath: string;
} {
  const trimmed = rawArgs.trim();

  if (!trimmed) {
    throw new APTLSyntaxError('Extends directive requires a template path');
  }

  // Remove quotes if present
  let templatePath = trimmed;
  if (
    (templatePath.startsWith('"') && templatePath.endsWith('"')) ||
    (templatePath.startsWith("'") && templatePath.endsWith("'"))
  ) {
    templatePath = templatePath.slice(1, -1);
  }

  return { templatePath };
}

/**
 * Normalize template path by adding .aptl extension if not present
 */
export function normalizeTemplatePath(path: string): string {
  if (path.endsWith('.aptl')) {
    return path;
  }
  return `${path}.aptl`;
}

/**
 * Extract section nodes from the current template's AST
 */
function extractChildSections(templateNode: any): Map<string, SectionInfo> {
  const sections = new Map<string, SectionInfo>();

  if (!templateNode || !templateNode.children) {
    return sections;
  }

  for (const child of templateNode.children) {
    if (child.type === NodeType.DIRECTIVE && child.name === 'section') {
      const directive = child as DirectiveNode;

      // Parse section arguments if not already parsed
      if (!directive.parsedArgs && directive.rawArgs) {
        directive.parsedArgs = parseSectionArgs(directive.rawArgs);
      }

      if (directive.parsedArgs) {
        const { name, attributes } = directive.parsedArgs;
        sections.set(name, {
          name,
          node: directive,
          overridable:
            attributes.overridable === 'true' ||
            attributes.overridable === true,
          override:
            attributes.override === 'true' || attributes.override === true,
          prepend: attributes.prepend === 'true' || attributes.prepend === true,
          append: attributes.append === 'true' || attributes.append === true,
          isNew: attributes.new === 'true' || attributes.new === true,
        });
      }
    }
  }

  return sections;
}

/**
 * ExtendsDirective class
 *
 * When this directive is encountered at the top of a template, it:
 * 1. Loads the parent template
 * 2. Extracts all @section directives from the current template
 * 3. Renders the parent template, but overrides/merges sections
 */
export class ExtendsDirective extends InlineDirective {
  readonly name = 'extends';
  readonly requiresTopLevel = true;
  readonly unique = true;
  readonly takesControl = true; // This directive takes full control of rendering

  constructor(private templateRegistry: TemplateRegistry) {
    super();
  }

  /**
   * Parse extends arguments
   */
  parseArguments(rawArgs: string): any {
    return parseExtendsArgs(rawArgs);
  }

  /**
   * Validate extends directive
   */
  validate(node: DirectiveNode): void {
    if (!node.rawArgs || !node.rawArgs.trim()) {
      throw new APTLSyntaxError(
        'Extends directive requires a template path',
        node.line,
        node.column,
      );
    }
  }

  /**
   * Parse and prepare the extends directive
   * Loads the parent template
   */
  async parse(node: DirectiveNode): Promise<void> {
    // Parse arguments if not already done
    if (!node.parsedArgs) {
      node.parsedArgs = parseExtendsArgs(node.rawArgs);
    }

    const { templatePath } = node.parsedArgs;
    const normalizedPath = normalizeTemplatePath(templatePath);

    // Check if template is already loaded
    if (
      this.templateRegistry.has(normalizedPath) ||
      this.templateRegistry.has(templatePath)
    ) {
      return; // Already loaded
    }

    // Try to load the template from filesystem
    const pathsToTry = [normalizedPath, templatePath];
    let loaded = false;

    for (const path of pathsToTry) {
      try {
        await this.templateRegistry.loadFile(path);
        loaded = true;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!loaded) {
      throw new APTLRuntimeError(
        `Parent template not found: ${normalizedPath}. Cannot load template for @extends directive.`,
        { templatePath: normalizedPath, line: node.line, column: node.column },
      );
    }
  }

  /**
   * Execute the extends directive
   *
   * This takes over the entire template rendering:
   * 1. Get the parent template
   * 2. Extract child sections from the current template
   * 3. Render child sections
   * 4. Render the parent with section overrides in context
   */
  execute(context: DirectiveContext): string {
    // Parse arguments if not already done
    if (!context.node.parsedArgs) {
      context.node.parsedArgs = parseExtendsArgs(context.node.rawArgs);
    }

    const { templatePath } = context.node.parsedArgs;
    const normalizedPath = normalizeTemplatePath(templatePath);

    // Get the parent template
    let parentTemplateName = normalizedPath;
    if (!this.templateRegistry.has(normalizedPath)) {
      if (this.templateRegistry.has(templatePath)) {
        parentTemplateName = templatePath;
      } else {
        throw new APTLRuntimeError(
          `Parent template not found: ${normalizedPath}`,
        );
      }
    }

    const parentTemplate = this.templateRegistry.get(parentTemplateName);

    // Extract sections from the current (child) template
    const childSections = extractChildSections(context.templateNode);

    if (!context.renderNode) {
      throw new APTLRuntimeError(
        '@extends directive requires renderNode function in context',
      );
    }

    // Check if there are already section overrides from a child template
    // This happens in multi-level inheritance (grandchild -> child -> parent)
    const existingOverrides = context.data.__sectionOverrides__ as
      | Record<
          string,
          {
            content: string;
            overridable?: boolean;
            override?: boolean;
            prepend?: boolean;
            append?: boolean;
          }
        >
      | undefined;

    // Render each section from this template and store the overrides
    const sectionOverrides: Record<
      string,
      {
        content: string;
        overridable?: boolean;
        override?: boolean;
        prepend?: boolean;
        append?: boolean;
      }
    > = {};

    for (const [name, section] of childSections) {
      // Render the current section's children
      // Set __sectionLevel__ to 1 so that nested formatted sections will be at nesting level 1
      // (which becomes heading level 2 = ## after formatter adds +1)
      // The parent section with format="md" will be at nesting level 0, rendering as # heading
      // So nested sections in the override should be one level deeper (##)
      const originalLevel = context.data.__sectionLevel__;
      context.data.__sectionLevel__ = 1;

      const currentSectionContent = section.node.children
        .map((child) => context.renderNode!(child, context.data))
        .join('');

      // Restore original level
      context.data.__sectionLevel__ = originalLevel;

      // Check if there's already an override from a deeper child
      if (existingOverrides && existingOverrides[name]) {
        const existingOverride = existingOverrides[name];

        // If both the existing override and current section use prepend,
        // we need to chain them: current prepends to existing
        if (section.prepend && existingOverride.prepend) {
          sectionOverrides[name] = {
            content: currentSectionContent + '\n' + existingOverride.content,
            overridable: section.overridable,
            override: section.override,
            prepend: true,
            append: section.append,
          };
        }
        // If both use append, chain them: existing appends to current
        else if (section.append && existingOverride.append) {
          sectionOverrides[name] = {
            content: existingOverride.content + '\n' + currentSectionContent,
            overridable: section.overridable,
            override: section.override,
            prepend: section.prepend,
            append: true,
          };
        }
        // Otherwise, just pass through the existing override
        else {
          sectionOverrides[name] = existingOverride;
        }
      } else {
        // No existing override - use current content
        sectionOverrides[name] = {
          content: currentSectionContent,
          overridable: section.overridable,
          override: section.override,
          prepend: section.prepend,
          append: section.append,
        };
      }
    }

    // Render the parent template with section overrides in the data context
    // The section directive will check for __sectionOverrides__ in the data
    const extendedData = {
      ...context.data,
      __sectionOverrides__: sectionOverrides,
    };

    let output = parentTemplate.render(extendedData);

    // Append any NEW sections that don't exist in the parent
    for (const [name, section] of childSections) {
      if (section.isNew) {
        // Render the new section
        const newSectionContent = section.node.children
          .map((child) => context.renderNode!(child, context.data))
          .join('');

        output += '\n' + newSectionContent;
      }
    }

    return output;
  }
}
