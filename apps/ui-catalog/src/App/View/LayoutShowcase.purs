module App.View.LayoutShowcase where

import Prelude

import App.Message (Message(..))
import App.Route (Route(..))
import App.View.Common (pageHeader, storySection)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Layout as UI
import ShuttlePub.UI.Link as Link
import ShuttlePub.UI.Theme as T

view :: Html Message
view =
  HE.div [ HA.class' "space-y-12" ]
    [ pageHeader "Layout" "ShuttlePub.UI.Layout — document / shell / navBar / contentArea page shell primitives"
    , storySection "navbar" "navBar"
        [ UI.navBar demoBrand
            [ HE.li_ [ Link.navLink "/" (Navigate Home) [ HE.text "Index" ] ]
            , HE.li_ [ Link.navLink "/component/link" (Navigate ComponentLink) [ HE.text "Link" ] ]
            ]
        ]
    , storySection "content-area" "contentArea"
        [ UI.contentArea
            [ HE.p [ HA.class' T.textPrimary ]
                [ HE.text "contentArea centers content (max-w-4xl) with page padding. This demo is nested inside the page's own contentArea." ]
            ]
        ]
    , storySection "document" "document / shell"
        [ HE.p [ HA.class' T.textSecondary ]
            [ HE.text "document renders the <html> root of this very page (lang, viewport meta, theme init script, /style.css and /app.js wiring) with the default data-color=\"catppuccin-mocha\" data-shape=\"rounded\" attributes. shell renders <main id=\"app\">, the hydration mount point — you are looking at both right now." ]
        ]
    ]
  where
  demoBrand =
    HE.span [ HA.class' ("text-lg font-bold tracking-tight " <> T.textHeading) ] [ HE.text "Brand" ]
