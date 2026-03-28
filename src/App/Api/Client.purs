module App.Api.Client where

import Prelude

import Affjax.ResponseFormat as AXRF
import Affjax.StatusCode (StatusCode(..))
import Affjax.Web as AX
import Affjax.RequestBody as AXRB
import Data.Argonaut.Core (Json)
import Data.Argonaut.Decode (class DecodeJson, decodeJson, printJsonDecodeError)
import Data.Argonaut.Encode (class EncodeJson, encodeJson)
import Data.Bifunctor (lmap)
import Data.Either (Either(..))
import Data.HTTP.Method (Method(..))
import Data.Maybe (Maybe(..))
import Effect.Aff (Aff)

-- | API error type
data ApiError
  = NetworkError String
  | HttpError Int String
  | DecodeError String

printApiError :: ApiError -> String
printApiError = case _ of
  NetworkError msg -> "Network error: " <> msg
  HttpError code msg -> "HTTP " <> show code <> ": " <> msg
  DecodeError msg -> "Decode error: " <> msg

-- | Make a request and decode JSON response
request :: forall a. DecodeJson a => AX.Request Json -> Aff (Either ApiError a)
request req = do
  result <- AX.request req
  pure $ case result of
    Left err -> Left $ NetworkError (AX.printError err)
    Right response ->
      let StatusCode code = response.status in
      if code >= 200 && code < 300
        then lmap (DecodeError <<< printJsonDecodeError) (decodeJson response.body)
        else Left $ HttpError code response.statusText

-- | GET with JSON response
get :: forall a. DecodeJson a => String -> Aff (Either ApiError a)
get url = request $ AX.defaultRequest
  { url = url
  , method = Left GET
  , responseFormat = AXRF.json
  }

-- | POST with JSON body and JSON response
post :: forall req res. EncodeJson req => DecodeJson res => String -> req -> Aff (Either ApiError res)
post url body = request $ AX.defaultRequest
  { url = url
  , method = Left POST
  , content = Just $ AXRB.json (encodeJson body)
  , responseFormat = AXRF.json
  }

-- | PUT with JSON body and JSON response
put :: forall req res. EncodeJson req => DecodeJson res => String -> req -> Aff (Either ApiError res)
put url body = request $ AX.defaultRequest
  { url = url
  , method = Left PUT
  , content = Just $ AXRB.json (encodeJson body)
  , responseFormat = AXRF.json
  }

-- | DELETE with no body
delete :: String -> Aff (Either ApiError Unit)
delete url = do
  result <- AX.request $ AX.defaultRequest
    { url = url
    , method = Left DELETE
    , responseFormat = AXRF.ignore
    }
  pure $ case result of
    Left err -> Left $ NetworkError (AX.printError err)
    Right response ->
      let StatusCode code = response.status in
      if code >= 200 && code < 300
        then Right unit
        else Left $ HttpError code response.statusText
