module App.View.NotFound where

import App.Message (Message)
import Flame (Html)
import Flame.Html.Element as HE

view :: Html Message
view =
  HE.div_
    [ HE.h1_ [ HE.text "404" ]
    , HE.p_ [ HE.text "Page not found." ]
    ]
