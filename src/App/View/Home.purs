module App.View.Home where

import App.Message (Message)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: Html Message
view =
  HE.div [HA.class' "space-y-6"]
    [ HE.h1 [HA.class' "text-4xl font-bold tracking-tight text-gray-900"]
        [ HE.text "Home" ]
    , HE.p [HA.class' "text-lg text-gray-600 leading-relaxed"]
        [ HE.text "Welcome to Ratcap." ]
    ]
