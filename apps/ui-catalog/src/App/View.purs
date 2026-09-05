module App.View where

import App.Message (Message)
import App.Model (Model)
import App.Route (Route(..))
import App.View.Home as Home
import App.View.Layout as Layout
import App.View.LayoutShowcase as LayoutShowcase
import App.View.LinkShowcase as LinkShowcase
import App.View.NotFoundShowcase as NotFoundShowcase
import App.View.ThemeShowcase as ThemeShowcase
import App.View.Tokens as Tokens
import Data.Maybe (Maybe(..))
import Flame (Html)
import ShuttlePub.UI.NotFound as NotFound

view :: Model -> Html Message
view model = Layout.page model
  [ case model.route of
      Just Home -> Home.view
      Just ComponentLayout -> LayoutShowcase.view
      Just ComponentLink -> LinkShowcase.view
      Just ComponentNotFound -> NotFoundShowcase.view
      Just ComponentTheme -> ThemeShowcase.view
      Just TokensColor -> Tokens.colorView
      Just TokensRadius -> Tokens.radiusView
      Just TokensShadow -> Tokens.shadowView
      Nothing -> NotFound.notFound
  ]
