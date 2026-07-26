#!/usr/bin/env bash
#
# Read-only wrapper around the `gh` CLI, used by the /label-issue command
# during issue triage. Claude is only allowed to call this script (see the
# allowed-tools in .claude/commands/label-issue.md), so this file is the
# security boundary: only a small allow-list of read commands is permitted.
#
set -euo pipefail

# gh authenticates via GH_TOKEN (falls back to GITHUB_TOKEN in Actions).
export GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"

# Match on the first two arguments (command + subcommand).
key="${1:-} ${2:-}"

case "$key" in
  "label list" | "issue view" | "search issues")
    exec gh "$@"
    ;;
  *)
    echo "Error: 'gh $*' is not allowed. Read-only triage commands only." >&2
    exit 1
    ;;
esac
