module App.Api.GraphQL
  ( fetchAccounts
  , fetchAccountDetail
  , createAccount
  , updateProfile
  , createMetadata
  , updateMetadata
  , deleteMetadata
  ) where

import Prelude

import App.Api.Client (ApiError(..))
import App.Api.GraphQL.Types (AccountResponse(..), MetadataResponse(..), ModerationResponse(..), ProfileResponse(..), Tristate(..))
import Data.Array (any, intercalate, mapMaybe)
import Data.Argonaut.Core (Json)
import Data.Argonaut.Decode (decodeJson, printJsonDecodeError)
import Data.Argonaut.Decode.Error (JsonDecodeError)
import Data.Argonaut.Decode.Combinators ((.:))
import Data.Either (Either(..), hush)
import Data.Maybe (Maybe(..), fromMaybe)
import Data.Newtype (unwrap)
import Effect.Aff (Aff, message, try)
import Foreign.Object as FO
import Generated.Schema.Gql (Mutation, Query)
import Generated.Schema.Gql.Enum.ModerationType (ModerationType(..))
import GraphQL.Client.Args (Args(..))
import GraphQL.Client.BaseClients.Affjax.Web (AffjaxWebClient(..))
import GraphQL.Client.GqlError (GqlError)
import GraphQL.Client.ID (ID(..))
import GraphQL.Client.Query (mutationJson, queryFullRes, queryJson)
import GraphQL.Client.Types (Client(..), GqlRes, GqlResJson(..))
import Type.Data.List (Nil')
import Type.Proxy (Proxy)

-- ---------------------------------------------------------------------------
-- GraphQL client
-- ---------------------------------------------------------------------------

queryClient :: Client AffjaxWebClient { directives :: Proxy Nil', query :: Query | () }
queryClient = Client (AffjaxWebClient "/graphql" [])

mutationClient :: Client AffjaxWebClient { directives :: Proxy Nil', mutation :: Mutation | () }
mutationClient = Client (AffjaxWebClient "/graphql" [])

-- ---------------------------------------------------------------------------
-- Error helpers
-- ---------------------------------------------------------------------------

-- | Check if a GqlError has a specific extensions.code.
hasExtensionCode :: String -> GqlError -> Boolean
hasExtensionCode target { extensions } = case extensions of
  Just exts -> case FO.lookup "code" exts of
    Just codeJson -> case decodeJson codeJson of
      Right s -> s == target
      _ -> false
    Nothing -> false
  Nothing -> false

-- | Convert GqlRes (typed) to Either ApiError.
gqlResToEither :: forall a. GqlRes a -> Either ApiError a
gqlResToEither { data_, errors } = case errors of
  Just errs ->
    if any (hasExtensionCode "UNAUTHENTICATED") errs then
      Left (HttpError 401 "Unauthorized")
    else if any (hasExtensionCode "NOT_FOUND") errs then
      Left (HttpError 404 "Not found")
    else
      Left (HttpError 500 (intercalate "; " (map _.message errs)))
  Nothing -> case data_ of
    Left decodeErr -> Left (DecodeError (printJsonDecodeError decodeErr))
    Right a -> Right a

-- | Check a GraphQL response JSON for errors, then decode the data field
-- | using the provided decoder.
safeDecodeData :: forall a. Json -> (Json -> Either ApiError a) -> Either ApiError a
safeDecodeData json decodeData =
  case decodeJson json of
    Left e -> Left (DecodeError (printJsonDecodeError e))
    Right obj -> do
      let errorsArr = hush (obj .: "errors") :: Maybe (Array Json)
      case errorsArr of
        Just errs ->
          if anyErrorHasCode "UNAUTHENTICATED" errs then
            Left (HttpError 401 "Unauthorized")
          else if anyErrorHasCode "NOT_FOUND" errs then
            Left (HttpError 404 "Not found")
          else
            Left (HttpError 500 (intercalate "; " (mapMaybe (\e -> hush (decodeJson e >>= (_ .: "message"))) errs)))
        Nothing ->
          case obj .: "data" of
            Left e -> Left (DecodeError (printJsonDecodeError e))
            Right dataJson -> decodeData dataJson

-- | Check if a JSON errors array contains an entry with a specific extensions.code.
anyErrorHasCode :: String -> Array Json -> Boolean
anyErrorHasCode target errs =
  any
    ( \e -> case decodeJson e of
        Right obj -> case obj .: "extensions" of
          Right exts -> case exts .: "code" of
            Right code -> code == target
            _ -> false
          _ -> false
        _ -> false
    )
    errs

-- | Unwrap GraphQL ID to String.
unwrapId :: ID -> String
unwrapId = unwrap

-- ---------------------------------------------------------------------------
-- Concrete result types (closed records for DecodeJson)
-- ---------------------------------------------------------------------------

type GqlModData =
  { type :: ModerationType
  , reason :: String
  , suspendedAt :: Maybe String
  , expiresAt :: Maybe String
  , bannedAt :: Maybe String
  }

type GqlProfileData =
  { nanoid :: ID
  , accountId :: ID
  , displayName :: Maybe String
  , summary :: Maybe String
  , iconUrl :: Maybe String
  , bannerUrl :: Maybe String
  }

type GqlMetaData =
  { nanoid :: ID
  , accountId :: ID
  , label :: String
  , content :: String
  }

type GqlAccountData =
  { id :: ID
  , name :: String
  , isBot :: Boolean
  , publicKey :: String
  , createdAt :: String
  , moderation :: Maybe GqlModData
  , profile :: Maybe GqlProfileData
  , metadata :: Array GqlMetaData
  }

type GqlAccountDetailData = { account :: Maybe GqlAccountData }
type GqlCreateAccountData = { createAccount :: GqlMinimalAccount }
type GqlUpdateProfileData = { updateProfile :: GqlProfileData }
type GqlCreateMetadataData = { createMetadata :: GqlMetaData }
type GqlUpdateMetadataData = { updateMetadata :: GqlMetaData }

type GqlMinimalAccount =
  { id :: ID
  , name :: String
  , isBot :: Boolean
  , publicKey :: String
  , createdAt :: String
  }

-- ---------------------------------------------------------------------------
-- fetchAccounts
-- ---------------------------------------------------------------------------

fetchAccounts :: Aff (Either ApiError (Array AccountResponse))
fetchAccounts = do
  result <- try $ queryFullRes decodeJson identity queryClient "FetchAccounts"
    { accounts: {} `Args`
        { items:
            { id: unit
            , name: unit
            , isBot: unit
            , publicKey: unit
            , createdAt: unit
            }
        , first: unit
        , last: unit
        }
    }
  pure $ case result of
    Left affErr -> Left (NetworkError (message affErr))
    Right gqlRes -> case gqlResToEither gqlRes of
      Right raw -> Right (map convertItem raw.accounts.items)
      Left err -> Left err
  where
  convertItem item =
    AccountResponse
      { id: unwrapId item.id
      , name: item.name
      , isBot: item.isBot
      , publicKey: item.publicKey
      , createdAt: item.createdAt
      , moderation: Nothing
      }

-- ---------------------------------------------------------------------------
-- fetchAccountDetail (account + profile + metadata, one query)
-- ---------------------------------------------------------------------------

type AccountDetailResult =
  { account :: AccountResponse
  , profile :: Maybe ProfileResponse
  , metadata :: Array MetadataResponse
  }

fetchAccountDetail :: String -> Aff (Either ApiError AccountDetailResult)
fetchAccountDetail accountId = do
  result <- try $ queryJson identity queryClient "FetchAccountDetail"
    { account:
        { id: ID accountId }
          `Args`
            { id: unit
            , name: unit
            , isBot: unit
            , publicKey: unit
            , createdAt: unit
            , moderation:
                { type: unit
                , reason: unit
                , suspendedAt: unit
                , expiresAt: unit
                , bannedAt: unit
                }
            , profile:
                { nanoid: unit
                , accountId: unit
                , displayName: unit
                , summary: unit
                , iconUrl: unit
                , bannerUrl: unit
                }
            , metadata:
                { nanoid: unit
                , accountId: unit
                , label: unit
                , content: unit
                }
            }
    }
  pure $ case result of
    Left affErr -> Left (NetworkError (message affErr))
    Right (GqlResJson json) -> safeDecodeData json \dataJson ->
      case decodeJson dataJson :: Either JsonDecodeError GqlAccountDetailData of
        Right detail -> case detail.account of
          Just acc -> Right (convertDetail acc)
          Nothing -> Left (HttpError 404 "Account not found")
        Left e -> Left (DecodeError (printJsonDecodeError e))
  where
  moderationFromRaw { type: SUSPENDED, reason, suspendedAt, expiresAt } =
    Suspended { reason, suspendedAt: fromMaybe "" suspendedAt, expiresAt }
  moderationFromRaw { type: BANNED, bannedAt, reason } =
    Banned { reason, bannedAt: fromMaybe "" bannedAt }
  convertDetail raw =
    { account: AccountResponse
        { id: unwrapId raw.id
        , name: raw.name
        , isBot: raw.isBot
        , publicKey: raw.publicKey
        , createdAt: raw.createdAt
        , moderation: moderationFromRaw <$> raw.moderation
        }
    , profile: map convertProfile raw.profile
    , metadata: map convertMetadata raw.metadata
    }
  convertProfile p =
    ProfileResponse
      { accountId: unwrapId p.accountId
      , bannerUrl: p.bannerUrl
      , displayName: p.displayName
      , iconUrl: p.iconUrl
      , nanoid: unwrapId p.nanoid
      , summary: p.summary
      }
  convertMetadata m =
    MetadataResponse
      { accountId: unwrapId m.accountId
      , content: m.content
      , label: m.label
      , nanoid: unwrapId m.nanoid
      }

-- ---------------------------------------------------------------------------
-- createAccount
-- ---------------------------------------------------------------------------

createAccount :: String -> Boolean -> Aff (Either ApiError AccountResponse)
createAccount name isBot = do
  result <- try $ mutationJson identity mutationClient "CreateAccount"
    { createAccount:
        { input: { name, isBot: isBot } }
          `Args`
            { id: unit
            , name: unit
            , isBot: unit
            , publicKey: unit
            , createdAt: unit
            }
    }
  pure $ case result of
    Left affErr -> Left (NetworkError (message affErr))
    Right (GqlResJson json) -> safeDecodeData json \dataJson ->
      case decodeJson dataJson of
        Right (raw :: { createAccount :: { id :: ID, name :: String, isBot :: Boolean, publicKey :: String, createdAt :: String } }) ->
          Right $ AccountResponse
            { id: unwrapId raw.createAccount.id
            , name: raw.createAccount.name
            , isBot: raw.createAccount.isBot
            , publicKey: raw.createAccount.publicKey
            , createdAt: raw.createAccount.createdAt
            , moderation: Nothing
            }
        Left e -> Left (DecodeError (printJsonDecodeError e))

-- ---------------------------------------------------------------------------
-- updateProfile
-- ---------------------------------------------------------------------------

updateProfile :: String -> { displayName :: Tristate String, summary :: Tristate String, iconUrl :: Tristate String, bannerUrl :: Tristate String } -> Aff (Either ApiError ProfileResponse)
updateProfile accountId fields = do
  let
    input =
      { displayName: tristateMaybe fields.displayName
      , summary: tristateMaybe fields.summary
      , iconUrl: tristateMaybe fields.iconUrl
      , bannerUrl: tristateMaybe fields.bannerUrl
      }
  result <- try $ mutationJson identity mutationClient "UpdateProfile"
    { updateProfile:
        { accountId: ID accountId
        , input: input
        }
          `Args`
            { nanoid: unit
            , accountId: unit
            , displayName: unit
            , summary: unit
            , iconUrl: unit
            , bannerUrl: unit
            }
    }
  pure $ case result of
    Left affErr -> Left (NetworkError (message affErr))
    Right (GqlResJson json) -> safeDecodeData json \dataJson ->
      case decodeJson dataJson of
        Right (raw :: { updateProfile :: { accountId :: ID, nanoid :: ID, displayName :: Maybe String, summary :: Maybe String, iconUrl :: Maybe String, bannerUrl :: Maybe String } }) ->
          Right $ ProfileResponse
            { accountId: unwrapId raw.updateProfile.accountId
            , bannerUrl: raw.updateProfile.bannerUrl
            , displayName: raw.updateProfile.displayName
            , iconUrl: raw.updateProfile.iconUrl
            , nanoid: unwrapId raw.updateProfile.nanoid
            , summary: raw.updateProfile.summary
            }
        Left e -> Left (DecodeError (printJsonDecodeError e))
  where
  tristateMaybe :: Tristate String -> Maybe String
  tristateMaybe Omitted = Nothing
  tristateMaybe SetNull = Nothing
  tristateMaybe (Value s) = Just s

-- ---------------------------------------------------------------------------
-- createMetadata
-- ---------------------------------------------------------------------------

createMetadata :: String -> { label :: String, content :: String } -> Aff (Either ApiError MetadataResponse)
createMetadata accountId { label, content } = do
  result <- try $ mutationJson identity mutationClient "CreateMetadata"
    { createMetadata:
        { accountId: ID accountId
        , input: { label, content }
        }
          `Args`
            { nanoid: unit
            , accountId: unit
            , label: unit
            , content: unit
            }
    }
  pure $ case result of
    Left affErr -> Left (NetworkError (message affErr))
    Right (GqlResJson json) -> safeDecodeData json \dataJson ->
      case decodeJson dataJson of
        Right (raw :: { createMetadata :: { nanoid :: ID, accountId :: ID, label :: String, content :: String } }) ->
          Right $ MetadataResponse
            { accountId: unwrapId raw.createMetadata.accountId
            , content: raw.createMetadata.content
            , label: raw.createMetadata.label
            , nanoid: unwrapId raw.createMetadata.nanoid
            }
        Left e -> Left (DecodeError (printJsonDecodeError e))

-- ---------------------------------------------------------------------------
-- updateMetadata
-- ---------------------------------------------------------------------------

updateMetadata :: String -> String -> { label :: String, content :: String } -> Aff (Either ApiError MetadataResponse)
updateMetadata accountId nanoid { label, content } = do
  result <- try $ mutationJson identity mutationClient "UpdateMetadata"
    { updateMetadata:
        { accountId: ID accountId
        , nanoid: ID nanoid
        , input: { label, content }
        }
          `Args`
            { nanoid: unit
            , accountId: unit
            , label: unit
            , content: unit
            }
    }
  pure $ case result of
    Left affErr -> Left (NetworkError (message affErr))
    Right (GqlResJson json) -> safeDecodeData json \dataJson ->
      case decodeJson dataJson of
        Right (raw :: { updateMetadata :: { nanoid :: ID, accountId :: ID, label :: String, content :: String } }) ->
          Right $ MetadataResponse
            { accountId: unwrapId raw.updateMetadata.accountId
            , content: raw.updateMetadata.content
            , label: raw.updateMetadata.label
            , nanoid: unwrapId raw.updateMetadata.nanoid
            }
        Left e -> Left (DecodeError (printJsonDecodeError e))

-- ---------------------------------------------------------------------------
-- deleteMetadata
-- ---------------------------------------------------------------------------

deleteMetadata :: String -> String -> Aff (Either ApiError Unit)
deleteMetadata accountId nanoid = do
  result <- try $ mutationJson identity mutationClient "DeleteMetadata"
    { deleteMetadata:
        { accountId: ID accountId
        , nanoid: ID nanoid
        } `Args` unit
    }
  pure $ case result of
    Left affErr -> Left (NetworkError (message affErr))
    Right (GqlResJson json) -> safeDecodeData json \_dataJson -> Right unit
