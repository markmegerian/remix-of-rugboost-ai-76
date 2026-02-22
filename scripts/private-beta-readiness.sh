#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASS=0
WARN=0
FAIL=0

log_pass() { echo "✅ $1"; PASS=$((PASS+1)); }
log_warn() { echo "⚠️  $1"; WARN=$((WARN+1)); }
log_fail() { echo "❌ $1"; FAIL=$((FAIL+1)); }

run_check() {
  local name="$1"
  local cmd="$2"

  echo
  echo "--- $name ---"
  set +e
  local output
  output="$(bash -lc "$cmd" 2>&1)"
  local code=$?
  set -e
  echo "$output"

  if [[ $code -eq 0 ]]; then
    log_pass "$name"
    return 0
  fi

  log_fail "$name"
  return 1
}

echo "== RugBoost Private Beta Readiness =="
echo "Repo: $ROOT_DIR"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

NODE_VERSION="$(node -v)"
echo
echo "Node: $NODE_VERSION"
NODE_MAJOR="$(echo "$NODE_VERSION" | sed -E 's/^v([0-9]+).*/\1/')"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  log_warn "Node major version is <22 (recommended >=22 for @capacitor/cli@8)"
else
  log_pass "Node version gate"
fi

run_check "npm version" "npm -v"
run_check "Install dependencies (npm ci)" "npm ci"
run_check "Lint" "npm run -s lint"
run_check "Unit tests" "npm run -s test"
run_check "Build" "npm run -s build"

echo
echo "== Summary =="
echo "✅ Passed: $PASS"
echo "⚠️  Warnings: $WARN"
echo "❌ Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
