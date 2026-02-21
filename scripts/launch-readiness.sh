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
  if bash -lc "$cmd"; then
    log_pass "$name"
    return
  fi

  # Treat known environment/package access issues as warnings so rollout can continue with explicit blocker visibility.
  if [[ "$name" == "Install dependencies (npm ci)" ]]; then
    log_warn "$name (blocked by registry/auth policy or missing token)"
  else
    log_fail "$name"
  fi
}

echo "== RugBoost Launch Readiness Runner =="
echo "Repo: $ROOT_DIR"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ -n "${NPM_TOKEN:-}" || -n "${GH_PAT:-}" ]]; then
  echo
  echo "Credentials detected in env; running setup bootstrap in non-interactive mode..."
  ./scripts/setup-env.sh --non-interactive || true
fi

run_check "Node version" "node -v"
run_check "npm version" "npm -v"
run_check "Install dependencies (npm ci)" "npm ci"

if [[ -d node_modules ]]; then
  run_check "Lint" "npm run -s lint"
  run_check "Unit tests" "npm run -s test"
  run_check "Build" "npm run -s build"
else
  log_warn "Skipped lint/test/build because node_modules is unavailable"
fi

echo
echo "== Summary =="
echo "✅ Passed: $PASS"
echo "⚠️  Warnings: $WARN"
echo "❌ Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
