module App.View.Home where

import Prelude

import App.Catalog (Entry, EntryKind(..), Story, catalog, entryUrl, storyUrl)
import App.Message (Message(..))
import App.View.Common (pageHeader)
import Data.Array (filter)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Link as Link
import ShuttlePub.UI.Theme as T

view :: Html Message
view =
  HE.div [ HA.class' "space-y-10" ]
    [ pageHeader "ShuttlePub UI Catalog"
        "packages/ui shared components and design-tokens showcase. Switch the theme in the nav: data-color (Catppuccin Mocha / Tokyo Night) × data-shape (rounded / sharp). Agent-facing manifest: /manifest.json"
    , entrySection "Components" Component
    , entrySection "Design tokens" DesignToken
    ]

entrySection :: String -> EntryKind -> Html Message
entrySection title kind =
  HE.section [ HA.class' "space-y-4" ]
    [ HE.h2 [ HA.class' ("text-xl font-semibold " <> T.textHeading) ] [ HE.text title ]
    , HE.div [ HA.class' "grid gap-4 sm:grid-cols-2" ]
        (map card (filter (\entry -> entry.kind == kind) catalog))
    ]

card :: Entry -> Html Message
card entry =
  HE.div [ HA.class' (T.surface <> " p-5 space-y-2") ]
    [ HE.div_
        [ Link.navLink (entryUrl entry) (Navigate entry.route) [ HE.text entry.name ] ]
    , HE.p [ HA.class' ("text-sm " <> T.textSecondary) ] [ HE.text entry.summary ]
    , HE.ul [ HA.class' ("space-y-1 text-xs font-mono " <> T.textMuted) ]
        (map (storyItem entry) entry.stories)
    ]

storyItem :: Entry -> Story -> Html Message
storyItem entry story =
  HE.li_
    [ HE.a [ HA.href (storyUrl entry story), HA.class' T.hoverTextAccent ]
        [ HE.text (storyUrl entry story) ]
    ]
