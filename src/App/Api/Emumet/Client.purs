module App.Api.Emumet.Client where

import Prelude

import App.Api.Client as Api
import App.Api.Client (ApiError(..))
import App.Api.Emumet.Types
  ( AccountResponse
  , AccountsResponse(..)
  , CreateAccountRequest
  , CreateMetadataRequest
  , MetadataResponse
  , ProfileResponse
  , UpdateMetadataRequest
  , UpdateProfileRequest
  )
import Data.Array (head)
import Data.Either (Either(..))
import Data.Maybe (maybe)
import Effect.Aff (Aff)

-- Base path for all Emumet API calls (proxied through Bun)
basePath :: String
basePath = "/api"

-- | GET /accounts -> Array AccountResponse
fetchAccounts :: Aff (Either ApiError (Array AccountResponse))
fetchAccounts = do
  result <- Api.get (basePath <> "/accounts")
  pure $ map (\(AccountsResponse r) -> r.items) result

-- | GET /accounts?ids=:id -> AccountResponse (extracted from items)
fetchAccount :: String -> Aff (Either ApiError AccountResponse)
fetchAccount targetId = do
  result <- Api.get (basePath <> "/accounts?ids=" <> targetId)
  pure $ result >>= \(AccountsResponse r) ->
    maybe (Left (HttpError 404 "Account not found")) Right (head r.items)

-- | POST /accounts -> AccountResponse
createAccount :: CreateAccountRequest -> Aff (Either ApiError AccountResponse)
createAccount = Api.post (basePath <> "/accounts")

-- | GET /profiles?account_ids=:id -> ProfileResponse (extracted from array)
fetchProfile :: String -> Aff (Either ApiError ProfileResponse)
fetchProfile accountId = do
  result <- Api.get (basePath <> "/profiles?account_ids=" <> accountId)
  pure $ result >>= \(profiles :: Array ProfileResponse) ->
    maybe (Left (HttpError 404 "Profile not found")) Right (head profiles)

-- | PUT /accounts/:id/profile -> 204 No Content
updateProfile :: String -> UpdateProfileRequest -> Aff (Either ApiError Unit)
updateProfile accountId = Api.putUnit (basePath <> "/accounts/" <> accountId <> "/profile")

-- | GET /metadata?account_ids=:id -> Array MetadataResponse
fetchMetadata :: String -> Aff (Either ApiError (Array MetadataResponse))
fetchMetadata accountId = Api.get (basePath <> "/metadata?account_ids=" <> accountId)

-- | POST /accounts/:id/metadata -> MetadataResponse
createMetadata :: String -> CreateMetadataRequest -> Aff (Either ApiError MetadataResponse)
createMetadata accountId = Api.post (basePath <> "/accounts/" <> accountId <> "/metadata")

-- | PUT /accounts/:id/metadata/:nanoid -> 204 No Content
updateMetadata :: String -> String -> UpdateMetadataRequest -> Aff (Either ApiError Unit)
updateMetadata accountId nanoid = Api.putUnit (basePath <> "/accounts/" <> accountId <> "/metadata/" <> nanoid)

-- | DELETE /accounts/:id/metadata/:nanoid
deleteMetadata :: String -> String -> Aff (Either ApiError Unit)
deleteMetadata accountId nanoid = Api.delete (basePath <> "/accounts/" <> accountId <> "/metadata/" <> nanoid)
