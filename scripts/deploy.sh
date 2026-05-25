#!/bin/bash
set -e

TAG=${1}

if [ -z "$TAG" ]; then
  echo "Usage: $0 <tag>"
  echo "Example: $0 v1.0"
  exit 1
fi

MARKETING_VERSION=$(grep -m1 MARKETING_VERSION mobile/ios/App/App.xcodeproj/project.pbxproj | grep -o '[0-9][0-9.]*')
TAG_VERSION=$(echo "$TAG" | sed 's/^v//')

if [ "$MARKETING_VERSION" != "$TAG_VERSION" ]; then
  echo "Error: tag is $TAG but MARKETING_VERSION in Xcode is $MARKETING_VERSION — update it in Xcode first."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes. Commit or stash them before deploying."
  exit 1
fi

echo "Pushing latest commits..."
git push origin mobile

echo "Tagging $TAG..."
git tag "$TAG"

echo "Pushing tag (triggers CI deploy)..."
git push origin "$TAG"

echo "Done — $TAG deployed."
