module Client.Update where

import Prelude

import App.Message (Message(..))
import App.Mock (findMockAccountDetail, mockAccounts)
import App.Model (Model, RemoteData(..), pageForMaybeRoute)
import App.Route (Route(..), routeCodec)
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
    let
      url = print routeCodec route
    in
      Tuple model
        [ liftEffect (nav.pushState (unsafeToForeign {}) url) $> Nothing ]

  UrlChanged mRoute ->
    if not model.isHydrated then noMessages $ model { isHydrated = true }
    else
      let
        base = model { route = mRoute, page = pageForMaybeRoute mRoute }
      in
        case mRoute of
          Just Home ->
            Tuple (base { accounts = Loading }) [ pure $ Just FetchAccounts ]
          Just (AccountDetail id) ->
            Tuple (base { selectedAccount = Loading }) [ pure $ Just (FetchAccountDetail id) ]
          _ -> noMessages base

  PageLoaded page ->
    noMessages $ model { page = page }

  FetchAccounts ->
    -- Phase 1: Use mock data, but go through Loaded/Failed messages
    Tuple (model { accounts = Loading })
      [ pure $ Just $ AccountsLoaded mockAccounts ]

  AccountsLoaded accs ->
    if model.route == Just Home
      then noMessages $ model { accounts = Loaded accs }
      else noMessages model

  AccountsFailed ->
    if model.route == Just Home
      then noMessages $ model { accounts = Failed }
      else noMessages model

  FetchAccountDetail id ->
    -- Phase 1: Use mock data, but go through Loaded/Failed messages
    Tuple (model { selectedAccount = Loading })
      [ pure $ Just $ case findMockAccountDetail id of
          Just detail -> AccountDetailLoaded id detail
          Nothing -> AccountDetailFailed id
      ]

  AccountDetailLoaded id detail ->
    if model.route == Just (AccountDetail id)
      then noMessages $ model { selectedAccount = Loaded detail }
      else noMessages model

  AccountDetailFailed id ->
    if model.route == Just (AccountDetail id)
      then noMessages $ model { selectedAccount = Failed }
      else noMessages model
