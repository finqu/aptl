#!/usr/bin/env bash

# Exit on error
set -e

echo "🧹 Cleaning dist directory..."
rm -rf dist

echo "📦 Building with Rolldown..."
pnpm rolldown --config rolldown.config.js

echo "📝 Generating TypeScript declarations..."
pnpm tsc -p tsconfig.build.json

echo "✅ Build complete!"
echo "📁 Output: dist/"
ls -lh dist/
