#!/bin/bash

# Version and Tag Creation Script for APTL
# Usage: ./scripts/version.sh [patch|minor|major|prerelease|<version>] [--no-push] [--no-publish]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PUSH=true
PUBLISH=false
DRY_RUN=false

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [patch|minor|major|prerelease|<version>] [options]"
    echo ""
    echo "Version Types:"
    echo "  patch       Increment patch version (1.0.0 -> 1.0.1)"
    echo "  minor       Increment minor version (1.0.0 -> 1.1.0)"
    echo "  major       Increment major version (1.0.0 -> 2.0.0)"
    echo "  prerelease  Increment prerelease version (1.0.0 -> 1.0.1-alpha.0)"
    echo "  <version>   Set specific version (e.g., 2.1.0-beta.1)"
    echo ""
    echo "Options:"
    echo "  --no-push     Don't push changes to remote repository"
    echo "  --publish     Publish to npm registry after tagging"
    echo "  --dry-run     Show what would be done without making changes"
    echo "  --help, -h    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 patch                    # Increment patch version"
    echo "  $0 1.2.0                    # Set specific version"
    echo "  $0 minor --publish          # Increment minor and publish"
    echo "  $0 prerelease --dry-run     # Preview prerelease changes"
}

# Parse command line arguments
VERSION_TYPE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        patch|minor|major|prerelease)
            VERSION_TYPE="$1"
            shift
            ;;
        --no-push)
            PUSH=false
            shift
            ;;
        --publish)
            PUBLISH=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        -*)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            if [[ -z "$VERSION_TYPE" ]]; then
                VERSION_TYPE="$1"
            else
                print_error "Too many arguments"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if version type is provided
if [[ -z "$VERSION_TYPE" ]]; then
    print_error "Version type is required"
    show_usage
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Check if working directory is clean
if [[ $(git status --porcelain) ]]; then
    print_error "Working directory is not clean. Please commit or stash your changes."
    git status --short
    exit 1
fi

# Check if we're on main branch (optional warning)
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    print_warning "You're not on the main branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborted"
        exit 0
    fi
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_info "Current version: $CURRENT_VERSION"

# Calculate new version
if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.*)?$ ]]; then
    # Specific version provided
    NEW_VERSION="$VERSION_TYPE"
else
    # Use npm version to calculate new version
    if [[ "$DRY_RUN" == true ]]; then
        # For dry run, simulate version calculation
        case $VERSION_TYPE in
            patch)
                NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1"."$2"."($3+1)}' | sed 's/-.*$//')
                ;;
            minor)
                NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print $1"."($2+1)".0"}' | sed 's/-.*$//')
                ;;
            major)
                NEW_VERSION=$(echo $CURRENT_VERSION | awk -F. '{print ($1+1)".0.0"}' | sed 's/-.*$//')
                ;;
            prerelease)
                if [[ $CURRENT_VERSION =~ -alpha\.[0-9]+$ ]]; then
                    NEW_VERSION=$(echo $CURRENT_VERSION | sed 's/-alpha\.\([0-9]*\)$/-alpha.\1/' | awk -F'-alpha.' '{print $1"-alpha."($2+1)}')
                else
                    NEW_VERSION="$CURRENT_VERSION-alpha.0"
                fi
                ;;
        esac
    else
        # Get new version using npm version (but don't commit yet)
        NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
        # Remove 'v' prefix if present
        NEW_VERSION=${NEW_VERSION#v}
    fi
fi

print_info "New version: $NEW_VERSION"

# Confirm the changes
if [[ "$DRY_RUN" == false ]]; then
    echo
    print_warning "This will:"
    echo "  • Update package.json version to $NEW_VERSION"
    echo "  • Create git tag v$NEW_VERSION"
    if [[ "$PUSH" == true ]]; then
        echo "  • Push changes and tags to remote repository"
    fi
    if [[ "$PUBLISH" == true ]]; then
        echo "  • Publish to npm registry"
    fi
    echo
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Aborted"
        exit 0
    fi
fi

if [[ "$DRY_RUN" == true ]]; then
    print_info "DRY RUN - No changes will be made"
    print_info "Would update version from $CURRENT_VERSION to $NEW_VERSION"
    print_info "Would create git tag v$NEW_VERSION"
    if [[ "$PUSH" == true ]]; then
        print_info "Would push changes and tags to remote"
    fi
    if [[ "$PUBLISH" == true ]]; then
        print_info "Would publish to npm registry"
    fi
    exit 0
fi

# Update package.json if not already done
if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-.*)?$ ]]; then
    print_info "Updating package.json version..."
    npm version $NEW_VERSION --no-git-tag-version > /dev/null
fi

# Create git commit
print_info "Creating git commit..."
git add package.json package-lock.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create git tag
print_info "Creating git tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

print_success "Version updated to $NEW_VERSION and tagged"

# Push changes and tags
if [[ "$PUSH" == true ]]; then
    print_info "Pushing changes and tags to remote..."
    git push origin $CURRENT_BRANCH
    git push origin "v$NEW_VERSION"
    print_success "Changes and tags pushed to remote"
fi

# Publish to npm
if [[ "$PUBLISH" == true ]]; then
    print_info "Publishing to npm registry..."
    npm publish
    print_success "Published to npm registry"
fi

print_success "All done! 🎉"
print_info "Version $NEW_VERSION has been created and tagged"

# Show recent tags
print_info "Recent tags:"
git tag --sort=-version:refname | head -5
