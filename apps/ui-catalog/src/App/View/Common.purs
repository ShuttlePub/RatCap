module App.View.Common where

import Prelude

import App.Message (Message)
import Data.Tuple (Tuple(..))
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Theme as T

pageHeader :: String -> String -> Html Message
pageHeader title summary =
  HE.header [ HA.class' "space-y-2" ]
    [ HE.h1 [ HA.class' ("text-3xl font-bold tracking-tight " <> T.textHeading) ] [ HE.text title ]
    , HE.p [ HA.class' T.textSecondary ] [ HE.text summary ]
    ]

-- | Section id must match the story id in App.Catalog / manifest.ts:
-- | direct story URLs are `<page>#story-<id>`.
storySection :: String -> String -> Array (Html Message) -> Html Message
storySection id title children =
  HE.section [ HA.id ("story-" <> id), HA.class' "space-y-4 scroll-mt-20" ]
    [ HE.h2 [ HA.class' ("text-xl font-semibold " <> T.textHeading) ]
        [ HE.a [ HA.href ("#story-" <> id), HA.class' T.hoverTextAccent ] [ HE.text title ] ]
    , HE.div [ HA.class' (T.surface <> " p-6 space-y-4") ] children
    ]

caption :: String -> Html Message
caption label =
  HE.p [ HA.class' ("text-xs font-mono " <> T.textMuted) ] [ HE.text label ]

-- | A color block sample. `Tuple label className`; the class name must appear
-- | literally so Tailwind's @source scan picks it up.
blockSwatch :: Tuple String String -> Html Message
blockSwatch (Tuple label cls) =
  HE.div [ HA.class' "space-y-2" ]
    [ HE.div [ HA.class' ("h-16 border " <> T.borderTheme <> " " <> T.roundedTheme <> " " <> cls) ] []
    , caption label
    ]

textSwatch :: Tuple String String -> Html Message
textSwatch (Tuple label cls) =
  HE.div [ HA.class' "space-y-1" ]
    [ HE.p [ HA.class' cls ] [ HE.text "The quick brown fox jumps over the lazy dog — 敏捷な茶色の狐" ]
    , caption label
    ]
