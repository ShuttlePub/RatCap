module App.Api.Weather where

import Prelude

import Data.Argonaut.Decode (class DecodeJson, decodeJson)
import Data.Argonaut.Encode (class EncodeJson, encodeJson)

newtype WeatherDay = WeatherDay
  { date :: Int
  , weather :: String
  , tempMax :: Int
  , tempMin :: Int
  , wind :: Int
  }

instance EncodeJson WeatherDay where
  encodeJson (WeatherDay r) = encodeJson r

instance DecodeJson WeatherDay where
  decodeJson json = WeatherDay <$> decodeJson json

newtype WeatherResponse = WeatherResponse
  { forecasts :: Array WeatherDay }

instance EncodeJson WeatherResponse where
  encodeJson (WeatherResponse r) = encodeJson r

instance DecodeJson WeatherResponse where
  decodeJson json = WeatherResponse <$> decodeJson json

weatherLabel :: String -> String
weatherLabel = case _ of
  "clear" -> "Clear"
  "pcloudy" -> "Partly Cloudy"
  "mcloudy" -> "Cloudy"
  "cloudy" -> "Overcast"
  "humid" -> "Humid"
  "lightrain" -> "Light Rain"
  "oshower" -> "Showers"
  "ishower" -> "Showers"
  "lightsnow" -> "Light Snow"
  "rain" -> "Rain"
  "snow" -> "Snow"
  "rainsnow" -> "Rain/Snow"
  "ts" -> "Thunderstorm"
  "tsrain" -> "Thunderstorm"
  other -> other

weatherIcon :: String -> String
weatherIcon = case _ of
  "clear" -> "☀"
  "pcloudy" -> "⛅"
  "mcloudy" -> "🌥"
  "cloudy" -> "☁"
  "humid" -> "💧"
  "lightrain" -> "🌦"
  "oshower" -> "🌧"
  "ishower" -> "🌧"
  "lightsnow" -> "🌨"
  "rain" -> "🌧"
  "snow" -> "❄"
  "rainsnow" -> "🌨"
  "ts" -> "⛈"
  "tsrain" -> "⛈"
  _ -> "🌤"

formatDate :: Int -> String
formatDate d = show month <> "/" <> show day
  where
  day = d `mod` 100
  month = (d `mod` 10000) `div` 100
