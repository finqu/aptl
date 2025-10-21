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
  hasFormat?: boolean;
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
 * Extract section metadata (name and format attribute) from a parent template by parsing its source
 */
function extractParentSections(parentTemplate: any): Map<string, { hasFormat: boolean }> {
  const sections = new Map<string, { hasFormat: boolean }>();

  // Try to get the parent template source
  const parentSource = parentTemplate.source;
  if (!parentSource) {
    // If source is not available, we can't extract section info
    return sections;
  }

  // Use a regex to extract section directives and their attributes
  // This regex matches: @section name or @section name(attributes)
  // Handles attributes with commas like: @section identity overridable=true, format="md"
  const sectionRegex = /@section\s+(\w+)(?:\s+([^@\n]+))?/g;
  let match;
  
  while ((match = sectionRegex.exec(parentSource)) !== null) {
    const sectionName = match[1];
    const attributesString = match[2]; // e.g., 'overridable=true, format="md"'
    const hasFormat = attributesString ? /format\s*=/.test(attributesString) : false;
    sections.set(sectionName, { hasFormat });
  }

  return sections;
}

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
          hasFormat: !!attributes.format,
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

    // Extract sections from the parent template to know which have format attributes
    const parentSections = extractParentSections(parentTemplate);

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
        attributes?: Record<string, any>; // Add attributes from child section
      }
    > = {};

    // Track which sections are being completely replaced (not prepend/append)
    // This is used to skip rendering of nested sections in the parent template
    const replacedSections = new Set<string>();

    for (const [name, section] of childSections) {
      // Render the current section's children
      // Set __sectionLevel__ based on whether the parent section has a format attribute
      // If parent has format, nested sections should be level 1 (##)
      // If parent has no format, nested sections should be level 0 (#)
      const originalLevel = context.data.__sectionLevel__;
      
      const parentSection = parentSections.get(name);
      if (parentSection && parentSection.hasFormat) {
        context.data.__sectionLevel__ = 1;
      }

      const currentSectionContent = section.node.children
        .map((child) => context.renderNode!(child, context.data))
        .join('');

      // Restore original level
      context.data.__sectionLevel__ = originalLevel;

      // Get the child section's attributes
      const childAttributes = section.node.parsedArgs?.attributes || {};

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
            attributes: childAttributes,
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
            attributes: childAttributes,
          };
        }
        // Otherwise, just pass through the existing override
        else {
          sectionOverrides[name] = existingOverride;
          // Mark as replaced if it's a complete override
          if (!existingOverride.prepend && !existingOverride.append) {
            replacedSections.add(name);
          }
        }
      } else {
        // No existing override - use current content
        sectionOverrides[name] = {
          content: currentSectionContent,
          overridable: section.overridable,
          override: section.override,
          prepend: section.prepend,
          append: section.append,
          attributes: childAttributes,
        };

        // Mark as replaced if it's a complete override (not prepend/append)
        if (!section.prepend && !section.append) {
          replacedSections.add(name);
        }
      }
    }

    // Render the parent template with section overrides in the data context
    // The section directive will check for __sectionOverrides__ in the data
    // Also pass __replacedSections__ so nested sections can check if their parent was replaced
    const extendedData = {
      ...context.data,
      __sectionOverrides__: sectionOverrides,
      __replacedSections__: replacedSections,
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
