/**
 * Include Directive
 * Includes and renders partial templates with optional variable scoping
 */

import { InlineDirective } from './base-directive';
import { DirectiveContext } from './types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode } from '@/core/types';
import { TemplateRegistry } from '@/templates/template-registry';

/**
 * Parse @include directive arguments
 *
 * Syntax examples:
 * - @include "template"
 * - @include "template.aptl"
 * - @include "path/to/template"
 * - @include "template" with {key: value}
 * - @include "template" with variable
 * - @include "template" with var1, var2, key="value"
 */
export function parseIncludeArgs(rawArgs: string): {
  templatePath: string;
  variables: Record<string, any> | null;
  variableNames: string[];
} {
  const trimmed = rawArgs.trim();

  if (!trimmed) {
    throw new APTLSyntaxError('Include directive requires a template path');
  }

  // Split by "with" keyword to separate template path and variables
  const withMatch = trimmed.match(/^(.+?)\s+with\s+(.+)$/);

  if (!withMatch) {
    // No "with" clause - just template path
    const templatePath = extractTemplatePath(trimmed);
    return {
      templatePath,
      variables: null,
      variableNames: [],
    };
  }

  const [, pathPart, varsPart] = withMatch;
  const templatePath = extractTemplatePath(pathPart.trim());

  // Parse the variables part
  const { variables, variableNames } = parseVariablesPart(varsPart.trim());

  return {
    templatePath,
    variables,
    variableNames,
  };
}

/**
 * Extract template path from string (removing quotes if present)
 */
function extractTemplatePath(pathStr: string): string {
  const trimmed = pathStr.trim();

  // Remove quotes if present
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

/**
 * Parse the variables part after "with"
 *
 * Supports:
 * - {key: value, key2: value2} - object literal
 * - variable - single variable name becomes key
 * - var1, var2, key="value" - comma-separated mix
 */
function parseVariablesPart(varsPart: string): {
  variables: Record<string, any> | null;
  variableNames: string[];
} {
  const trimmed = varsPart.trim();

  // Check if it's an object literal syntax
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    // This is a variable reference, not a literal object
    // We'll resolve it at runtime
    return {
      variables: null,
      variableNames: [trimmed],
    };
  }

  // Parse comma-separated list of variables and key-value pairs
  const variableNames: string[] = [];
  const literalValues: Record<string, string> = {};

  // Split by comma, but respect quotes
  const parts = splitByComma(trimmed);

  for (const part of parts) {
    const cleaned = part.trim();
    if (!cleaned) continue;

    // Check if it's a key="value" or key=value pattern
    const assignMatch = cleaned.match(/^(\w+)\s*=\s*(.+)$/);

    if (assignMatch) {
      const [, key, value] = assignMatch;
      // Store the literal value (remove quotes if present)
      literalValues[key.trim()] = extractTemplatePath(value.trim());
    } else {
      // It's a variable name
      variableNames.push(cleaned);
    }
  }

  // If we have literal values, return them separately
  // The directive will merge them with resolved variables
  return {
    variables: Object.keys(literalValues).length > 0 ? literalValues : null,
    variableNames,
  };
}

/**
 * Split a string by comma, respecting quotes and braces
 */
function splitByComma(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let braceDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if ((char === '"' || char === "'") && str[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
      current += char;
    } else if (char === '{' && !inQuotes) {
      braceDepth++;
      current += char;
    } else if (char === '}' && !inQuotes) {
      braceDepth--;
      current += char;
    } else if (char === ',' && !inQuotes && braceDepth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Normalize template path by adding .aptl extension if not present
 */
export function normalizeTemplatePath(path: string): string {
  // If it already has an extension, don't add another
  if (path.endsWith('.aptl')) {
    return path;
  }

  // Add .aptl extension
  return `${path}.aptl`;
}

/**
 * IncludeDirective class
 * Includes and renders partial templates with optional variable scoping
 *
 * Usage:
 *   @include "common/guidelines"
 *   @include "common/guidelines.aptl"
 *   @include "common/guidelines" with {language: "en"}
 *   @include "snippets/tools" with {tools: enabledTools}
 *   @include "snippets/query" with query, options={}
 */
export class IncludeDirective extends InlineDirective {
  readonly name = 'include';
  readonly requiresTopLevel = false;
  readonly unique = false;

  constructor(private templateRegistry: TemplateRegistry) {
    super();
  }

  /**
   * Parse include arguments
   */
  parseArguments(rawArgs: string): any {
    return parseIncludeArgs(rawArgs);
  }

  /**
   * Validate include directive
   */
  validate(node: DirectiveNode): void {
    if (!node.rawArgs || !node.rawArgs.trim()) {
      throw new APTLSyntaxError(
        'Include directive requires a template path',
        node.line,
        node.column,
      );
    }
  }

  /**
   * Parse and prepare the include directive
   * Loads the referenced template and validates it exists
   */
  async parse(node: DirectiveNode): Promise<void> {
    // Parse arguments if not already done
    if (!node.parsedArgs) {
      node.parsedArgs = parseIncludeArgs(node.rawArgs);
    }

    const { templatePath } = node.parsedArgs;

    // Normalize the template path (add .aptl if needed)
    const normalizedPath = normalizeTemplatePath(templatePath);

    // Check if template is already loaded
    if (
      this.templateRegistry.has(normalizedPath) ||
      this.templateRegistry.has(templatePath)
    ) {
      return; // Already loaded
    }

    // Try to load the template from filesystem
    const fs = this.templateRegistry.getFileSystem();

    // Try both paths
    const pathsToTry = [normalizedPath, templatePath];
    let loaded = false;

    for (const path of pathsToTry) {
      try {
        await this.templateRegistry.loadFile(path);
        loaded = true;
        break;
      } catch (error) {
        // Try next path
        continue;
      }
    }

    if (!loaded) {
      throw new APTLRuntimeError(
        `Template not found: ${normalizedPath}. Cannot load template for @include directive.`,
        { templatePath: normalizedPath, line: node.line, column: node.column },
      );
    }
  }

  /**
   * Execute the include directive
   */
  execute(context: DirectiveContext): string {
    // Parse arguments if not already done
    if (!context.node.parsedArgs) {
      context.node.parsedArgs = parseIncludeArgs(context.node.rawArgs);
    }

    const { templatePath, variables, variableNames } = context.node.parsedArgs;

    // Normalize the template path (add .aptl if needed)
    const normalizedPath = normalizeTemplatePath(templatePath);

    // Get the template from the registry
    // Try both normalized and original paths
    let template;
    try {
      if (this.templateRegistry.has(normalizedPath)) {
        template = this.templateRegistry.get(normalizedPath);
      } else if (this.templateRegistry.has(templatePath)) {
        template = this.templateRegistry.get(templatePath);
      } else {
        throw new APTLRuntimeError(
          `Template not found: ${normalizedPath}. Templates must be registered or loaded before use.`,
          { templatePath: normalizedPath },
        );
      }
    } catch (error) {
      if (error instanceof APTLRuntimeError) {
        throw error;
      }
      throw new APTLRuntimeError(
        `Failed to load template '${normalizedPath}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { templatePath: normalizedPath },
      );
    }

    // Prepare the data context for the included template
    const includeData = this.prepareIncludeData(
      context.data,
      variables,
      variableNames,
    );

    // Render the included template with the merged data
    try {
      return template.render(includeData);
    } catch (error) {
      throw new APTLRuntimeError(
        `Failed to render included template '${normalizedPath}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        { templatePath: normalizedPath, data: includeData },
      );
    }
  }

  /**
   * Prepare the data context for the included template
   * Merges parent context with provided variables
   */
  private prepareIncludeData(
    parentData: Record<string, any>,
    variables: Record<string, any> | null,
    variableNames: string[],
  ): Record<string, any> {
    // Start with parent context (allowing access to parent variables)
    const includeData = { ...parentData };

    // If we have variable names to resolve from parent context
    for (const varName of variableNames) {
      // Check if it's an object reference like {key: value}
      if (varName.startsWith('{') && varName.endsWith('}')) {
        // Try to resolve it as a variable first
        const resolved = this.resolveVariable(varName, parentData);
        if (resolved !== undefined && typeof resolved === 'object') {
          // Merge the resolved object
          Object.assign(includeData, resolved);
        }
      } else {
        // Regular variable name - use the name as the key
        const value = this.resolveVariable(varName, parentData);
        if (value !== undefined) {
          includeData[varName] = value;
        }
      }
    }

    // Override with any literal values provided
    if (variables) {
      Object.assign(includeData, variables);
    }

    return includeData;
  }

  /**
   * Resolve a variable path from data context
   */
  private resolveVariable(path: string, data: Record<string, any>): any {
    // Handle nested paths like "user.name"
    const parts = path.split('.');
    let current: any = data;

    for (const part of parts) {
      if (current == null) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
