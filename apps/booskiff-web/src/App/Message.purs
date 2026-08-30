module App.Message where

import App.Model (Billing, FileItem, Folder)
import App.Route (Route)
import Data.Either (Either)
import Data.Maybe (Maybe)

data Message
  = Navigate Route
  | UrlChanged (Maybe Route)
  -- Authentication (BFF-based)
  | CheckSession -- fire GET /auth/session on startup
  | SessionChecked (Maybe String) -- Just username = authenticated
  | LoginIdentifierChanged String
  | LoginPasswordChanged String
  | SubmitLogin
  | LoginFailed String
  | Logout
  | LogoutDone
  | LogoutFailed String
  -- Drive data
  | LoadDrive -- fetch files + folders + billing
  | FilesLoaded (Either String (Array FileItem))
  | FoldersLoaded (Either String (Array Folder))
  | BillingLoaded (Either String Billing)
  | SelectFolder (Maybe String) -- folder filter; Nothing shows all files
  -- Folder operations
  | FolderNameChanged String
  | SubmitCreateFolder
  | StartRenameFolder String
  | SubmitRenameFolder
  | SubmitDeleteFolder String
  | FolderSaved (Either String Folder) -- create/rename result
  | FolderDeleted (Either String String) -- deleted folder id
  -- File operations
  | SubmitDeleteFile String
  | FileDeleted (Either String String) -- deleted file id
  -- Upload (FFI-driven, see Client.Upload)
  | StartUpload
  | UploadProgress { loaded :: Number, total :: Number }
  | UploadFinished (Either String FileItem)
  -- Common
  | DismissError
