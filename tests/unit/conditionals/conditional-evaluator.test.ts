/**
 * Conditional Evaluator Tests
 */

import { ConditionalEvaluator } from '@/conditionals/conditional-evaluator';

describe('ConditionalEvaluator', () => {
  let evaluator: ConditionalEvaluator;
  let testData: Record<string, any>;

  beforeEach(() => {
    evaluator = new ConditionalEvaluator();
    testData = {
      isActive: true,
      isDisabled: false,
      count: 5,
      score: 0,
      name: 'John',
      emptyString: '',
      items: ['a', 'b', 'c'],
      emptyArray: [],
      user: {
        age: 25,
        role: 'admin',
        isVerified: true,
      },
      nullValue: null,
      undefinedValue: undefined,
    };
  });

  describe('Simple Variable References', () => {
    it('should evaluate boolean true', () => {
      expect(evaluator.evaluate('isActive', testData)).toBe(true);
    });

    it('should evaluate boolean false', () => {
      expect(evaluator.evaluate('isDisabled', testData)).toBe(false);
    });

    it('should evaluate non-zero number as true', () => {
      expect(evaluator.evaluate('count', testData)).toBe(true);
    });

    it('should evaluate zero as false', () => {
      expect(evaluator.evaluate('score', testData)).toBe(false);
    });

    it('should evaluate non-empty string as true', () => {
      expect(evaluator.evaluate('name', testData)).toBe(true);
    });

    it('should evaluate empty string as false', () => {
      expect(evaluator.evaluate('emptyString', testData)).toBe(false);
    });

    it('should evaluate non-empty array as true', () => {
      expect(evaluator.evaluate('items', testData)).toBe(true);
    });

    it('should evaluate empty array as false', () => {
      expect(evaluator.evaluate('emptyArray', testData)).toBe(false);
    });

    it('should evaluate nested property', () => {
      expect(evaluator.evaluate('user.isVerified', testData)).toBe(true);
    });

    it('should evaluate null as false', () => {
      expect(evaluator.evaluate('nullValue', testData)).toBe(false);
    });

    it('should evaluate undefined as false', () => {
      expect(evaluator.evaluate('undefinedValue', testData)).toBe(false);
    });

    it('should evaluate non-existent property as false', () => {
      expect(evaluator.evaluate('nonExistent', testData)).toBe(false);
    });
  });

  describe('Comparison Operators', () => {
    describe('Equality (==)', () => {
      it('should compare numbers', () => {
        expect(evaluator.evaluate('count == 5', testData)).toBe(true);
        expect(evaluator.evaluate('count == 10', testData)).toBe(false);
      });

      it('should compare strings', () => {
        expect(evaluator.evaluate('name == "John"', testData)).toBe(true);
        expect(evaluator.evaluate("name == 'John'", testData)).toBe(true);
        expect(evaluator.evaluate('name == "Jane"', testData)).toBe(false);
      });

      it('should compare booleans', () => {
        expect(evaluator.evaluate('isActive == true', testData)).toBe(true);
        expect(evaluator.evaluate('isDisabled == false', testData)).toBe(true);
      });

      it('should compare nested properties', () => {
        expect(evaluator.evaluate('user.age == 25', testData)).toBe(true);
        expect(evaluator.evaluate('user.role == "admin"', testData)).toBe(true);
      });
    });

    describe('Inequality (!=)', () => {
      it('should compare numbers', () => {
        expect(evaluator.evaluate('count != 10', testData)).toBe(true);
        expect(evaluator.evaluate('count != 5', testData)).toBe(false);
      });

      it('should compare strings', () => {
        expect(evaluator.evaluate('name != "Jane"', testData)).toBe(true);
        expect(evaluator.evaluate('name != "John"', testData)).toBe(false);
      });
    });

    describe('Less than (<)', () => {
      it('should compare numbers', () => {
        expect(evaluator.evaluate('count < 10', testData)).toBe(true);
        expect(evaluator.evaluate('count < 5', testData)).toBe(false);
        expect(evaluator.evaluate('count < 3', testData)).toBe(false);
      });

      it('should compare nested properties', () => {
        expect(evaluator.evaluate('user.age < 30', testData)).toBe(true);
        expect(evaluator.evaluate('user.age < 20', testData)).toBe(false);
      });
    });

    describe('Greater than (>)', () => {
      it('should compare numbers', () => {
        expect(evaluator.evaluate('count > 3', testData)).toBe(true);
        expect(evaluator.evaluate('count > 5', testData)).toBe(false);
        expect(evaluator.evaluate('count > 10', testData)).toBe(false);
      });
    });

    describe('Less than or equal (<=)', () => {
      it('should compare numbers', () => {
        expect(evaluator.evaluate('count <= 5', testData)).toBe(true);
        expect(evaluator.evaluate('count <= 10', testData)).toBe(true);
        expect(evaluator.evaluate('count <= 3', testData)).toBe(false);
      });
    });

    describe('Greater than or equal (>=)', () => {
      it('should compare numbers', () => {
        expect(evaluator.evaluate('count >= 5', testData)).toBe(true);
        expect(evaluator.evaluate('count >= 3', testData)).toBe(true);
        expect(evaluator.evaluate('count >= 10', testData)).toBe(false);
      });
    });
  });

  describe('Logical Operators', () => {
    describe('AND operator', () => {
      it('should evaluate true when both conditions are true', () => {
        expect(evaluator.evaluate('isActive and count > 0', testData)).toBe(
          true,
        );
        expect(
          evaluator.evaluate(
            'user.isVerified and user.role == "admin"',
            testData,
          ),
        ).toBe(true);
      });

      it('should evaluate false when first condition is false', () => {
        expect(evaluator.evaluate('isDisabled and count > 0', testData)).toBe(
          false,
        );
      });

      it('should evaluate false when second condition is false', () => {
        expect(evaluator.evaluate('isActive and count > 10', testData)).toBe(
          false,
        );
      });

      it('should evaluate false when both conditions are false', () => {
        expect(evaluator.evaluate('isDisabled and count > 10', testData)).toBe(
          false,
        );
      });

      it('should handle multiple AND conditions', () => {
        expect(
          evaluator.evaluate(
            'isActive and count > 0 and name == "John"',
            testData,
          ),
        ).toBe(true);
        expect(
          evaluator.evaluate(
            'isActive and count > 0 and name == "Jane"',
            testData,
          ),
        ).toBe(false);
      });
    });

    describe('OR operator', () => {
      it('should evaluate true when first condition is true', () => {
        expect(evaluator.evaluate('isActive or count > 10', testData)).toBe(
          true,
        );
      });

      it('should evaluate true when second condition is true', () => {
        expect(evaluator.evaluate('isDisabled or count > 0', testData)).toBe(
          true,
        );
      });

      it('should evaluate true when both conditions are true', () => {
        expect(evaluator.evaluate('isActive or count > 0', testData)).toBe(
          true,
        );
      });

      it('should evaluate false when both conditions are false', () => {
        expect(evaluator.evaluate('isDisabled or count > 10', testData)).toBe(
          false,
        );
      });

      it('should handle multiple OR conditions', () => {
        expect(
          evaluator.evaluate(
            'isDisabled or score > 0 or name == "John"',
            testData,
          ),
        ).toBe(true);
        expect(
          evaluator.evaluate(
            'isDisabled or score > 0 or name == "Jane"',
            testData,
          ),
        ).toBe(false);
      });
    });

    describe('NOT operator', () => {
      it('should negate true to false', () => {
        expect(evaluator.evaluate('not isActive', testData)).toBe(false);
      });

      it('should negate false to true', () => {
        expect(evaluator.evaluate('not isDisabled', testData)).toBe(true);
      });

      it('should work with comparisons', () => {
        expect(evaluator.evaluate('not count == 10', testData)).toBe(true);
        expect(evaluator.evaluate('not count == 5', testData)).toBe(false);
      });

      it('should work with complex expressions', () => {
        expect(
          evaluator.evaluate('not (isActive and count > 10)', testData),
        ).toBe(true);
      });
    });

    describe('Mixed logical operators', () => {
      it('should handle AND and OR with correct precedence', () => {
        // OR has lower precedence, so: (isActive and count > 10) or name == "John"
        expect(
          evaluator.evaluate(
            'isActive and count > 10 or name == "John"',
            testData,
          ),
        ).toBe(true);

        // (isDisabled and count > 0) or name == "John"
        expect(
          evaluator.evaluate(
            'isDisabled and count > 0 or name == "John"',
            testData,
          ),
        ).toBe(true);

        // (isDisabled and count > 0) or name == "Jane"
        expect(
          evaluator.evaluate(
            'isDisabled and count > 0 or name == "Jane"',
            testData,
          ),
        ).toBe(false);
      });
    });
  });

  describe('Parentheses and Grouping', () => {
    it('should handle simple parentheses', () => {
      expect(evaluator.evaluate('(isActive)', testData)).toBe(true);
      expect(evaluator.evaluate('(isDisabled)', testData)).toBe(false);
    });

    it('should override operator precedence with parentheses', () => {
      // Without parens: isActive and (count > 10 or name == "John")
      expect(
        evaluator.evaluate(
          'isActive and (count > 10 or name == "John")',
          testData,
        ),
      ).toBe(true);

      // With parens changing precedence: (isActive and count > 10) or name == "John"
      expect(
        evaluator.evaluate(
          '(isActive and count > 10) or name == "John"',
          testData,
        ),
      ).toBe(true);
    });

    it('should handle nested parentheses', () => {
      expect(evaluator.evaluate('((isActive) and (count > 0))', testData)).toBe(
        true,
      );

      expect(
        evaluator.evaluate(
          '(isActive and (count > 0 or name == "Jane")) or isDisabled',
          testData,
        ),
      ).toBe(true);
    });

    it('should handle NOT with parentheses', () => {
      expect(evaluator.evaluate('not (isActive)', testData)).toBe(false);
      expect(
        evaluator.evaluate('not (isActive and count > 10)', testData),
      ).toBe(true);
    });

    it('should handle complex grouped expressions', () => {
      expect(
        evaluator.evaluate(
          '(isActive or isDisabled) and (count > 0 or name == "John")',
          testData,
        ),
      ).toBe(true);

      expect(
        evaluator.evaluate(
          '(isActive and count > 10) or (name == "John" and user.age > 20)',
          testData,
        ),
      ).toBe(true);
    });
  });

  describe('IN Operator', () => {
    it('should check if item is in array', () => {
      expect(evaluator.evaluate('"a" in items', testData)).toBe(true);
      expect(evaluator.evaluate('"d" in items', testData)).toBe(false);
    });

    it('should work with variables', () => {
      const data = { ...testData, searchItem: 'b' };
      expect(evaluator.evaluate('searchItem in items', data)).toBe(true);
    });

    it('should return false for non-array', () => {
      expect(evaluator.evaluate('"test" in name', testData)).toBe(false);
    });

    it('should work with numbers', () => {
      const data = { numbers: [1, 2, 3, 4, 5] };
      expect(evaluator.evaluate('3 in numbers', data)).toBe(true);
      expect(evaluator.evaluate('10 in numbers', data)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty condition', () => {
      expect(evaluator.evaluate('', testData)).toBe(false);
      expect(evaluator.evaluate('   ', testData)).toBe(false);
    });

    it('should handle whitespace around operators', () => {
      expect(evaluator.evaluate('count  ==  5', testData)).toBe(true);
      expect(evaluator.evaluate('isActive   and   count>0', testData)).toBe(
        true,
      );
    });

    it('should handle string comparisons with spaces', () => {
      const data = { message: 'hello world' };
      expect(evaluator.evaluate('message == "hello world"', data)).toBe(true);
    });

    it('should handle comparison with variables on both sides', () => {
      const data = { a: 5, b: 5, c: 10 };
      expect(evaluator.evaluate('a == b', data)).toBe(true);
      expect(evaluator.evaluate('a == c', data)).toBe(false);
    });

    it('should handle deeply nested properties', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      };
      expect(
        evaluator.evaluate('level1.level2.level3.value == "deep"', data),
      ).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should evaluate user authentication condition', () => {
      const user = {
        isLoggedIn: true,
        role: 'admin',
        permissions: ['read', 'write', 'delete'],
      };

      expect(evaluator.evaluate('isLoggedIn and role == "admin"', user)).toBe(
        true,
      );
      expect(evaluator.evaluate('isLoggedIn and role == "user"', user)).toBe(
        false,
      );
    });

    it('should evaluate feature flag conditions', () => {
      const config = {
        betaEnabled: true,
        userCount: 150,
        isPremium: false,
      };

      expect(
        evaluator.evaluate(
          'betaEnabled and (userCount > 100 or isPremium)',
          config,
        ),
      ).toBe(true);
    });

    it('should evaluate form validation conditions', () => {
      const form = {
        email: 'user@example.com',
        password: 'secret123',
        agreedToTerms: true,
        age: 25,
      };

      expect(
        evaluator.evaluate(
          'email and password and agreedToTerms and age >= 18',
          form,
        ),
      ).toBe(true);

      const invalidForm = { ...form, agreedToTerms: false };
      expect(
        evaluator.evaluate(
          'email and password and agreedToTerms and age >= 18',
          invalidForm,
        ),
      ).toBe(false);
    });

    it('should evaluate content visibility conditions', () => {
      const content = {
        isPublished: true,
        status: 'approved',
        hasAccess: true,
        subscriptionLevel: 'premium',
      };

      expect(
        evaluator.evaluate(
          'isPublished and status == "approved" and (hasAccess or subscriptionLevel == "premium")',
          content,
        ),
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unmatched parentheses', () => {
      expect(() => evaluator.evaluate('(isActive', testData)).toThrow(
        /Unmatched/,
      );
    });

    it('should handle missing data gracefully', () => {
      expect(evaluator.evaluate('nonExistent.deeply.nested', testData)).toBe(
        false,
      );
    });
  });
});
