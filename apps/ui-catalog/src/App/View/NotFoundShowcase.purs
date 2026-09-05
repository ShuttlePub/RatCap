module App.View.NotFoundShowcase where

import Prelude

import App.Message (Message)
import App.View.Common (pageHeader, storySection)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.NotFound as NotFound
import ShuttlePub.UI.Theme as T

view :: Html Message
view =
  HE.div [ HA.class' "space-y-12" ]
    [ pageHeader "NotFound" "ShuttlePub.UI.NotFound — the shared 404 view"
    , storySection "not-found" "notFound"
        [ NotFound.notFound ]
    , HE.p [ HA.class' ("text-sm " <> T.textSecondary) ]
        [ HE.text "Any unknown URL (e.g. /nope) is SSR-rendered with this component as well." ]
    ]
