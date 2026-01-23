#!/bin/bash
set -e

# Check if template remote exists
if ! git remote | grep -q '^template$'; then
  echo "Error: 'template' remote not found."
  echo ""
  echo "To add the template remote, run:"
  echo "  git remote add template git@github.com:breath103/tss-stack-template.git"
  exit 1
fi

git fetch template
git rebase template/main

echo "Successfully rebased onto template/main"
