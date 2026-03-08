module Client.Update where

import Prelude

import App.Message (Message(..))
import App.Model (Model, pageForMaybeRoute)
import App.Route (routeCodec)
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Effect.Class (liftEffect)
import Flame (Update, noMessages)
import Foreign (unsafeToForeign)
import Routing.Duplex (print)
import Routing.PushState (PushStateInterface)

mkUpdate :: PushStateInterface -> Update Model Message
mkUpdate nav model = case _ of
  Navigate route ->
    let url = print routeCodec route
    in Tuple model
      [ liftEffect (nav.pushState (unsafeToForeign {}) url) $> Nothing ]

  UrlChanged mRoute ->
    if not model.isHydrated
      then noMessages $ model { isHydrated = true }
      else noMessages $ model { route = mRoute, page = pageForMaybeRoute mRoute }

  PageLoaded page ->
    noMessages $ model { page = page }
