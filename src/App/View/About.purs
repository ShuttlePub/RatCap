module App.View.About where

import App.Message (Message)
import Flame (Html)
import Flame.Html.Element as HE

view :: Html Message
view =
  HE.div_
    [ HE.h1_ [ HE.text "About" ]
    , HE.p_ [ HE.text "About Ratcap." ]
    ]
