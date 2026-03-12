module App.View.Layout where

import Prelude

import App.Message (Message)
import App.Model (Model)
import App.Route (Route(..))
import App.Theme as T
import App.View.Link (link)
import Flame (Html)
import Flame.Html.Element as HE
import Flame.Html.Attribute as HA

page :: Model -> Array (Html Message) -> Html Message
page _model content =
  HE.main [ HA.id "app", HA.class' ("min-h-screen antialiased " <> T.bgSecondary <> " " <> T.textPrimary) ]
    [ nav
    , HE.div [ HA.id "content", HA.class' "max-w-4xl mx-auto px-6 py-12" ] content
    ]

nav :: Html Message
nav =
  HE.nav [ HA.class' ("sticky top-0 z-10 backdrop-blur-md border-b " <> T.bgNav <> " " <> T.borderTheme) ]
    [ HE.div [ HA.class' "max-w-4xl mx-auto px-6" ]
        [ HE.div [ HA.class' "flex items-center justify-between h-16" ]
            [ HE.span [ HA.class' ("text-lg font-bold tracking-tight " <> T.textHeading) ] [ HE.text "Ratcap" ]
            , HE.ul [ HA.class' "flex items-center gap-1" ]
                [ HE.li_ [ link Home [ HE.text "Home" ] ]
                , HE.li_ [ link About [ HE.text "About" ] ]
                , HE.li_ [ link Settings [ HE.text "Settings" ] ]
                ]
            ]
        ]
    ]

document :: Html Message -> Html Message
document content =
  HE.html
    [ HA.lang "en"
    , HA.createAttribute "data-color" "catppuccin-mocha"
    , HA.createAttribute "data-shape" "rounded"
    ]
    [ HE.head_
        [ HE.meta [ HA.charset "utf-8" ]
        , HE.meta [ HA.name "viewport", HA.content "width=device-width, initial-scale=1.0" ]
        , HE.title [ HE.text "Ratcap" ]
        , themeInitScript
        , HE.link [ HA.rel "stylesheet", HA.href "/style.css" ]
        ]
    , HE.body_
        [ content
        , HE.script [ HA.type' "module", HA.src "/app.js" ] []
        ]
    ]

themeInitScript :: Html Message
themeInitScript =
  HE.script_
    [ HE.text "(function(){var d=document.documentElement,c=localStorage.getItem('ratcap-color')||'catppuccin-mocha',s=localStorage.getItem('ratcap-shape')||'rounded';d.setAttribute('data-color',c);d.setAttribute('data-shape',s);var bg={'catppuccin-mocha':'#1e1e2e','tokyo-night':'#1a1b26'};d.style.backgroundColor=bg[c]||bg['catppuccin-mocha'];})()" ]
