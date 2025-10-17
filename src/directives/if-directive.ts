/**
 * If/Elif/Else Directive
 * Conditional rendering based on expressions
 */

import { Directive, DirectiveContext } from './types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode, NodeType, ASTNode } from '@/core/types';
import { parseConditional } from './argument-parsers';
import { ConditionalEvaluator } from '@/conditionals/conditional-evaluator';

/**
 * Parse if/elif arguments - validate and return parsed result
 */
function parseIfArguments(rawArgs: string): any {
  return parseConditional(rawArgs);
}

/**
 * Validate if directive structure
 * - Must have a condition
 * - Can have elif/else siblings
 * - Must end with @end
 */
function validateIfDirective(node: DirectiveNode): void {
  if (!node.rawArgs || node.rawArgs.trim() === '') {
    throw new APTLSyntaxError(
      'If directive requires a condition argument',
      node.line,
      node.column,
    );
  }

  // Validate the conditional expression
  try {
    parseConditional(node.rawArgs);
  } catch (error) {
    throw new APTLSyntaxError(
      `Invalid condition in @if directive: ${error instanceof Error ? error.message : 'Unknown error'}`,
      node.line,
      node.column,
    );
  }
}

/**
 * Validate elif directive
 */
function validateElifDirective(node: DirectiveNode): void {
  if (!node.rawArgs || node.rawArgs.trim() === '') {
    throw new APTLSyntaxError(
      'Elif directive requires a condition argument',
      node.line,
      node.column,
    );
  }

  // Validate the conditional expression
  try {
    parseConditional(node.rawArgs);
  } catch (error) {
    throw new APTLSyntaxError(
      `Invalid condition in @elif directive: ${error instanceof Error ? error.message : 'Unknown error'}`,
      node.line,
      node.column,
    );
  }
}

/**
 * Find elif and else branches in the if directive's children
 * Returns structured branches: { type: 'elif'|'else', node: DirectiveNode, condition?: string }
 */
export interface ConditionalBranch {
  type: 'if' | 'elif' | 'else';
  condition?: string;
  children: ASTNode[];
  node?: DirectiveNode;
}

/**
 * Extract conditional branches from if directive
 * Exported for testing purposes
 */
export function extractConditionalBranches(
  ifNode: DirectiveNode,
): ConditionalBranch[] {
  const branches: ConditionalBranch[] = [];

  // First branch is the if itself
  const ifChildren: ASTNode[] = [];
  let currentChildren = ifChildren;

  // Process children to find elif/else at the same nesting level
  for (const child of ifNode.children) {
    if (child.type === NodeType.DIRECTIVE) {
      const directiveNode = child as DirectiveNode;

      if (directiveNode.name === 'elif') {
        // Save current if/elif branch
        if (branches.length === 0) {
          // First branch is if
          branches.push({
            type: 'if',
            condition: ifNode.rawArgs,
            children: ifChildren,
            node: ifNode,
          });
        }

        // Add elif branch with its own children
        branches.push({
          type: 'elif',
          condition: directiveNode.rawArgs,
          children: directiveNode.children,
          node: directiveNode,
        });
        // Create new array for next branch (in case there's an else after this)
        currentChildren = [];
      } else if (directiveNode.name === 'else') {
        // Save current branch
        if (branches.length === 0) {
          branches.push({
            type: 'if',
            condition: ifNode.rawArgs,
            children: ifChildren,
            node: ifNode,
          });
        }

        // Add else branch with its own children
        branches.push({
          type: 'else',
          children: directiveNode.children,
          node: directiveNode,
        });
        // No more branches should come after else
        currentChildren = [];
      } else {
        // Regular nested directive
        currentChildren.push(child);
      }
    } else {
      // Text or variable node
      currentChildren.push(child);
    }
  }

  // If no elif/else was found, return just the if branch
  if (branches.length === 0) {
    branches.push({
      type: 'if',
      condition: ifNode.rawArgs,
      children: ifChildren,
      node: ifNode,
    });
  }

  return branches;
}

/**
 * @if directive
 * Conditionally renders content based on an expression
 *
 * Usage:
 *   @if user.isActive
 *   User is active
 *   @end
 *
 *   @if user.age >= 18
 *   Adult content
 *   @elif user.age >= 13
 *   Teen content
 *   @else
 *   Child content
 *   @end
 */
export const ifDirective: Directive = {
  name: 'if',
  requiresTopLevel: false,
  unique: false,

  validate: validateIfDirective,
  parseArguments: parseIfArguments,

  handler: (context: DirectiveContext): string => {
    const evaluator = new ConditionalEvaluator();

    // Extract all conditional branches (if/elif/else)
    const branches = extractConditionalBranches(context.node);

    // Ensure renderTemplate is available
    if (!context.renderTemplate) {
      throw new APTLRuntimeError(
        '@if directive requires renderTemplate function in context',
      );
    }

    // Evaluate conditions in order until one is true
    for (const branch of branches) {
      if (branch.type === 'else') {
        // Else branch - always render if we reach it
        // Pass the children to renderTemplate which will render them
        // For now, we need to store them in metadata so the compiler can render them
        context.metadata.set('childrenToRender', branch.children);
        // Trigger rendering through the compiler
        return context.renderTemplate('', {});
      }

      // Evaluate if or elif condition
      if (branch.condition) {
        try {
          const result = evaluator.evaluate(branch.condition, context.data);

          if (result) {
            // Condition is true - render this branch
            context.metadata.set('childrenToRender', branch.children);
            // Trigger rendering through the compiler
            return context.renderTemplate('', {});
          }
        } catch (error) {
          // Check strict mode from context options if available
          const isStrict = (context as any).strict || false;
          if (isStrict) {
            throw new APTLRuntimeError(
              `Error evaluating condition in @${branch.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              { condition: branch.condition },
            );
          }
          // In non-strict mode, treat error as false
          continue;
        }
      }
    }

    // No condition was true - render nothing
    return '';
  },
};

/**
 * @elif directive (handled as part of @if)
 */
export const elifDirective: Directive = {
  name: 'elif',
  requiresTopLevel: false,
  unique: false,
  hasBody: true,
  bodyTerminators: ['elif', 'else', 'end'],

  validate: validateElifDirective,
  parseArguments: parseIfArguments,

  handler: (context: DirectiveContext): string => {
    // Elif is handled by the if directive
    // This should not be called independently
    throw new APTLRuntimeError(
      '@elif directive must be used within an @if block',
    );
  },
};

/**
 * @else directive (handled as part of @if)
 */
export const elseDirective: Directive = {
  name: 'else',
  requiresTopLevel: false,
  unique: false,
  hasBody: true,
  bodyTerminators: ['end'],

  validate: (node: DirectiveNode) => {
    // Else should not have arguments
    if (node.rawArgs && node.rawArgs.trim() !== '') {
      throw new APTLSyntaxError(
        '@else directive does not accept arguments',
        node.line,
        node.column,
      );
    }
  },

  handler: (context: DirectiveContext): string => {
    // Else is handled by the if directive
    // This should not be called independently
    throw new APTLRuntimeError(
      '@else directive must be used within an @if block',
    );
  },
};
