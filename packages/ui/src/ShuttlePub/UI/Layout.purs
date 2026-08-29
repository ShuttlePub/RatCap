module ShuttlePub.UI.Layout where

import Prelude

import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Theme as T

document :: forall msg. String -> Html msg -> Html msg
document title content =
  HE.html
    [ HA.lang "en"
    , HA.createAttribute "data-color" "catppuccin-mocha"
    , HA.createAttribute "data-shape" "rounded"
    ]
    [ HE.head_
        [ HE.meta [ HA.charset "utf-8" ]
        , HE.meta [ HA.name "viewport", HA.content "width=device-width, initial-scale=1.0" ]
        , HE.title [ HE.text title ]
        , themeInitScript
        , HE.link [ HA.rel "stylesheet", HA.href "/style.css" ]
        ]
    , HE.body_
        [ content
        , HE.script [ HA.type' "module", HA.src "/app.js" ] []
        ]
    ]

-- | Served as a static file (src/theme.js) because Flame's renderer HTML-escapes
-- | HE.text payloads, and <script> content is raw text where entities are not
-- | decoded — inlining would turn every `'` into `&#39;` and break the script.
themeInitScript :: forall msg. Html msg
themeInitScript =
  HE.script [ HA.src "/theme.js" ] []

shell :: forall msg. Array (Html msg) -> Html msg
shell children =
  HE.main [ HA.id "app", HA.class' ("min-h-screen antialiased " <> T.bgSecondary <> " " <> T.textPrimary) ]
    children

contentArea :: forall msg. Array (Html msg) -> Html msg
contentArea children =
  HE.div [ HA.id "content", HA.class' "max-w-4xl mx-auto px-6 py-12" ] children

navBar :: forall msg. Html msg -> Array (Html msg) -> Html msg
navBar brand items =
  HE.nav [ HA.class' ("sticky top-0 z-10 backdrop-blur-md border-b " <> T.bgNav <> " " <> T.borderTheme) ]
    [ HE.div [ HA.class' "max-w-4xl mx-auto px-6" ]
        [ HE.div [ HA.class' "flex items-center justify-between h-16" ]
            [ brand
            , HE.ul [ HA.class' "flex items-center gap-1" ] items
            ]
        ]
    ]
