module App.View.AccountNew where

import Prelude

import App.Message (Message(..))
import App.Model (NewAccountForm)
import App.Theme as T
import Data.String.Common (trim)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: NewAccountForm -> Html Message
view form =
  HE.div [ HA.class' "space-y-8 max-w-lg mx-auto" ]
    [ HE.h1 [ HA.class' ("text-4xl font-bold tracking-tight " <> T.textHeading) ]
        [ HE.text "New Account" ]
    , formSection form
    ]

formSection :: NewAccountForm -> Html Message
formSection form =
  HE.div [ HA.class' (T.surface <> " p-6 space-y-5") ]
    [ fieldGroup "Name" "Account handle (e.g. alice)"
        [ HE.input
            [ HA.class' (inputClass <> " w-full")
            , HA.type' "text"
            , HA.placeholder "alice"
            , HA.value form.name
            , HA.onInput SetNewAccountName
            ]
        ]
    , fieldGroup "Type" "Is this a bot account?"
        [ HE.label [ HA.class' ("flex items-center gap-3 cursor-pointer " <> T.textSecondary) ]
            [ HE.input
                [ HA.class' ("w-4 h-4 " <> T.bgAccent)
                , HA.type' "checkbox"
                , HA.checked form.isBot
                , HA.onCheck SetNewAccountIsBot
                ]
            , HE.text "This is a bot account"
            ]
        ]
    , HE.div [ HA.class' "pt-2" ]
        [ HE.button
            [ HA.class' ("w-full px-4 py-2.5 text-sm font-medium text-white " <> T.bgAccent <> " " <> T.hoverBgAccent <> " " <> T.roundedTheme <> " transition-colors")
            , HA.onClick SubmitNewAccount
            , HA.disabled (trim form.name == "")
            ]
            [ HE.text "Create Account" ]
        ]
    ]

fieldGroup :: String -> String -> Array (Html Message) -> Html Message
fieldGroup label hint children =
  HE.div [ HA.class' "space-y-1.5" ]
    [ HE.label [ HA.class' ("block text-sm font-medium " <> T.textPrimary) ]
        [ HE.text label ]
    , HE.div [] children
    , HE.p [ HA.class' ("text-xs " <> T.textMuted) ]
        [ HE.text hint ]
    ]

inputClass :: String
inputClass = "px-3 py-2 text-sm border " <> T.borderTheme <> " " <> T.bgSurface <> " " <> T.textPrimary <> " " <> T.roundedTheme <> " focus:outline-none focus:ring-2 focus:ring-accent/50"
