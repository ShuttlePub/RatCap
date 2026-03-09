module Client.Update where

import Prelude

import App.Api.Weather (WeatherResponse(..))
import App.Message (Message(..))
import App.Model (Model, pageForMaybeRoute)
import App.Route (routeCodec)
import Client.Fetch (fetchText)
import Data.Argonaut.Decode (decodeJson)
import Data.Argonaut.Parser (jsonParser)
import Data.Either (hush)
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Effect.Class (liftEffect)
import Flame (Update, noMessages)
import Foreign (unsafeToForeign)
import Routing.Duplex (print)
import Routing.PushState (PushStateInterface)

mkUpdate :: PushStateInterface -> Update Model Message
mkUpdate nav model = case _ of
  Navigate route ->
    let url = print routeCodec route
    in Tuple model
      [ liftEffect (nav.pushState (unsafeToForeign {}) url) $> Nothing ]

  UrlChanged mRoute ->
    if not model.isHydrated
      then noMessages $ model { isHydrated = true }
      else noMessages $ model { route = mRoute, page = pageForMaybeRoute mRoute }

  PageLoaded page ->
    noMessages $ model { page = page }

  FetchWeather ->
    Tuple model
      [ do
          body <- fetchText "/api/weather"
          let mForecasts = do
                json <- hush $ jsonParser body
                WeatherResponse { forecasts } <- hush $ decodeJson json
                pure forecasts
          pure $ WeatherLoaded <$> mForecasts
      ]

  WeatherLoaded forecasts ->
    noMessages $ model { weather = Just forecasts }
