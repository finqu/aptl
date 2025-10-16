/**
 * If Directive (Class-based)
 * Conditional rendering with elif/else support
 */

import { ConditionalDirective, DirectiveParser } from './base-directive';
import { DirectiveContext } from './types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode, NodeType, ASTNode, TokenType } from '@/core/types';
import { parseConditional } from './argument-parsers';
import { ConditionalEvaluator } from '@/conditionals/conditional-evaluator';

/**
 * Conditional branch interface
 */
export interface ConditionalBranch {
    type: 'if' | 'elif' | 'else';
    condition?: string;
    children: ASTNode[];
    node?: DirectiveNode;
}

/**
 * IfDirective class - handles @if, @elif, and @else
 */
export class IfDirective extends ConditionalDirective {
    readonly name = 'if';
    readonly hasBody = true;

    /**
     * Return the conditional keywords that this directive handles
     */
    getConditionalKeywords(): string[] {
        return ['elif', 'else'];
    }

    /**
     * Validate if directive arguments
     */
    validate(node: DirectiveNode): void {
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
     * Parse arguments (condition)
     */
    parseArguments(rawArgs: string): any {
        return parseConditional(rawArgs);
    }

    /**
     * Handle elif/else child directives during parsing
     * This is called by the parser when it encounters elif/else inside an if body
     */
    handleChildDirective(
        directiveName: string,
        parser: DirectiveParser,
        children: ASTNode[],
    ): boolean {
        const conditionalKeywords = this.getConditionalKeywords();

        // Handle elif
        if (directiveName === 'elif') {
            // Manually parse elif with awareness of other conditional keywords
            const elifNode = this.parseConditionalBranch(parser, 'elif', conditionalKeywords);
            children.push(elifNode);
            return true;
        }

        // Handle else
        if (directiveName === 'else') {
            // Manually parse else with awareness of end
            const elseNode = this.parseConditionalBranch(parser, 'else', []);
            children.push(elseNode);
            return true;
        }

        return false;
    }

    /**
     * Parse a conditional branch (elif/else) manually
     * This ensures the branch stops at the next conditional keyword or @end
     */
    private parseConditionalBranch(
        parser: DirectiveParser,
        branchType: string,
        stopKeywords: string[],
    ): DirectiveNode {
        const startToken = parser.advance(); // consume @elif or @else token

        // Read raw arguments
        const rawArgs = this.readUntilNewline(parser);

        // Validate arguments
        if (branchType === 'elif') {
            if (!rawArgs || rawArgs.trim() === '') {
                throw new APTLSyntaxError(
                    'Elif directive requires a condition argument',
                    startToken.line,
                    startToken.column,
                );
            }
            try {
                parseConditional(rawArgs);
            } catch (error) {
                throw new APTLSyntaxError(
                    `Invalid condition in @elif directive: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    startToken.line,
                    startToken.column,
                );
            }
        } else if (branchType === 'else') {
            if (rawArgs && rawArgs.trim() !== '') {
                throw new APTLSyntaxError(
                    '@else directive does not accept arguments',
                    startToken.line,
                    startToken.column,
                );
            }
        }

        // Parse the branch body until we hit a stop keyword or @end
        const branchChildren: ASTNode[] = [];
        while (!parser.isAtEnd()) {
            const nextToken = parser.peek();

            // Stop at @end
            if (nextToken.type === TokenType.END) {
                break;
            }

            // Stop at next conditional keyword (for elif, stop at else; for else, just stop at end)
            if (nextToken.type === TokenType.DIRECTIVE) {
                const nextDirectiveName = nextToken.value.toLowerCase();
                if (stopKeywords.includes(nextDirectiveName) || nextDirectiveName === 'end') {
                    break;
                }
            }

            const node = parser.parseStatement();
            if (node) {
                branchChildren.push(node);
            }
        }

        return {
            type: NodeType.DIRECTIVE,
            name: branchType,
            rawArgs,
            children: branchChildren,
            line: startToken.line,
            column: startToken.column,
        };
    }

    /**
     * Read tokens until newline
     */
    private readUntilNewline(parser: DirectiveParser): string {
        let text = '';
        while (!parser.isAtEnd() && parser.peek().type !== TokenType.NEWLINE) {
            const token = parser.peek();
            if (token.type === TokenType.STRING) {
                text += `"${token.value}"`;
            } else {
                text += token.value;
            }
            parser.advance();
        }
        if (parser.peek().type === TokenType.NEWLINE) {
            parser.advance();
        }
        return text.trim();
    }

    /**
     * Extract conditional branches from if directive
     */
    private extractConditionalBranches(ifNode: DirectiveNode): ConditionalBranch[] {
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
     * Execute the if directive
     */
    execute(context: DirectiveContext): string {
        const evaluator = new ConditionalEvaluator();

        // Extract all conditional branches (if/elif/else)
        const branches = this.extractConditionalBranches(context.node);

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
                context.metadata.set('childrenToRender', branch.children);
                return context.renderTemplate('', context.data);
            }

            // Evaluate if or elif condition
            if (branch.condition) {
                try {
                    const result = evaluator.evaluate(branch.condition, context.data);

                    if (result) {
                        // Condition is true - render this branch
                        context.metadata.set('childrenToRender', branch.children);
                        return context.renderTemplate('', context.data);
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
    }
}
