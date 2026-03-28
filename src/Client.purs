module Client where

import Prelude

import App.Message (Message(..))
import App.Route (Route(..), routeCodec)
import App.View (view)
import Client.Update (mkUpdate)
import Data.Either (hush)
import Data.Maybe (Maybe(..))
import Effect (Effect)
import Flame (AppId(..), resumeMount)
import Flame.Subscription (send)
import Routing.Duplex (parse)
import Routing.PushState (makeInterface, paths)
import Web.DOM.ParentNode (QuerySelector(..))

appId :: AppId String Message
appId = AppId "ratcap"

foreign import initThemeSelector :: Effect Unit

main :: Effect Unit
main = do
  nav <- makeInterface

  _model <- resumeMount (QuerySelector "main#app") appId
    { view, update: mkUpdate nav, subscribe: [] }

  initThemeSelector

  -- Initial route-based data fetching
  loc <- nav.locationState
  let currentRoute = hush $ parse routeCodec loc.path
  case currentRoute of
    Just Home -> send appId FetchAccounts
    Just (AccountDetail id) -> send appId (FetchAccountDetail id)
    _ -> pure unit

  void $ paths handlePath nav
  where
  handlePath :: Maybe String -> String -> Effect Unit
  handlePath _old new = send appId (UrlChanged (hush $ parse routeCodec new))
