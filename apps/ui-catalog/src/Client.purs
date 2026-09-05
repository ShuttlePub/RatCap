module Client where

import Prelude

import App.Message (Message(..))
import App.Route (routeCodec)
import App.Update (mkUpdate)
import App.View (view)
import Data.Either (hush)
import Data.Maybe (Maybe)
import Effect (Effect)
import Flame (AppId(..), resumeMount)
import Flame.Subscription (send)
import Routing.Duplex (parse)
import Routing.PushState (makeInterface, paths)
import Web.DOM.ParentNode (QuerySelector(..))

appId :: AppId String Message
appId = AppId "ui-catalog"

foreign import initThemeSelector :: Effect Unit

main :: Effect Unit
main = do
  nav <- makeInterface

  let
    handlePath :: Maybe String -> String -> Effect Unit
    handlePath _old new = send appId (UrlChanged (hush $ parse routeCodec new))

  _model <- resumeMount (QuerySelector "main#app") appId
    { view, update: mkUpdate nav, subscribe: [] }

  initThemeSelector

  void $ paths handlePath nav
