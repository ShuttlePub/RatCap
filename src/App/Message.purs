module App.Message where

import App.Api.Emumet.Types (AccountResponse)
import App.Model (AccountWithDetails)
import App.Route (Route)
import Data.Maybe (Maybe)

data Message
  = Navigate Route
  | UrlChanged (Maybe Route)
  -- Account list
  | FetchAccounts
  | AccountsLoaded (Array AccountResponse)
  | AccountsFailed
  -- Account detail
  | FetchAccountDetail String
  | AccountDetailLoaded String AccountWithDetails
  | AccountDetailFailed String
  -- New account form
  | SetNewAccountName String
  | SetNewAccountIsBot Boolean
  | SubmitNewAccount
  -- Profile editing
  | StartEditProfile
  | SetEditProfileDisplayName String
  | SetEditProfileSummary String
  | SetEditProfileIconUrl String
  | SetEditProfileBannerUrl String
  | SaveProfile
  | CancelEditProfile
  -- Metadata editing
  | StartAddMetadata
  | StartEditMetadata String
  | SetMetadataLabel String
  | SetMetadataContent String
  | SaveMetadata
  | CancelMetadata
  | DeleteMetadata String
