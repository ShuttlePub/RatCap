module Client where

import Prelude

import App.Message (Message(..))
import App.Route (Route, routeCodec)
import App.View (view)
import Client.Update (mkUpdate)
import Data.Either (hush)
import Data.Maybe (Maybe)
import Effect (Effect)
import Flame (AppId(..), resumeMount)
import Flame.Subscription (send)
import Routing.Duplex (parse)
import Routing.PushState (makeInterface, matchesWith)
import Web.DOM.ParentNode (QuerySelector(..))

appId :: AppId String Message
appId = AppId "ratcap"

main :: Effect Unit
main = do
  nav <- makeInterface

  _model <- resumeMount (QuerySelector "main#app") appId
    { view, update: mkUpdate nav, subscribe: [] }

  void $ matchesWith (hush <<< parse routeCodec) handleRoute nav
  where
  handleRoute :: Maybe Route -> Route -> Effect Unit
  handleRoute _old new = send appId (UrlChanged new)
