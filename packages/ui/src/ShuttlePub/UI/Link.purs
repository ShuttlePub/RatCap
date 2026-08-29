module ShuttlePub.UI.Link where

import Prelude

import Data.Maybe (Maybe(..))
import Effect (Effect)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Theme as T
import Web.Event.Event (Event, preventDefault)

navLink :: forall msg. String -> msg -> Array (Html msg) -> Html msg
navLink href message children =
  HE.a
    [ HA.href href
    , HA.class' T.navLink
    , HA.createRawEvent "click" handler
    ]
    children
  where
  handler :: Event -> Effect (Maybe msg)
  handler event = do
    preventDefault event
    pure (Just message)
