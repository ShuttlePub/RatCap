module App.Model where

import Prelude

import App.Api.Weather (WeatherDay)
import App.Route (Route)
import App.Route as Route
import Data.Argonaut.Decode (class DecodeJson)
import Data.Argonaut.Decode.Generic (genericDecodeJson)
import Data.Argonaut.Encode (class EncodeJson)
import Data.Argonaut.Encode.Generic (genericEncodeJson)
import Data.Generic.Rep (class Generic)
import Data.Maybe (Maybe, maybe)

data PageModel = Home | About | NotFound

derive instance Generic PageModel _
derive instance Eq PageModel

instance EncodeJson PageModel where
  encodeJson = genericEncodeJson

instance DecodeJson PageModel where
  decodeJson = genericDecodeJson

type Model =
  { route :: Maybe Route
  , page :: PageModel
  , isHydrated :: Boolean
  , weather :: Maybe (Array WeatherDay)
  }

pageForRoute :: Route -> PageModel
pageForRoute = case _ of
  Route.Home -> Home
  Route.About -> About

pageForMaybeRoute :: Maybe Route -> PageModel
pageForMaybeRoute = maybe NotFound pageForRoute
