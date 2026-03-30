#!/bin/bash
set -euo pipefail

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/bump-version.sh <version>"
  echo "Example: ./scripts/bump-version.sh 1.0.0"
  exit 1
fi

if [[ "$VERSION" == v* ]]; then
  echo "Error: provide version without 'v' prefix (e.g. 1.0.0, not v1.0.0)"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Bumping version to $VERSION..."

sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT_DIR/package.json"
sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT_DIR/apps/desktop/src-tauri/tauri.conf.json"

sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" "$ROOT_DIR/apps/mobile/app.json"

echo "Updated:"
echo "  - package.json"
echo "  - apps/desktop/src-tauri/tauri.conf.json"
echo "  - apps/mobile/app.json"

cd "$ROOT_DIR"
git add package.json apps/desktop/src-tauri/tauri.conf.json apps/mobile/app.json
git commit -m "release: v$VERSION"
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"

echo ""
echo "Tagged and pushed v$VERSION — release build started!"
echo "Watch the build: https://github.com/benjaminlgur/SimpleGlobalAudiobook/actions"
