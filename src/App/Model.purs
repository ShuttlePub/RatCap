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
import Data.Maybe (Maybe(..), maybe)

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

-- Form state for creating a new account
type NewAccountForm =
  { name :: String
  , isBot :: Boolean
  }

emptyNewAccountForm :: NewAccountForm
emptyNewAccountForm = { name: "", isBot: false }

-- Form state for editing a profile (Nothing = not editing)
type EditProfileForm =
  { displayName :: String
  , summary :: String
  , iconUrl :: String
  , bannerUrl :: String
  }

-- Form state for adding/editing metadata (Nothing = not editing)
-- id: Nothing = creating new, Just nanoid = editing existing
type EditMetadataForm =
  { id :: Maybe String
  , label :: String
  , content :: String
  }

type Model =
  { route :: Maybe Route
  , page :: PageModel
  , isHydrated :: Boolean
  , accounts :: RemoteData (Array AccountResponse)
  , selectedAccount :: RemoteData AccountWithDetails
  , accountDetails :: Array AccountWithDetails
  , nextId :: Int
  , newAccountForm :: NewAccountForm
  , editProfileForm :: Maybe EditProfileForm
  , editMetadataForm :: Maybe EditMetadataForm
  }

pageForRoute :: Route -> PageModel
pageForRoute = case _ of
  Route.Home -> Home
  Route.Settings -> Settings
  Route.AccountNew -> AccountNew
  Route.AccountDetail _ -> AccountDetail

pageForMaybeRoute :: Maybe Route -> PageModel
pageForMaybeRoute = maybe NotFound pageForRoute
