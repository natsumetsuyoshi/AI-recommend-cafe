#!/usr/bin/env bash
#
# Apply (or remove) labels on the issue from the current workflow event.
# Used by the /label-issue command during issue triage.
#
# Usage: ./scripts/edit-issue-labels.sh --add-label LABEL1 --add-label LABEL2
#
# The issue number is read from the GitHub Actions event payload, NOT from
# arguments — Claude cannot target an arbitrary issue. Only --add-label /
# --remove-label flags are forwarded to `gh issue edit`.
#
set -euo pipefail

export GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"

# Resolve the issue number from the workflow event (fallback: ISSUE_NUMBER env).
issue_number="${ISSUE_NUMBER:-}"
if [[ -z "$issue_number" && -n "${GITHUB_EVENT_PATH:-}" && -f "${GITHUB_EVENT_PATH}" ]]; then
  issue_number="$(jq -r '.issue.number // empty' "$GITHUB_EVENT_PATH")"
fi

if [[ -z "$issue_number" ]]; then
  echo "Error: could not determine the issue number from the workflow event." >&2
  exit 1
fi

# Forward only label flags to `gh issue edit`.
args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --add-label | --remove-label)
      if [[ $# -lt 2 ]]; then
        echo "Error: $1 requires a value." >&2
        exit 1
      fi
      args+=("$1" "$2")
      shift 2
      ;;
    *)
      echo "Error: unsupported argument: $1 (only --add-label / --remove-label allowed)" >&2
      exit 1
      ;;
  esac
done

if [[ ${#args[@]} -eq 0 ]]; then
  echo "No label changes requested; nothing to do."
  exit 0
fi

exec gh issue edit "$issue_number" "${args[@]}"
