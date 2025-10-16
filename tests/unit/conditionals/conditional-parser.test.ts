/**
 * Tests for parseConditional
 * The Expression Validator
 */

import { parseConditional } from '@/directives/argument-parsers';
import { APTLSyntaxError } from '@/utils/errors';

describe('parseConditional - The Expression Validator', () => {
    describe('Simple Variable References', () => {
        it('should parse a simple variable', () => {
            const result = parseConditional('user.isActive');
            expect(result).toEqual({ condition: 'user.isActive' });
        });

        it('should parse a nested property path', () => {
            const result = parseConditional('user.profile.settings.darkMode');
            expect(result).toEqual({ condition: 'user.profile.settings.darkMode' });
        });

        it('should handle whitespace around variables', () => {
            const result = parseConditional('  user.isActive  ');
            expect(result).toEqual({ condition: 'user.isActive' });
        });
    });

    describe('Comparison Operators', () => {
        it('should parse equality comparison', () => {
            const result = parseConditional('status == "approved"');
            expect(result).toEqual({ condition: 'status == "approved"' });
        });

        it('should parse inequality comparison', () => {
            const result = parseConditional('status != "pending"');
            expect(result).toEqual({ condition: 'status != "pending"' });
        });

        it('should parse greater than comparison', () => {
            const result = parseConditional('user.age > 18');
            expect(result).toEqual({ condition: 'user.age > 18' });
        });

        it('should parse less than comparison', () => {
            const result = parseConditional('count < 100');
            expect(result).toEqual({ condition: 'count < 100' });
        });

        it('should parse greater than or equal', () => {
            const result = parseConditional('user.age >= 18');
            expect(result).toEqual({ condition: 'user.age >= 18' });
        });

        it('should parse less than or equal', () => {
            const result = parseConditional('score <= 100');
            expect(result).toEqual({ condition: 'score <= 100' });
        });

        it('should parse comparison with string literals', () => {
            const result = parseConditional('role == "admin"');
            expect(result).toEqual({ condition: 'role == "admin"' });
        });

        it('should parse comparison with numbers', () => {
            const result = parseConditional('count >= 5');
            expect(result).toEqual({ condition: 'count >= 5' });
        });
    });

    describe('Logical Operators', () => {
        it('should parse AND operator', () => {
            const result = parseConditional('user.isActive and user.isPremium');
            expect(result).toEqual({ condition: 'user.isActive and user.isPremium' });
        });

        it('should parse OR operator', () => {
            const result = parseConditional('status == "pending" or status == "approved"');
            expect(result).toEqual({ condition: 'status == "pending" or status == "approved"' });
        });

        it('should parse NOT operator', () => {
            const result = parseConditional('not user.isBlocked');
            expect(result).toEqual({ condition: 'not user.isBlocked' });
        });

        it('should parse IN operator', () => {
            const result = parseConditional('"premium" in user.roles');
            expect(result).toEqual({ condition: '"premium" in user.roles' });
        });

        it('should parse complex AND/OR chain', () => {
            const result = parseConditional('a and b or c and d');
            expect(result).toEqual({ condition: 'a and b or c and d' });
        });

        it('should parse NOT with comparison', () => {
            const result = parseConditional('not status == "blocked"');
            expect(result).toEqual({ condition: 'not status == "blocked"' });
        });
    });

    describe('Parentheses Grouping', () => {
        it('should parse simple parentheses', () => {
            const result = parseConditional('(user.isActive)');
            expect(result).toEqual({ condition: '(user.isActive)' });
        });

        it('should parse grouped AND/OR expressions', () => {
            const result = parseConditional('(user.age >= 18 and user.hasConsent) or user.isAdmin');
            expect(result).toEqual({
                condition: '(user.age >= 18 and user.hasConsent) or user.isAdmin',
            });
        });

        it('should parse nested parentheses', () => {
            const result = parseConditional('((a or b) and (c or d))');
            expect(result).toEqual({ condition: '((a or b) and (c or d))' });
        });

        it('should parse multiple grouped expressions', () => {
            const result = parseConditional('(a and b) or (c and d) or (e and f)');
            expect(result).toEqual({
                condition: '(a and b) or (c and d) or (e and f)',
            });
        });
    });

    describe('Complex Expressions', () => {
        it('should parse mixed operators with grouping', () => {
            const result = parseConditional(
                '(user.role == "admin" or user.role == "moderator") and not user.isBanned',
            );
            expect(result).toEqual({
                condition:
                    '(user.role == "admin" or user.role == "moderator") and not user.isBanned',
            });
        });

        it('should parse multiple comparisons with logical operators', () => {
            const result = parseConditional('age >= 18 and age <= 65 and isEmployed');
            expect(result).toEqual({
                condition: 'age >= 18 and age <= 65 and isEmployed',
            });
        });

        it('should parse IN operator with logical operators', () => {
            const result = parseConditional('"admin" in user.roles and user.isActive');
            expect(result).toEqual({
                condition: '"admin" in user.roles and user.isActive',
            });
        });

        it('should parse deeply nested conditions', () => {
            const result = parseConditional(
                '((a and b) or (c and d)) and ((e or f) and (g or h))',
            );
            expect(result).toEqual({
                condition: '((a and b) or (c and d)) and ((e or f) and (g or h))',
            });
        });
    });

    describe('Error Cases', () => {
        it('should reject empty condition', () => {
            expect(() => parseConditional('')).toThrow(APTLSyntaxError);
            expect(() => parseConditional('')).toThrow('Empty conditional expression');
        });

        it('should reject whitespace-only condition', () => {
            expect(() => parseConditional('   ')).toThrow(APTLSyntaxError);
            expect(() => parseConditional('   ')).toThrow('Empty conditional expression');
        });

        it('should reject unmatched opening parenthesis', () => {
            expect(() => parseConditional('(user.isActive')).toThrow(APTLSyntaxError);
            expect(() => parseConditional('(user.isActive')).toThrow('Unmatched opening parenthesis');
        });

        it('should reject unmatched closing parenthesis', () => {
            expect(() => parseConditional('user.isActive)')).toThrow(APTLSyntaxError);
            expect(() => parseConditional('user.isActive)')).toThrow('Unmatched closing parenthesis');
        });

        it('should reject multiple unmatched parentheses', () => {
            expect(() => parseConditional('((user.isActive)')).toThrow(APTLSyntaxError);
            expect(() => parseConditional('(user.isActive))')).toThrow(APTLSyntaxError);
        });

        it('should reject deeply nested unmatched opening parenthesis', () => {
            expect(() => parseConditional('(((a and b)')).toThrow(APTLSyntaxError);
            expect(() => parseConditional('(((a and b)')).toThrow('Unmatched opening parenthesis');
        });

        it('should reject deeply nested unmatched closing parenthesis', () => {
            expect(() => parseConditional('a and b)))')).toThrow(APTLSyntaxError);
            expect(() => parseConditional('a and b)))')).toThrow('Unmatched closing parenthesis');
        });
    });

    describe('Edge Cases', () => {
        it('should handle variable names with underscores', () => {
            const result = parseConditional('is_active_user');
            expect(result).toEqual({ condition: 'is_active_user' });
        });

        it('should handle variable names with numbers', () => {
            const result = parseConditional('user123.setting456');
            expect(result).toEqual({ condition: 'user123.setting456' });
        });

        it('should handle single character variable', () => {
            const result = parseConditional('a');
            expect(result).toEqual({ condition: 'a' });
        });

        it('should handle multiple NOT operators', () => {
            const result = parseConditional('not not user.isActive');
            expect(result).toEqual({ condition: 'not not user.isActive' });
        });

        it('should handle parentheses after NOT', () => {
            const result = parseConditional('not (user.isActive and user.isPremium)');
            expect(result).toEqual({ condition: 'not (user.isActive and user.isPremium)' });
        });

        it('should accept empty parentheses (semantic validation is done by evaluator)', () => {
            const result = parseConditional('()');
            expect(result).toEqual({ condition: '()' });
        });

        it('should accept incomplete expressions (semantic validation by evaluator)', () => {
            // Parser only checks balanced parentheses, evaluator validates semantics
            const result = parseConditional('user.isActive and');
            expect(result).toEqual({ condition: 'user.isActive and' });
        });

        it('should accept unknown operators (semantic validation by evaluator)', () => {
            // Parser doesn't validate operators, only balanced parentheses
            const result = parseConditional('a foo b');
            expect(result).toEqual({ condition: 'a foo b' });
        });
    });

    describe('Real-World Scenarios', () => {
        it('should parse user permission check', () => {
            const result = parseConditional(
                '(user.role == "admin" or user.role == "moderator") and not user.isSuspended',
            );
            expect(result).toEqual({
                condition:
                    '(user.role == "admin" or user.role == "moderator") and not user.isSuspended',
            });
        });

        it('should parse age verification with multiple conditions', () => {
            const result = parseConditional(
                '(user.age >= 18 and user.hasConsent) or user.hasParentalConsent',
            );
            expect(result).toEqual({
                condition: '(user.age >= 18 and user.hasConsent) or user.hasParentalConsent',
            });
        });

        it('should parse feature flag check', () => {
            const result = parseConditional(
                'feature.enabled and (user.isBeta or feature.releaseDate <= currentDate)',
            );
            expect(result).toEqual({
                condition:
                    'feature.enabled and (user.isBeta or feature.releaseDate <= currentDate)',
            });
        });

        it('should parse status workflow check', () => {
            const result = parseConditional(
                'status == "pending" or status == "approved" or status == "processing"',
            );
            expect(result).toEqual({
                condition: 'status == "pending" or status == "approved" or status == "processing"',
            });
        });

        it('should parse array membership with role check', () => {
            const result = parseConditional(
                '"premium" in user.subscriptions and user.paymentStatus == "active"',
            );
            expect(result).toEqual({
                condition: '"premium" in user.subscriptions and user.paymentStatus == "active"',
            });
        });

        it('should parse numeric range check', () => {
            const result = parseConditional('score >= 0 and score <= 100 and isValid');
            expect(result).toEqual({
                condition: 'score >= 0 and score <= 100 and isValid',
            });
        });

        it('should parse complex business logic', () => {
            const result = parseConditional(
                '((orderTotal >= 100 and hasDiscount) or isPremiumMember) and itemsInStock and not isBlacklisted',
            );
            expect(result).toEqual({
                condition:
                    '((orderTotal >= 100 and hasDiscount) or isPremiumMember) and itemsInStock and not isBlacklisted',
            });
        });
    });

    describe('Whitespace Handling', () => {
        it('should handle extra whitespace around operators', () => {
            const result = parseConditional('a    and    b');
            expect(result).toEqual({ condition: 'a    and    b' });
        });

        it('should handle newlines in expressions (preserved in condition)', () => {
            const result = parseConditional('a and\nb');
            expect(result).toEqual({ condition: 'a and\nb' });
        });

        it('should handle tabs and mixed whitespace', () => {
            const result = parseConditional('a\tand\t\tb');
            expect(result).toEqual({ condition: 'a\tand\t\tb' });
        });
    });
});
