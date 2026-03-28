module App.Message where

import App.Api.Emumet.Types (AccountResponse)
import App.Model (AccountWithDetails, PageModel)
import App.Route (Route)
import Data.Maybe (Maybe)

data Message
  = Navigate Route
  | UrlChanged (Maybe Route)
  | PageLoaded PageModel
  | FetchAccounts
  | AccountsLoaded (Array AccountResponse)
  | AccountsFailed
  | FetchAccountDetail String
  | AccountDetailLoaded String AccountWithDetails
  | AccountDetailFailed String
