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

data PageModel = Home | About | Settings | NotFound

derive instance Generic PageModel _
derive instance Eq PageModel

instance EncodeJson PageModel where
  encodeJson = genericEncodeJson

instance DecodeJson PageModel where
  decodeJson = genericDecodeJson

data RemoteData a = NotAsked | Loading | Failed | Loaded a

derive instance Generic (RemoteData a) _

instance EncodeJson a => EncodeJson (RemoteData a) where
  encodeJson = genericEncodeJson

instance DecodeJson a => DecodeJson (RemoteData a) where
  decodeJson = genericDecodeJson

type Model =
  { route :: Maybe Route
  , page :: PageModel
  , isHydrated :: Boolean
  , weather :: RemoteData (Array WeatherDay)
  }

pageForRoute :: Route -> PageModel
pageForRoute = case _ of
  Route.Home -> Home
  Route.About -> About
  Route.Settings -> Settings

pageForMaybeRoute :: Maybe Route -> PageModel
pageForMaybeRoute = maybe NotFound pageForRoute
