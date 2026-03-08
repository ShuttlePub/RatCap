module App.View.Home where

import App.Message (Message)
import Flame (Html)
import Flame.Html.Element as HE

view :: Html Message
view =
  HE.div_
    [ HE.h1_ [ HE.text "Home" ]
    , HE.p_ [ HE.text "Welcome to Ratcap." ]
    ]
