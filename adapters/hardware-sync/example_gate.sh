#!/usr/bin/env bash
set -euo pipefail

profile="${1:-default}"

if [[ "${AHTO_SYNC_OK:-}" == "1" ]]; then
  echo "hardware sync gate passed for profile: ${profile}"
  exit 0
fi

echo "hardware sync gate failed for profile: ${profile}. Set AHTO_SYNC_OK=1 for the example stub or replace this script with a real project-specific gate." >&2
exit 1
