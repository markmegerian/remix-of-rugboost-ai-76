#!/usr/bin/env bash
set -euo pipefail

# RugBoost local/container bootstrap for auth + package installs.
# This script configures user-level auth only (never commits secrets into the repo).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== RugBoost Environment Setup =="
echo "Repo: $ROOT_DIR"
echo

if ! command -v npm >/dev/null 2>&1; then
  echo "[error] npm is not installed. Install Node.js first."
  exit 1
fi

NODE_VERSION="$(node -v 2>/dev/null || true)"
echo "Node: ${NODE_VERSION:-not-found}"

if [[ -n "$NODE_VERSION" ]]; then
  MAJOR="$(echo "$NODE_VERSION" | sed -E 's/^v([0-9]+).*/\1/')"
  if [[ "$MAJOR" -lt 22 ]]; then
    echo "[warn] Node 22+ is recommended for @capacitor/cli@8."
  fi
fi

echo
read -r -p "Configure npm auth token now? (y/N): " SET_NPM
if [[ "$SET_NPM" =~ ^[Yy]$ ]]; then
  read -r -s -p "Paste NPM token (input hidden): " NPM_TOKEN
  echo
  if [[ -z "$NPM_TOKEN" ]]; then
    echo "[error] Empty NPM token provided."
    exit 1
  fi

  NPMRC_PATH="$HOME/.npmrc"
  touch "$NPMRC_PATH"

  # Remove previous auth line for npmjs to avoid duplicates.
  grep -v '^//registry\.npmjs\.org/:_authToken=' "$NPMRC_PATH" > "$NPMRC_PATH.tmp" || true
  mv "$NPMRC_PATH.tmp" "$NPMRC_PATH"

  {
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}"
    echo "always-auth=true"
  } >> "$NPMRC_PATH"

  chmod 600 "$NPMRC_PATH"
  echo "[ok] Wrote npm auth to $NPMRC_PATH"
fi

echo
read -r -p "Configure GitHub PAT helper for git push/pull now? (y/N): " SET_GH
if [[ "$SET_GH" =~ ^[Yy]$ ]]; then
  read -r -p "GitHub username: " GH_USER
  read -r -s -p "GitHub PAT (input hidden): " GH_PAT
  echo

  if [[ -z "$GH_USER" || -z "$GH_PAT" ]]; then
    echo "[error] Username or PAT missing."
    exit 1
  fi

  git config --global credential.helper store
  printf "https://%s:%s@github.com\n" "$GH_USER" "$GH_PAT" >> "$HOME/.git-credentials"
  chmod 600 "$HOME/.git-credentials"
  echo "[ok] Stored GitHub credentials in ~/.git-credentials"
fi

echo
read -r -p "Attempt dependency install now (npm install)? (y/N): " RUN_INSTALL
if [[ "$RUN_INSTALL" =~ ^[Yy]$ ]]; then
  npm install
fi

echo
cat <<'MSG'
Done.

Notes:
- This script stores secrets in your HOME directory, never in the repo.
- Do NOT commit ~/.npmrc or ~/.git-credentials.
- In Lovable/CI, prefer secret environment variables over file-based credentials.
MSG
