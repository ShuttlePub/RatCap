#!/usr/bin/env bash
# E2E runner: boots the isolated booskiff-web-e2e compose stack, runs the
# Playwright suite against it, and always tears the stack down afterwards.
#
# Usage: apps/booskiff-web/scripts/e2e.sh [extra playwright args...]
#   e.g. scripts/e2e.sh -g "upload"
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
E2E_DIR="$APP_DIR/e2e"
COMPOSE_FILE="$E2E_DIR/compose.e2e.yml"
PROJECT_NAME="booskiff-web-e2e"

# 1. Locate the Booskiff core checkout (build context for the core image).
CORE_DIR="${BOOSKIFF_CORE_DIR:-$HOME/Documents/ShuttlePub/Booskiff}"
if [[ ! -f "$CORE_DIR/deploy/self-hosting/Containerfile" ]]; then
  echo "error: Booskiff core checkout not found at '$CORE_DIR'." >&2
  echo "Set BOOSKIFF_CORE_DIR to the absolute path of a Booskiff checkout" >&2
  echo "containing deploy/self-hosting/Containerfile and retry." >&2
  exit 1
fi
export BOOSKIFF_CORE_DIR="$CORE_DIR"

# 2. Generate the gitignored runtime env from the committed fixtures.
#    Compose cannot base64-encode the PEM itself, so this file carries the
#    pre-encoded values for the web service's env_file.
FIXTURES_DIR="$E2E_DIR/fixtures"
RUNTIME_ENV="$E2E_DIR/.env.e2e.runtime"
TEST_JWT_PRIVATE_KEY_PEM_BASE64="$(base64 -w0 "$FIXTURES_DIR/jwtRS256.pkcs8.pem")"
TEST_JWT_JWKS_JSON="$(tr -d '\n\r' < "$FIXTURES_DIR/jwks.json")"
printf 'TEST_JWT_PRIVATE_KEY_PEM_BASE64=%s\nTEST_JWT_JWKS_JSON=%s\n' \
  "$TEST_JWT_PRIVATE_KEY_PEM_BASE64" \
  "$TEST_JWT_JWKS_JSON" > "$RUNTIME_ENV"

# 3. Up, test, down (volumes included, so every run starts fresh).
cleanup() {
  docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" down -v --remove-orphans
}
trap cleanup EXIT
# Pre-clean in case a previous run died before its trap (or used `exec`).
cleanup

docker compose -f "$COMPOSE_FILE" --project-name "$PROJECT_NAME" up --build --wait

cd "$APP_DIR"
# Not `exec`: that would replace the shell and never run the EXIT trap.
playwright_exit=0
bunx playwright test --config e2e/playwright.config.ts "$@" || playwright_exit=$?
exit "$playwright_exit"
