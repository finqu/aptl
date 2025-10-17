# APTL Documentation

This directory contains the GitHub Pages documentation for APTL (AI Prompt Template Language).

## Documentation Structure

- **[index.md](index.md)** - Main landing page with project overview, quick start, and navigation
- **[getting-started.md](getting-started.md)** - Installation guide, first template, basic concepts, and troubleshooting
- **[syntax-reference.md](syntax-reference.md)** - Complete syntax guide covering variables, sections, comments, and expressions
- **[directives.md](directives.md)** - Detailed reference for all built-in directives with examples
- **[advanced-features.md](advanced-features.md)** - Template inheritance, formatters, template registry, custom directives
- **[examples.md](examples.md)** - Real-world examples and use cases
- **[api-reference.md](api-reference.md)** - Complete TypeScript API documentation
- **[best-practices.md](best-practices.md)** - Guidelines for effective AI prompt engineering with APTL

## Viewing Documentation

### Online
The documentation is published at: https://finqu.github.io/aptl

### Local Development

To preview the documentation locally using Jekyll:

```bash
# Install Jekyll (if not already installed)
gem install bundler jekyll

# Navigate to the docs directory
cd docs

# Serve the site locally
jekyll serve

# Open http://localhost:4000/aptl in your browser
```

## Contributing to Documentation

When updating documentation:

1. Edit the relevant Markdown files in the `docs/` directory
2. Follow the existing structure and formatting
3. Test locally with Jekyll before committing
4. Ensure all internal links work correctly
5. Keep code examples accurate and tested

## Jekyll Configuration

The site uses:
- **Theme**: Cayman (GitHub Pages default)
- **Markdown**: Kramdown with GitHub Flavored Markdown
- **Syntax Highlighting**: Rouge

Configuration is in `_config.yml`.

## Deployment

Documentation is automatically deployed to GitHub Pages via GitHub Actions when changes are pushed to the `main` branch. See `.github/workflows/docs.yml` for the workflow configuration.
