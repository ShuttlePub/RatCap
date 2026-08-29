module App.View.Layout where

import Prelude

import App.Message (Message(..))
import App.Model (Model)
import App.Route (Route(..))
import App.View.Link (link)
import Data.Maybe (Maybe(..))
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Layout as UI
import ShuttlePub.UI.Theme as T

page :: Model -> Array (Html Message) -> Html Message
page model content =
  UI.shell [ nav model, UI.contentArea content ]

nav :: Model -> Html Message
nav model =
  UI.navBar brand
    ( [ HE.li_ [ link Home [ HE.text "Home" ] ]
      , HE.li_ [ link Settings [ HE.text "Settings" ] ]
      ] <> authSection model
    )

brand :: Html Message
brand =
  HE.span [ HA.class' ("text-lg font-bold tracking-tight " <> T.textHeading) ] [ HE.text "Ratcap" ]

authSection :: Model -> Array (Html Message)
authSection model =
  case model.session of
    Just session ->
      [ HE.li_ [ HE.span [ HA.class' ("px-3 py-2 text-sm " <> T.textMuted) ] [ HE.text session.username ] ]
      , HE.li_
          [ HE.button
              [ HA.class' T.navLink
              , HA.onClick Logout
              ]
              [ HE.text "Logout" ]
          ]
      ]
    Nothing ->
      [ HE.li_ [ link Login [ HE.text "Login" ] ] ]
