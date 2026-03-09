module App.View.Link where

import Prelude

import App.Message (Message(..))
import App.Route (Route, routeCodec)
import Data.Maybe (Maybe(..))
import Effect (Effect)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import Routing.Duplex (print)
import Web.Event.Event (Event, preventDefault)

link :: Route -> Array (Html Message) -> Html Message
link route children =
  HE.a
    [ HA.href (print routeCodec route)
    , HA.class' "px-3 py-2 text-sm font-medium text-gray-600 rounded-lg transition-colors hover:text-gray-900 hover:bg-gray-100"
    , HA.createRawEvent "click" handler
    ]
    children
  where
  handler :: Event -> Effect (Maybe Message)
  handler event = do
    preventDefault event
    pure (Just (Navigate route))
