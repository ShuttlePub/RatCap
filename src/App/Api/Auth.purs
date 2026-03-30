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

-- | Login request body (identifier = email for Kratos compatibility)
newtype LoginRequest = LoginRequest { identifier :: String, password :: String }

instance EncodeJson LoginRequest where
  encodeJson (LoginRequest r) =
    "identifier" := r.identifier
      ~> "password" := r.password
      ~> jsonEmptyObject

-- | Login response from BFF
newtype LoginResponse = LoginResponse { authenticated :: Boolean, username :: String }

instance DecodeJson LoginResponse where
  decodeJson json = do
    obj <- decodeJson json
    authenticated <- obj .: "authenticated"
    username <- obj .: "username"
    pure (LoginResponse { authenticated, username })

-- | Session response from BFF (GET /auth/session)
newtype SessionResponse = SessionResponse { authenticated :: Boolean, username :: String }

instance DecodeJson SessionResponse where
  decodeJson json = do
    obj <- decodeJson json
    authenticated <- obj .: "authenticated"
    username <- obj .: "username"
    pure (SessionResponse { authenticated, username })

-- | POST /auth/login
login :: LoginRequest -> Aff (Either ApiError LoginResponse)
login = Api.post "/auth/login"

-- | GET /auth/session
checkSession :: Aff (Either ApiError SessionResponse)
checkSession = Api.get "/auth/session"

-- | POST /auth/logout
logout :: Aff (Either ApiError LogoutResponse)
logout = Api.post "/auth/logout" jsonEmptyObject

newtype LogoutResponse = LogoutResponse { loggedOut :: Boolean }

instance DecodeJson LogoutResponse where
  decodeJson json = do
    obj <- decodeJson json
    loggedOut <- obj .: "loggedOut"
    pure (LogoutResponse { loggedOut })
