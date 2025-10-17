/**
 * Directive Type Definitions
 */

import { RenderContext, DirectiveNode, Token } from '@/core/types';
import type { BaseDirective } from './base-directive';

/**
 * Directive execution context
 */
export interface DirectiveContext extends RenderContext {
  /**
   * The AST node associated with this directive
   */
  node: DirectiveNode;

  /**
   * The parent template node (for directives that need access to siblings)
   */
  templateNode?: import('@/core/types').TemplateNode;

  /**
   * Custom metadata for directive-specific data
   * Each directive can store and retrieve its own data here
   */
  metadata: Map<string, any>;

  /**
   * Compile and render a template string
   */
  renderTemplate?: (template: string, data?: Record<string, any>) => string;

  /**
   * Render a specific AST node
   */
  renderNode?: (
    node: import('@/core/types').ASTNode,
    data?: Record<string, any>,
  ) => string;
}

/**
 * Directive argument parser function
 * Takes raw argument string and returns parsed arguments object
 * Can also take an array of tokens if tokenization is needed
 */
export type DirectiveArgumentParser = (
  rawArgs: string,
  tokens?: Token[],
) => any;

/**
 * Type for directives - only class-based directives are supported
 */
export type DirectiveType = BaseDirective;
