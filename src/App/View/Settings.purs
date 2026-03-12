module App.View.Settings where

import Prelude

import App.Message (Message)
import App.Theme as T
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: Html Message
view =
  HE.div [ HA.class' "space-y-8" ]
    [ HE.h1 [ HA.class' ("text-4xl font-bold tracking-tight " <> T.textHeading) ]
        [ HE.text "Settings" ]
    , colorSection
    , shapeSection
    ]

colorSection :: Html Message
colorSection =
  HE.div [ HA.class' "space-y-3" ]
    [ HE.h2 [ HA.class' ("text-xl font-semibold " <> T.textPrimary) ]
        [ HE.text "Color" ]
    , HE.div [ HA.class' "flex gap-3" ]
        [ colorCard "purple" "#a78bfa" "Purple"
        , colorCard "navy" "#4488cc" "Navy"
        ]
    ]

colorCard :: String -> String -> String -> Html Message
colorCard value swatch label =
  HE.button
    [ HA.class' (T.surface <> " p-4 flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-80")
    , HA.id ("color-" <> value)
    , HA.createAttribute "data-color-option" value
    ]
    [ HE.div
        [ HA.class' ("w-8 h-8 " <> T.roundedTheme)
        , HA.style { backgroundColor: swatch }
        ]
        []
    , HE.span [ HA.class' ("text-sm font-medium " <> T.textPrimary) ]
        [ HE.text label ]
    ]

shapeSection :: Html Message
shapeSection =
  HE.div [ HA.class' "space-y-3" ]
    [ HE.h2 [ HA.class' ("text-xl font-semibold " <> T.textPrimary) ]
        [ HE.text "Shape" ]
    , HE.div [ HA.class' "flex gap-3" ]
        [ shapeCard "rounded" "Rounded"
        , shapeCard "sharp" "Sharp"
        ]
    ]

shapeCard :: String -> String -> Html Message
shapeCard value label =
  HE.button
    [ HA.class' (T.surface <> " p-4 flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-80")
    , HA.id ("shape-" <> value)
    , HA.createAttribute "data-shape-option" value
    ]
    [ HE.div
        [ HA.class' ("w-8 h-8 border-2 " <> T.borderTheme <> " " <> bgForShape value)
        ]
        []
    , HE.span [ HA.class' ("text-sm font-medium " <> T.textPrimary) ]
        [ HE.text label ]
    ]

bgForShape :: String -> String
bgForShape = case _ of
  "rounded" -> "rounded-lg " <> T.bgSurface
  _ -> T.bgSurface
