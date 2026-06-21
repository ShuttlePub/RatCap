-- Auto-generated from OpenAPI spec. DO NOT EDIT.
module App.Api.Emumet.Types where

import Prelude

import App.Api.Emumet.Tristate (Tristate, tristateField, tristateDecodeField)
import Data.Argonaut.Core (fromObject, jsonEmptyObject)
import Data.Argonaut.Decode (class DecodeJson, decodeJson, (.:), (.:?))
import Data.Argonaut.Decode.Error (JsonDecodeError(..))
import Data.Argonaut.Encode (class EncodeJson, encodeJson, (:=), (~>))
import Data.Either (Either(..))
import Data.Maybe (Maybe)
import Foreign.Object as FO

newtype AccountResponse = AccountResponse
  { createdAt :: String
  , id :: String
  , isBot :: Boolean
  , moderation :: (Maybe ModerationResponse)
  , name :: String
  , publicKey :: String
  }

instance EncodeJson AccountResponse where
  encodeJson (AccountResponse r) =
    "created_at" := r.createdAt
      ~> "id" := r.id
      ~> "is_bot" := r.isBot
      ~> "moderation" := r.moderation
      ~> "name" := r.name
      ~> "public_key" := r.publicKey
      ~> jsonEmptyObject

instance DecodeJson AccountResponse where
  decodeJson json = do
    obj <- decodeJson json
    createdAt <- obj .: "created_at"
    id <- obj .: "id"
    isBot <- obj .: "is_bot"
    moderation <- join <$> obj .:? "moderation"
    name <- obj .: "name"
    publicKey <- obj .: "public_key"
    pure (AccountResponse { createdAt, id, isBot, moderation, name, publicKey })

newtype AccountsResponse = AccountsResponse
  { first :: (Maybe String)
  , items :: (Array AccountResponse)
  , last :: (Maybe String)
  }

instance EncodeJson AccountsResponse where
  encodeJson (AccountsResponse r) =
    "first" := r.first
      ~> "items" := r.items
      ~> "last" := r.last
      ~> jsonEmptyObject

instance DecodeJson AccountsResponse where
  decodeJson json = do
    obj <- decodeJson json
    first <- join <$> obj .:? "first"
    items <- obj .: "items"
    last <- join <$> obj .:? "last"
    pure (AccountsResponse { first, items, last })

newtype BanAccountRequest = BanAccountRequest
  { reason :: String
  }

instance EncodeJson BanAccountRequest where
  encodeJson (BanAccountRequest r) =
    "reason" := r.reason ~> jsonEmptyObject

instance DecodeJson BanAccountRequest where
  decodeJson json = do
    obj <- decodeJson json
    reason <- obj .: "reason"
    pure (BanAccountRequest { reason })

newtype ConsentDecision = ConsentDecision
  { accept :: Boolean
  , consentChallenge :: String
  , grantScope :: (Maybe (Array String))
  }

instance EncodeJson ConsentDecision where
  encodeJson (ConsentDecision r) =
    "accept" := r.accept
      ~> "consent_challenge" := r.consentChallenge
      ~> "grant_scope" := r.grantScope
      ~> jsonEmptyObject

instance DecodeJson ConsentDecision where
  decodeJson json = do
    obj <- decodeJson json
    accept <- obj .: "accept"
    consentChallenge <- obj .: "consent_challenge"
    grantScope <- join <$> obj .:? "grant_scope"
    pure (ConsentDecision { accept, consentChallenge, grantScope })

newtype CreateAccountRequest = CreateAccountRequest
  { isBot :: Boolean
  , name :: String
  }

instance EncodeJson CreateAccountRequest where
  encodeJson (CreateAccountRequest r) =
    "is_bot" := r.isBot
      ~> "name" := r.name
      ~> jsonEmptyObject

instance DecodeJson CreateAccountRequest where
  decodeJson json = do
    obj <- decodeJson json
    isBot <- obj .: "is_bot"
    name <- obj .: "name"
    pure (CreateAccountRequest { isBot, name })

newtype CreateMetadataRequest = CreateMetadataRequest
  { content :: String
  , label :: String
  }

instance EncodeJson CreateMetadataRequest where
  encodeJson (CreateMetadataRequest r) =
    "content" := r.content
      ~> "label" := r.label
      ~> jsonEmptyObject

instance DecodeJson CreateMetadataRequest where
  decodeJson json = do
    obj <- decodeJson json
    content <- obj .: "content"
    label <- obj .: "label"
    pure (CreateMetadataRequest { content, label })

newtype CreateProfileRequest = CreateProfileRequest
  { bannerUrl :: (Tristate String)
  , displayName :: (Tristate String)
  , iconUrl :: (Tristate String)
  , summary :: (Tristate String)
  }

instance EncodeJson CreateProfileRequest where
  encodeJson (CreateProfileRequest r) =
    fromObject
      $ tristateField "banner_url" r.bannerUrl
      $ tristateField "display_name" r.displayName
      $ tristateField "icon_url" r.iconUrl
      $ tristateField "summary" r.summary
      $ FO.empty

instance DecodeJson CreateProfileRequest where
  decodeJson json = do
    obj <- decodeJson json
    bannerUrl <- tristateDecodeField obj "banner_url"
    displayName <- tristateDecodeField obj "display_name"
    iconUrl <- tristateDecodeField obj "icon_url"
    summary <- tristateDecodeField obj "summary"
    pure (CreateProfileRequest { bannerUrl, displayName, iconUrl, summary })

newtype MetadataResponse = MetadataResponse
  { accountId :: String
  , content :: String
  , label :: String
  , nanoid :: String
  }

instance EncodeJson MetadataResponse where
  encodeJson (MetadataResponse r) =
    "account_id" := r.accountId
      ~> "content" := r.content
      ~> "label" := r.label
      ~> "nanoid" := r.nanoid
      ~> jsonEmptyObject

instance DecodeJson MetadataResponse where
  decodeJson json = do
    obj <- decodeJson json
    accountId <- obj .: "account_id"
    content <- obj .: "content"
    label <- obj .: "label"
    nanoid <- obj .: "nanoid"
    pure (MetadataResponse { accountId, content, label, nanoid })

data ModerationResponse
  = ModerationResponseSuspended
      { expiresAt :: (Maybe String)
      , reason :: String
      , suspendedAt :: String
      }
  | ModerationResponseBanned
      { bannedAt :: String
      , reason :: String
      }

instance EncodeJson ModerationResponse where
  encodeJson (ModerationResponseSuspended r) =
    "type" := "suspended"
      ~> "expires_at" := r.expiresAt
      ~> "reason" := r.reason
      ~> "suspended_at" := r.suspendedAt
      ~> jsonEmptyObject
  encodeJson (ModerationResponseBanned r) =
    "type" := "banned"
      ~> "banned_at" := r.bannedAt
      ~> "reason" := r.reason
      ~> jsonEmptyObject

instance DecodeJson ModerationResponse where
  decodeJson json = do
    obj <- decodeJson json
    tag <- obj .: "type"
    case (tag :: String) of
      "suspended" -> do
        expiresAt <- join <$> obj .:? "expires_at"
        reason <- obj .: "reason"
        suspendedAt <- obj .: "suspended_at"
        pure (ModerationResponseSuspended { expiresAt, reason, suspendedAt })
      "banned" -> do
        bannedAt <- obj .: "banned_at"
        reason <- obj .: "reason"
        pure (ModerationResponseBanned { bannedAt, reason })
      other -> Left (UnexpectedValue (encodeJson other))

data OAuth2Response
  = OAuth2ResponseRedirect
      { redirectTo :: String
      }
  | OAuth2ResponseShowConsent
      { clientName :: (Maybe String)
      , consentChallenge :: String
      , requestedScope :: (Array String)
      }

instance EncodeJson OAuth2Response where
  encodeJson (OAuth2ResponseRedirect r) =
    "action" := "redirect"
      ~> "redirect_to" := r.redirectTo
      ~> jsonEmptyObject
  encodeJson (OAuth2ResponseShowConsent r) =
    "action" := "show_consent"
      ~> "client_name" := r.clientName
      ~> "consent_challenge" := r.consentChallenge
      ~> "requested_scope" := r.requestedScope
      ~> jsonEmptyObject

instance DecodeJson OAuth2Response where
  decodeJson json = do
    obj <- decodeJson json
    tag <- obj .: "action"
    case (tag :: String) of
      "redirect" -> do
        redirectTo <- obj .: "redirect_to"
        pure (OAuth2ResponseRedirect { redirectTo })
      "show_consent" -> do
        clientName <- join <$> obj .:? "client_name"
        consentChallenge <- obj .: "consent_challenge"
        requestedScope <- obj .: "requested_scope"
        pure (OAuth2ResponseShowConsent { clientName, consentChallenge, requestedScope })
      other -> Left (UnexpectedValue (encodeJson other))

newtype ProfileResponse = ProfileResponse
  { accountId :: String
  , bannerUrl :: (Maybe String)
  , displayName :: (Maybe String)
  , iconUrl :: (Maybe String)
  , nanoid :: String
  , summary :: (Maybe String)
  }

instance EncodeJson ProfileResponse where
  encodeJson (ProfileResponse r) =
    "account_id" := r.accountId
      ~> "banner_url" := r.bannerUrl
      ~> "display_name" := r.displayName
      ~> "icon_url" := r.iconUrl
      ~> "nanoid" := r.nanoid
      ~> "summary" := r.summary
      ~> jsonEmptyObject

instance DecodeJson ProfileResponse where
  decodeJson json = do
    obj <- decodeJson json
    accountId <- obj .: "account_id"
    bannerUrl <- join <$> obj .:? "banner_url"
    displayName <- join <$> obj .:? "display_name"
    iconUrl <- join <$> obj .:? "icon_url"
    nanoid <- obj .: "nanoid"
    summary <- join <$> obj .:? "summary"
    pure (ProfileResponse { accountId, bannerUrl, displayName, iconUrl, nanoid, summary })

newtype SuspendAccountRequest = SuspendAccountRequest
  { expiresAt :: (Tristate String)
  , reason :: String
  }

instance EncodeJson SuspendAccountRequest where
  encodeJson (SuspendAccountRequest r) =
    fromObject
      $ tristateField "expires_at" r.expiresAt
      $ FO.insert "reason" (encodeJson r.reason)
      $ FO.empty

instance DecodeJson SuspendAccountRequest where
  decodeJson json = do
    obj <- decodeJson json
    expiresAt <- tristateDecodeField obj "expires_at"
    reason <- obj .: "reason"
    pure (SuspendAccountRequest { expiresAt, reason })

newtype UpdateAccountRequest = UpdateAccountRequest
  { isBot :: Boolean
  }

instance EncodeJson UpdateAccountRequest where
  encodeJson (UpdateAccountRequest r) =
    "is_bot" := r.isBot ~> jsonEmptyObject

instance DecodeJson UpdateAccountRequest where
  decodeJson json = do
    obj <- decodeJson json
    isBot <- obj .: "is_bot"
    pure (UpdateAccountRequest { isBot })

newtype UpdateMetadataRequest = UpdateMetadataRequest
  { content :: String
  , label :: String
  }

instance EncodeJson UpdateMetadataRequest where
  encodeJson (UpdateMetadataRequest r) =
    "content" := r.content
      ~> "label" := r.label
      ~> jsonEmptyObject

instance DecodeJson UpdateMetadataRequest where
  decodeJson json = do
    obj <- decodeJson json
    content <- obj .: "content"
    label <- obj .: "label"
    pure (UpdateMetadataRequest { content, label })

newtype UpdateProfileRequest = UpdateProfileRequest
  { bannerUrl :: (Tristate String)
  , displayName :: (Tristate String)
  , iconUrl :: (Tristate String)
  , summary :: (Tristate String)
  }

instance EncodeJson UpdateProfileRequest where
  encodeJson (UpdateProfileRequest r) =
    fromObject
      $ tristateField "banner_url" r.bannerUrl
      $ tristateField "display_name" r.displayName
      $ tristateField "icon_url" r.iconUrl
      $ tristateField "summary" r.summary
      $ FO.empty

instance DecodeJson UpdateProfileRequest where
  decodeJson json = do
    obj <- decodeJson json
    bannerUrl <- tristateDecodeField obj "banner_url"
    displayName <- tristateDecodeField obj "display_name"
    iconUrl <- tristateDecodeField obj "icon_url"
    summary <- tristateDecodeField obj "summary"
    pure (UpdateProfileRequest { bannerUrl, displayName, iconUrl, summary })
