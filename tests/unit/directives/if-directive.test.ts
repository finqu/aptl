/**
 * Tests for @if, @elif, @else directives
 */

import { ifDirective, elifDirective, elseDirective, extractConditionalBranches } from '@/directives/if-directive';
import { DirectiveContext } from '@/directives/types';
import { DirectiveNode, NodeType, TextNode } from '@/core/types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';
import { ConditionalEvaluator } from '@/conditionals/conditional-evaluator';

describe('If Directive', () => {
    describe('parseIfArguments', () => {
        it('should parse simple condition', () => {
            const result = ifDirective.parseArguments!('user.active');
            expect(result).toEqual({ condition: 'user.active' });
        });

        it('should parse condition with operators', () => {
            const result = ifDirective.parseArguments!('age >= 18');
            expect(result).toEqual({ condition: 'age >= 18' });
        });

        it('should parse complex condition with parentheses', () => {
            const result = ifDirective.parseArguments!('(a > 5) and (b < 10)');
            expect(result).toEqual({ condition: '(a > 5) and (b < 10)' });
        });

        it('should trim whitespace', () => {
            const result = ifDirective.parseArguments!('  user.active  ');
            expect(result).toEqual({ condition: 'user.active' });
        });

        it('should throw on empty condition', () => {
            expect(() => ifDirective.parseArguments!('')).toThrow(APTLSyntaxError);
        });

        it('should throw on unbalanced parentheses', () => {
            expect(() => ifDirective.parseArguments!('(a > 5')).toThrow(APTLSyntaxError);
        });
    });

    describe('validateIfDirective', () => {
        it('should validate correct if directive', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'user.active',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => ifDirective.validate!(node)).not.toThrow();
        });

        it('should throw if no condition provided', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: '',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => ifDirective.validate!(node)).toThrow(APTLSyntaxError);
            expect(() => ifDirective.validate!(node)).toThrow('requires a condition');
        });

        it('should throw if condition is only whitespace', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: '   ',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => ifDirective.validate!(node)).toThrow(APTLSyntaxError);
        });

        it('should throw on invalid condition syntax', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: '(unbalanced',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => ifDirective.validate!(node)).toThrow(APTLSyntaxError);
            expect(() => ifDirective.validate!(node)).toThrow('Invalid condition');
        });
    });

    describe('validateElifDirective', () => {
        it('should validate correct elif directive', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: 'age >= 13',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => elifDirective.validate!(node)).not.toThrow();
        });

        it('should throw if no condition provided', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: '',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => elifDirective.validate!(node)).toThrow(APTLSyntaxError);
            expect(() => elifDirective.validate!(node)).toThrow('requires a condition');
        });
    });

    describe('validateElseDirective', () => {
        it('should validate else directive without arguments', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'else',
                rawArgs: '',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => elseDirective.validate!(node)).not.toThrow();
        });

        it('should throw if arguments provided', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'else',
                rawArgs: 'some condition',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => elseDirective.validate!(node)).toThrow(APTLSyntaxError);
            expect(() => elseDirective.validate!(node)).toThrow('does not accept arguments');
        });
    });

    describe('ifDirective handler', () => {
        function createMockContext(
            node: DirectiveNode,
            data: Record<string, any> = {}
        ): DirectiveContext {
            const metadata = new Map<string, any>();

            return {
                node,
                data,
                scope: [],
                helpers: {},
                metadata,
                renderTemplate: (template: string, contextData?: Record<string, any>) => {
                    // Mock implementation - render children from metadata
                    const childrenToRender = metadata.get('childrenToRender') || node.children;
                    return childrenToRender
                        .map((child: any) => child.type === NodeType.TEXT ? child.value : '')
                        .join('');
                },
            };
        }

        function createTextNode(value: string): TextNode {
            return {
                type: NodeType.TEXT,
                value,
                line: 1,
                column: 1,
            };
        }

        it('should render content when condition is true', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'user.active',
                children: [createTextNode('User is active')],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { user: { active: true } });
            const result = ifDirective.handler(context);

            expect(result).toBe('User is active');
        });

        it('should not render content when condition is false', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'user.active',
                children: [createTextNode('User is active')],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { user: { active: false } });
            const result = ifDirective.handler(context);

            expect(result).toBe('');
        });

        it('should handle numeric comparisons', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 18',
                children: [createTextNode('Adult')],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 25 });
            const result = ifDirective.handler(context);

            expect(result).toBe('Adult');
        });

        it('should not render when numeric comparison is false', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 18',
                children: [createTextNode('Adult')],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 15 });
            const result = ifDirective.handler(context);

            expect(result).toBe('');
        });

        it('should handle complex boolean expressions', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: '(age >= 18) and user.active',
                children: [createTextNode('Valid')],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 25, user: { active: true } });
            const result = ifDirective.handler(context);

            expect(result).toBe('Valid');
        });

        it('should not throw in non-strict mode when condition evaluation fails', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'nonexistent.property',
                children: [createTextNode('Content')],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, {});
            const result = ifDirective.handler(context);

            // In non-strict mode, undefined properties evaluate to false
            expect(result).toBe('');
        });

        it('should throw if renderTemplate is not available', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'true',
                children: [createTextNode('Content')],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node);
            delete context.renderTemplate;

            expect(() => ifDirective.handler(context)).toThrow(APTLRuntimeError);
            expect(() => ifDirective.handler(context)).toThrow('requires renderTemplate');
        });
    });

    describe('elif/else handling', () => {
        function createMockContext(
            node: DirectiveNode,
            data: Record<string, any> = {}
        ): DirectiveContext {
            const metadata = new Map<string, any>();

            return {
                node,
                data,
                scope: [],
                helpers: {},
                metadata,
                renderTemplate: (template: string, contextData?: Record<string, any>) => {
                    const childrenToRender = metadata.get('childrenToRender') || node.children;
                    return childrenToRender
                        .map((child: any) => child.type === NodeType.TEXT ? child.value : '')
                        .join('');
                },
            };
        }

        function createTextNode(value: string): TextNode {
            return {
                type: NodeType.TEXT,
                value,
                line: 1,
                column: 1,
            };
        }

        it('should render elif branch when if condition is false', () => {
            const elifNode: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: 'age >= 13',
                children: [createTextNode('Teen')],
                line: 2,
                column: 1,
            };

            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 18',
                children: [
                    createTextNode('Adult'),
                    elifNode,
                ],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 15 });
            const result = ifDirective.handler(context);

            expect(result).toBe('Teen');
        });

        it('should render else branch when all conditions are false', () => {
            const elifNode: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: 'age >= 13',
                children: [createTextNode('Teen')],
                line: 2,
                column: 1,
            };

            const elseNode: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'else',
                rawArgs: '',
                children: [createTextNode('Child')],
                line: 3,
                column: 1,
            };

            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 18',
                children: [
                    createTextNode('Adult'),
                    elifNode,
                    elseNode,
                ],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 10 });
            const result = ifDirective.handler(context);

            expect(result).toBe('Child');
        });

        it('should render only first true condition (if before elif)', () => {
            const elifNode: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: 'age >= 10',
                children: [createTextNode('Also true')],
                line: 2,
                column: 1,
            };

            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 15',
                children: [
                    createTextNode('First true'),
                    elifNode,
                ],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 20 });
            const result = ifDirective.handler(context);

            expect(result).toBe('First true');
        });

        it('should skip elif when if is true', () => {
            const elifNode: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: 'true',
                children: [createTextNode('Elif')],
                line: 2,
                column: 1,
            };

            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'true',
                children: [
                    createTextNode('If'),
                    elifNode,
                ],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, {});
            const result = ifDirective.handler(context);

            expect(result).toBe('If');
        });

        it('should handle multiple elif branches', () => {
            const elif1: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: 'age >= 13',
                children: [createTextNode('Teen')],
                line: 2,
                column: 1,
            };

            const elif2: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: 'age >= 6',
                children: [createTextNode('Kid')],
                line: 3,
                column: 1,
            };

            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 18',
                children: [
                    createTextNode('Adult'),
                    elif1,
                    elif2,
                ],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 8 });
            const result = ifDirective.handler(context);

            expect(result).toBe('Kid');
        });
    });

    describe('nested if directives', () => {
        function createMockContext(
            node: DirectiveNode,
            data: Record<string, any> = {}
        ): DirectiveContext {
            const metadata = new Map<string, any>();

            return {
                node,
                data,
                scope: [],
                helpers: {},
                metadata,
                renderTemplate: (template: string, contextData?: Record<string, any>) => {
                    const childrenToRender = metadata.get('childrenToRender') || node.children;
                    return childrenToRender
                        .map((child: any) => {
                            if (child.type === NodeType.TEXT) {
                                return child.value;
                            } else if (child.type === NodeType.DIRECTIVE && child.name === 'if') {
                                // Recursively handle nested if
                                const nestedContext = createMockContext(child, data);
                                return ifDirective.handler(nestedContext);
                            }
                            return '';
                        })
                        .join('');
                },
            };
        }

        function createTextNode(value: string): TextNode {
            return {
                type: NodeType.TEXT,
                value,
                line: 1,
                column: 1,
            };
        }

        it('should handle nested if directives', () => {
            const nestedIf: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'user.active',
                children: [createTextNode('Active adult')],
                line: 2,
                column: 1,
            };

            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 18',
                children: [
                    createTextNode('Adult: '),
                    nestedIf,
                ],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 25, user: { active: true } });
            const result = ifDirective.handler(context);

            expect(result).toBe('Adult: Active adult');
        });

        it('should not render nested if when outer if is false', () => {
            const nestedIf: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'user.active',
                children: [createTextNode('Should not see this')],
                line: 2,
                column: 1,
            };

            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 18',
                children: [
                    createTextNode('Adult: '),
                    nestedIf,
                ],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 15, user: { active: true } });
            const result = ifDirective.handler(context);

            expect(result).toBe('');
        });

        it('should not render nested if when nested condition is false', () => {
            const nestedIf: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'user.active',
                children: [createTextNode('Active')],
                line: 2,
                column: 1,
            };

            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'if',
                rawArgs: 'age >= 18',
                children: [
                    createTextNode('Adult: '),
                    nestedIf,
                ],
                line: 1,
                column: 1,
            };

            const context = createMockContext(node, { age: 25, user: { active: false } });
            const result = ifDirective.handler(context);

            expect(result).toBe('Adult: ');
        });
    });

    describe('elifDirective handler', () => {
        it('should throw when called independently', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'elif',
                rawArgs: 'some condition',
                children: [],
                line: 1,
                column: 1,
            };

            const context: DirectiveContext = {
                node,
                data: {},
                scope: [],
                helpers: {},
                metadata: new Map(),
            };

            expect(() => elifDirective.handler(context)).toThrow(APTLRuntimeError);
            expect(() => elifDirective.handler(context)).toThrow('must be used within an @if block');
        });
    });

    describe('elseDirective handler', () => {
        it('should throw when called independently', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'else',
                rawArgs: '',
                children: [],
                line: 1,
                column: 1,
            };

            const context: DirectiveContext = {
                node,
                data: {},
                scope: [],
                helpers: {},
                metadata: new Map(),
            };

            expect(() => elseDirective.handler(context)).toThrow(APTLRuntimeError);
            expect(() => elseDirective.handler(context)).toThrow('must be used within an @if block');
        });
    });
});
