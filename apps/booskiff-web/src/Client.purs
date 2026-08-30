module Client where

import Prelude

import App.Message (Message(..))
import App.Route (routeCodec)
import App.View (view)
import Client.Update (mkUpdate)
import Data.Either (hush)
import Data.Maybe (Maybe)
import Effect (Effect)
import Flame (AppId(..), resumeMount)
import Flame.Subscription (send)
import Foreign (unsafeToForeign)
import Routing.Duplex (parse)
import Routing.PushState (makeInterface, paths)
import Web.DOM.ParentNode (QuerySelector(..))

appId :: AppId String Message
appId = AppId "booskiff"

foreign import initThemeSelector :: Effect Unit

main :: Effect Unit
main = do
  nav <- makeInterface

  let
    -- The root path is not part of the codec: redirect it to /drive.
    handlePath :: Maybe String -> String -> Effect Unit
    handlePath _old new
      | new == "/" = void $ nav.pushState (unsafeToForeign {}) "/drive"
      | otherwise = send appId (UrlChanged (hush $ parse routeCodec new))

  _model <- resumeMount (QuerySelector "main#app") appId
    { view, update: mkUpdate nav (send appId), subscribe: [] }

  initThemeSelector

  -- Check session via BFF cookie
  send appId CheckSession

  void $ paths handlePath nav
