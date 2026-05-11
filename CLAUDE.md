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
- **Bundle CSS:** `bunx @tailwindcss/cli -i src/style.css -o dist/style.css`
- **Run tests:** `spago test`
- **Install JS dependencies:** `bun install`

## Architecture

- **Language:** PureScript with Flame framework (Elm architecture: Model, Message, Update, View)
- **Routing:** `routing-duplex` for bidirectional URL codec, `routing` for PushState History API
- **SSR:** `Server.purs` renders full HTML via `Flame.Renderer.String`, with serialized state embedded in `<template-state>` for hydration
- **Client:** `Client.purs` hydrates SSR HTML via `Flame.resumeMount`, then handles client-side routing with `matchesWith`
- **Styling:** Tailwind CSS v4 — utility classes applied directly via `HA.class'` in PureScript views; `src/style.css` is the entry point with `@source "../src/**/*.purs"` to scan PureScript files for class names
- **Auth (BFF):** `index.ts` implements BFF (Backend-for-Frontend) auth — mock mode (built-in) and real mode (Kratos + Hydra OAuth2 PKCE). Session is stored in an AES-GCM encrypted HttpOnly cookie (`ratcap_session`). `/api/*` proxy injects Bearer token from session cookie.
- **Dev server:** `index.ts` — Bun.serve() handles SSR (all routes), static files (`/app.js`, `/style.css`), auth endpoints (`/auth/*`), and API proxy (`/api/*`)
- **Dev script:** `scripts/dev.sh` — triple bundle (client + server + CSS) + watchexec (auto-rebuild on `.purs` changes) + Tailwind `--watch` + Bun dev server
- **PureScript packages:** managed by `spago.yaml`, uses registry package set
- **JS dependencies:** managed by `package.json` / `bun.lock`

### Module Structure

```
src/
  style.css               -- Tailwind CSS entry point (@import "tailwindcss" + @source)
  App/
    Route.purs            -- Route ADT (Home, Settings, AccountNew, AccountDetail, Login) + routing-duplex codec
    Model.purs            -- Model type (Maybe Route, PageModel, SessionInfo, isHydrated) + JSON instances
    Message.purs          -- Message ADT (Navigate, UrlChanged, CheckSession, Login/Logout, etc.)
    View.purs             -- Top-level view dispatcher
    Api/
      Client.purs         -- Generic HTTP client (Affjax-based: get, post, put, delete)
      Auth.purs           -- Auth API calls (login, checkSession, logout) via BFF /auth/* endpoints
      Emumet/
        Client.purs       -- Emumet API wrappers over Api.Client
        Types.purs        -- Auto-generated Emumet API types (DO NOT EDIT)
        Tristate.purs     -- Tristate type for optional update fields
    View/
      Layout.purs         -- HTML shell (<html>/<head>/<body>) + auth-aware navigation
      Login.purs          -- Login page view (email + password form)
      Accounts.purs       -- Account list view
      AccountNew.purs     -- New account form view
      AccountDetail.purs  -- Account detail/edit view
      Settings.purs       -- Settings page view
      NotFound.purs       -- 404 view
      Link.purs           -- SPA <a> with preventDefault + Navigate message
    Theme.purs            -- Semantic Tailwind class helpers (Catppuccin-mocha theme)
    Format.purs           -- Date/time formatting helpers
  Client.purs             -- Client entry: resumeMount + CheckSession + route subscription
  Client/
    Update.purs           -- Client update function (auth, navigation, API calls)
    Navigation.js         -- FFI: window.location.assign for full-page redirects
    Navigation.purs       -- PureScript binding for navigation FFI
    Fetch.js              -- FFI: alternative fetch implementation (unused)
    Fetch.purs            -- Alternative fetch module with bearer token (unused)
  Server.purs             -- Server entry: renderPage for SSR HTML generation
scripts/
  dev.sh                  -- Dev server (build + watch + serve)
  register-hydra-client.ts -- Register OAuth2 client in Hydra (real mode setup)
  fetch-openapi.ts        -- Fetch OpenAPI spec from Emumet
  generate-api.ts         -- Generate PureScript types from OpenAPI spec
  sync-api.ts             -- Sync API types (fetch + generate)
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
- Use `bun index.ts` (not `bun run index.ts`) to avoid Bun's module cache issues with rebuilt bundles.
- PureScript source changes require `spago bundle` to regenerate `dist/app.js` and `dist/server.js`. The dev script handles this automatically.
- Tailwind CSS classes are used directly in PureScript views via `HA.class' "..."`. New classes in `.purs` files are automatically picked up by Tailwind's `@source` directive.
- When adding a new static file to `dist/`, a corresponding route must be added in `index.ts`.
