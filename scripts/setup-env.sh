#!/usr/bin/env bash
set -euo pipefail

# RugBoost local/container bootstrap for auth + package installs.
# This script configures user-level auth only (never commits secrets into the repo).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'HELP'
Usage: ./scripts/setup-env.sh [options]

Options:
  --non-interactive  Use environment variables only (no prompts)
  --install          Run npm install at the end
  --disable-proxy    Remove npm proxy settings for this user (useful for bad proxy 403s)
  -h, --help         Show this help message

Environment variables:
  NPM_TOKEN          npm auth token for npm registry
  NPM_REGISTRY       npm registry URL (default: https://registry.npmjs.org/)
  GH_USER            GitHub username for credential helper setup
  GH_PAT             GitHub PAT for credential helper setup
HELP
}

NON_INTERACTIVE=false
RUN_INSTALL=false
DISABLE_PROXY=false
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmjs.org/}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --non-interactive)
      NON_INTERACTIVE=true
      shift
      ;;
    --install)
      RUN_INSTALL=true
      shift
      ;;
    --disable-proxy)
      DISABLE_PROXY=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[error] Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

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

# Normalize registry URL once for consistent auth host formatting
NPM_REGISTRY="${NPM_REGISTRY%/}"
NPM_REGISTRY_HOST="${NPM_REGISTRY#https://}"
NPM_REGISTRY_HOST="${NPM_REGISTRY_HOST#http://}"

if [[ "$DISABLE_PROXY" == "true" ]]; then
  npm config --global delete proxy >/dev/null 2>&1 || true
  npm config --global delete https-proxy >/dev/null 2>&1 || true
  npm config --global delete http-proxy >/dev/null 2>&1 || true
  echo "[ok] Cleared npm proxy settings in user config"
fi

SET_NPM="n"
if [[ -n "${NPM_TOKEN:-}" ]]; then
  SET_NPM="y"
elif [[ "$NON_INTERACTIVE" == "false" ]]; then
  echo
  read -r -p "Configure npm auth token now? (y/N): " SET_NPM
fi

if [[ "$SET_NPM" =~ ^[Yy]$ ]]; then
  if [[ -z "${NPM_TOKEN:-}" ]]; then
    read -r -s -p "Paste NPM token (input hidden): " NPM_TOKEN
    echo
  fi
  if [[ -z "$NPM_TOKEN" ]]; then
    echo "[error] Empty NPM token provided."
    exit 1
  fi

  NPMRC_PATH="$HOME/.npmrc"
  touch "$NPMRC_PATH"

  # Remove previous auth + registry lines to avoid duplicates.
  grep -v '^//.*:_authToken=' "$NPMRC_PATH" | grep -v '^registry=' > "$NPMRC_PATH.tmp" || true
  mv "$NPMRC_PATH.tmp" "$NPMRC_PATH"

  {
    echo "registry=${NPM_REGISTRY}"
    echo "//${NPM_REGISTRY_HOST}/:_authToken=${NPM_TOKEN}"
    echo "always-auth=true"
  } >> "$NPMRC_PATH"

  chmod 600 "$NPMRC_PATH"
  echo "[ok] Wrote npm auth to $NPMRC_PATH (registry: ${NPM_REGISTRY})"
fi

SET_GH="n"
if [[ -n "${GH_USER:-}" || -n "${GH_PAT:-}" ]]; then
  SET_GH="y"
elif [[ "$NON_INTERACTIVE" == "false" ]]; then
  echo
  read -r -p "Configure GitHub PAT helper for git push/pull now? (y/N): " SET_GH
fi

if [[ "$SET_GH" =~ ^[Yy]$ ]]; then
  if [[ -z "${GH_USER:-}" ]]; then
    read -r -p "GitHub username: " GH_USER
  fi
  if [[ -z "${GH_PAT:-}" ]]; then
    read -r -s -p "GitHub PAT (input hidden): " GH_PAT
    echo
  fi

  if [[ -z "$GH_USER" || -z "$GH_PAT" ]]; then
    echo "[error] Username or PAT missing."
    exit 1
  fi

  git config --global credential.helper store
  printf "https://%s:%s@github.com\n" "$GH_USER" "$GH_PAT" >> "$HOME/.git-credentials"
  chmod 600 "$HOME/.git-credentials"
  echo "[ok] Stored GitHub credentials in ~/.git-credentials"
fi

if [[ "$RUN_INSTALL" == "false" && "$NON_INTERACTIVE" == "false" ]]; then
  echo
  read -r -p "Attempt dependency install now (npm install)? (y/N): " USER_RUN_INSTALL
  if [[ "$USER_RUN_INSTALL" =~ ^[Yy]$ ]]; then
    RUN_INSTALL=true
  fi
fi

if [[ "$RUN_INSTALL" == "true" ]]; then
  if [[ "$DISABLE_PROXY" == "true" ]]; then
    env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u npm_config_http_proxy -u npm_config_https_proxy npm install
  else
    npm install
  fi
fi

echo
cat <<'MSG'
Done.

Notes:
- This script stores secrets in your HOME directory, never in the repo.
- Do NOT commit ~/.npmrc or ~/.git-credentials.
- In Lovable/CI, prefer secret environment variables over file-based credentials.
MSG
