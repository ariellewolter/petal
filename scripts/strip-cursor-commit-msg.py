#!/usr/bin/env python3
"""Remove Cursor attribution trailers from git commit messages."""
import re
import sys

TRAILER_RE = re.compile(
    r"^(?:Co-authored-by:|Made-with:).*(?:[Cc]ursor|cursoragent@)",
    re.IGNORECASE,
)


def strip_message(text: str) -> str:
    lines = text.split("\n")
    while lines and lines[-1] == "":
        lines.pop()
    filtered = [line for line in lines if not TRAILER_RE.match(line.strip())]
    if not filtered:
        return ""
    return "\n".join(filtered) + "\n"


if __name__ == "__main__":
    sys.stdout.write(strip_message(sys.stdin.read()))
