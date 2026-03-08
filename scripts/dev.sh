#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Initial bundle (client + server)
spago bundle --platform browser --module Client --outfile dist/app.js
spago bundle --platform node --module Server --outfile dist/server.js --bundle-type module

# Watch PureScript sources and re-bundle on change
watchexec -w src -w spago.yaml -e purs -- \
  "spago bundle --platform browser --module Client --outfile dist/app.js && \
   spago bundle --platform node --module Server --outfile dist/server.js --bundle-type module" &
WATCH_PID=$!

# Start Bun dev server
bun scripts/serve.ts &
BUN_PID=$!

trap "kill $WATCH_PID $BUN_PID 2>/dev/null" EXIT

wait
