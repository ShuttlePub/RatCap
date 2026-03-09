module Server.Api where

import Prelude

import App.Api.Weather (WeatherDay(..), WeatherResponse(..))
import Data.Argonaut.Core (stringify)
import Data.Argonaut.Decode (decodeJson, JsonDecodeError)
import Data.Argonaut.Encode (encodeJson)
import Data.Argonaut.Parser (jsonParser)
import Data.Either (Either(..))

type Temp2m = { max :: Int, min :: Int }

type RawEntry =
  { date :: Int
  , weather :: String
  , temp2m :: Temp2m
  , wind10m_max :: Int
  }

type Raw7Timer = { dataseries :: Array RawEntry }

transformWeather :: String -> String
transformWeather rawJson =
  case parse rawJson of
    Left _ -> stringify $ encodeJson { error: "failed to decode upstream response" }
    Right raw -> stringify $ encodeJson $ toResponse raw
  where
  parse :: String -> Either String Raw7Timer
  parse s = case jsonParser s of
    Left err -> Left err
    Right json -> case (decodeJson json :: Either JsonDecodeError Raw7Timer) of
      Left err -> Left (show err)
      Right val -> Right val

  toResponse :: Raw7Timer -> WeatherResponse
  toResponse raw = WeatherResponse { forecasts: map toDay raw.dataseries }

  toDay :: RawEntry -> WeatherDay
  toDay e = WeatherDay
    { date: e.date
    , weather: e.weather
    , tempMax: e.temp2m.max
    , tempMin: e.temp2m.min
    , wind: e.wind10m_max
    }
