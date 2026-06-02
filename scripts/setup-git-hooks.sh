#!/bin/sh
# Point this repo at tracked hooks (run once per clone).
set -e
cd "$(git rev-parse --show-toplevel)"
chmod +x .githooks/prepare-commit-msg
git config core.hooksPath .githooks
echo "Git hooks enabled (.githooks/prepare-commit-msg strips Cursor trailers)."
