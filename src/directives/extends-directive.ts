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
      // Check if there's already an override from a deeper child
      // If so, use that instead of rendering this template's section
      if (existingOverrides && existingOverrides[name]) {
        // Pass through the existing override
        sectionOverrides[name] = existingOverrides[name];
      } else {
        // Render the section's children
        const sectionContent = section.node.children
          .map((child) => context.renderNode!(child, context.data))
          .join('');

        sectionOverrides[name] = {
          content: sectionContent,
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
