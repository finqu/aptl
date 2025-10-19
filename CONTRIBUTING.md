# Contributing to APTL

Thank you for your interest in contributing to APTL (AI Prompt Template Language)! We welcome contributions from the community.

## Ways to Contribute

- **Report bugs** - Submit issues for bugs you encounter
- **Suggest features** - Propose new features or improvements
- **Improve documentation** - Help make our docs better
- **Submit code** - Fix bugs or implement new features
- **Share examples** - Contribute real-world template examples

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/finqu/aptl.git
   cd aptl
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Building the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript and generates type definitions.

### Running Tests

```bash
npm test
```

Make sure all tests pass before submitting a PR.

### Code Formatting

We use Prettier for code formatting:

```bash
# Check formatting
npm run format:check

# Auto-format code
npm run format
```

## Submitting Changes

1. **Make your changes** in your feature branch
2. **Add tests** for new functionality
3. **Update documentation** if needed
4. **Run tests** to ensure everything works:
   ```bash
   npm test
   npm run build
   ```
5. **Commit your changes** with clear commit messages:
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve issue with..."
   git commit -m "docs: update getting started guide"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Create a Pull Request** on GitHub

## Commit Message Guidelines

We follow conventional commit messages:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
- `feat: add @repeat directive`
- `fix: resolve variable resolution for nested arrays`
- `docs: add examples for template inheritance`

## Code Style

- Use TypeScript for all code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and concise

## Adding a New Directive

1. Create a new file in `src/directives/`
2. Extend `InlineDirective`, `BlockDirective`, or `ConditionalDirective`
3. Implement required methods
4. Add tests in `tests/unit/directives/`
5. Register the directive in `src/directives/index.ts`
6. Update documentation

Example:
```typescript
import { BlockDirective, DirectiveContext } from '@/directives/base-directive';

export class MyDirective extends BlockDirective {
  get name(): string {
    return 'mydirective';
  }

  execute(context: DirectiveContext): string {
    const content = this.renderChildren(context);
    // Your logic here
    return content;
  }
}
```

## Testing Guidelines

- Write tests for all new features
- Update tests when changing existing functionality
- Aim for high test coverage
- Test edge cases and error conditions
- Use descriptive test names

Test structure:
```typescript
describe('MyDirective', () => {
  it('should render content correctly', async () => {
    const template = `@mydirective\nContent\n@end`;
    const output = await engine.render(template, {});
    expect(output).toBe('Content');
  });
});
```

## Documentation

When adding new features:

1. Update the relevant documentation in `docs/`
2. Add examples to show usage
3. Update API reference if needed
4. Add to the CHANGELOG

Documentation structure:
- `docs/getting-started.md` - Getting started guide
- `docs/syntax-reference.md` - Syntax details
- `docs/directives.md` - Directive reference
- `docs/advanced-features.md` - Advanced topics
- `docs/examples.md` - Real-world examples
- `docs/api-reference.md` - API documentation
- `docs/best-practices.md` - Best practices

## Questions?

- Open an issue for questions
- Start a discussion in GitHub Discussions
- Check existing issues and PRs

## Code of Conduct

Please be respectful and constructive in all interactions. We're building a welcoming community.

## License

By contributing to APTL, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to APTL! 🎉
