module Server where

import Prelude

import App.Api.Weather (WeatherResponse(..))
import App.Message (Message)
import App.Model (Model, RemoteData(..), pageForMaybeRoute)
import App.Route (routeCodec)
import Data.Argonaut.Decode (decodeJson)
import Data.Argonaut.Parser (jsonParser)
import Data.Bifunctor (lmap)
import App.View (view)
import App.View.Layout as Layout
import Data.Either (Either(..), hush)
import Effect (Effect)
import Server.Api as Api
import Flame.Application.Internal.PreMount (injectState, tagSerializedState, idSerializedState, attributeSerializedState, onlyLetters)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import Flame.Renderer.String as FRS
import Flame.Serialization as FS
import Flame.Types (Html)
import Routing.Duplex (parse)

selector :: String
selector = "main#app"

renderPage :: String -> String -> Effect String
renderPage weatherJson urlPath = do
  let
    mRoute = hush $ parse routeCodec urlPath
    page = pageForMaybeRoute mRoute
    weather = case jsonParser weatherJson >>= (lmap show <<< decodeJson) of
      Right (WeatherResponse { forecasts }) -> Loaded forecasts
      Left _ -> NotAsked
    model = { route: mRoute, page, isHydrated: false, weather }
    appView = view model
    stateEl = mkStateElement model
    withState = injectState stateEl appView
    fullDoc = Layout.document withState
  FRS.render fullDoc

mkStateElement :: Model -> Html Message
mkStateElement model =
  HE.createElement tagSerializedState
    [ HA.style { display: "none" }
    , HA.id $ idSerializedState sanitizedSelector
    , HA.createAttribute (attributeSerializedState sanitizedSelector) sanitizedSelector
    ]
    [ HE.text $ FS.serialize model ]
  where
  sanitizedSelector = onlyLetters selector

transformWeather :: String -> String
transformWeather = Api.transformWeather
