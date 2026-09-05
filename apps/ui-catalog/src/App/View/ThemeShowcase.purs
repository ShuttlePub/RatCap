module App.View.ThemeShowcase where

import Prelude

import App.Message (Message(..))
import App.Route (Route(..))
import App.View.Common (blockSwatch, caption, pageHeader, storySection, textSwatch)
import Data.Tuple (Tuple(..))
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Link as Link
import ShuttlePub.UI.Theme as T

view :: Html Message
view =
  HE.div [ HA.class' "space-y-12" ]
    [ pageHeader "Theme" "ShuttlePub.UI.Theme class constants, applied live. Switch data-color / data-shape in the nav to see them react."
    , storySection "background" "Background"
        [ HE.div [ HA.class' "grid grid-cols-2 sm:grid-cols-4 gap-4" ]
            [ blockSwatch (Tuple "bgPrimary → bg-bg-primary" T.bgPrimary)
            , blockSwatch (Tuple "bgSecondary → bg-bg-secondary" T.bgSecondary)
            , blockSwatch (Tuple "bgSurface → bg-bg-surface" T.bgSurface)
            , blockSwatch (Tuple "bgNav → bg-bg-nav" T.bgNav)
            ]
        ]
    , storySection "text" "Text"
        [ textSwatch (Tuple "textPrimary → text-text-primary" T.textPrimary)
        , textSwatch (Tuple "textSecondary → text-text-secondary" T.textSecondary)
        , textSwatch (Tuple "textMuted → text-text-muted" T.textMuted)
        , textSwatch (Tuple "textHeading → text-text-heading" T.textHeading)
        , textSwatch (Tuple "textAccent → text-accent" T.textAccent)
        , textSwatch (Tuple "textError → text-error" T.textError)
        , textSwatch (Tuple "textTempHigh → text-temp-high" T.textTempHigh)
        , textSwatch (Tuple "textTempLow → text-temp-low" T.textTempLow)
        ]
    , storySection "accent-border" "Accent / Border"
        [ HE.div [ HA.class' "grid grid-cols-2 sm:grid-cols-4 gap-4" ]
            [ blockSwatch (Tuple "bgAccent → bg-accent" T.bgAccent)
            , blockSwatch (Tuple "borderTheme → border-border (border-2 demo)" ("border-2 " <> T.borderTheme))
            ]
        , HE.p [ HA.class' ("text-sm " <> T.hoverTextAccent) ]
            [ HE.text "hoverTextAccent → hover:text-accent (hover me)" ]
        , caption "hoverBgAccent → hover:bg-accent-hover is used on accent buttons in the apps"
        ]
    , storySection "shape" "Shape"
        [ HE.div [ HA.class' "grid grid-cols-2 sm:grid-cols-3 gap-4" ]
            [ shapeBox (Tuple "roundedTheme → rounded-theme" T.roundedTheme)
            , shapeBox (Tuple "roundedThemeLg → rounded-theme-lg" T.roundedThemeLg)
            , shapeBox (Tuple "shadowTheme → shadow-theme" (T.roundedTheme <> " " <> T.shadowTheme))
            ]
        , HE.p [ HA.class' ("text-sm " <> T.textSecondary) ]
            [ HE.text "data-shape=\"sharp\" flattens radius and shadow via the design tokens." ]
        ]
    , storySection "composites" "Composites"
        [ HE.div [ HA.class' (T.surface <> " p-4") ]
            [ caption "surface = roundedThemeLg + border + borderTheme + bgSurface + shadowTheme (this card)" ]
        , HE.div_
            [ Link.navLink "/" (Navigate Home) [ HE.text "navLink composite" ] ]
        ]
    ]
  where
  shapeBox (Tuple label cls) =
    HE.div [ HA.class' "space-y-2" ]
      [ HE.div [ HA.class' ("h-16 border " <> T.borderTheme <> " " <> T.bgSurface <> " " <> cls) ] []
      , caption label
      ]
