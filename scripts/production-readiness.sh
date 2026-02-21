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

print_403_help() {
  cat <<'MSG'
[hint] Dependency install failed with 403.
- Configure npm auth in HOME (not repo):
    export NPM_TOKEN="<token>"
    export NPM_REGISTRY="https://registry.npmjs.org"   # or your org mirror
    ./scripts/setup-env.sh --non-interactive
- Verify registry reachability:
    npm ping --registry "$NPM_REGISTRY"
- If still blocked, your proxy/security policy must allow that registry host.
MSG
}

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

  if [[ "$name" == "Install dependencies (npm ci)" ]] && echo "$output" | rg -q "403|E403|Forbidden"; then
    log_fail "$name (registry/auth policy block)"
    print_403_help
  else
    log_fail "$name"
  fi
  return 1
}

echo "== RugBoost Production Readiness =="
echo "Repo: $ROOT_DIR"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ -n "${NPM_TOKEN:-}" || -n "${GH_PAT:-}" ]]; then
  echo
  echo "Credentials detected in env; bootstrapping setup..."
  ./scripts/setup-env.sh --non-interactive || true
fi

# Node version gate for Capacitor 8+
echo
NODE_VERSION="$(node -v)"
echo "Node: $NODE_VERSION"
NODE_MAJOR="$(echo "$NODE_VERSION" | sed -E 's/^v([0-9]+).*/\1/')"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  log_warn "Node major version is <22 (recommended >=22 for @capacitor/cli@8)"
else
  log_pass "Node version gate"
fi

run_check "npm version" "npm -v"

if ! run_check "Install dependencies (npm ci)" "npm ci"; then
  echo
  log_warn "Skipped lint/test/build because dependencies did not install"
else
  run_check "Lint" "npm run -s lint"
  run_check "Unit tests" "npm run -s test"
  run_check "Build" "npm run -s build"
fi

echo
echo "== Summary =="
echo "✅ Passed: $PASS"
echo "⚠️  Warnings: $WARN"
echo "❌ Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
