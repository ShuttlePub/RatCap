module App.View.Tokens where

import Prelude

import App.Message (Message)
import App.View.Common (blockSwatch, pageHeader, storySection)
import Data.Tuple (Tuple(..))
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Theme as T

colorView :: Html Message
colorView =
  HE.div [ HA.class' "space-y-12" ]
    [ pageHeader "Colors"
        "Color tokens from packages/design-tokens/tokens.css. Use the nav switcher to compare data-color=\"catppuccin-mocha\" and data-color=\"tokyo-night\"."
    , storySection "palette" "Palette"
        [ HE.div [ HA.class' "grid grid-cols-2 sm:grid-cols-3 gap-4" ]
            [ blockSwatch (Tuple "--theme-bg-primary (bg-bg-primary)" "bg-bg-primary")
            , blockSwatch (Tuple "--theme-bg-secondary (bg-bg-secondary)" "bg-bg-secondary")
            , blockSwatch (Tuple "--theme-bg-surface (bg-bg-surface)" "bg-bg-surface")
            , blockSwatch (Tuple "--theme-bg-nav (bg-bg-nav)" "bg-bg-nav")
            , blockSwatch (Tuple "--theme-text-primary (bg-text-primary)" "bg-text-primary")
            , blockSwatch (Tuple "--theme-text-secondary (bg-text-secondary)" "bg-text-secondary")
            , blockSwatch (Tuple "--theme-text-muted (bg-text-muted)" "bg-text-muted")
            , blockSwatch (Tuple "--theme-text-heading (bg-text-heading)" "bg-text-heading")
            , blockSwatch (Tuple "--theme-accent (bg-accent)" "bg-accent")
            , blockSwatch (Tuple "--theme-accent-hover (bg-accent-hover)" "bg-accent-hover")
            , blockSwatch (Tuple "--theme-border (bg-border)" "bg-border")
            , blockSwatch (Tuple "--theme-temp-high (bg-temp-high)" "bg-temp-high")
            , blockSwatch (Tuple "--theme-temp-low (bg-temp-low)" "bg-temp-low")
            , blockSwatch (Tuple "--theme-error (bg-error)" "bg-error")
            ]
        ]
    ]

radiusView :: Html Message
radiusView =
  HE.div [ HA.class' "space-y-12" ]
    [ pageHeader "Radius"
        "Radius tokens. data-shape=\"rounded\" sets --theme-radius: 0.75rem / --theme-radius-lg: 1rem; data-shape=\"sharp\" sets both to 0."
    , storySection "scale" "Scale"
        [ HE.div [ HA.class' "grid grid-cols-2 gap-4" ]
            [ blockSwatch (Tuple "--theme-radius (rounded-theme)" ("rounded-theme " <> T.bgSurface))
            , blockSwatch (Tuple "--theme-radius-lg (rounded-theme-lg)" ("rounded-theme-lg " <> T.bgSurface))
            ]
        ]
    ]

shadowView :: Html Message
shadowView =
  HE.div [ HA.class' "space-y-12" ]
    [ pageHeader "Shadow"
        "Shadow token. data-shape=\"rounded\" sets --theme-shadow: 0 2px 8px rgba(0,0,0,0.15); data-shape=\"sharp\" sets it to none."
    , storySection "elevation" "Elevation"
        [ HE.div [ HA.class' "grid grid-cols-2 gap-4" ]
            [ blockSwatch (Tuple "--theme-shadow (shadow-theme)" ("shadow-theme " <> T.bgSurface))
            ]
        ]
    ]
