/**
 * Template Validator
 * Validates template structure and syntax
 *
 * Note: Directive-specific validation (sections, conditionals, iterations) is handled
 * by the parser and individual directive validators. This class focuses on general
 * AST structure validation and delegates syntax validation to the tokenizer/parser.
 */

import {
  TemplateNode,
  ASTNode,
  NodeType,
  VariableNode,
} from '../core/types';
import { APTLValidationError, APTLSyntaxError } from '@/utils/errors';
import { Tokenizer } from '@/core/tokenizer';
import { Parser } from '@/core/parser';

export interface ValidationOptions {
  validateVariables?: boolean; // Validate variable paths format
  maxNestingDepth?: number; // Maximum nesting depth for blocks
}

export class TemplateValidator {
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      validateVariables: true,
      maxNestingDepth: 50,
      ...options,
    };
  }

  /**
   * Validate a template AST
   * Performs general structure validation (nesting depth, variable paths)
   * Directive-specific validation is handled by the parser and directives themselves
   */
  validate(ast: TemplateNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check for proper nesting depth
      this.validateNestingDepth(ast, 0, errors);

      // Validate variables if enabled
      if (this.options.validateVariables) {
        this.validateVariablePaths(ast, errors);
      }
    } catch (e) {
      if (e instanceof Error) {
        errors.push(e.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate template syntax without compilation
   * Uses the tokenizer and parser to validate syntax
   */
  validateSyntax(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const tokenizer = new Tokenizer();
      const tokens = tokenizer.tokenize(template);
      const parser = new Parser();
      const ast = parser.parse(tokens);

      // Optionally run AST validation as well
      const astValidation = this.validate(ast);
      if (!astValidation.valid) {
        errors.push(...astValidation.errors);
      }
    } catch (e) {
      if (e instanceof APTLSyntaxError) {
        errors.push(e.toString());
      } else if (e instanceof Error) {
        errors.push(`Syntax error: ${e.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Throw validation error if template is invalid
   */
  assertValid(ast: TemplateNode): void {
    const result = this.validate(ast);
    if (!result.valid) {
      throw new APTLValidationError(
        'Template validation failed',
        result.errors,
      );
    }
  }

  /**
   * Validate nesting depth doesn't exceed maximum
   */
  private validateNestingDepth(
    node: ASTNode,
    depth: number,
    errors: string[],
  ): void {
    if (depth > (this.options.maxNestingDepth ?? 50)) {
      errors.push(
        `Maximum nesting depth exceeded (${this.options.maxNestingDepth})`,
      );
      return;
    }

    // Recursively check all children
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.validateNestingDepth(child, depth + 1, errors);
      }
    }
  }



  /**
   * Validate variable node
   */
  private validateVariableNode(node: VariableNode, errors: string[]): void {
    // Check path is not empty
    if (!node.path || node.path.trim() === '') {
      errors.push(
        `Empty variable path at line ${node.line}, column ${node.column}`,
      );
    }

    // Check path format (dotted notation with optional array access)
    const path = node.path.trim();

    // Allow dotted paths and array access: user.items[0].name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*|\[\d+\])*$/.test(path)) {
      errors.push(
        `Invalid variable path "${node.path}" at line ${node.line}. Must be a valid dotted path (e.g., user.name or items[0].name).`,
      );
    }
  }

  /**
   * Validate all variable paths in the template
   */
  private validateVariablePaths(node: ASTNode, errors: string[]): void {
    if (node.type === NodeType.VARIABLE) {
      this.validateVariableNode(node as VariableNode, errors);
    }

    // Recursively check children in all nodes
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.validateVariablePaths(child, errors);
      }
    }
  }
}
