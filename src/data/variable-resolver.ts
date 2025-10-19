/**
 * Variable Resolver
 * Resolves variable paths (e.g., user.profile.name, items[0].name) in the data context
 * Supports APTL syntax for variable interpolation
 */

import { VariableResolutionOptions } from '@/core/types';

export class VariableResolver {
  private options: VariableResolutionOptions;

  constructor(options: VariableResolutionOptions = {}) {
    this.options = {
      allowUndefined: true,
      defaultValue: '',
      ...options,
    };
  }

  /**
   * Resolve a variable path in the data context
   * Supports dot notation (user.name), array access (items[0]), and mixed (items[0].name)
   * Also supports default values with pipe syntax: name|"default value"
   */
  resolve(path: string, data: Record<string, any>): any {
    if (!path || path.trim() === '') {
      return this.options.defaultValue;
    }

    // Check if path contains a default value (pipe syntax)
    const pipeIndex = path.indexOf('|');
    let actualPath = path;
    let defaultValue: any = undefined;
    let hasDefaultValue = false;

    if (pipeIndex !== -1) {
      actualPath = path.substring(0, pipeIndex).trim();
      const defaultPart = path.substring(pipeIndex + 1).trim();

      // Parse the default value
      defaultValue = this.parseDefaultValue(defaultPart);
      hasDefaultValue = true;
    }

    try {
      const resolvedValue = this.resolvePath(actualPath, data);

      // If value is undefined/null
      if (resolvedValue === undefined || resolvedValue === null) {
        // If we have a pipe default, use it
        if (hasDefaultValue) {
          return defaultValue;
        }
        // Otherwise use the general default
        return this.handleUndefined(actualPath);
      }

      return resolvedValue;
    } catch (error) {
      // If we have a default value, return it instead of the general default
      if (hasDefaultValue) {
        return defaultValue;
      }
      return this.handleUndefined(actualPath);
    }
  }

  /**
   * Parse a default value from the pipe syntax
   * Supports: "string", 'string', numbers, booleans
   */
  private parseDefaultValue(value: string): any {
    const trimmed = value.trim();

    // String literals with quotes
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    // Boolean literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Number literals
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      return num;
    }

    // Otherwise return as-is
    return trimmed;
  }

  /**
   * Internal path resolution with support for arrays and object properties
   * Returns undefined if the path doesn't exist in the data
   */
  private resolvePath(path: string, data: Record<string, any>): any {
    // Split path into segments, handling both dots and brackets
    const segments = this.parsePath(path);
    let value: any = data;

    for (const segment of segments) {
      if (value == null) {
        return undefined;
      }

      if (segment.type === 'property') {
        value = value[segment.key];
      } else if (segment.type === 'index') {
        // Handle array index access
        const index = parseInt(segment.key, 10);
        if (isNaN(index)) {
          return undefined;
        }
        value = Array.isArray(value) ? value[index] : value[segment.key];
      }
    }

    return value;
  }

  /**
   * Parse a variable path into segments
   * Handles: user.name, items[0], items[0].name, data.0.value
   */
  private parsePath(
    path: string,
  ): Array<{ type: 'property' | 'index'; key: string }> {
    const segments: Array<{ type: 'property' | 'index'; key: string }> = [];
    let current = '';
    let inBrackets = false;
    let i = 0;

    while (i < path.length) {
      const char = path[i];

      if (char === '[' && !inBrackets) {
        // End of property name, start of bracket notation
        if (current) {
          segments.push({ type: 'property', key: current });
          current = '';
        }
        inBrackets = true;
      } else if (char === ']' && inBrackets) {
        // End of bracket notation
        if (current) {
          segments.push({ type: 'index', key: current });
          current = '';
        }
        inBrackets = false;
      } else if (char === '.' && !inBrackets) {
        // End of property name
        if (current) {
          // Check if it's a numeric key (like data.0.value)
          const isNumeric = /^\d+$/.test(current);
          segments.push({
            type: isNumeric ? 'index' : 'property',
            key: current,
          });
          current = '';
        }
      } else if (char !== '.' || inBrackets) {
        // Regular character
        current += char;
      }

      i++;
    }

    // Add the last segment
    if (current) {
      const isNumeric = /^\d+$/.test(current);
      segments.push({
        type: isNumeric && !inBrackets ? 'index' : 'property',
        key: current,
      });
    }

    return segments;
  }

  /**
   * Check if a path exists in the data (returns true if the path resolves to a defined value)
   */
  exists(path: string, data: Record<string, any>): boolean {
    try {
      // Temporarily use strict mode to check actual existence
      const segments = this.parsePath(path);
      let value: any = data;

      for (const segment of segments) {
        if (value == null) {
          return false;
        }

        if (segment.type === 'property') {
          if (!(segment.key in value)) {
            return false;
          }
          value = value[segment.key];
        } else if (segment.type === 'index') {
          const index = parseInt(segment.key, 10);
          if (isNaN(index)) {
            return false;
          }
          if (Array.isArray(value)) {
            if (index < 0 || index >= value.length) {
              return false;
            }
          } else if (!(segment.key in value)) {
            return false;
          }
          value = Array.isArray(value) ? value[index] : value[segment.key];
        }
      }

      // Return true for any defined value (including falsy values like 0, false, '')
      // but false for null and undefined
      return value !== undefined && value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Validate if a path is syntactically correct
   */
  validatePath(path: string): { valid: boolean; error?: string } {
    if (!path || path.trim() === '') {
      return { valid: false, error: 'Empty path' };
    }

    // Check for unclosed brackets first
    const openBrackets = (path.match(/\[/g) || []).length;
    const closeBrackets = (path.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      return { valid: false, error: 'Unclosed brackets' };
    }

    // Check for empty brackets or double dots
    if (path.includes('[]')) {
      return { valid: false, error: 'Invalid bracket content' };
    }

    if (path.includes('..')) {
      return { valid: false, error: 'Invalid path syntax' };
    }

    // Check for invalid bracket content
    const bracketContent = path.match(/\[([^\]]*)\]/g);
    if (bracketContent) {
      for (const bracket of bracketContent) {
        const content = bracket.slice(1, -1); // Remove [ and ]
        if (
          !content ||
          (!content.match(/^\d+$/) && !content.match(/^['"][^'"]*['"]$/))
        ) {
          return { valid: false, error: 'Invalid bracket content' };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Get all variable paths used in a template
   */
  extractPaths(template: string): string[] {
    const variableRegex = /@\{([^}]+)\}/g;
    const paths: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const path = match[1].trim();
      if (path && !paths.includes(path)) {
        paths.push(path);
      }
    }

    return paths;
  }

  private handleUndefined(path: string): any {
    if (this.options.allowUndefined) {
      return this.options.defaultValue;
    }
    throw new Error(`Undefined variable: ${path}`);
  }
}

// Legacy helper function for backward compatibility
export function resolveVariables(data: Record<string, any>): string {
  const resolvedData: Record<string, string> = {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      resolvedData[key] =
        typeof value === 'string' ? value : JSON.stringify(value);
    }
  }

  return Object.entries(resolvedData)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}
