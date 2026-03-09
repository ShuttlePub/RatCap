#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

cleanup() {
  kill $(jobs -p) 2>/dev/null
}
trap cleanup EXIT INT TERM

# Initial bundle (client + server + CSS)
spago bundle --platform browser --module Client --outfile dist/app.js
spago bundle --platform node --module Server --outfile dist/server.js --bundle-type module
bunx @tailwindcss/cli -i src/style.css -o dist/style.css

# Watch PureScript sources and re-bundle on change
watchexec -w src -w spago.yaml -e purs -- \
  "spago bundle --platform browser --module Client --outfile dist/app.js && \
   spago bundle --platform node --module Server --outfile dist/server.js --bundle-type module" &

# Watch CSS sources and re-bundle on change
bunx @tailwindcss/cli -i src/style.css -o dist/style.css --watch &

# Start Bun dev server
bun scripts/serve.ts &

wait
