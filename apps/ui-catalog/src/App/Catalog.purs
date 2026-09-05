module App.Catalog where

import Prelude

import App.Route (Route(..), routeCodec)
import Routing.Duplex (print)

data EntryKind = Component | DesignToken

derive instance Eq EntryKind

-- | PureScript-side source of truth for the catalog pages. The Bun server
-- | mirrors this list in manifest.ts for the agent-facing /manifest.json;
-- | both sides are pinned to the same URL list by test/Test/Main.purs
-- | (spago test) and manifest.test.ts (bun test), so drift fails CI.
type Story =
  { id :: String
  , title :: String
  }

type Entry =
  { name :: String
  , kind :: EntryKind
  , summary :: String
  , route :: Route
  , stories :: Array Story
  }

catalog :: Array Entry
catalog =
  [ { name: "Layout"
    , kind: Component
    , summary: "document / shell / navBar / contentArea — page shell primitives"
    , route: ComponentLayout
    , stories:
        [ { id: "navbar", title: "navBar" }
        , { id: "content-area", title: "contentArea" }
        , { id: "document", title: "document / shell" }
        ]
    }
  , { name: "Link"
    , kind: Component
    , summary: "navLink — client-side navigation link"
    , route: ComponentLink
    , stories:
        [ { id: "nav-link", title: "navLink" }
        ]
    }
  , { name: "NotFound"
    , kind: Component
    , summary: "notFound — 404 view"
    , route: ComponentNotFound
    , stories:
        [ { id: "not-found", title: "notFound" }
        ]
    }
  , { name: "Theme"
    , kind: Component
    , summary: "Theme class constants (background / text / accent / shape / composites)"
    , route: ComponentTheme
    , stories:
        [ { id: "background", title: "Background" }
        , { id: "text", title: "Text" }
        , { id: "accent-border", title: "Accent / Border" }
        , { id: "shape", title: "Shape" }
        , { id: "composites", title: "Composites" }
        ]
    }
  , { name: "Colors"
    , kind: DesignToken
    , summary: "Color tokens (Catppuccin Mocha / Tokyo Night)"
    , route: TokensColor
    , stories:
        [ { id: "palette", title: "Palette" }
        ]
    }
  , { name: "Radius"
    , kind: DesignToken
    , summary: "Radius tokens (rounded / sharp)"
    , route: TokensRadius
    , stories:
        [ { id: "scale", title: "Scale" }
        ]
    }
  , { name: "Shadow"
    , kind: DesignToken
    , summary: "Shadow tokens"
    , route: TokensShadow
    , stories:
        [ { id: "elevation", title: "Elevation" }
        ]
    }
  ]

entryUrl :: Entry -> String
entryUrl entry = print routeCodec entry.route

storyUrl :: Entry -> Story -> String
storyUrl entry story = entryUrl entry <> "#story-" <> story.id
