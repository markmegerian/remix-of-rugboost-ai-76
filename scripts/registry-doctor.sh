#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REGISTRY="${NPM_REGISTRY:-$(npm config get registry 2>/dev/null || echo https://registry.npmjs.org)}"
REGISTRY="${REGISTRY%/}"

PASS=0
WARN=0
FAIL=0

pass(){ echo "✅ $1"; PASS=$((PASS+1)); }
warn(){ echo "⚠️  $1"; WARN=$((WARN+1)); }
fail(){ echo "❌ $1"; FAIL=$((FAIL+1)); }

run_cmd() {
  local name="$1"
  local cmd="$2"
  echo
  echo "--- $name ---"
  set +e
  local out
  out="$(timeout 25s bash -lc "$cmd" 2>&1)"
  local code=$?
  set -e
  echo "$out"
  if [[ $code -eq 0 ]]; then
    pass "$name"
  else
    if [[ $code -eq 124 ]]; then
      warn "$name (timed out)"
    else
      fail "$name"
    fi
  fi
  return $code
}

echo "== RugBoost Registry Doctor =="
echo "Repo: $ROOT_DIR"
echo "Registry: $REGISTRY"
echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo
printf "Proxy env:\n"
env | rg -n "HTTP_PROXY|HTTPS_PROXY|http_proxy|https_proxy|NO_PROXY|no_proxy|npm_config_http_proxy|npm_config_https_proxy" || true

run_cmd "npm whoami (auth check)" "npm whoami --registry '$REGISTRY'" || true
run_cmd "npm ping (current env)" "npm ping --registry '$REGISTRY'" || true

if [[ -n "${NPM_TOKEN:-}" ]]; then
  echo
  echo "NPM_TOKEN detected; applying setup-env..."
  ./scripts/setup-env.sh --non-interactive || true
  run_cmd "npm ping after setup-env" "npm ping --registry '$REGISTRY'" || true
else
  warn "NPM_TOKEN not set in environment"
fi

run_cmd "npm ping with proxy vars unset (diagnostic)" "env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u npm_config_http_proxy -u npm_config_https_proxy npm ping --registry '$REGISTRY'" || true

echo
cat <<'GUIDE'
Next actions by outcome:
1) If ping works without proxy but fails with proxy:
   - your proxy policy is blocking the registry; ask admin to allow the registry host.
2) If ping fails both ways with 403:
   - token/registry policy issue; use org registry mirror or verify token scope.
3) If ping works but npm ci fails:
   - dependency policy blocks specific packages; mirror/allowlist those packages.

Windows PowerShell quick setup:
  $env:NPM_TOKEN="<token>"
  $env:NPM_REGISTRY="https://registry.npmjs.org"
  bash ./scripts/setup-env.sh --non-interactive --install
GUIDE

echo
 echo "== Summary =="
echo "✅ Passed: $PASS"
echo "⚠️  Warnings: $WARN"
echo "❌ Failed: $FAIL"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
