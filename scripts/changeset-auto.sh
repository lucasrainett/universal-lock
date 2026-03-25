#!/usr/bin/env bash
set -euo pipefail

# Detect which packages have source changes compared to master
BASE_BRANCH="master"
PACKAGES_DIR="packages"

# Get changed files relative to master
CHANGED_FILES=$(git diff --name-only "$BASE_BRANCH"...HEAD -- "$PACKAGES_DIR/*/src/**" 2>/dev/null \
  || git diff --name-only "$BASE_BRANCH" -- "$PACKAGES_DIR/*/src/**" 2>/dev/null \
  || git diff --name-only HEAD -- "$PACKAGES_DIR/*/src/**")

if [ -z "$CHANGED_FILES" ]; then
  echo "No package source changes detected."
  exit 0
fi

# Extract unique package directories from changed files
CHANGED_PKGS=$(echo "$CHANGED_FILES" | sed 's|packages/\([^/]*\)/.*|\1|' | sort -u)

# Map directory names to package names
PACKAGE_NAMES=""
for pkg_dir in $CHANGED_PKGS; do
  pkg_json="$PACKAGES_DIR/$pkg_dir/package.json"
  if [ -f "$pkg_json" ]; then
    name=$(node -e "console.log(require('./$pkg_json').name)")
    PACKAGE_NAMES="$PACKAGE_NAMES $name"
  fi
done

PACKAGE_NAMES=$(echo "$PACKAGE_NAMES" | xargs)

if [ -z "$PACKAGE_NAMES" ]; then
  echo "No publishable packages changed."
  exit 0
fi

echo "Changed packages: $PACKAGE_NAMES"
echo ""

# Prompt for bump type
echo "Select bump type:"
echo "  1) patch  — bug fixes, internal changes"
echo "  2) minor  — new features, non-breaking"
echo "  3) major  — breaking changes"
echo ""
read -rp "Bump type [1/2/3]: " BUMP_CHOICE

case "$BUMP_CHOICE" in
  1) BUMP="patch" ;;
  2) BUMP="minor" ;;
  3) BUMP="major" ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

# Prompt for summary
echo ""
read -rp "Summary: " SUMMARY

if [ -z "$SUMMARY" ]; then
  echo "Summary cannot be empty."
  exit 1
fi

# Generate changeset file
CHANGESET_ID=$(node -e "console.log(Math.random().toString(36).substring(2, 10))")
CHANGESET_FILE=".changeset/${CHANGESET_ID}.md"

{
  echo "---"
  for name in $PACKAGE_NAMES; do
    echo "\"$name\": $BUMP"
  done
  echo "---"
  echo ""
  echo "$SUMMARY"
} > "$CHANGESET_FILE"

echo ""
echo "Created $CHANGESET_FILE:"
echo ""
cat "$CHANGESET_FILE"
