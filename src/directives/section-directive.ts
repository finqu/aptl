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
   * Extract nested section directives as Section children and render their content
   * (excluding their own nested sections, which will be extracted recursively)
   */
  private extractNestedSections(
    node: DirectiveNode,
    context: DirectiveContext,
    parentLevel: number = 0,
  ): Section[] {
    const children: Section[] = [];

    // Get section overrides from context for nested section replacement
    const sectionOverrides = context.data.__sectionOverrides__ as
      | Record<
          string,
          {
            content: string;
            overridable?: boolean;
            override?: boolean;
            prepend?: boolean;
            append?: boolean;
            attributes?: Record<string, any>;
          }
        >
      | undefined;

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

        // Recursively extract nested sections with incremented level
        const nestedChildren = this.extractNestedSections(
          childDirectiveNode,
          context,
          parentLevel + 1,
        );

        // Check if there's an override for this nested section
        let childContent: string;
        let effectiveAttributes = childAttributes; // Use parent's attributes by default
        if (sectionOverrides && sectionOverrides[childName]) {
          const override = sectionOverrides[childName];
          // Use the override content instead of rendering from the parent's AST
          // This handles the case where a child template has a top-level section
          // that overrides a nested section in the parent template
          if (override.prepend || override.append) {
            // For prepend/append, render original and combine with override
            const originalContent = childDirectiveNode.children
              .filter(
                (c) =>
                  !(
                    c.type === NodeType.DIRECTIVE &&
                    (c as DirectiveNode).name === 'section'
                  ),
              )
              .map((c) => (context.renderNode ? context.renderNode(c) : ''))
              .join('');

            childContent = override.prepend
              ? override.content + '\n' + originalContent
              : originalContent + '\n' + override.content;
          } else {
            // Complete override - use child's content AND attributes
            childContent = override.content;
            // Use child's attributes instead of parent's to avoid inheriting format
            effectiveAttributes = override.attributes || {};

            // If the child's override doesn't have a 'format' attribute but the parent did,
            // set title=false to prevent the formatter from adding a heading
            if (!effectiveAttributes.format && childAttributes.format) {
              effectiveAttributes = { ...effectiveAttributes, title: 'false' };
            }
          }
        } else {
          // No override - render the child section's content (excluding nested @section directives)
          // This prevents double-rendering of deeply nested sections
          childContent = childDirectiveNode.children
            .filter(
              (c) =>
                !(
                  c.type === NodeType.DIRECTIVE &&
                  (c as DirectiveNode).name === 'section'
                ),
            )
            .map((c) => (context.renderNode ? context.renderNode(c) : ''))
            .join('');
        }

        // Create Section object for this child with level information
        const childSection: Section = {
          name: childName,
          attributes: {
            ...effectiveAttributes,
            __level: String(parentLevel + 1),
          },
          content: childContent.trim(),
          children: nestedChildren.length > 0 ? nestedChildren : undefined,
        };

        children.push(childSection);
      }
    }

    return children;
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

    // Get current section nesting level (defaults to 0 for root level)
    const currentLevel = (context.data.__sectionLevel__ as number) || 0;

    // Check if we're nested inside a section that was completely replaced
    // This must be checked BEFORE looking for section overrides
    const replacedSections = context.data.__replacedSections__ as
      | Set<string>
      | undefined;
    const parentSectionName = context.data.__parentSectionName__ as
      | string
      | undefined;

    if (
      replacedSections &&
      parentSectionName &&
      replacedSections.has(parentSectionName)
    ) {
      // This section is nested within a parent section that was completely replaced
      // Skip rendering this section (it should have been part of the override content)
      return '';
    }

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
            attributes?: Record<string, any>;
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

    // Render the original section content by rendering all children
    // If this section has a format attribute, increment the section level for children
    const childLevel = formatAttr ? currentLevel + 1 : currentLevel;
    const originalLevel = context.data.__sectionLevel__;
    const originalParentSectionName = context.data.__parentSectionName__;

    // Set the new level for children and track current section as parent
    context.data.__sectionLevel__ = childLevel;
    context.data.__parentSectionName__ = name;

    // When a format attribute is present, we should NOT render nested @section directives
    // as part of the content, because they will be extracted and rendered by the formatter
    // This prevents double-rendering of nested sections
    const childrenToRender = formatAttr
      ? context.node.children.filter(
          (child) =>
            !(
              child.type === NodeType.DIRECTIVE &&
              (child as DirectiveNode).name === 'section'
            ),
        )
      : context.node.children;

    const originalContent = childrenToRender
      .map((child) => {
        if (context.renderNode) {
          return context.renderNode(child);
        }
        return '';
      })
      .join('');

    // Restore the original level and parent section name
    context.data.__sectionLevel__ = originalLevel;
    context.data.__parentSectionName__ = originalParentSectionName;

    // Apply section override logic if present
    let wasOverridden = false;
    let shouldExtractNestedSections = true; // By default, extract nested sections for formatter

    if (sectionOverrides && sectionOverrides[name]) {
      const override = sectionOverrides[name];
      const isOverridable =
        attributes.overridable === 'true' || attributes.overridable === true;

      if (override.prepend || override.append) {
        // For prepend/append, we need to render all children in document order
        // rather than extracting sections separately, to preserve order of @include, @if, etc.
        if (formatAttr) {
          // Set the correct level for nested sections before rendering them (same as childLevel)
          const prevLevel = context.data.__sectionLevel__;
          context.data.__sectionLevel__ = childLevel;

          // Render ALL children in document order (sections, includes, conditionals, etc.)
          // This preserves the original order of all directives and content
          const allChildrenContent = context.node.children
            .map((child) => {
              if (context.renderNode) {
                return context.renderNode(child);
              }
              return '';
            })
            .join('');

          // Restore the original level
          context.data.__sectionLevel__ = prevLevel;

          // Now prepend or append to the full content
          if (override.prepend) {
            sectionContent = override.content + '\n' + allChildrenContent;
          } else {
            sectionContent = allChildrenContent + '\n' + override.content;
          }

          // Don't extract nested sections again in renderWithFormatter
          shouldExtractNestedSections = false;
        } else {
          // No format attribute - simple prepend/append
          if (override.prepend) {
            sectionContent = override.content + '\n' + originalContent;
          } else {
            sectionContent = originalContent + '\n' + override.content;
          }
        }
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
          wasOverridden = true; // Mark that this section was completely replaced
        } else {
          // No modifier and not overridable - keep original
          sectionContent = originalContent;
        }
      }
    } else {
      // No override - use original content
      sectionContent = originalContent;
    }

    // If format attribute is present, use formatter to render
    if (formatAttr) {
      return this.renderWithFormatter(
        context,
        name,
        attributes,
        formatAttr,
        sectionContent,
        wasOverridden, // Pass whether this was completely replaced
        shouldExtractNestedSections, // Pass whether to extract nested sections
      );
    }

    // Note: We no longer add automatic trailing newlines for inline sections.
    // With @end support, inline directives can be chained on the same line.
    // If a newline is desired, it should be explicit in the template or will
    // naturally occur when the inline directive ends at EOL (without @end).

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
    sectionContent: string,
    wasOverridden: boolean = false,
    shouldExtractNestedSections: boolean = true,
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

    // Get current section nesting level (defaults to 0 for root level)
    const currentLevel = (context.data.__sectionLevel__ as number) || 0;

    // Extract nested sections from the node (but use sectionContent for main content)
    // Pass the current level so nested sections know their depth
    // Always extract nested sections even if the section was overridden, because
    // the child template might have top-level sections that override nested sections
    // in the parent template
    // However, if shouldExtractNestedSections is false (prepend/append case),
    // skip extraction because nested sections have already been rendered inline
    const children = shouldExtractNestedSections
      ? this.extractNestedSections(context.node, context, currentLevel)
      : [];

    // Build Section object with the (possibly overridden) content
    const section: Section = {
      name,
      attributes: { ...attributes, __level: String(currentLevel) },
      content: sectionContent.trim(),
      children: children.length > 0 ? children : undefined,
    };

    // Check if whitespace preservation is enabled
    const preserveWhitespace = context.data.__preserveWhitespace__ as boolean;

    // Format using the formatter
    // Add two newlines to preserve spacing between sections
    // (parser consumes one newline after directives, so we add two to get one blank line)
    // But only if whitespace is NOT being preserved (when preserveWhitespace is true,
    // the original newlines are kept and cleanWhitespace doesn't run)
    return (
      formatter.formatSection(section) + (preserveWhitespace ? '' : '\n\n')
    );
  }
}
