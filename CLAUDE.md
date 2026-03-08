# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ratcap is a PureScript web application using the Flame framework (Elm-like architecture) with SSR (Server-Side Rendering) + client-side hydration and History API-based routing.

## Development Environment

Development tools are managed via Nix flake + direnv. Entering the project directory automatically provides: `purs`, `spago`, `esbuild`, `watchexec`, `purs-backend-es`, `purescript-language-server`.

## Commands

- **Dev server (build + watch + serve):** `./scripts/dev.sh`
- **Build only:** `spago build`
- **Bundle client:** `spago bundle --platform browser --module Client --outfile dist/app.js`
- **Bundle server:** `spago bundle --platform node --module Server --outfile dist/server.js --bundle-type module`
- **Run tests:** `spago test`
- **Install JS dependencies:** `bun install`

## Architecture

- **Language:** PureScript with Flame framework (Elm architecture: Model, Message, Update, View)
- **Routing:** `routing-duplex` for bidirectional URL codec, `routing` for PushState History API
- **SSR:** `Server.purs` renders full HTML via `Flame.Renderer.String`, with serialized state embedded in `<template-state>` for hydration
- **Client:** `Client.purs` hydrates SSR HTML via `Flame.resumeMount`, then handles client-side routing with `matchesWith`
- **Dev server:** `scripts/serve.ts` — Bun.serve() handles SSR (all routes), static files (`/app.js`), and API stub (`/api/*`)
- **Dev script:** `scripts/dev.sh` — dual bundle (client + server) + watchexec (auto-rebuild on `.purs` changes) + Bun dev server
- **PureScript packages:** managed by `spago.yaml`, uses registry package set
- **JS dependencies:** managed by `package.json` / `bun.lock`

### Module Structure

```
src/
  App/
    Route.purs          -- Route ADT + routing-duplex codec
    Model.purs          -- Model type (Maybe Route, PageModel, isHydrated) + JSON instances
    Message.purs        -- Message ADT (Navigate, UrlChanged, PageLoaded)
    View.purs           -- Top-level view dispatcher
    View/
      Layout.purs       -- HTML shell (<html>/<head>/<body>) + navigation
      Home.purs         -- Home page view
      About.purs        -- About page view
      NotFound.purs     -- 404 view
      Link.purs         -- SPA <a> with preventDefault + Navigate message
  Client.purs           -- Client entry: resumeMount + matchesWith routing
  Client/
    Update.purs         -- Client update function (Navigate→pushState, UrlChanged→Model update)
  Server.purs           -- Server entry: renderPage for SSR HTML generation
```

### Key Design Decisions

- **Single package + App namespace:** View is shared between server/client, so workspace separation adds no benefit
- **Mount selector `main#app`:** Flame hydration requires the mount selector to match the view's root element, not `body`
- **`Maybe Route` in Model:** Unknown URLs map to `Nothing` → `PageModel.NotFound`, since `routing-duplex` `sum` requires all constructors
- **`mkUpdate nav` closure:** PushStateInterface is not serializable, so it's injected via closure rather than stored in Model
- **`isHydrated` flag:** Prevents data re-fetch on initial `matchesWith` callback firing

## Tooling Preferences

- Use **Bun** instead of Node.js for all JS/TS execution and package management.
- Use **Bun.serve()** for serving, not express or vite.
- Use `bun scripts/serve.ts` (not `bun run scripts/serve.ts`) to avoid Bun's module cache issues with rebuilt bundles.
- PureScript source changes require `spago bundle` to regenerate `dist/app.js` and `dist/server.js`. The dev script handles this automatically.
