/**
 * Section Directive (Class-based)
 * Defines output sections with formatting and conditional rendering based on model
 */

import { BlockDirective } from './base-directive';
import { DirectiveContext } from './types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode, Section, NodeType } from '@/core/types';
import { parseSectionArgs } from './argument-parsers';

/**
 * Parse model attribute and extract model-specific formats
 *
 * Syntax:
 * - model="gpt-5.1" <- renders only for gpt-5.1 model
 * - model="gpt-5.1/structured" <- renders structured data only for gpt-5.1
 * - model="gpt-5.1/structured, md" <- renders structured data for gpt-5.1, other md
 * - model="gpt-5.1/structured, claude-4/json, md" <- renders structured data for gpt-5.1, claude json, other md
 */
export interface ModelConfig {
  model: string;
  format?: string;
}

export function parseModelAttribute(modelAttr: string): {
  configs: ModelConfig[];
  defaultFormat?: string;
} {
  const trimmed = modelAttr.trim();
  if (!trimmed) {
    return { configs: [] };
  }

  // Split by comma to get individual configurations
  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p);
  const configs: ModelConfig[] = [];
  let defaultFormat: string | undefined;

  for (const part of parts) {
    // Check if this is a model/format pair or just a format (default)
    if (part.includes('/')) {
      const [model, format] = part.split('/').map((s) => s.trim());
      if (model && format) {
        configs.push({ model, format });
      }
    } else {
      // Check if it looks like a model name (no slash) or a format
      // If it's the last item without a slash, treat as default format
      // If it has dots or hyphens typical of model names, treat as model-only
      if (
        part === parts[parts.length - 1] &&
        !part.includes('.') &&
        !part.includes('-')
      ) {
        defaultFormat = part;
      } else {
        // Treat as model without specific format
        configs.push({ model: part });
      }
    }
  }

  return { configs, defaultFormat };
}

/**
 * Match the current model against model configurations
 * Returns the format to use, or null if section should not render
 */
export function matchModel(
  currentModel: string,
  configs: ModelConfig[],
  defaultFormat?: string,
): string | null {
  // First, try exact match
  for (const config of configs) {
    if (config.model === currentModel) {
      return config.format || 'default';
    }
  }

  // If no exact match and defaultFormat is specified, use it
  if (defaultFormat) {
    return defaultFormat;
  }

  // If no configs, render for all models
  if (configs.length === 0) {
    return 'default';
  }

  // No match and no default - don't render
  return null;
}

/**
 * SectionDirective class
 * Defines a named section with optional formatting attributes and model-based conditional rendering
 *
 * Usage:
 *   @section intro
 *   This is the introduction
 *   @end
 *
 *   @section code(format="markdown")
 *   ```javascript
 *   console.log('hello');
 *   ```
 *   @end
 *
 *   @section output(model="gpt-5.1")
 *   Only shown for gpt-5.1
 *   @end
 *
 *   @section data(model="gpt-5.1/structured, claude-4/json, md")
 *   Different format per model, with fallback
 *   @end
 */
export class SectionDirective extends BlockDirective {
  readonly name = 'section';
  readonly requiresTopLevel = false;
  readonly unique = false;

  /**
   * Parse section arguments
   */
  parseArguments(rawArgs: string): any {
    return parseSectionArgs(rawArgs);
  }

  /**
   * Validate section directive
   */
  validate(node: DirectiveNode): void {
    // Section name should be in rawArgs or parsedArgs
    const hasName =
      (node.rawArgs && node.rawArgs.trim() !== '') ||
      (node.parsedArgs && node.parsedArgs.name);

    if (!hasName) {
      throw new APTLSyntaxError(
        'Section directive requires a name',
        node.line,
        node.column,
      );
    }
  }

  /**
   * Extract nested section directives as Section children
   */
  private extractNestedSections(
    node: DirectiveNode,
    context: DirectiveContext,
  ): { content: string; children: Section[] } {
    const children: Section[] = [];
    let contentParts: string[] = [];

    for (const child of node.children) {
      if (
        child.type === NodeType.DIRECTIVE &&
        (child as DirectiveNode).name === 'section'
      ) {
        const childDirectiveNode = child as DirectiveNode;

        // Parse the child section's arguments
        if (!childDirectiveNode.parsedArgs) {
          childDirectiveNode.parsedArgs = parseSectionArgs(
            childDirectiveNode.rawArgs,
          );
        }

        const { name: childName, attributes: childAttributes } =
          childDirectiveNode.parsedArgs;

        // Recursively extract nested sections
        const nestedResult = this.extractNestedSections(
          childDirectiveNode,
          context,
        );

        // Create Section object for this child
        const childSection: Section = {
          name: childName,
          attributes: childAttributes,
          content: nestedResult.content.trim(),
          children:
            nestedResult.children.length > 0
              ? nestedResult.children
              : undefined,
        };

        children.push(childSection);
      } else {
        // Render non-section nodes as content
        if (context.renderNode) {
          contentParts.push(context.renderNode(child));
        }
      }
    }

    return {
      content: contentParts.join(''),
      children,
    };
  }

  /**
   * Execute the section directive
   */
  execute(context: DirectiveContext): string {
    // Parse arguments if not already done
    if (!context.node.parsedArgs) {
      context.node.parsedArgs = parseSectionArgs(context.node.rawArgs);
    }

    const { name, attributes } = context.node.parsedArgs;

    // Check if model attribute exists FIRST (before rendering)
    const modelAttr = attributes.model;

    if (modelAttr) {
      // Get current model from context data
      const currentModel = context.data.model as string;

      if (!currentModel) {
        // Render nothing if no model is provided but model attribute is specified
        return '';
      }

      // Parse model attribute and match against current model
      const { configs, defaultFormat } = parseModelAttribute(modelAttr);
      const matchedFormat = matchModel(currentModel, configs, defaultFormat);

      // If no match, don't render this section
      if (matchedFormat === null) {
        return '';
      }

      // Store the matched format in metadata for potential use by formatters
      context.metadata.set('format', matchedFormat);
    }

    // Check for section overrides from @extends directive
    const sectionOverrides = context.data.__sectionOverrides__ as
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

    let sectionContent: string;

    if (!context.renderTemplate) {
      throw new APTLRuntimeError(
        '@section directive requires renderTemplate function in context',
      );
    }

    // Check if format attribute is present (direct format, not from model matching)
    const formatAttr = attributes.format;

    if (formatAttr) {
      // Use formatter to render this section
      return this.renderWithFormatter(context, name, attributes, formatAttr);
    }

    // Render the original section content
    const originalContent = context.renderTemplate('');

    // Apply section override logic if present
    if (sectionOverrides && sectionOverrides[name]) {
      const override = sectionOverrides[name];
      const isOverridable =
        attributes.overridable === 'true' || attributes.overridable === true;

      if (override.prepend) {
        // Prepend child content to parent content
        sectionContent = override.content + '\n' + originalContent;
      } else if (override.append) {
        // Append child content to parent content
        sectionContent = originalContent + '\n' + override.content;
      } else {
        // Default behavior: override/replace
        // Check if section is overridable when child tries to override
        if (override.override || (!override.prepend && !override.append)) {
          if (!isOverridable) {
            throw new APTLRuntimeError(
              `Cannot override section "${name}" - parent section is not marked as overridable`,
            );
          }
          sectionContent = override.content;
        } else {
          // No modifier and not overridable - keep original
          sectionContent = originalContent;
        }
      }
    } else {
      // No override - use original content
      sectionContent = originalContent;
    }

    return sectionContent;
  }

  /**
   * Render section using a formatter
   */
  private renderWithFormatter(
    context: DirectiveContext,
    name: string,
    attributes: Record<string, any>,
    formatName: string,
  ): string {
    // Get formatter registry from context data
    const formatterRegistry = context.data.__formatterRegistry__;

    if (!formatterRegistry) {
      throw new APTLRuntimeError(
        'Formatter registry not available in context. Cannot use format attribute.',
      );
    }

    // Get the formatter
    const formatter = formatterRegistry.get(formatName);

    if (!formatter) {
      throw new APTLRuntimeError(
        `Unknown formatter: "${formatName}". Available formatters: ${Array.from(formatterRegistry.get ? [] : []).join(', ')}`,
      );
    }

    // Extract content and nested sections
    const { content, children } = this.extractNestedSections(
      context.node,
      context,
    );

    // Build Section object
    const section: Section = {
      name,
      attributes,
      content: content.trim(),
      children: children.length > 0 ? children : undefined,
    };

    // Format using the formatter
    return formatter.formatSection(section);
  }
}
