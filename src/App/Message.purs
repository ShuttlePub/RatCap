module App.Message where

import App.Model (PageModel)
import App.Route (Route)

data Message
  = Navigate Route
  | UrlChanged Route
  | PageLoaded PageModel
