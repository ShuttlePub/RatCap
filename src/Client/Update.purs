module Client.Update where

import Prelude

import App.Api.Client (ApiError(..), printApiError)
import App.Api.Emumet.Client as Emumet
import App.Api.Emumet.Tristate (Tristate(..))
import App.Api.Emumet.Types (AccountResponse(..), CreateAccountRequest(..), CreateMetadataRequest(..), CreateProfileRequest(..), MetadataResponse(..), ProfileResponse(..), UpdateMetadataRequest(..), UpdateProfileRequest(..))
import App.Message (Message(..))
import App.Model (AccountWithDetails, Model, RemoteData(..), emptyNewAccountForm, pageForMaybeRoute)
import App.Route (Route(..), routeCodec)
import Control.Parallel (parallel, sequential)
import Data.Array (filter, find)
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), fromMaybe)
import Data.String.Common (trim)
import Data.Tuple (Tuple(..))
import Effect.Aff (Aff)
import Effect.Class (liftEffect)
import Flame (Update, noMessages)
import Foreign (unsafeToForeign)
import Routing.Duplex (print)
import Routing.PushState (PushStateInterface)

-- | Get the current account ID from selectedAccount, if loaded
currentAccountId :: Model -> Maybe String
currentAccountId model = case model.selectedAccount of
  Loaded d -> let AccountResponse acc = d.account in Just acc.id
  _ -> Nothing

mkUpdate :: PushStateInterface -> Update Model Message
mkUpdate nav model = case _ of
  Navigate route ->
    let url = print routeCodec route
    in Tuple model
      [ liftEffect (nav.pushState (unsafeToForeign {}) url) $> Nothing ]

  UrlChanged mRoute ->
    if not model.isHydrated then noMessages $ model { isHydrated = true }
    else
      let
        base = model { route = mRoute, page = pageForMaybeRoute mRoute, editProfileForm = Nothing, editMetadataForm = Nothing, errorMessage = Nothing, savePending = false }
      in
        case mRoute of
          Just Home ->
            Tuple (base { accounts = Loading }) [ pure $ Just FetchAccounts ]
          Just (AccountDetail id) ->
            Tuple (base { selectedAccount = Loading }) [ pure $ Just (FetchAccountDetail id) ]
          Just AccountNew ->
            noMessages $ base { newAccountForm = emptyNewAccountForm }
          _ -> noMessages base

  -- Account list: fetch from API
  FetchAccounts ->
    Tuple (model { accounts = Loading })
      [ fetchAccountsAff ]

  AccountsLoaded accs ->
    if model.route == Just Home
      then noMessages $ model { accounts = Loaded accs }
      else noMessages model

  AccountsFailed msg ->
    if model.route == Just Home
      then noMessages $ model { accounts = Failed, errorMessage = Just msg }
      else noMessages model

  -- Account detail: fetch account + profile + metadata (parallel)
  FetchAccountDetail id ->
    Tuple (model { selectedAccount = Loading })
      [ fetchAccountDetailAff id ]

  AccountDetailLoaded id detail ->
    if model.route == Just (AccountDetail id)
      then noMessages $ model { selectedAccount = Loaded detail }
      else noMessages model

  AccountDetailFailed id msg ->
    if model.route == Just (AccountDetail id)
      then noMessages $ model { selectedAccount = Failed, errorMessage = Just msg }
      else noMessages model

  -- New account form
  SetNewAccountName name ->
    noMessages $ model { newAccountForm = model.newAccountForm { name = name } }

  SetNewAccountIsBot isBot ->
    noMessages $ model { newAccountForm = model.newAccountForm { isBot = isBot } }

  SubmitNewAccount ->
    let
      form = model.newAccountForm
      trimmedName = trim form.name
    in
      if trimmedName == "" || model.savePending then noMessages model
      else
        Tuple (model { errorMessage = Nothing, savePending = true })
          [ submitNewAccountAff trimmedName form.isBot ]

  AccountCreated (AccountResponse acc) ->
    -- Guard: only navigate if still on AccountNew page
    if model.route == Just AccountNew
      then
        let url = print routeCodec (AccountDetail acc.id)
        in Tuple (model { newAccountForm = emptyNewAccountForm, errorMessage = Nothing, savePending = false })
          [ liftEffect (nav.pushState (unsafeToForeign {}) url) $> Nothing ]
      else noMessages $ model { savePending = false }

  AccountCreateFailed msg ->
    -- Guard: only show error if still on AccountNew page
    if model.route == Just AccountNew
      then noMessages $ model { errorMessage = Just msg, savePending = false }
      else noMessages $ model { savePending = false }

  -- Profile editing
  StartEditProfile ->
    case model.selectedAccount of
      Loaded d ->
        let
          form = case d.profile of
            Just (ProfileResponse p) ->
              { displayName: fromMaybe "" p.displayName
              , summary: fromMaybe "" p.summary
              , iconUrl: fromMaybe "" p.iconUrl
              , bannerUrl: fromMaybe "" p.bannerUrl
              }
            Nothing ->
              { displayName: "", summary: "", iconUrl: "", bannerUrl: "" }
        in
          noMessages $ model { editProfileForm = Just form, errorMessage = Nothing }
      _ -> noMessages model

  SetEditProfileDisplayName v ->
    case model.editProfileForm of
      Just form -> noMessages $ model { editProfileForm = Just (form { displayName = v }) }
      Nothing -> noMessages model

  SetEditProfileSummary v ->
    case model.editProfileForm of
      Just form -> noMessages $ model { editProfileForm = Just (form { summary = v }) }
      Nothing -> noMessages model

  SetEditProfileIconUrl v ->
    case model.editProfileForm of
      Just form -> noMessages $ model { editProfileForm = Just (form { iconUrl = v }) }
      Nothing -> noMessages model

  SetEditProfileBannerUrl v ->
    case model.editProfileForm of
      Just form -> noMessages $ model { editProfileForm = Just (form { bannerUrl = v }) }
      Nothing -> noMessages model

  SaveProfile ->
    case model.editProfileForm, model.selectedAccount of
      Just form, Loaded d ->
        if model.savePending then noMessages model
        else
          let
            AccountResponse acc = d.account
            trimmedDisplayName = trim form.displayName
            trimmedSummary = trim form.summary
            trimmedIconUrl = trim form.iconUrl
            trimmedBannerUrl = trim form.bannerUrl
            allEmpty = trimmedDisplayName == "" && trimmedSummary == "" && trimmedIconUrl == "" && trimmedBannerUrl == ""
            hasExistingProfile = case d.profile of
              Just _ -> true
              Nothing -> false
            toTristate s = if s == "" then SetNull else Value s
          in
            -- If all empty AND no existing profile, just close the form
            -- If all empty AND existing profile, send all SetNull to clear
            if allEmpty && not hasExistingProfile then noMessages $ model { editProfileForm = Nothing }
            else
              Tuple (model { errorMessage = Nothing, savePending = true })
                [ saveProfileAff acc.id hasExistingProfile
                    { displayName: toTristate trimmedDisplayName
                    , summary: toTristate trimmedSummary
                    , iconUrl: toTristate trimmedIconUrl
                    , bannerUrl: toTristate trimmedBannerUrl
                    }
                ]
      _, _ -> noMessages model

  ProfileSaved accountId profile ->
    -- Guard: only apply if we're still viewing the same account
    if currentAccountId model == Just accountId
      then case model.selectedAccount of
        Loaded d ->
          noMessages $ model
            { selectedAccount = Loaded (d { profile = Just profile })
            , editProfileForm = Nothing
            , errorMessage = Nothing
            , savePending = false
            }
        _ -> noMessages $ model { editProfileForm = Nothing, savePending = false }
      else noMessages $ model { savePending = false }

  ProfileSaveFailed accountId msg ->
    -- Guard: only show error if still viewing the same account
    if currentAccountId model == Just accountId
      then noMessages $ model { errorMessage = Just msg, savePending = false }
      else noMessages $ model { savePending = false }

  CancelEditProfile ->
    noMessages $ model { editProfileForm = Nothing, errorMessage = Nothing }

  -- Metadata editing
  StartAddMetadata ->
    noMessages $ model { editMetadataForm = Just { id: Nothing, label: "", content: "" }, errorMessage = Nothing }

  StartEditMetadata nanoid ->
    case model.selectedAccount of
      Loaded d ->
        case findMetadata nanoid d.metadata of
          Just (MetadataResponse m) ->
            noMessages $ model { editMetadataForm = Just { id: Just nanoid, label: m.label, content: m.content }, errorMessage = Nothing }
          Nothing -> noMessages model
      _ -> noMessages model

  SetMetadataLabel v ->
    case model.editMetadataForm of
      Just form -> noMessages $ model { editMetadataForm = Just (form { label = v }) }
      Nothing -> noMessages model

  SetMetadataContent v ->
    case model.editMetadataForm of
      Just form -> noMessages $ model { editMetadataForm = Just (form { content = v }) }
      Nothing -> noMessages model

  SaveMetadata ->
    case model.editMetadataForm, model.selectedAccount of
      Just form, Loaded d ->
        if model.savePending then noMessages model
        else
          let
            trimmedLabel = trim form.label
            trimmedContent = trim form.content
          in
            if trimmedLabel == "" || trimmedContent == "" then noMessages model
            else
              let AccountResponse acc = d.account
              in Tuple (model { errorMessage = Nothing, savePending = true })
                [ saveMetadataAff acc.id form.id
                    { label: trimmedLabel, content: trimmedContent }
                ]
      _, _ -> noMessages model

  MetadataSaved accountId meta ->
    -- Guard: only apply if we're still viewing the same account
    if currentAccountId model == Just accountId
      then case model.selectedAccount of
        Loaded d ->
          let
            MetadataResponse m = meta
            newMetadata = case findMetadata m.nanoid d.metadata of
              Just _ -> map (\existing -> let MetadataResponse e = existing in if e.nanoid == m.nanoid then meta else existing) d.metadata
              Nothing -> d.metadata <> [ meta ]
          in
            noMessages $ model
              { selectedAccount = Loaded (d { metadata = newMetadata })
              , editMetadataForm = Nothing
              , errorMessage = Nothing
              , savePending = false
              }
        _ -> noMessages $ model { editMetadataForm = Nothing, savePending = false }
      else noMessages $ model { savePending = false }

  MetadataSaveFailed accountId msg ->
    -- Guard: only show error if still viewing the same account
    if currentAccountId model == Just accountId
      then noMessages $ model { errorMessage = Just msg, savePending = false }
      else noMessages $ model { savePending = false }

  CancelMetadata ->
    noMessages $ model { editMetadataForm = Nothing, errorMessage = Nothing }

  DeleteMetadata nanoid ->
    case model.selectedAccount of
      Loaded d ->
        if model.savePending then noMessages model
        else
          let AccountResponse acc = d.account
          in Tuple (model { errorMessage = Nothing, savePending = true })
            [ deleteMetadataAff acc.id nanoid ]
      _ -> noMessages model

  MetadataDeleted accountId nanoid ->
    -- Guard: only apply if we're still viewing the same account
    if currentAccountId model == Just accountId
      then case model.selectedAccount of
        Loaded d ->
          let newMetadata = filter (\(MetadataResponse m) -> m.nanoid /= nanoid) d.metadata
          in noMessages $ model { selectedAccount = Loaded (d { metadata = newMetadata }), errorMessage = Nothing, savePending = false }
        _ -> noMessages $ model { savePending = false }
      else noMessages $ model { savePending = false }

  MetadataDeleteFailed accountId msg ->
    -- Guard: only show error if still viewing the same account
    if currentAccountId model == Just accountId
      then noMessages $ model { errorMessage = Just msg, savePending = false }
      else noMessages $ model { savePending = false }

-- Helper: find metadata by nanoid
findMetadata :: String -> Array MetadataResponse -> Maybe MetadataResponse
findMetadata targetId = find (\(MetadataResponse r) -> r.nanoid == targetId)

-- | Check if an ApiError is a 404 (resource not found = not yet created)
is404 :: ApiError -> Boolean
is404 (HttpError 404 _) = true
is404 _ = false

-- Aff helpers: API calls that produce Messages

fetchAccountsAff :: Aff (Maybe Message)
fetchAccountsAff = do
  result <- Emumet.fetchAccounts
  pure $ Just $ case result of
    Right accs -> AccountsLoaded accs
    Left err -> AccountsFailed (printApiError err)

fetchAccountDetailAff :: String -> Aff (Maybe Message)
fetchAccountDetailAff id = do
  accResult <- Emumet.fetchAccount id
  case accResult of
    Left err -> pure $ Just $ AccountDetailFailed id (printApiError err)
    Right acc -> do
      let AccountResponse a = acc
      -- Fetch profile and metadata in parallel
      Tuple profileResult metadataResult <- sequential $
        Tuple <$> parallel (Emumet.fetchProfile a.id) <*> parallel (Emumet.fetchMetadata a.id)
      -- 404 = not yet created (normal), other errors = real failure
      let
        profileOutcome = case profileResult of
          Right p -> Right (Just p)
          Left err -> if is404 err then Right Nothing else Left err
        metadataOutcome = case metadataResult of
          Right ms -> Right ms
          Left err -> if is404 err then Right [] else Left err
      case profileOutcome, metadataOutcome of
        Left err, _ -> pure $ Just $ AccountDetailFailed id ("Failed to load profile: " <> printApiError err)
        _, Left err -> pure $ Just $ AccountDetailFailed id ("Failed to load metadata: " <> printApiError err)
        Right profile, Right metadata ->
          let
            detail :: AccountWithDetails
            detail = { account: acc, profile, metadata }
          in pure $ Just $ AccountDetailLoaded id detail

submitNewAccountAff :: String -> Boolean -> Aff (Maybe Message)
submitNewAccountAff name isBot = do
  result <- Emumet.createAccount (CreateAccountRequest { name, isBot })
  pure $ Just $ case result of
    Right acc -> AccountCreated acc
    Left err -> AccountCreateFailed (printApiError err)

saveProfileAff :: String -> Boolean -> { displayName :: Tristate String, summary :: Tristate String, iconUrl :: Tristate String, bannerUrl :: Tristate String } -> Aff (Maybe Message)
saveProfileAff accountId hasExisting fields = do
  result <-
    if hasExisting
      then Emumet.updateProfile accountId (UpdateProfileRequest fields)
      else Emumet.createProfile accountId (CreateProfileRequest fields)
  pure $ Just $ case result of
    Right profile -> ProfileSaved accountId profile
    Left err -> ProfileSaveFailed accountId (printApiError err)

saveMetadataAff :: String -> Maybe String -> { label :: String, content :: String } -> Aff (Maybe Message)
saveMetadataAff accountId mNanoid fields = do
  result <- case mNanoid of
    Just nanoid -> Emumet.updateMetadata accountId nanoid (UpdateMetadataRequest fields)
    Nothing -> Emumet.createMetadata accountId (CreateMetadataRequest fields)
  pure $ Just $ case result of
    Right meta -> MetadataSaved accountId meta
    Left err -> MetadataSaveFailed accountId (printApiError err)

deleteMetadataAff :: String -> String -> Aff (Maybe Message)
deleteMetadataAff accountId nanoid = do
  result <- Emumet.deleteMetadata accountId nanoid
  pure $ Just $ case result of
    Right _ -> MetadataDeleted accountId nanoid
    Left err -> MetadataDeleteFailed accountId (printApiError err)
