module App.Api.Auth where

import Prelude

import App.Api.Client as Api
import App.Api.Client (ApiError)
import Data.Argonaut.Decode (class DecodeJson, decodeJson)
import Data.Argonaut.Encode (class EncodeJson)
import Data.Argonaut.Encode.Combinators ((:=), (~>))
import Data.Argonaut.Core (jsonEmptyObject)
import Data.Argonaut.Decode.Combinators ((.:))
import Data.Either (Either)
import Effect.Aff (Aff)

-- | Login request body
newtype LoginRequest = LoginRequest { username :: String, password :: String }

instance EncodeJson LoginRequest where
  encodeJson (LoginRequest r) =
    "username" := r.username
      ~> "password" := r.password
      ~> jsonEmptyObject

-- | Login response from API
newtype LoginResponse = LoginResponse { token :: String, username :: String }

instance DecodeJson LoginResponse where
  decodeJson json = do
    obj <- decodeJson json
    token <- obj .: "token"
    username <- obj .: "username"
    pure (LoginResponse { token, username })

-- | POST /api/login
login :: LoginRequest -> Aff (Either ApiError LoginResponse)
login = Api.post "/api/login"
