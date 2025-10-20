/**
 * Argument Parsers Tests - Where Strings Become Structure
 * Testing the art of turning directive arguments into usable data
 */

import {
  parseAttributes,
  parseSectionArgs,
  parseIteration,
  parseConditional,
  parseSimpleArg,
  parseNamedParams,
} from '@/directives/argument-parsers';
import { APTLSyntaxError } from '@/utils/errors';

describe('Argument Parsers - The String Surgeons', () => {
  describe('parseAttributes - The Key-Value Extractor', () => {
    it('should parse simple attribute', () => {
      const result = parseAttributes('key="value"');
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse multiple attributes', () => {
      const result = parseAttributes('name="John", age="30", city="NYC"');
      expect(result).toEqual({
        name: 'John',
        age: '30',
        city: 'NYC',
      });
    });

    it('should handle parentheses wrapper', () => {
      const result = parseAttributes('(format="json", lang="js")');
      expect(result).toEqual({
        format: 'json',
        lang: 'js',
      });
    });

    it('should parse single quoted strings', () => {
      const result = parseAttributes("name='John', role='admin'");
      expect(result).toEqual({
        name: 'John',
        role: 'admin',
      });
    });

    it('should handle unquoted values', () => {
      const result = parseAttributes('count=5, flag=true');
      expect(result).toEqual({
        count: '5',
        flag: 'true',
      });
    });

    it('should handle empty attributes', () => {
      const result = parseAttributes('');
      expect(result).toEqual({});
    });

    it('should handle whitespace-only input', () => {
      const result = parseAttributes('   ');
      expect(result).toEqual({});
    });

    it('should handle attributes without commas', () => {
      const result = parseAttributes('key="value"');
      expect(result).toEqual({ key: 'value' });
    });

    it('should ignore extra commas', () => {
      const result = parseAttributes('a="1", , b="2"');
      expect(result).toEqual({
        a: '1',
        b: '2',
      });
    });

    it('should handle trailing comma', () => {
      const result = parseAttributes('name="test",');
      expect(result).toEqual({ name: 'test' });
    });

    it('should handle special characters in values', () => {
      const result = parseAttributes(
        'path="/usr/local/bin", email="user@example.com"',
      );
      expect(result).toEqual({
        path: '/usr/local/bin',
        email: 'user@example.com',
      });
    });

    it('should handle escaped quotes in values', () => {
      const result = parseAttributes('message="He said \\"hello\\""');
      expect(result).toEqual({
        message: 'He said "hello"',
      });
    });

    it('should throw on missing value', () => {
      expect(() => parseAttributes('key=')).toThrow(APTLSyntaxError);
      expect(() => parseAttributes('key=')).toThrow(/Expected/);
    });

    it('should throw on missing equals', () => {
      expect(() => parseAttributes('key "value"')).toThrow(APTLSyntaxError);
      expect(() => parseAttributes('key "value"')).toThrow(/Expected '='/);
    });

    it('should throw on attributes missing comma separator', () => {
      // When unquoted values are followed by another attribute without a comma
      expect(() => parseAttributes('overridable=true format="md"')).toThrow(
        APTLSyntaxError,
      );
      expect(() => parseAttributes('overridable=true format="md"')).toThrow(
        /Attributes must be separated by commas/,
      );
      expect(() => parseAttributes('overridable=true format="md"')).toThrow(
        /Did you mean.*overridable="true", format/,
      );
    });

    it('should handle multiline attributes gracefully', () => {
      const result = parseAttributes('key1="value1"\nkey2="value2"');
      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });
  });

  describe('parseSectionArgs - The Section Specialist', () => {
    it('should parse section name only', () => {
      const result = parseSectionArgs('header');
      expect(result).toEqual({
        name: 'header',
        attributes: {},
      });
    });

    it('should parse section with attributes', () => {
      const result = parseSectionArgs('code(format="json", lang="js")');
      expect(result).toEqual({
        name: 'code',
        attributes: {
          format: 'json',
          lang: 'js',
        },
      });
    });

    it('should handle section with single attribute', () => {
      const result = parseSectionArgs('main(role="system")');
      expect(result).toEqual({
        name: 'main',
        attributes: {
          role: 'system',
        },
      });
    });

    it('should handle empty parentheses', () => {
      const result = parseSectionArgs('section()');
      expect(result).toEqual({
        name: 'section',
        attributes: {},
      });
    });

    it('should handle whitespace around name', () => {
      const result = parseSectionArgs('  header  ');
      expect(result).toEqual({
        name: 'header',
        attributes: {},
      });
    });

    it('should handle whitespace in parentheses', () => {
      const result = parseSectionArgs('code( format="json" )');
      expect(result).toEqual({
        name: 'code',
        attributes: {
          format: 'json',
        },
      });
    });

    it('should return empty for empty string', () => {
      const result = parseSectionArgs('');
      expect(result).toEqual({
        name: '',
        attributes: {},
      });
    });

    it('should handle complex attribute values', () => {
      const result = parseSectionArgs(
        'section(class="btn btn-primary", id="submit-btn")',
      );
      expect(result).toEqual({
        name: 'section',
        attributes: {
          class: 'btn btn-primary',
          id: 'submit-btn',
        },
      });
    });

    it('should throw on invalid section name', () => {
      // If first token is not TEXT (e.g., starts with parenthesis)
      expect(() => parseSectionArgs('(invalid)')).toThrow(APTLSyntaxError);
    });

    it('should handle space between section name and attributes', () => {
      const result = parseSectionArgs('header (format="json")');
      expect(result).toEqual({
        name: 'header',
        attributes: {
          format: 'json',
        },
      });
    });

    it('should handle quoted section name with space before attributes', () => {
      const result = parseSectionArgs('"role" (overridable=true)');
      expect(result).toEqual({
        name: 'role',
        attributes: {
          overridable: 'true',
        },
      });
    });

    it('should handle multiple spaces between name and attributes', () => {
      const result = parseSectionArgs('section   (key="value")');
      expect(result).toEqual({
        name: 'section',
        attributes: {
          key: 'value',
        },
      });
    });

    it('should handle newline between name and attributes', () => {
      const result = parseSectionArgs('section\n(key="value")');
      expect(result).toEqual({
        name: 'section',
        attributes: {
          key: 'value',
        },
      });
    });

    it('should handle attributes without parentheses', () => {
      const result = parseSectionArgs('"role" overridable=true, format="json"');
      expect(result).toEqual({
        name: 'role',
        attributes: {
          overridable: 'true',
          format: 'json',
        },
      });
    });
  });

  describe('parseIteration - The Loop Logic Parser', () => {
    it('should parse simple iteration', () => {
      const result = parseIteration('item in items');
      expect(result).toEqual({
        itemName: 'item',
        arrayPath: 'items',
      });
    });

    it('should parse iteration with index', () => {
      const result = parseIteration('user, index in users');
      expect(result).toEqual({
        itemName: 'user',
        indexName: 'index',
        arrayPath: 'users',
      });
    });

    it('should handle nested paths', () => {
      const result = parseIteration('post in blog.posts');
      expect(result).toEqual({
        itemName: 'post',
        arrayPath: 'blog.posts',
      });
    });

    it('should handle whitespace variations', () => {
      const result = parseIteration('  item   in   items  ');
      expect(result).toEqual({
        itemName: 'item',
        arrayPath: 'items',
      });
    });

    it('should handle whitespace with index', () => {
      const result = parseIteration('item , index  in  items');
      expect(result).toEqual({
        itemName: 'item',
        indexName: 'index',
        arrayPath: 'items',
      });
    });

    it('should throw on empty input', () => {
      expect(() => parseIteration('')).toThrow(APTLSyntaxError);
      expect(() => parseIteration('')).toThrow(/Empty iteration/);
    });

    it('should throw on missing "in" keyword', () => {
      expect(() => parseIteration('item items')).toThrow(APTLSyntaxError);
      expect(() => parseIteration('item items')).toThrow(
        /missing 'in' keyword/,
      );
    });

    it('should throw on missing item name', () => {
      expect(() => parseIteration('in items')).toThrow(APTLSyntaxError);
      expect(() => parseIteration('in items')).toThrow(
        /Invalid iteration syntax/,
      );
    });

    it('should throw on missing array path', () => {
      expect(() => parseIteration('item in')).toThrow(APTLSyntaxError);
      expect(() => parseIteration('item in')).toThrow(
        /Invalid iteration syntax/,
      );
    });

    it('should throw on too many variables', () => {
      expect(() => parseIteration('a, b, c in items')).toThrow(APTLSyntaxError);
      expect(() => parseIteration('a, b, c in items')).toThrow(
        /Invalid iteration syntax/,
      );
    });

    it('should handle underscore in variable names', () => {
      const result = parseIteration('item_data, item_index in data_array');
      expect(result).toEqual({
        itemName: 'item_data',
        indexName: 'item_index',
        arrayPath: 'data_array',
      });
    });

    it('should handle deeply nested array path', () => {
      const result = parseIteration('comment in post.comments.active');
      expect(result).toEqual({
        itemName: 'comment',
        arrayPath: 'post.comments.active',
      });
    });
  });

  describe('parseConditional - The Expression Wrapper', () => {
    it('should parse simple variable condition', () => {
      const result = parseConditional('user.isActive');
      expect(result).toEqual({
        condition: 'user.isActive',
      });
    });

    it('should parse comparison', () => {
      const result = parseConditional('user.age >= 18');
      expect(result).toEqual({
        condition: 'user.age >= 18',
      });
    });

    it('should parse logical operators', () => {
      const result = parseConditional('user.isActive and user.isPremium');
      expect(result).toEqual({
        condition: 'user.isActive and user.isPremium',
      });
    });

    it('should parse complex expressions', () => {
      const result = parseConditional(
        '(user.age >= 18 and user.hasConsent) or user.isAdmin',
      );
      expect(result).toEqual({
        condition: '(user.age >= 18 and user.hasConsent) or user.isAdmin',
      });
    });

    it('should reject empty condition', () => {
      expect(() => parseConditional('')).toThrow(APTLSyntaxError);
      expect(() => parseConditional('')).toThrow(
        'Empty conditional expression',
      );
    });

    it('should trim whitespace', () => {
      const result = parseConditional('  user.isActive  ');
      expect(result).toEqual({
        condition: 'user.isActive',
      });
    });

    it('should preserve string literals', () => {
      const result = parseConditional('status == "approved"');
      expect(result).toEqual({
        condition: 'status == "approved"',
      });
    });
  });

  describe('parseSimpleArg - The Minimalist', () => {
    it('should parse simple string', () => {
      const result = parseSimpleArg('templateName');
      expect(result).toEqual({
        value: 'templateName',
      });
    });

    it('should trim whitespace', () => {
      const result = parseSimpleArg('  base.aptl  ');
      expect(result).toEqual({
        value: 'base.aptl',
      });
    });

    it('should handle empty string', () => {
      const result = parseSimpleArg('');
      expect(result).toEqual({
        value: '',
      });
    });

    it('should handle paths', () => {
      const result = parseSimpleArg('templates/base.aptl');
      expect(result).toEqual({
        value: 'templates/base.aptl',
      });
    });

    it('should handle quoted strings', () => {
      const result = parseSimpleArg('"my template"');
      expect(result).toEqual({
        value: '"my template"',
      });
    });
  });

  describe('parseNamedParams - The Parameter Juggler', () => {
    it('should parse positional parameters', () => {
      const result = parseNamedParams('value1, value2, value3');
      expect(result).toEqual({
        positional: ['value1', 'value2', 'value3'],
        named: {},
      });
    });

    it('should parse named parameters', () => {
      const result = parseNamedParams('key1=value1, key2=value2');
      expect(result).toEqual({
        positional: [],
        named: {
          key1: 'value1',
          key2: 'value2',
        },
      });
    });

    it('should parse mixed parameters', () => {
      const result = parseNamedParams('positional, key1=value1, another');
      expect(result).toEqual({
        positional: ['positional', 'another'],
        named: {
          key1: 'value1',
        },
      });
    });

    it('should handle quoted values', () => {
      const result = parseNamedParams('name="John Doe", age="30"');
      expect(result).toEqual({
        positional: [],
        named: {
          name: 'John Doe',
          age: '30',
        },
      });
    });

    it('should handle quoted positional', () => {
      const result = parseNamedParams('"first value", "second value"');
      expect(result).toEqual({
        positional: ['first value', 'second value'],
        named: {},
      });
    });

    it('should handle empty input', () => {
      const result = parseNamedParams('');
      expect(result).toEqual({
        positional: [],
        named: {},
      });
    });

    it('should handle single parameter', () => {
      const result = parseNamedParams('singleValue');
      expect(result).toEqual({
        positional: ['singleValue'],
        named: {},
      });
    });

    it('should handle single named parameter', () => {
      const result = parseNamedParams('key=value');
      expect(result).toEqual({
        positional: [],
        named: {
          key: 'value',
        },
      });
    });

    it('should handle whitespace variations', () => {
      const result = parseNamedParams('  a  ,  b=c  ,  d  ');
      expect(result).toEqual({
        positional: ['a', 'd'],
        named: {
          b: 'c',
        },
      });
    });

    it('should throw on missing value for named param', () => {
      expect(() => parseNamedParams('key=')).toThrow(APTLSyntaxError);
      expect(() => parseNamedParams('key=')).toThrow(/Expected value/);
    });

    it('should handle complex quoted values', () => {
      const result = parseNamedParams(
        'path="/usr/local/bin", command="echo \\"hello\\""',
      );
      expect(result).toEqual({
        positional: [],
        named: {
          path: '/usr/local/bin',
          command: 'echo "hello"',
        },
      });
    });

    it('should handle trailing comma', () => {
      const result = parseNamedParams('a, b=c,');
      expect(result).toEqual({
        positional: ['a'],
        named: {
          b: 'c',
        },
      });
    });

    it('should handle multiple commas', () => {
      const result = parseNamedParams('a,, b=c');
      expect(result).toEqual({
        positional: ['a'],
        named: {
          b: 'c',
        },
      });
    });
  });

  describe('Edge Cases - The Unusual Suspects', () => {
    it('should handle unicode in attribute values', () => {
      const result = parseAttributes('emoji="👋", text="こんにちは"');
      expect(result).toEqual({
        emoji: '👋',
        text: 'こんにちは',
      });
    });

    it('should handle unicode in iteration', () => {
      const result = parseIteration('項目 in リスト');
      expect(result).toEqual({
        itemName: '項目',
        arrayPath: 'リスト',
      });
    });

    it('should handle very long attribute values', () => {
      const longValue = 'a'.repeat(1000);
      const result = parseAttributes(`key="${longValue}"`);
      expect(result.key).toHaveLength(1000);
    });

    it('should handle nested parentheses in section args', () => {
      const result = parseSectionArgs('section(data="(nested)")');
      expect(result).toEqual({
        name: 'section',
        attributes: {
          data: '(nested)',
        },
      });
    });

    it('should handle numbers in variable names', () => {
      const result = parseIteration('item1, index2 in array3');
      expect(result).toEqual({
        itemName: 'item1',
        indexName: 'index2',
        arrayPath: 'array3',
      });
    });

    it('should handle dashes in variable names', () => {
      const result = parseIteration('item-data in data-array');
      expect(result).toEqual({
        itemName: 'item-data',
        arrayPath: 'data-array',
      });
    });
  });

  describe('Real-world Scenarios - Battle-tested', () => {
    it('should parse section with formatting attributes', () => {
      const result = parseSectionArgs(
        'code(format="json", lang="javascript", indent="2")',
      );
      expect(result).toEqual({
        name: 'code',
        attributes: {
          format: 'json',
          lang: 'javascript',
          indent: '2',
        },
      });
    });

    it('should parse AI prompt section', () => {
      const result = parseSectionArgs(
        'prompt(role="system", temperature="0.7")',
      );
      expect(result).toEqual({
        name: 'prompt',
        attributes: {
          role: 'system',
          temperature: '0.7',
        },
      });
    });

    it('should parse complex iteration with nested path', () => {
      const result = parseIteration(
        'message, idx in conversation.messages.unread',
      );
      expect(result).toEqual({
        itemName: 'message',
        indexName: 'idx',
        arrayPath: 'conversation.messages.unread',
      });
    });

    it('should parse conditional with string comparison', () => {
      const result = parseConditional(
        'user.role == "admin" or user.role == "moderator"',
      );
      expect(result).toEqual({
        condition: 'user.role == "admin" or user.role == "moderator"',
      });
    });

    it('should parse template include with parameters', () => {
      const result = parseNamedParams(
        '"header.aptl", title="Welcome", showNav=true',
      );
      expect(result).toEqual({
        positional: ['header.aptl'],
        named: {
          title: 'Welcome',
          showNav: 'true',
        },
      });
    });

    it('should parse HTML-like attributes', () => {
      const result = parseAttributes(
        'class="container mx-auto", id="main-content", data-value="123"',
      );
      expect(result).toEqual({
        class: 'container mx-auto',
        id: 'main-content',
        'data-value': '123',
      });
    });

    it('should parse markdown section attributes', () => {
      const result = parseSectionArgs(
        'markdown(lang="en", style="github", breaks=true)',
      );
      expect(result).toEqual({
        name: 'markdown',
        attributes: {
          lang: 'en',
          style: 'github',
          breaks: 'true',
        },
      });
    });
  });

  describe('Error Messages - Helpful Hints', () => {
    it('should provide clear error for malformed attributes', () => {
      try {
        parseAttributes('key without equals sign');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.message).toContain('Expected');
      }
    });

    it('should provide clear error for malformed iteration', () => {
      expect(() => {
        parseIteration('item from items');
      }).toThrow(APTLSyntaxError);

      expect(() => {
        parseIteration('item from items');
      }).toThrow(/missing 'in' keyword/);
    });

    it('should provide clear error for incomplete named param', () => {
      try {
        parseNamedParams('key=');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(APTLSyntaxError);
        const syntaxError = error as APTLSyntaxError;
        expect(syntaxError.message).toContain('value');
      }
    });
  });

  describe('Consistency - Tokenizer Integration', () => {
    it('should handle escaped quotes consistently', () => {
      const result = parseAttributes('message="She said \\"Hi\\""');
      expect(result.message).toBe('She said "Hi"');
    });

    it('should handle escaped backslashes', () => {
      const result = parseAttributes('path="C:\\\\Users\\\\Documents"');
      expect(result.path).toBe('C:\\Users\\Documents');
    });

    it('should handle newlines in attribute values', () => {
      const result = parseAttributes('text="line1\\nline2"');
      expect(result.text).toBe('line1\nline2');
    });

    it('should handle tabs in attribute values', () => {
      const result = parseAttributes('formatted="col1\\tcol2"');
      expect(result.formatted).toBe('col1\tcol2');
    });
  });
});
