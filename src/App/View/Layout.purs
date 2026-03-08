module App.View.Layout where

import App.Message (Message)
import App.Model (Model)
import App.Route (Route(..))
import App.View.Link (link)
import Flame (Html)
import Flame.Html.Element as HE
import Flame.Html.Attribute as HA

page :: Model -> Array (Html Message) -> Html Message
page _model content =
  HE.main [HA.id "app"]
    [ nav
    , HE.div [HA.id "content"] content
    ]

nav :: Html Message
nav =
  HE.nav_
    [ HE.ul_
        [ HE.li_ [ link Home [ HE.text "Home" ] ]
        , HE.li_ [ link About [ HE.text "About" ] ]
        ]
    ]

document :: Html Message -> Html Message
document content =
  HE.html
    [ HA.lang "en" ]
    [ HE.head_
        [ HE.meta [ HA.charset "utf-8" ]
        , HE.title [ HE.text "Ratcap" ]
        ]
    , HE.body_
        [ content
        , HE.script [ HA.type' "module", HA.src "/app.js" ] []
        ]
    ]
