#!/usr/bin/env bash

# Exit on error
set -e

echo "🧹 Cleaning dist directory..."
rm -rf dist

echo "📦 Building with Rolldown..."
pnpm rolldown --config rolldown.config.js

echo "📝 Generating TypeScript declarations..."
pnpm tsc -p tsconfig.build.json

echo "📋 Copying LocalFileSystem standalone export..."
mkdir -p dist/filesystem
cp src/filesystem/local-filesystem-standalone.js dist/filesystem/local-filesystem.js || echo "Note: Standalone file not found, will be created on demand"

echo "✅ Build complete!"
echo "📁 Output: dist/"
ls -lh dist/
