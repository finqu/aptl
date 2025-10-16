/**
 * Template Validator
 * Validates template structure and syntax
 */

import {
  TemplateNode,
  ASTNode,
  NodeType,
  SectionNode,
  ConditionalNode,
  IterationNode,
  VariableNode,
} from '../core/types';
import { APTLValidationError, APTLSyntaxError } from '../utils/errors';
import { Tokenizer } from '../core/tokenizer';
import { Parser } from '../core/parser';

export interface ValidationOptions {
  strict?: boolean; // Strict mode - validate undefined variables
  allowEmptySections?: boolean; // Allow sections with no content
  validateVariables?: boolean; // Validate variable paths format
  maxNestingDepth?: number; // Maximum nesting depth for blocks
}

export class TemplateValidator {
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      strict: false,
      allowEmptySections: true,
      validateVariables: true,
      maxNestingDepth: 50,
      ...options,
    };
  }

  /**
   * Validate a template AST
   */
  validate(ast: TemplateNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Check for proper nesting depth
      this.validateNestingDepth(ast, 0, errors);

      // Validate all nodes in the tree
      this.validateNode(ast, errors);

      // Check for unclosed blocks (should be caught during parsing, but double-check)
      this.validateBlockClosure(ast, errors);

      // Validate section attributes
      this.validateSections(ast, errors);

      // Validate variables
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

    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.validateNestingDepth(child, depth + 1, errors);
      }
    }

    if (node.type === NodeType.CONDITIONAL) {
      const conditional = node as ConditionalNode;
      if (conditional.consequent) {
        for (const child of conditional.consequent) {
          this.validateNestingDepth(child, depth + 1, errors);
        }
      }
      if (conditional.alternate) {
        if (Array.isArray(conditional.alternate)) {
          for (const child of conditional.alternate) {
            this.validateNestingDepth(child, depth + 1, errors);
          }
        } else {
          this.validateNestingDepth(conditional.alternate, depth + 1, errors);
        }
      }
    }
  }

  /**
   * Validate individual nodes
   */
  private validateNode(node: ASTNode, errors: string[]): void {
    switch (node.type) {
      case NodeType.SECTION:
        this.validateSectionNode(node as SectionNode, errors);
        break;
      case NodeType.CONDITIONAL:
        this.validateConditionalNode(node as ConditionalNode, errors);
        break;
      case NodeType.ITERATION:
        this.validateIterationNode(node as IterationNode, errors);
        break;
      case NodeType.VARIABLE:
        this.validateVariableNode(node as VariableNode, errors);
        break;
    }

    // Recursively validate children
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.validateNode(child, errors);
      }
    }

    if (node.type === NodeType.CONDITIONAL) {
      const conditional = node as ConditionalNode;
      if (conditional.consequent) {
        for (const child of conditional.consequent) {
          this.validateNode(child, errors);
        }
      }
      if (conditional.alternate) {
        if (Array.isArray(conditional.alternate)) {
          for (const child of conditional.alternate) {
            this.validateNode(child, errors);
          }
        } else {
          this.validateNode(conditional.alternate, errors);
        }
      }
    }
  }

  /**
   * Validate section node
   */
  private validateSectionNode(node: SectionNode, errors: string[]): void {
    // Check section name is valid
    if (!node.name || node.name.trim() === '') {
      errors.push(
        `Section has empty name at line ${node.line}, column ${node.column}`,
      );
    }

    // Check section name format (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(node.name)) {
      errors.push(
        `Invalid section name "${node.name}" at line ${node.line}. Section names must contain only letters, numbers, underscores, and hyphens.`,
      );
    }

    // Check for empty sections if not allowed
    if (!this.options.allowEmptySections && node.children.length === 0) {
      errors.push(
        `Empty section "${node.name}" at line ${node.line}. Sections must have content.`,
      );
    }

    // Validate attributes
    if (node.attributes) {
      for (const [key, value] of Object.entries(node.attributes)) {
        if (!key || key.trim() === '') {
          errors.push(
            `Empty attribute name in section "${node.name}" at line ${node.line}`,
          );
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          errors.push(
            `Invalid attribute name "${key}" in section "${node.name}" at line ${node.line}`,
          );
        }
      }
    }
  }

  /**
   * Validate conditional node
   */
  private validateConditionalNode(
    node: ConditionalNode,
    errors: string[],
  ): void {
    // Check condition is not empty
    if (!node.condition || node.condition.trim() === '') {
      errors.push(
        `Empty condition in @if at line ${node.line}, column ${node.column}`,
      );
    }

    // Check for valid condition syntax
    const condition = node.condition.trim();
    if (condition.includes('==') || condition.includes('!=')) {
      // Check operator isn't at start or end
      if (
        condition.startsWith('==') ||
        condition.startsWith('!=') ||
        condition.endsWith('==') ||
        condition.endsWith('!=')
      ) {
        errors.push(
          `Invalid condition syntax at line ${node.line}: "${node.condition}"`,
        );
      }
    }
  }

  /**
   * Validate iteration node
   */
  private validateIterationNode(node: IterationNode, errors: string[]): void {
    // Check item name is valid
    if (!node.itemName || node.itemName.trim() === '') {
      errors.push(
        `Empty item name in @each at line ${node.line}, column ${node.column}`,
      );
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(node.itemName)) {
      errors.push(
        `Invalid item name "${node.itemName}" in @each at line ${node.line}. Must be a valid identifier.`,
      );
    }

    // Check array path is valid
    if (!node.arrayPath || node.arrayPath.trim() === '') {
      errors.push(
        `Empty array path in @each at line ${node.line}, column ${node.column}`,
      );
    }

    // Check iteration has content
    if (node.children.length === 0) {
      errors.push(
        `Empty iteration block at line ${node.line}. @each blocks must have content.`,
      );
    }
  }

  /**
   * Validate variable node
   */
  private validateVariableNode(node: VariableNode, errors: string[]): void {
    // Only validate if validateVariables option is enabled
    if (!this.options.validateVariables) {
      return;
    }

    // Check path is not empty
    if (!node.path || node.path.trim() === '') {
      errors.push(
        `Empty variable path at line ${node.line}, column ${node.column}`,
      );
    }

    // Check path format (dotted notation)
    const path = node.path.trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(path)) {
      errors.push(
        `Invalid variable path "${node.path}" at line ${node.line}. Must be a valid dotted path (e.g., user.name).`,
      );
    }
  }

  /**
   * Validate all blocks are properly closed
   */
  private validateBlockClosure(node: ASTNode, errors: string[]): void {
    // This is mostly handled by the parser, but we can add extra checks here
    // For now, just verify the structure is complete
    if (
      node.type === NodeType.SECTION ||
      node.type === NodeType.CONDITIONAL ||
      node.type === NodeType.ITERATION
    ) {
      if (!('children' in node)) {
        errors.push(
          `Block node at line ${node.line} is missing children array`,
        );
      }
    }
  }

  /**
   * Validate all sections in the template
   */
  private validateSections(node: ASTNode, errors: string[]): void {
    if (node.type === NodeType.SECTION) {
      const section = node as SectionNode;

      // Check for duplicate section names (warn only, not an error)
      // This would require tracking all section names, skipping for now

      // Validate section-specific rules
      if (section.name === 'system' || section.name === 'user') {
        // Could add specific validation for known section types
      }
    }

    // Recursively check children
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.validateSections(child, errors);
      }
    }

    if (node.type === NodeType.CONDITIONAL) {
      const conditional = node as ConditionalNode;
      if (conditional.consequent) {
        for (const child of conditional.consequent) {
          this.validateSections(child, errors);
        }
      }
      if (conditional.alternate) {
        if (Array.isArray(conditional.alternate)) {
          for (const child of conditional.alternate) {
            this.validateSections(child, errors);
          }
        } else {
          this.validateSections(conditional.alternate, errors);
        }
      }
    }
  }

  /**
   * Validate all variable paths in the template
   */
  private validateVariablePaths(node: ASTNode, errors: string[]): void {
    if (node.type === NodeType.VARIABLE) {
      this.validateVariableNode(node as VariableNode, errors);
    }

    // Recursively check children
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.validateVariablePaths(child, errors);
      }
    }

    if (node.type === NodeType.CONDITIONAL) {
      const conditional = node as ConditionalNode;
      if (conditional.consequent) {
        for (const child of conditional.consequent) {
          this.validateVariablePaths(child, errors);
        }
      }
      if (conditional.alternate) {
        if (Array.isArray(conditional.alternate)) {
          for (const child of conditional.alternate) {
            this.validateVariablePaths(child, errors);
          }
        } else {
          this.validateVariablePaths(conditional.alternate, errors);
        }
      }
    }
  }
}
