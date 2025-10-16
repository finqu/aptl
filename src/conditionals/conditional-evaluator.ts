/**
 * Conditional Evaluator
 * Evaluates conditional expressions using recursive descent evaluation
 */

import { VariableResolver } from '../data/variable-resolver';

export class ConditionalEvaluator {
  private variableResolver: VariableResolver;

  constructor() {
    this.variableResolver = new VariableResolver();
  }

  /**
   * Evaluate a conditional expression
   */
  evaluate(condition: string, data: Record<string, any>): boolean {
    // Trim the condition
    condition = condition.trim();

    // Handle empty condition
    if (!condition) {
      return false;
    }

    // Handle parentheses for grouping
    if (condition.includes('(')) {
      return this.evaluateWithParentheses(condition, data);
    }

    // Handle boolean literals (from parentheses evaluation)
    if (condition === 'true') return true;
    if (condition === 'false') return false;

    // Handle logical operators FIRST (before comparison operators)
    // Look for 'or' at the top level (lowest precedence)
    // Use regex to handle variable whitespace
    if (/ or /.test(condition)) {
      const parts = this.splitByOperator(condition, ' or ');
      return parts.some((part) => this.evaluate(part.trim(), data));
    }

    // Look for 'and' at the next level (higher precedence than 'or')
    // Use regex to handle variable whitespace
    if (/ and /.test(condition)) {
      const parts = this.splitByOperator(condition, ' and ');
      return parts.every((part) => this.evaluate(part.trim(), data));
    }

    // Handle negation
    if (condition.startsWith('not ')) {
      return !this.evaluate(condition.substring(4).trim(), data);
    }

    // Handle comparison operators (check in order of specificity)
    // Use regex to match operators even without surrounding whitespace
    if (/[^<>=!]==/.test(condition) || /^==/.test(condition)) {
      return this.evaluateComparison(condition, data, '==');
    }
    if (/[^<>=!]!=/.test(condition) || /^!=/.test(condition)) {
      return this.evaluateComparison(condition, data, '!=');
    }
    if (/[^<>]<=/.test(condition) || /^<=/.test(condition)) {
      return this.evaluateComparison(condition, data, '<=');
    }
    if (/[^<>]>=/.test(condition) || /^>=/.test(condition)) {
      return this.evaluateComparison(condition, data, '>=');
    }
    if (/[^<>]</.test(condition) || /^</.test(condition)) {
      return this.evaluateComparison(condition, data, '<');
    }
    if (/[^<>]>/.test(condition) || /^>/.test(condition)) {
      return this.evaluateComparison(condition, data, '>');
    }

    // Handle 'in' operator for array membership
    if (condition.includes(' in ')) {
      return this.evaluateInOperator(condition, data);
    }

    // Default to truthiness check (simple variable reference)
    const value = this.variableResolver.resolve(condition, data);
    return this.isTruthy(value);
  }

  /**
   * Handle parentheses for expression grouping
   */
  private evaluateWithParentheses(
    condition: string,
    data: Record<string, any>,
  ): boolean {
    let result = condition;

    // Find and evaluate innermost parentheses first
    while (result.includes('(')) {
      const start = result.lastIndexOf('(');
      const end = result.indexOf(')', start);

      if (end === -1) {
        throw new Error('Unmatched opening parenthesis');
      }

      const inner = result.substring(start + 1, end);
      const innerResult = this.evaluate(inner, data);

      // Replace the parenthesized expression with its result
      result =
        result.substring(0, start) +
        (innerResult ? 'true' : 'false') +
        result.substring(end + 1);
    }

    return this.evaluate(result, data);
  }

  /**
   * Split a condition by an operator, respecting parentheses
   */
  private splitByOperator(condition: string, operator: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    // Normalize the operator by trimming it
    const normalizedOp = operator.trim();

    for (let i = 0; i < condition.length; i++) {
      const char = condition[i];

      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (depth === 0) {
        // Check if we're at an operator position (with variable whitespace)
        // Look ahead to match the operator word
        const remaining = condition.substring(i).trimStart();
        if (
          remaining.startsWith(normalizedOp) &&
          (remaining.length === normalizedOp.length ||
            /\s/.test(remaining[normalizedOp.length]))
        ) {
          parts.push(current.trim());
          current = '';
          // Skip past the operator and any surrounding whitespace
          while (i < condition.length && /\s/.test(condition[i])) {
            i++;
          }
          i += normalizedOp.length - 1;
          continue;
        }
        current += char;
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  /**
   * Evaluate 'in' operator for array membership
   */
  private evaluateInOperator(
    condition: string,
    data: Record<string, any>,
  ): boolean {
    const [left, right] = condition.split(' in ').map((s) => s.trim());

    const item = this.getValue(left, data);
    const array = this.getValue(right, data);

    if (!Array.isArray(array)) {
      return false;
    }

    return array.includes(item);
  }

  private evaluateComparison(
    condition: string,
    data: Record<string, any>,
    operator: string,
  ): boolean {
    const [left, right] = condition.split(operator).map((s) => s.trim());

    const leftValue = this.getValue(left, data);
    const rightValue = this.getValue(right, data);

    switch (operator) {
      case '==':
        return leftValue == rightValue;
      case '!=':
        return leftValue != rightValue;
      case '<':
        return leftValue < rightValue;
      case '>':
        return leftValue > rightValue;
      case '<=':
        return leftValue <= rightValue;
      case '>=':
        return leftValue >= rightValue;
      default:
        return false;
    }
  }

  private getValue(expr: string, data: Record<string, any>): any {
    // Check if it's a quoted string
    if (
      (expr.startsWith('"') && expr.endsWith('"')) ||
      (expr.startsWith("'") && expr.endsWith("'"))
    ) {
      return expr.slice(1, -1);
    }

    // Check if it's a number
    if (!isNaN(Number(expr))) {
      return Number(expr);
    }

    // Check if it's a boolean
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    // Otherwise, resolve as variable path
    return this.variableResolver.resolve(expr, data);
  }

  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    // Objects (including empty objects) are truthy, consistent with JavaScript
    if (typeof value === 'object') return true;
    return Boolean(value);
  }
}
