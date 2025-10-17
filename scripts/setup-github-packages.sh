#!/bin/bash

# GitHub Packages Setup Script for @finqu/aptl

echo "🚀 Setting up GitHub Packages for @finqu/aptl"

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ GITHUB_TOKEN environment variable is not set"
    echo "Please set your GitHub Personal Access Token with packages:write permission:"
    echo "export GITHUB_TOKEN=your_token_here"
    exit 1
fi

echo "✅ GitHub token found"

# Login to GitHub npm registry
echo "📦 Logging into GitHub npm registry..."
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" >> ~/.npmrc
echo "@finqu:registry=https://npm.pkg.github.com" >> ~/.npmrc

echo "✅ Configured npm for GitHub packages"

# Build the package
echo "🔨 Building package..."
pnpm build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Package built successfully"

# Test publish (dry run)
echo "🧪 Testing publish (dry run)..."
pnpm publish --dry-run

if [ $? -ne 0 ]; then
    echo "❌ Publish test failed"
    exit 1
fi

echo "✅ Package ready to publish"
echo ""
echo "🎉 Setup complete! To publish your package:"
echo "   1. Create a new release on GitHub"
echo "   2. Or run: pnpm publish"
echo ""
echo "📚 Users can install with:"
echo "   npm install @finqu/aptl"
