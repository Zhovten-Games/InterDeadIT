#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly TARGET_DIR="${1:-public}"

print_usage() {
  cat <<USAGE
Usage: $SCRIPT_NAME [HUGO_OUTPUT_DIR]

Audit generated HTML files and fail when a page has zero or more than one <h1> element.
Default output directory: public
USAGE
}

validate_target_dir() {
  if [[ ! -d "$TARGET_DIR" ]]; then
    echo "[audit-h1] Target directory not found: $TARGET_DIR" >&2
    echo "[audit-h1] Run 'hugo' or pass a valid output path." >&2
    exit 2
  fi
}

collect_html_files() {
  mapfile -d '' HTML_FILES < <(find "$TARGET_DIR" -type f -name '*.html' -print0 | sort -z)
}

count_h1_in_file() {
  local file_path="$1"
  rg --no-heading --ignore-case --count-matches '<h1(\s|>)' "$file_path" || true
}

audit_files() {
  local has_violations=0

  for file_path in "${HTML_FILES[@]}"; do
    local h1_count
    h1_count="$(count_h1_in_file "$file_path")"

    if [[ "$h1_count" -eq 0 ]]; then
      echo "[audit-h1][ZERO] $file_path"
      has_violations=1
    elif [[ "$h1_count" -gt 1 ]]; then
      echo "[audit-h1][MULTIPLE:$h1_count] $file_path"
      has_violations=1
    fi
  done

  if [[ "$has_violations" -ne 0 ]]; then
    echo "[audit-h1] FAILED: detected pages violating the one-h1 rule." >&2
    exit 1
  fi

  echo "[audit-h1] OK: all scanned pages contain exactly one <h1>."
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  print_usage
  exit 0
fi

validate_target_dir
collect_html_files

if [[ "${#HTML_FILES[@]}" -eq 0 ]]; then
  echo "[audit-h1] No HTML files found in: $TARGET_DIR" >&2
  exit 2
fi

audit_files
