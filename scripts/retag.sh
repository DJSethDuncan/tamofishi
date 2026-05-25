#!/bin/bash
set -e

TAG=${1}

if [ -z "$TAG" ]; then
  echo "Usage: $0 <tag>"
  echo "Example: $0 v1.0"
  exit 1
fi

if [[ "$TAG" != v* ]]; then
  echo "Error: tag must start with 'v' (e.g. v1.0) — the CI trigger pattern is 'v*'."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes. Commit or stash them before retagging."
  exit 1
fi

echo "Pushing latest commits..."
git push origin main

echo "Retagging $TAG..."

git tag -d "$TAG"
git push origin ":refs/tags/$TAG"
git tag "$TAG"
git push origin "$TAG"

echo "Done — $TAG retagged and pushed."
