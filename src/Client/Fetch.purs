module Client.Fetch where

import Prelude

import Data.Argonaut.Core (stringify)
import Data.Argonaut.Decode (class DecodeJson, decodeJson, printJsonDecodeError)
import Data.Argonaut.Encode (class EncodeJson, encodeJson)
import Data.Argonaut.Parser (jsonParser)
import Data.Either (Either(..))
import Data.Maybe (Maybe(..))
import Effect.Aff (Aff, error, throwError)
import Effect.Aff.Compat (EffectFnAff, fromEffectFnAff)

foreign import _fetchText :: String -> EffectFnAff String

fetchText :: String -> Aff String
fetchText url = fromEffectFnAff (_fetchText url)

type RawRequestOptions =
  { method :: String
  , url :: String
  , headers :: Array { key :: String, value :: String }
  , body :: String
  }

type RawResponse =
  { status :: Int
  , body :: String
  }

foreign import _request :: RawRequestOptions -> EffectFnAff RawResponse

type ClientConfig =
  { baseUrl :: String
  , bearerToken :: Maybe String
  }

type Response a =
  { status :: Int
  , body :: a
  }

request :: RawRequestOptions -> Aff RawResponse
request opts = fromEffectFnAff (_request opts)

buildHeaders :: ClientConfig -> String -> Array { key :: String, value :: String }
buildHeaders config contentType =
  let
    base = [ { key: "Content-Type", value: contentType } ]
  in
    case config.bearerToken of
      Nothing -> base
      Just token -> base <> [ { key: "Authorization", value: "Bearer " <> token } ]

requestJson
  :: forall req res
   . EncodeJson req
  => DecodeJson res
  => ClientConfig
  -> String
  -> String
  -> Maybe req
  -> Aff (Response res)
requestJson config method path maybeBody = do
  let
    headers = buildHeaders config "application/json"
    bodyStr = case maybeBody of
      Nothing -> ""
      Just b -> stringify (encodeJson b)
    opts =
      { method
      , url: config.baseUrl <> path
      , headers
      , body: bodyStr
      }
  raw <- request opts
  case jsonParser raw.body of
    Left parseErr -> throwError (error $ "JSON parse error: " <> parseErr)
    Right json -> case decodeJson json of
      Left decodeErr -> throwError (error $ "JSON decode error: " <> printJsonDecodeError decodeErr)
      Right decoded -> pure { status: raw.status, body: decoded }

requestJsonNoBody
  :: forall res
   . DecodeJson res
  => ClientConfig
  -> String
  -> String
  -> Aff (Response res)
requestJsonNoBody config method path = do
  let
    headers = buildHeaders config "application/json"
    opts =
      { method
      , url: config.baseUrl <> path
      , headers
      , body: ""
      }
  raw <- request opts
  case jsonParser raw.body of
    Left parseErr -> throwError (error $ "JSON parse error: " <> parseErr)
    Right json -> case decodeJson json of
      Left decodeErr -> throwError (error $ "JSON decode error: " <> printJsonDecodeError decodeErr)
      Right decoded -> pure { status: raw.status, body: decoded }

requestNoContent
  :: ClientConfig
  -> String
  -> String
  -> Aff { status :: Int }
requestNoContent config method path = do
  let
    headers = buildHeaders config "application/json"
    opts =
      { method
      , url: config.baseUrl <> path
      , headers
      , body: ""
      }
  raw <- request opts
  pure { status: raw.status }
