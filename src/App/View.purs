module App.View where

import App.Message (Message)
import App.Model (Model, PageModel(..))
import App.View.About as About
import App.View.Home as Home
import App.View.Layout as Layout
import App.View.NotFound as NotFound
import App.View.Settings as Settings
import Flame (Html)

view :: Model -> Html Message
view model = Layout.page model
  [ case model.page of
      Home -> Home.view model.weather
      About -> About.view
      Settings -> Settings.view
      NotFound -> NotFound.view
  ]
