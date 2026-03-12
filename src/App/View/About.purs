module App.View.About where

import Prelude

import App.Message (Message)
import App.Theme as T
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: Html Message
view =
  HE.div [ HA.class' "space-y-6" ]
    [ HE.h1 [ HA.class' ("text-4xl font-bold tracking-tight " <> T.textHeading) ]
        [ HE.text "About" ]
    , HE.p [ HA.class' ("text-lg leading-relaxed " <> T.textSecondary) ]
        [ HE.text "About Ratcap." ]
    ]
