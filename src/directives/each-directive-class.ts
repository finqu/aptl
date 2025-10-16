/**
 * Each Directive (Class-based)
 * Iteration over arrays with optional else branch for empty collections
 */

import { ConditionalDirective, DirectiveParser } from './base-directive';
import { DirectiveContext } from './types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { DirectiveNode, NodeType, ASTNode, TokenType } from '@/core/types';
import { parseIteration } from './argument-parsers';
import { VariableResolver } from '@/data/variable-resolver';

/**
 * Loop branch interface
 */
export interface LoopBranch {
    type: 'each' | 'else';
    children: ASTNode[];
    node?: DirectiveNode;
}

/**
 * EachDirective class - handles @each and @else
 */
export class EachDirective extends ConditionalDirective {
    readonly name = 'each';
    readonly hasBody = true;

    /**
     * Return the conditional keywords that this directive handles
     */
    getConditionalKeywords(): string[] {
        return ['else'];
    }

    /**
     * Validate each directive arguments
     */
    validate(node: DirectiveNode): void {
        if (!node.rawArgs || node.rawArgs.trim() === '') {
            throw new APTLSyntaxError(
                'Each directive requires iteration syntax: item in array',
                node.line,
                node.column,
            );
        }

        // Validate the iteration syntax
        try {
            parseIteration(node.rawArgs);
        } catch (error) {
            throw new APTLSyntaxError(
                `Invalid iteration syntax in @each directive: ${error instanceof Error ? error.message : 'Unknown error'}`,
                node.line,
                node.column,
            );
        }
    }

    /**
     * Parse arguments (iteration syntax)
     */
    parseArguments(rawArgs: string): any {
        return parseIteration(rawArgs);
    }

    /**
     * Handle else child directive during parsing
     */
    handleChildDirective(
        directiveName: string,
        parser: DirectiveParser,
        children: ASTNode[],
    ): boolean {
        const conditionalKeywords = this.getConditionalKeywords();

        // Handle else
        if (directiveName === 'else') {
            const elseNode = this.parseElseBranch(parser);
            children.push(elseNode);
            return true;
        }

        return false;
    }

    /**
     * Parse an else branch manually
     */
    private parseElseBranch(parser: DirectiveParser): DirectiveNode {
        const startToken = parser.advance(); // consume @else token

        // Read raw arguments
        const rawArgs = this.readUntilNewline(parser);

        // Validate arguments - else should not have arguments
        if (rawArgs && rawArgs.trim() !== '') {
            throw new APTLSyntaxError(
                '@else directive in @each does not accept arguments',
                startToken.line,
                startToken.column,
            );
        }

        // Parse the else body until we hit @end
        const elseChildren: ASTNode[] = [];
        while (!parser.isAtEnd()) {
            const nextToken = parser.peek();

            // Stop at @end
            if (nextToken.type === TokenType.END) {
                break;
            }

            const node = parser.parseStatement();
            if (node) {
                elseChildren.push(node);
            }
        }

        return {
            type: NodeType.DIRECTIVE,
            name: 'else',
            rawArgs,
            children: elseChildren,
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
     * Extract loop branches from each directive
     */
    private extractLoopBranches(eachNode: DirectiveNode): LoopBranch[] {
        const branches: LoopBranch[] = [];

        // First branch is the each itself
        const eachChildren: ASTNode[] = [];

        // Process children to find else at the same nesting level
        for (const child of eachNode.children) {
            if (child.type === NodeType.DIRECTIVE) {
                const directiveNode = child as DirectiveNode;

                if (directiveNode.name === 'else') {
                    // Save current each branch if we have content
                    if (branches.length === 0) {
                        branches.push({
                            type: 'each',
                            children: eachChildren,
                            node: eachNode,
                        });
                    }

                    // Add else branch with its own children
                    branches.push({
                        type: 'else',
                        children: directiveNode.children,
                        node: directiveNode,
                    });

                    // No more branches should come after else
                    break;
                } else {
                    // Regular nested directive
                    eachChildren.push(child);
                }
            } else {
                // Text or variable node
                eachChildren.push(child);
            }
        }

        // If no else was found, return just the each branch
        if (branches.length === 0) {
            branches.push({
                type: 'each',
                children: eachChildren,
                node: eachNode,
            });
        }

        return branches;
    }

    /**
     * Execute the each directive
     */
    execute(context: DirectiveContext): string {
        const variableResolver = new VariableResolver({
            allowUndefined: true,
            defaultValue: undefined,
        });

        // Extract loop branches (each/else)
        const branches = this.extractLoopBranches(context.node);

        // Ensure renderTemplate is available
        if (!context.renderTemplate) {
            throw new APTLRuntimeError(
                '@each directive requires renderTemplate function in context',
            );
        }

        // Parse iteration arguments
        const parsed = parseIteration(context.node.rawArgs);
        const { itemName, indexName, arrayPath } = parsed;

        // Resolve the array
        let array: any;
        try {
            array = variableResolver.resolve(arrayPath, context.data);
        } catch (error) {
            // Array not found - treat as empty
            array = null;
        }

        // Check if array is empty or not iterable
        if (!array || !Array.isArray(array) || array.length === 0) {
            // Render else branch if it exists
            const elseBranch = branches.find(b => b.type === 'else');
            if (elseBranch) {
                context.metadata.set('childrenToRender', elseBranch.children);
                // Use original context data for else branch
                return context.renderTemplate!('', context.data);
            }
            // No else branch - render nothing
            return '';
        }

        // Get the each branch
        const eachBranch = branches.find(b => b.type === 'each');
        if (!eachBranch) {
            return '';
        }

        // Iterate over the array
        const results: string[] = [];
        const totalLength = array.length;

        for (let i = 0; i < array.length; i++) {
            const item = array[i];

            // Create loop context with item and loop metadata
            const loopData = {
                ...context.data,
                [itemName]: item,
            };

            // Add index name if provided
            if (indexName) {
                loopData[indexName] = i;
            }

            // Add loop metadata
            loopData.loop = {
                index: i,
                first: i === 0,
                last: i === totalLength - 1,
                even: i % 2 === 0,
                odd: i % 2 !== 0,
                length: totalLength,
            };

            // Set the children to render
            context.metadata.set('childrenToRender', eachBranch.children);

            // Render this iteration with the loop data
            const result = context.renderTemplate!('', loopData);
            results.push(result);
        }

        return results.join('');
    }
}
