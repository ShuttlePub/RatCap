module App.View.NotFound where

import App.Message (Message)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: Html Message
view =
  HE.div [ HA.class' "space-y-6 text-center py-20" ]
    [ HE.h1 [ HA.class' "text-6xl font-bold text-gray-300" ]
        [ HE.text "404" ]
    , HE.p [ HA.class' "text-lg text-gray-500" ]
        [ HE.text "Page not found." ]
    ]
