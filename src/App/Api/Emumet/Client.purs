module App.Api.Emumet.Client where

import Prelude

import App.Api.Client as Api
import App.Api.Client (ApiError)
import App.Api.Emumet.Types
  ( AccountResponse
  , AccountsResponse(..)
  , CreateAccountRequest
  , CreateMetadataRequest
  , CreateProfileRequest
  , MetadataResponse
  , ProfileResponse
  , UpdateMetadataRequest
  , UpdateProfileRequest
  )
import Data.Either (Either)
import Effect.Aff (Aff)

-- Base path for all Emumet API calls (proxied through Bun)
basePath :: String
basePath = "/api"

-- | GET /accounts -> Array AccountResponse
fetchAccounts :: Aff (Either ApiError (Array AccountResponse))
fetchAccounts = do
  result <- Api.get (basePath <> "/accounts")
  pure $ map (\(AccountsResponse r) -> r.items) result

-- | GET /accounts/:id -> AccountResponse
fetchAccount :: String -> Aff (Either ApiError AccountResponse)
fetchAccount id = Api.get (basePath <> "/accounts/" <> id)

-- | POST /accounts -> AccountResponse
createAccount :: CreateAccountRequest -> Aff (Either ApiError AccountResponse)
createAccount = Api.post (basePath <> "/accounts")

-- | GET /accounts/:id/profile -> ProfileResponse
fetchProfile :: String -> Aff (Either ApiError ProfileResponse)
fetchProfile accountId = Api.get (basePath <> "/accounts/" <> accountId <> "/profile")

-- | POST /accounts/:id/profile -> ProfileResponse
createProfile :: String -> CreateProfileRequest -> Aff (Either ApiError ProfileResponse)
createProfile accountId = Api.post (basePath <> "/accounts/" <> accountId <> "/profile")

-- | PUT /accounts/:id/profile -> ProfileResponse
updateProfile :: String -> UpdateProfileRequest -> Aff (Either ApiError ProfileResponse)
updateProfile accountId = Api.put (basePath <> "/accounts/" <> accountId <> "/profile")

-- | GET /metadata?account_ids=:id -> Array MetadataResponse
fetchMetadata :: String -> Aff (Either ApiError (Array MetadataResponse))
fetchMetadata accountId = Api.get (basePath <> "/metadata?account_ids=" <> accountId)

-- | POST /accounts/:id/metadata -> MetadataResponse
createMetadata :: String -> CreateMetadataRequest -> Aff (Either ApiError MetadataResponse)
createMetadata accountId = Api.post (basePath <> "/accounts/" <> accountId <> "/metadata")

-- | PUT /accounts/:id/metadata/:nanoid -> MetadataResponse
updateMetadata :: String -> String -> UpdateMetadataRequest -> Aff (Either ApiError MetadataResponse)
updateMetadata accountId nanoid = Api.put (basePath <> "/accounts/" <> accountId <> "/metadata/" <> nanoid)

-- | DELETE /accounts/:id/metadata/:nanoid
deleteMetadata :: String -> String -> Aff (Either ApiError Unit)
deleteMetadata accountId nanoid = Api.delete (basePath <> "/accounts/" <> accountId <> "/metadata/" <> nanoid)
