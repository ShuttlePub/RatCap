# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ratcap is a PureScript web application using the Flame framework (Elm-like architecture). The frontend is built with PureScript and served via Bun.

## Development Environment

Development tools are managed via Nix flake + direnv. Entering the project directory automatically provides: `purs`, `spago`, `esbuild`, `watchexec`, `purs-backend-es`, `purescript-language-server`.

## Commands

- **Dev server (build + watch + serve):** `./scripts/dev.sh`
- **Build only:** `spago build`
- **Bundle for browser:** `spago bundle --platform browser --outfile dist/app.js`
- **Run tests:** `spago test`
- **Install JS dependencies:** `bun install`

## Architecture

- **Language:** PureScript with Flame framework (Elm architecture: Model, Message, Update, View)
- **Entry point:** `src/Main.purs` — mounts Flame app on `<body>`
- **Dev server:** `scripts/serve.ts` — Bun.serve() with HMR, serves `dist/index.html`
- **Dev script:** `scripts/dev.sh` — runs spago bundle + watchexec (auto-rebuild on `.purs` changes) + Bun dev server
- **PureScript packages:** managed by `spago.yaml`, uses registry package set
- **JS dependencies:** managed by `package.json` / `bun.lock`

## Tooling Preferences

- Use **Bun** instead of Node.js for all JS/TS execution and package management.
- Use **Bun.serve()** for serving, not express or vite.
- PureScript source changes require `spago bundle` to regenerate `dist/app.js`. The dev script handles this automatically.
