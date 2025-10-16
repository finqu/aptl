/**
 * Tests for @section directive with model-based conditional rendering
 */

import { sectionDirective, parseModelAttribute, matchModel } from '@/directives/section-directive';
import { DirectiveContext } from '@/directives/types';
import { DirectiveNode, NodeType, TextNode } from '@/core/types';
import { APTLSyntaxError, APTLRuntimeError } from '@/utils/errors';

describe('Section Directive', () => {
    describe('parseModelAttribute', () => {
        it('should parse single model without format', () => {
            const result = parseModelAttribute('gpt-5.1');
            expect(result.configs).toEqual([{ model: 'gpt-5.1' }]);
            expect(result.defaultFormat).toBeUndefined();
        });

        it('should parse single model with format', () => {
            const result = parseModelAttribute('gpt-5.1/structured');
            expect(result.configs).toEqual([
                { model: 'gpt-5.1', format: 'structured' }
            ]);
            expect(result.defaultFormat).toBeUndefined();
        });

        it('should parse model with format and default fallback', () => {
            const result = parseModelAttribute('gpt-5.1/structured, md');
            expect(result.configs).toEqual([
                { model: 'gpt-5.1', format: 'structured' }
            ]);
            expect(result.defaultFormat).toBe('md');
        });

        it('should parse multiple models with formats and default', () => {
            const result = parseModelAttribute('gpt-5.1/structured, claude-4/json, md');
            expect(result.configs).toEqual([
                { model: 'gpt-5.1', format: 'structured' },
                { model: 'claude-4', format: 'json' }
            ]);
            expect(result.defaultFormat).toBe('md');
        });

        it('should handle whitespace correctly', () => {
            const result = parseModelAttribute('  gpt-5.1 / structured  ,  claude-4 / json  ,  md  ');
            expect(result.configs).toEqual([
                { model: 'gpt-5.1', format: 'structured' },
                { model: 'claude-4', format: 'json' }
            ]);
            expect(result.defaultFormat).toBe('md');
        });

        it('should return empty configs for empty string', () => {
            const result = parseModelAttribute('');
            expect(result.configs).toEqual([]);
            expect(result.defaultFormat).toBeUndefined();
        });

        it('should handle multiple models without formats', () => {
            const result = parseModelAttribute('gpt-5.1, claude-4');
            expect(result.configs).toEqual([
                { model: 'gpt-5.1' },
                { model: 'claude-4' }
            ]);
            expect(result.defaultFormat).toBeUndefined();
        });
    });

    describe('matchModel', () => {
        it('should match exact model without format', () => {
            const configs = [{ model: 'gpt-5.1' }];
            const result = matchModel('gpt-5.1', configs);
            expect(result).toBe('default');
        });

        it('should match exact model with format', () => {
            const configs = [{ model: 'gpt-5.1', format: 'structured' }];
            const result = matchModel('gpt-5.1', configs);
            expect(result).toBe('structured');
        });

        it('should return null when no match and no default', () => {
            const configs = [{ model: 'gpt-5.1', format: 'structured' }];
            const result = matchModel('claude-4', configs);
            expect(result).toBeNull();
        });

        it('should return default format when no match but default provided', () => {
            const configs = [{ model: 'gpt-5.1', format: 'structured' }];
            const result = matchModel('claude-4', configs, 'md');
            expect(result).toBe('md');
        });

        it('should match first matching model', () => {
            const configs = [
                { model: 'gpt-5.1', format: 'structured' },
                { model: 'claude-4', format: 'json' }
            ];
            const result = matchModel('claude-4', configs);
            expect(result).toBe('json');
        });

        it('should return default when no configs', () => {
            const result = matchModel('gpt-5.1', []);
            expect(result).toBe('default');
        });
    });

    describe('parseArguments', () => {
        it('should parse section name only', () => {
            const result = sectionDirective.parseArguments!('intro');
            expect(result.name).toBe('intro');
            expect(result.attributes).toEqual({});
        });

        it('should parse section with model attribute', () => {
            const result = sectionDirective.parseArguments!('intro(model="gpt-5.1")');
            expect(result.name).toBe('intro');
            expect(result.attributes.model).toBe('gpt-5.1');
        });

        it('should parse section with complex model attribute', () => {
            const result = sectionDirective.parseArguments!('data(model="gpt-5.1/structured, claude-4/json, md")');
            expect(result.name).toBe('data');
            expect(result.attributes.model).toBe('gpt-5.1/structured, claude-4/json, md');
        });

        it('should parse section with multiple attributes', () => {
            const result = sectionDirective.parseArguments!('code(format="markdown", model="gpt-5.1")');
            expect(result.name).toBe('code');
            expect(result.attributes.format).toBe('markdown');
            expect(result.attributes.model).toBe('gpt-5.1');
        });
    });

    describe('validate', () => {
        it('should validate section with name in rawArgs', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'section',
                rawArgs: 'intro',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => sectionDirective.validate!(node)).not.toThrow();
        });

        it('should validate section with name in parsedArgs', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'section',
                rawArgs: '',
                parsedArgs: { name: 'intro', attributes: {} },
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => sectionDirective.validate!(node)).not.toThrow();
        });

        it('should throw if no name provided', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'section',
                rawArgs: '',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => sectionDirective.validate!(node)).toThrow(APTLSyntaxError);
            expect(() => sectionDirective.validate!(node)).toThrow('requires a name');
        });

        it('should throw if name is only whitespace', () => {
            const node: DirectiveNode = {
                type: NodeType.DIRECTIVE,
                name: 'section',
                rawArgs: '   ',
                children: [],
                line: 1,
                column: 1,
            };

            expect(() => sectionDirective.validate!(node)).toThrow(APTLSyntaxError);
        });
    });

    describe('handler - model-based conditional rendering', () => {
        const createContext = (
            model: string,
            rawArgs: string,
            children: any[] = []
        ): DirectiveContext => {
            const textNode: TextNode = {
                type: NodeType.TEXT,
                value: 'Test content',
            };

            return {
                node: {
                    type: NodeType.DIRECTIVE,
                    name: 'section',
                    rawArgs,
                    children: children.length > 0 ? children : [textNode],
                    line: 1,
                    column: 1,
                },
                data: { model },
                helpers: {},
                scope: [{ model }],
                metadata: new Map(),
                renderTemplate: jest.fn((template: string, data?: any) => {
                    // Simple mock that returns the children content
                    return 'Test content';
                }),
            } as any;
        };

        it('should render section without model attribute', () => {
            const context = createContext('gpt-5.1', 'intro');
            const result = sectionDirective.handler(context);
            expect(result).toBe('Test content');
            expect(context.renderTemplate).toHaveBeenCalled();
        });

        it('should render section when model matches exactly', () => {
            const context = createContext('gpt-5.1', 'intro(model="gpt-5.1")');
            const result = sectionDirective.handler(context);
            expect(result).toBe('Test content');
            expect(context.renderTemplate).toHaveBeenCalled();
        });

        it('should not render section when model does not match', () => {
            const context = createContext('claude-4', 'intro(model="gpt-5.1")');
            const result = sectionDirective.handler(context);
            expect(result).toBe('');
            expect(context.renderTemplate).not.toHaveBeenCalled();
        });

        it('should render with default format when model does not match but default provided', () => {
            const context = createContext('claude-4', 'data(model="gpt-5.1/structured, md")');
            const result = sectionDirective.handler(context);
            expect(result).toBe('Test content');
            expect(context.renderTemplate).toHaveBeenCalled();
            expect(context.metadata.get('format')).toBe('md');
        });

        it('should use specific format for matched model', () => {
            const context = createContext('gpt-5.1', 'data(model="gpt-5.1/structured, md")');
            const result = sectionDirective.handler(context);
            expect(result).toBe('Test content');
            expect(context.renderTemplate).toHaveBeenCalled();
            expect(context.metadata.get('format')).toBe('structured');
        });

        it('should handle multiple model configurations', () => {
            const context = createContext('claude-4', 'data(model="gpt-5.1/structured, claude-4/json, md")');
            const result = sectionDirective.handler(context);
            expect(result).toBe('Test content');
            expect(context.renderTemplate).toHaveBeenCalled();
            expect(context.metadata.get('format')).toBe('json');
        });

        it('should return empty string when no model in data (non-strict mode)', () => {
            const context = createContext('', 'intro(model="gpt-5.1")');
            context.data.model = undefined;
            const result = sectionDirective.handler(context);
            expect(result).toBe('');
        });

        it('should throw if renderTemplate is not available', () => {
            const context = createContext('gpt-5.1', 'intro');
            context.renderTemplate = undefined;
            expect(() => sectionDirective.handler(context)).toThrow(APTLRuntimeError);
            expect(() => sectionDirective.handler(context)).toThrow('requires renderTemplate');
        });
    });
});
