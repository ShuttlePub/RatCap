module App.Message where

import App.Api.Emumet.Types (AccountResponse, MetadataResponse, ProfileResponse)
import App.Model (AccountWithDetails)
import App.Route (Route)
import Data.Maybe (Maybe)

data Message
  = Navigate Route
  | UrlChanged (Maybe Route)
  -- Authentication
  | InitAuth (Maybe String) (Maybe String) -- token, username (from sessionStorage on startup)
  | SetLoginUsername String
  | SetLoginPassword String
  | SubmitLogin
  | LoginSuccess String String -- token, username
  | LoginFailed String
  | Logout
  -- Account list
  | FetchAccounts
  | AccountsLoaded (Array AccountResponse)
  | AccountsFailed String
  -- Account detail (fetch account + profile + metadata in parallel)
  | FetchAccountDetail String
  | AccountDetailLoaded String AccountWithDetails
  | AccountDetailFailed String String
  -- New account form
  | SetNewAccountName String
  | SetNewAccountIsBot Boolean
  | SubmitNewAccount
  | AccountCreated AccountResponse
  | AccountCreateFailed String
  -- Profile editing
  | StartEditProfile
  | SetEditProfileDisplayName String
  | SetEditProfileSummary String
  | SetEditProfileIconUrl String
  | SetEditProfileBannerUrl String
  | SaveProfile
  | ProfileSaved String ProfileResponse
  | ProfileSaveFailed String String -- accountId, errorMsg
  | CancelEditProfile
  -- Metadata editing
  | StartAddMetadata
  | StartEditMetadata String
  | SetMetadataLabel String
  | SetMetadataContent String
  | SaveMetadata
  | MetadataSaved String MetadataResponse
  | MetadataSaveFailed String String -- accountId, errorMsg
  | CancelMetadata
  | DeleteMetadata String
  | MetadataDeleted String String
  | MetadataDeleteFailed String String -- accountId, errorMsg
