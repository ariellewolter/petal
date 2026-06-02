#!/usr/bin/env python3
"""Remove Cursor agent trailers from git commit messages (for filter-branch)."""
import sys

SKIP = {
    "Co-authored-by: Cursor <cursoragent@cursor.com>",
    "Made-with: Cursor",
}

text = sys.stdin.read()
lines = text.split("\n")
while lines and lines[-1] == "":
    lines.pop()
filtered = [line for line in lines if line not in SKIP]
sys.stdout.write("\n".join(filtered))
if filtered:
    sys.stdout.write("\n")
