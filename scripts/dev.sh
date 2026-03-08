#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Initial bundle
spago bundle --platform browser --outfile dist/app.js

# Watch PureScript sources and re-bundle on change
watchexec -w src -w spago.yaml -e purs -- spago bundle --platform browser --outfile dist/app.js &
WATCH_PID=$!

# Start Bun dev server
bun run scripts/serve.ts &
BUN_PID=$!

trap "kill $WATCH_PID $BUN_PID 2>/dev/null" EXIT

wait
