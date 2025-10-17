#!/bin/bash

# Development Helper Script for APTL
# Quick shortcuts for common development tasks

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

show_usage() {
    echo "APTL Development Helper"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  status       Show current project status"
    echo "  tags         List recent git tags"
    echo "  clean        Clean build artifacts"
    echo "  fresh        Fresh build (clean + build)"
    echo "  check        Check for uncommitted changes"
    echo "  info         Show project information"
    echo ""
    echo "Version Management:"
    echo "  patch        Create patch version"
    echo "  minor        Create minor version"
    echo "  major        Create major version"
    echo "  prerelease   Create prerelease version"
    echo "  preview      Preview next patch version"
}

case "$1" in
    status)
        print_info "Project Status"
        echo "Current version: $(node -p "require('./package.json').version")"
        echo "Current branch: $(git branch --show-current)"
        echo "Git status:"
        git status --short
        echo ""
        echo "Recent commits:"
        git log --oneline -5
        ;;
    tags)
        print_info "Recent Git Tags"
        git tag --sort=-version:refname | head -10
        ;;
    clean)
        print_info "Cleaning build artifacts..."
        rm -rf dist/
        print_success "Clean complete"
        ;;
    fresh)
        print_info "Fresh build starting..."
        rm -rf dist/
        pnpm build
        print_success "Fresh build complete"
        ;;
    check)
        if [[ $(git status --porcelain) ]]; then
            print_warning "Working directory is not clean:"
            git status --short
            exit 1
        else
            print_success "Working directory is clean"
        fi
        ;;
    info)
        print_info "Project Information"
        echo "Name: $(node -p "require('./package.json').name")"
        echo "Version: $(node -p "require('./package.json').version")"
        echo "Description: $(node -p "require('./package.json').description")"
        echo "Registry: $(node -p "require('./package.json').publishConfig?.registry || 'npm'")"
        echo "Repository: $(node -p "require('./package.json').repository?.url || 'Not set'")"
        ;;
    patch)
        ./scripts/version.sh patch
        ;;
    minor)
        ./scripts/version.sh minor
        ;;
    major)
        ./scripts/version.sh major
        ;;
    prerelease)
        ./scripts/version.sh prerelease
        ;;
    preview)
        ./scripts/version.sh patch --dry-run
        ;;
    ""|--help|-h)
        show_usage
        ;;
    *)
        echo "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
