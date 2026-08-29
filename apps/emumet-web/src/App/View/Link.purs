module App.View.Link where

import Prelude

import App.Message (Message(..))
import App.Route (Route, routeCodec)
import Flame (Html)
import Routing.Duplex (print)
import ShuttlePub.UI.Link as UI.Link

link :: Route -> Array (Html Message) -> Html Message
link route children =
  UI.Link.navLink (print routeCodec route) (Navigate route) children
