/**
 * Common Argument Parsers for Directives
 * Reusable parsers for common directive argument patterns
 *
 * Uses the tokenizer for consistent, robust parsing
 */

import { APTLSyntaxError } from '@/utils/errors';
import { Tokenizer } from '@/core/tokenizer';
import { TokenType, Token } from '@/core/types';

/**
 * Parse key-value attributes from parenthesized format
 * Example: (key1="value1", key2="value2") or key1="value1", key2="value2"
 */
export function parseAttributes(rawArgs: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const trimmed = rawArgs.trim();

  if (!trimmed) {
    return attributes;
  }

  // Tokenize the arguments using the directive argument mode
  // In this mode, quotes are treated as string delimiters
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenizeDirectiveArguments(trimmed);

  let i = 0;

  // Skip opening parenthesis if present
  if (tokens[i]?.type === TokenType.LPAREN) {
    i++;
  }

  while (i < tokens.length && tokens[i].type !== TokenType.EOF) {
    const token = tokens[i];

    // Stop at closing parenthesis
    if (token.type === TokenType.RPAREN) {
      break;
    }

    // Expect: IDENTIFIER = STRING/VALUE
    if (token.type === TokenType.TEXT) {
      const key = token.value.trim();

      if (!key) {
        i++;
        continue;
      }

      i++;

      // Expect assignment operator
      if (i >= tokens.length || tokens[i].type !== TokenType.ASSIGN) {
        throw new APTLSyntaxError(
          `Expected '=' after attribute key '${key}'`,
          token.line,
          token.column,
        );
      }

      i++; // Skip '='

      // Get the value (STRING or TEXT token)
      if (i >= tokens.length) {
        throw new APTLSyntaxError(
          `Expected value after '=' for attribute '${key}'`,
          token.line,
          token.column,
        );
      }

      const valueToken = tokens[i];
      let value: string;

      if (valueToken.type === TokenType.STRING) {
        value = valueToken.value;
      } else if (valueToken.type === TokenType.TEXT) {
        value = valueToken.value.trim();
      } else {
        throw new APTLSyntaxError(
          `Expected string or value for attribute '${key}', got ${valueToken.type}`,
          valueToken.line,
          valueToken.column,
        );
      }

      attributes[key] = value;
      i++;

      // Skip comma if present
      if (
        i < tokens.length &&
        tokens[i].type === TokenType.PUNCTUATION &&
        tokens[i].value === ','
      ) {
        i++;
      }
    } else if (token.type === TokenType.PUNCTUATION && token.value === ',') {
      // Skip extra commas
      i++;
    } else if (token.type === TokenType.NEWLINE) {
      // Skip newlines
      i++;
    } else {
      i++;
    }
  }

  return attributes;
}

/**
 * Parse section-style arguments
 * Example: "sectionName" or "sectionName(attr1="val1")"
 */
export function parseSectionArgs(rawArgs: string): {
  name: string;
  attributes: Record<string, string>;
} {
  const trimmed = rawArgs.trim();

  if (!trimmed) {
    return { name: '', attributes: {} };
  }

  // Tokenize the arguments using directive argument mode
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenizeDirectiveArguments(trimmed);

  // First token should be the section name (TEXT or STRING)
  if (tokens.length === 0 || tokens[0].type === TokenType.EOF) {
    return { name: '', attributes: {} };
  }

  let name: string;
  if (tokens[0].type === TokenType.STRING) {
    // Handle quoted section names like "role"
    name = tokens[0].value.trim();
  } else if (tokens[0].type === TokenType.TEXT) {
    // Handle unquoted section names
    name = tokens[0].value.trim();
  } else {
    throw new APTLSyntaxError(
      `Expected section name, got ${tokens[0].type}`,
      tokens[0].line,
      tokens[0].column,
    );
  }

  // Find the next non-whitespace token after the section name
  let nextTokenIndex = 1;
  while (nextTokenIndex < tokens.length) {
    const token = tokens[nextTokenIndex];
    // Skip whitespace-only TEXT tokens and NEWLINE tokens
    if (
      token.type === TokenType.NEWLINE ||
      (token.type === TokenType.TEXT && token.value.trim() === '')
    ) {
      nextTokenIndex++;
    } else {
      break;
    }
  }

  // No more tokens after name
  if (
    nextTokenIndex >= tokens.length ||
    tokens[nextTokenIndex].type === TokenType.EOF
  ) {
    return {
      name,
      attributes: {},
    };
  }

  // Check if there are attributes
  // They can be:
  // 1. Wrapped in parentheses: (key="value")
  // 2. Without parentheses: key="value"
  const hasParentheses = tokens[nextTokenIndex].type === TokenType.LPAREN;

  let attrStart = nextTokenIndex;
  let attrEnd = tokens.length - 1;

  if (hasParentheses) {
    // Find the matching RPAREN
    let parenDepth = 0;
    for (let i = nextTokenIndex; i < tokens.length; i++) {
      if (tokens[i].type === TokenType.LPAREN) {
        parenDepth++;
      } else if (tokens[i].type === TokenType.RPAREN) {
        parenDepth--;
        if (parenDepth === 0) {
          attrEnd = i;
          break;
        }
      }
    }
  } else {
    // Find the last non-EOF token
    while (attrEnd >= 0 && tokens[attrEnd].type === TokenType.EOF) {
      attrEnd--;
    }
  }

  // Reconstruct the attribute string from tokens
  // For STRING tokens, keep them as-is (the value is already unquoted)
  // For other tokens, use their raw value
  let attrString = '';
  for (let i = attrStart; i <= attrEnd; i++) {
    const token = tokens[i];
    if (token.type === TokenType.STRING) {
      // STRING tokens need quotes re-added for parseAttributes
      // because parseAttributes will tokenize again
      attrString += `"${token.value}"`;
    } else if (token.type !== TokenType.EOF) {
      attrString += token.value;
    }
  }

  return {
    name,
    attributes: parseAttributes(attrString),
  };
} /**
 * Parse conditional expression
 * Supports: variables, comparisons, logical operators (and, or, not),
 * parentheses for grouping, and 'in' operator
 *
 * Examples:
 *   "user.isActive"
 *   "user.age >= 18"
 *   "status == \"completed\""
 *   "user.isActive and user.isPremium"
 *   "status == \"pending\" or status == \"approved\""
 *   "not user.isBlocked"
 *   "(user.age >= 18 and user.hasConsent) or user.isAdmin"
 *   "\"premium\" in user.roles"
 *
 * This parser performs basic syntax validation (balanced parentheses).
 * Semantic validation is handled by ConditionalEvaluator during evaluation.
 */
export function parseConditional(rawArgs: string): {
  condition: string;
} {
  const trimmed = rawArgs.trim();

  if (!trimmed) {
    throw new APTLSyntaxError('Empty conditional expression');
  }

  // Tokenize to validate basic syntax
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenize(trimmed);

  // Validate balanced parentheses
  validateBalancedParentheses(tokens);

  return {
    condition: trimmed,
  };
}

/**
 * Validate balanced parentheses in conditional expression
 */
function validateBalancedParentheses(tokens: Token[]): void {
  let parenDepth = 0;
  let firstUnmatched: Token | null = null;

  for (const token of tokens) {
    if (token.type === TokenType.LPAREN) {
      if (parenDepth === 0) {
        firstUnmatched = token;
      }
      parenDepth++;
    } else if (token.type === TokenType.RPAREN) {
      parenDepth--;
      if (parenDepth < 0) {
        throw new APTLSyntaxError(
          'Unmatched closing parenthesis in conditional',
          token.line,
          token.column,
        );
      }
    }
  }

  if (parenDepth > 0 && firstUnmatched) {
    throw new APTLSyntaxError(
      'Unmatched opening parenthesis in conditional',
      firstUnmatched.line,
      firstUnmatched.column,
    );
  }
}

/**
 * Parse iteration syntax
 * Example: "item in items" or "user, index in users"
 */
export function parseIteration(rawArgs: string): {
  itemName: string;
  indexName?: string;
  arrayPath: string;
} {
  const trimmed = rawArgs.trim();

  if (!trimmed) {
    throw new APTLSyntaxError('Empty iteration syntax');
  }

  // Tokenize the arguments
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenize(trimmed);

  // Collect all TEXT tokens and build the full string, looking for "in"
  let fullText = '';
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === TokenType.TEXT) {
      fullText += tokens[i].value;
    } else if (
      tokens[i].type === TokenType.PUNCTUATION &&
      tokens[i].value === ','
    ) {
      fullText += ',';
    } else if (tokens[i].type === TokenType.NEWLINE) {
      fullText += ' ';
    }
  }

  // Now parse using simple string split since we've reconstructed the full text
  const inMatch = fullText.match(/^(.+?)\s+in\s+(.+)$/);

  if (!inMatch) {
    throw new APTLSyntaxError(
      `Invalid iteration syntax: expected "item in array", missing 'in' keyword`,
    );
  }

  const leftPart = inMatch[1].trim();
  const arrayPath = inMatch[2].trim();

  if (!leftPart) {
    throw new APTLSyntaxError(`Missing item variable before 'in'`);
  }

  if (!arrayPath) {
    throw new APTLSyntaxError(`Missing array path after 'in'`);
  }

  // Parse left part for item and optional index
  const varParts = leftPart
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p);

  if (varParts.length === 0) {
    throw new APTLSyntaxError(`Missing item variable before 'in'`);
  } else if (varParts.length === 1) {
    return {
      itemName: varParts[0],
      arrayPath,
    };
  } else if (varParts.length === 2) {
    return {
      itemName: varParts[0],
      indexName: varParts[1],
      arrayPath,
    };
  } else {
    throw new APTLSyntaxError(
      `Invalid iteration syntax: expected "item in array" or "item, index in array", got "${rawArgs}"`,
    );
  }
}

/**
 * Parse simple positional arguments
 * Example: "templateName" or "slotName"
 */
export function parseSimpleArg(rawArgs: string): {
  value: string;
} {
  return {
    value: rawArgs.trim(),
  };
}

/**
 * Parse named parameters with optional positional
 * Example: "param1, key1=value1, key2=value2"
 */
export function parseNamedParams(rawArgs: string): {
  positional: string[];
  named: Record<string, string>;
} {
  const trimmed = rawArgs.trim();
  const positional: string[] = [];
  const named: Record<string, string> = {};

  if (!trimmed) {
    return { positional, named };
  }

  // Tokenize the arguments using directive argument mode
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenizeDirectiveArguments(trimmed);

  let i = 0;

  while (i < tokens.length && tokens[i].type !== TokenType.EOF) {
    const token = tokens[i];

    // Skip whitespace/newlines
    if (token.type === TokenType.NEWLINE) {
      i++;
      continue;
    }

    // Check for named parameter (TEXT followed by ASSIGN)
    if (token.type === TokenType.TEXT) {
      const key = token.value.trim();

      if (!key) {
        i++;
        continue;
      }

      // Peek ahead for assignment
      if (i + 1 < tokens.length && tokens[i + 1].type === TokenType.ASSIGN) {
        // It's a named parameter
        i++; // Move to ASSIGN
        i++; // Move to value

        if (i >= tokens.length || tokens[i].type === TokenType.EOF) {
          throw new APTLSyntaxError(
            `Expected value after '=' for parameter '${key}'`,
            token.line,
            token.column,
          );
        }

        const valueToken = tokens[i];
        let value: string;

        if (valueToken.type === TokenType.STRING) {
          value = valueToken.value;
        } else if (valueToken.type === TokenType.TEXT) {
          value = valueToken.value.trim();
        } else {
          throw new APTLSyntaxError(
            `Expected value for parameter '${key}', got ${valueToken.type}`,
            valueToken.line,
            valueToken.column,
          );
        }

        named[key] = value;
        i++;
      } else {
        // It's a positional parameter
        positional.push(key);
        i++;
      }
    } else if (token.type === TokenType.STRING) {
      // String literal as positional parameter
      positional.push(token.value);
      i++;
    } else if (token.type === TokenType.PUNCTUATION && token.value === ',') {
      // Skip commas
      i++;
    } else {
      i++;
    }
  }

  return { positional, named };
}
