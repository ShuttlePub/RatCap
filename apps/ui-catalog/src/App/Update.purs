module App.Update where

import Prelude

import App.Message (Message(..))
import App.Model (Model)
import App.Route (routeCodec)
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Effect.Class (liftEffect)
import Flame (Update, noMessages)
import Foreign (unsafeToForeign)
import Routing.Duplex (print)
import Routing.PushState (PushStateInterface)

-- | The first UrlChanged fires on subscription init (Routing.PushState
-- | `paths`), flipping isHydrated — the nav badge is the observable proof
-- | that the client took over from SSR.
mkUpdate :: PushStateInterface -> Update Model Message
mkUpdate nav model = case _ of
  Navigate route ->
    Tuple model
      [ liftEffect (nav.pushState (unsafeToForeign {}) (print routeCodec route)) $> Nothing ]
  UrlChanged mRoute ->
    noMessages $ model { route = mRoute, isHydrated = true }
