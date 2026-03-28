module App.Model where

import Prelude

import App.Api.Emumet.Types (AccountResponse, MetadataResponse, ProfileResponse)
import App.Route (Route)
import App.Route as Route
import Data.Argonaut.Decode (class DecodeJson)
import Data.Argonaut.Decode.Generic (genericDecodeJson)
import Data.Argonaut.Encode (class EncodeJson)
import Data.Argonaut.Encode.Generic (genericEncodeJson)
import Data.Generic.Rep (class Generic)
import Data.Maybe (Maybe, maybe)

data PageModel = Home | Settings | AccountNew | AccountDetail | NotFound

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

type AccountWithDetails =
  { account :: AccountResponse
  , profile :: Maybe ProfileResponse
  , metadata :: Array MetadataResponse
  }

type Model =
  { route :: Maybe Route
  , page :: PageModel
  , isHydrated :: Boolean
  , accounts :: RemoteData (Array AccountResponse)
  , selectedAccount :: RemoteData AccountWithDetails
  }

pageForRoute :: Route -> PageModel
pageForRoute = case _ of
  Route.Home -> Home
  Route.Settings -> Settings
  Route.AccountNew -> AccountNew
  Route.AccountDetail _ -> AccountDetail

pageForMaybeRoute :: Maybe Route -> PageModel
pageForMaybeRoute = maybe NotFound pageForRoute
