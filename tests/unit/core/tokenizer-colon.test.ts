/**
 * Test for tokenizer handling of colons in quoted strings
 */

import { Tokenizer } from '@/core/tokenizer';
import { TokenType } from '@/core/types';

describe('Tokenizer - Colon in Quoted Strings', () => {
    let tokenizer: Tokenizer;

    beforeEach(() => {
        tokenizer = new Tokenizer();
        tokenizer.registerDirective('section');
    });

    it('should not create COLON token for colon inside quoted string in directive arguments', () => {
        const template = `@section example title="Step 1: This shouldn't be parsed as inline"
Example content
@end`;

        const tokens = tokenizer.tokenize(template);

        // Find all COLON tokens
        const colonTokens = tokens.filter((t) => t.type === TokenType.COLON);

        // There should be NO COLON tokens because the colon is inside a quoted string
        expect(colonTokens.length).toBe(0);

        // Verify the quoted string is kept as a single TEXT token with quotes
        const textTokens = tokens.filter((t) => t.type === TokenType.TEXT);
        const quotedStringToken = textTokens.find((t) =>
            t.value.includes('Step 1:'),
        );
        expect(quotedStringToken).toBeDefined();
        expect(quotedStringToken?.value).toBe(
            '"Step 1: This shouldn\'t be parsed as inline"',
        );
    });
});
