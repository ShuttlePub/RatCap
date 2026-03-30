module App.View.Login where

import Prelude

import App.Message (Message(..))
import App.Model (LoginForm)
import App.Theme as T
import Data.Maybe (Maybe(..))
import Data.String.Common (trim)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: LoginForm -> Maybe String -> Boolean -> Html Message
view form errorMsg savePending =
  HE.div [ HA.class' "space-y-8 max-w-sm mx-auto pt-12" ]
    [ HE.h1 [ HA.class' ("text-4xl font-bold tracking-tight text-center " <> T.textHeading) ]
        [ HE.text "Login" ]
    , errorBanner errorMsg
    , formSection form savePending
    ]

errorBanner :: Maybe String -> Html Message
errorBanner = case _ of
  Nothing -> HE.div [ HA.class' "hidden" ] []
  Just msg ->
    HE.div [ HA.class' ("px-4 py-3 text-sm " <> T.roundedTheme <> " " <> T.textError <> " border " <> T.borderTheme <> " bg-red-500/10") ]
      [ HE.text msg ]

formSection :: LoginForm -> Boolean -> Html Message
formSection form savePending =
  HE.form [ HA.class' (T.surface <> " p-6 space-y-5"), HA.onSubmit SubmitLogin ]
    [ fieldGroup "Username"
        [ HE.input
            [ HA.class' (inputClass <> " w-full")
            , HA.type' "text"
            , HA.placeholder "alice"
            , HA.value form.username
            , HA.onInput SetLoginUsername
            , HA.createAttribute "autocomplete" "username"
            ]
        ]
    , fieldGroup "Password"
        [ HE.input
            [ HA.class' (inputClass <> " w-full")
            , HA.type' "password"
            , HA.placeholder "••••••••"
            , HA.value form.password
            , HA.onInput SetLoginPassword
            , HA.createAttribute "autocomplete" "current-password"
            ]
        ]
    , HE.div [ HA.class' "pt-2" ]
        [ HE.button
            [ HA.class' ("w-full px-4 py-2.5 text-sm font-medium text-white " <> T.bgAccent <> " " <> T.hoverBgAccent <> " " <> T.roundedTheme <> " transition-colors" <> if savePending then " opacity-50 cursor-not-allowed" else "")
            , HA.type' "submit"
            , HA.disabled (trim form.username == "" || form.password == "" || savePending)
            ]
            [ HE.text (if savePending then "Logging in..." else "Login") ]
        ]
    ]

fieldGroup :: String -> Array (Html Message) -> Html Message
fieldGroup label children =
  HE.div [ HA.class' "space-y-1.5" ]
    [ HE.label [ HA.class' ("block text-sm font-medium " <> T.textPrimary) ]
        [ HE.text label ]
    , HE.div [] children
    ]

inputClass :: String
inputClass = "px-3 py-2 text-sm border " <> T.borderTheme <> " " <> T.bgSurface <> " " <> T.textPrimary <> " " <> T.roundedTheme <> " focus:outline-none focus:ring-2 focus:ring-accent/50"
