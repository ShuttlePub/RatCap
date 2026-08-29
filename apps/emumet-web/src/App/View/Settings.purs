module App.View.Settings where

import Prelude

import App.Message (Message(..))
import App.Model (Model, SessionInfo)
import App.Route (Route(..))
import ShuttlePub.UI.Theme as T
import App.View.Link (link)
import Data.Maybe (Maybe(..))
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: Model -> Html Message
view model =
  HE.div [ HA.class' "space-y-8" ]
    [ HE.h1 [ HA.class' ("text-4xl font-bold tracking-tight " <> T.textHeading) ]
        [ HE.text "Settings" ]
    , accountSection
    , sessionSection model.session
    , blockMuteSection
    , displaySection
    ]

section :: String -> Array (Html Message) -> Html Message
section title children =
  HE.section [ HA.class' "space-y-3" ]
    ( [ HE.h2 [ HA.class' ("text-xl font-semibold " <> T.textPrimary) ]
          [ HE.text title ]
      ]
        <> children
    )

accountSection :: Html Message
accountSection =
  section "アカウント設定"
    [ HE.p [ HA.class' ("text-sm " <> T.textMuted) ]
        [ HE.text "アカウントの一覧や詳細の確認はこちらから。" ]
    , HE.div_ [ link Home [ HE.text "アカウント一覧へ" ] ]
    ]

sessionSection :: Maybe SessionInfo -> Html Message
sessionSection session =
  section "セッション情報" $ case session of
    Just info ->
      [ HE.div [ HA.class' (T.surface <> " p-4 flex items-center justify-between gap-3") ]
          [ HE.span [ HA.class' ("text-sm " <> T.textPrimary) ]
              [ HE.text ("ログイン中: " <> info.username) ]
          , HE.button
              [ HA.class' T.navLink
              , HA.onClick Logout
              ]
              [ HE.text "ログアウト" ]
          ]
      ]
    Nothing ->
      [ HE.p [ HA.class' ("text-sm " <> T.textMuted) ]
          [ HE.text "ログインしていません" ]
      , HE.div_ [ link Login [ HE.text "ログインページへ" ] ]
      ]

blockMuteSection :: Html Message
blockMuteSection =
  section "ブロック/ミュート（準備中）"
    [ HE.p [ HA.class' ("text-sm " <> T.textMuted) ]
        [ HE.text "ブロック・ミュートしたアカウントを管理する機能です。" ]
    , HE.p [ HA.class' ("text-sm " <> T.textMuted) ]
        [ HE.text "今後の機能です。" ]
    ]

displaySection :: Html Message
displaySection =
  section "表示設定"
    [ HE.div [ HA.class' "space-y-6" ]
        [ colorSection
        , shapeSection
        ]
    ]

colorSection :: Html Message
colorSection =
  HE.div [ HA.class' "space-y-3" ]
    [ HE.h3 [ HA.class' ("text-base font-semibold " <> T.textPrimary) ]
        [ HE.text "Color" ]
    , HE.div [ HA.class' "flex gap-3" ]
        [ colorCard "catppuccin-mocha" "#cba6f7" "Catppuccin Mocha"
        , colorCard "tokyo-night" "#7aa2f7" "Tokyo Night"
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
    [ HE.h3 [ HA.class' ("text-base font-semibold " <> T.textPrimary) ]
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
