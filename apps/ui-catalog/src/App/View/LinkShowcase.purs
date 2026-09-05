module App.View.LinkShowcase where

import App.Message (Message(..))
import App.Route (Route(..))
import App.View.Common (pageHeader, storySection)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Link as Link
import ShuttlePub.UI.Theme as T

view :: Html Message
view =
  HE.div [ HA.class' "space-y-12" ]
    [ pageHeader "Link" "ShuttlePub.UI.Link — navLink intercepts clicks and routes client-side (no full reload after hydration)"
    , storySection "nav-link" "navLink"
        [ HE.p [ HA.class' T.textSecondary ]
            [ HE.text "These links use navLink. After hydration, clicks go through pushState; in SSR HTML they are plain anchors." ]
        , HE.div [ HA.class' "flex gap-2" ]
            [ Link.navLink "/" (Navigate Home) [ HE.text "Index" ]
            , Link.navLink "/component/not-found" (Navigate ComponentNotFound) [ HE.text "NotFound" ]
            , Link.navLink "/tokens/color" (Navigate TokensColor) [ HE.text "Colors" ]
            ]
        ]
    ]
