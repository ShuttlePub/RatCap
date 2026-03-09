module App.View.Home where

import Prelude

import App.Api.Weather (WeatherDay(..), weatherLabel, weatherIcon, formatDate)
import App.Message (Message)
import Data.Maybe (Maybe(..))
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: Maybe (Array WeatherDay) -> Html Message
view mWeather =
  HE.div [HA.class' "space-y-8"]
    [ HE.h1 [HA.class' "text-4xl font-bold tracking-tight text-gray-900"]
        [ HE.text "Home" ]
    , HE.p [HA.class' "text-lg text-gray-600 leading-relaxed"]
        [ HE.text "Welcome to Ratcap." ]
    , weatherSection mWeather
    ]

weatherSection :: Maybe (Array WeatherDay) -> Html Message
weatherSection = case _ of
  Nothing ->
    HE.div [HA.class' "flex items-center gap-2 text-gray-400"]
      [ HE.text "Loading weather..." ]
  Just days ->
    HE.div [HA.class' "space-y-3"]
      [ HE.h2 [HA.class' "text-xl font-semibold text-gray-800"]
          [ HE.text "Tokyo Weather Forecast" ]
      , HE.div [HA.class' "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"]
          (map dayCard days)
      ]

dayCard :: WeatherDay -> Html Message
dayCard (WeatherDay day) =
  HE.div [HA.class' "rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm"]
    [ HE.div [HA.class' "text-sm font-medium text-gray-500"]
        [ HE.text (formatDate day.date) ]
    , HE.div [HA.class' "my-2 text-3xl"]
        [ HE.text (weatherIcon day.weather) ]
    , HE.div [HA.class' "text-xs text-gray-500"]
        [ HE.text (weatherLabel day.weather) ]
    , HE.div [HA.class' "mt-2 text-sm font-medium text-gray-700"]
        [ HE.span [HA.class' "text-red-500"] [ HE.text (show day.tempMax <> "°") ]
        , HE.text " / "
        , HE.span [HA.class' "text-blue-500"] [ HE.text (show day.tempMin <> "°") ]
        ]
    ]
