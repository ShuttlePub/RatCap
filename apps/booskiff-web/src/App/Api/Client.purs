module App.Api.Client where

import Prelude

import Affjax.RequestBody as AXRB
import Affjax.ResponseFormat as AXRF
import Affjax.StatusCode (StatusCode(..))
import Affjax.Web as AX
import Data.Argonaut.Core (Json)
import Data.Argonaut.Decode (class DecodeJson, decodeJson, printJsonDecodeError)
import Data.Argonaut.Encode (class EncodeJson, encodeJson)
import Data.Bifunctor (lmap)
import Data.Either (Either(..))
import Data.HTTP.Method (Method(..))
import Data.Maybe (Maybe(..))
import Effect.Aff (Aff)

data ApiError
  = NetworkError String
  | HttpError Int String
  | DecodeError String

printApiError :: ApiError -> String
printApiError = case _ of
  NetworkError msg -> "Network error: " <> msg
  HttpError code msg -> "HTTP " <> show code <> ": " <> msg
  DecodeError msg -> "Decode error: " <> msg

-- | Make a request and decode the JSON response
request :: forall a. DecodeJson a => AX.Request Json -> Aff (Either ApiError a)
request req = do
  result <- AX.request req
  pure $ case result of
    Left err -> Left $ NetworkError (AX.printError err)
    Right response ->
      let
        StatusCode code = response.status
      in
        if code >= 200 && code < 300 then lmap (DecodeError <<< printJsonDecodeError) (decodeJson response.body)
        else Left $ HttpError code response.statusText

-- | GET with JSON response. Errors are flattened to a printable string.
get :: forall a. DecodeJson a => String -> Aff (Either String a)
get url = map (lmap printApiError) $ request $ AX.defaultRequest
  { url = url
  , method = Left GET
  , responseFormat = AXRF.json
  }

-- | POST with JSON body and JSON response
postJson :: forall req res. EncodeJson req => DecodeJson res => String -> req -> Aff (Either String res)
postJson url body = map (lmap printApiError) $ request $ AX.defaultRequest
  { url = url
  , method = Left POST
  , content = Just $ AXRB.json (encodeJson body)
  , responseFormat = AXRF.json
  }

-- | PATCH with JSON body and JSON response
patchJson :: forall req res. EncodeJson req => DecodeJson res => String -> req -> Aff (Either String res)
patchJson url body = map (lmap printApiError) $ request $ AX.defaultRequest
  { url = url
  , method = Left PATCH
  , content = Just $ AXRB.json (encodeJson body)
  , responseFormat = AXRF.json
  }

-- | POST with no meaningful response body (e.g. logout)
postUnit :: String -> Aff (Either String Unit)
postUnit url = do
  result <- AX.request $ AX.defaultRequest
    { url = url
    , method = Left POST
    , content = Just $ AXRB.json (encodeJson {})
    , responseFormat = AXRF.ignore
    }
  pure $ case result of
    Left err -> Left $ printApiError (NetworkError (AX.printError err))
    Right response ->
      let
        StatusCode code = response.status
      in
        if code >= 200 && code < 300 then Right unit
        else Left $ printApiError (HttpError code response.statusText)

-- | DELETE with no body
delete_ :: String -> Aff (Either String Unit)
delete_ url = do
  result <- AX.request $ AX.defaultRequest
    { url = url
    , method = Left DELETE
    , responseFormat = AXRF.ignore
    }
  pure $ case result of
    Left err -> Left $ printApiError (NetworkError (AX.printError err))
    Right response ->
      let
        StatusCode code = response.status
      in
        if code >= 200 && code < 300 then Right unit
        else Left $ printApiError (HttpError code response.statusText)
