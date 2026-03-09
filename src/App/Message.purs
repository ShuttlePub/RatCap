module App.Message where

import App.Api.Weather (WeatherDay)
import App.Model (PageModel)
import App.Route (Route)
import Data.Maybe (Maybe)

data Message
  = Navigate Route
  | UrlChanged (Maybe Route)
  | PageLoaded PageModel
  | FetchWeather
  | WeatherLoaded (Array WeatherDay)
