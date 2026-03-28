module Client.Update where

import Prelude

import App.Api.Emumet.Types (AccountResponse(..), MetadataResponse(..), ProfileResponse(..))
import App.Message (Message(..))
import App.Model (AccountWithDetails, Model, RemoteData(..), emptyNewAccountForm, pageForMaybeRoute)
import App.Route (Route(..), routeCodec)
import Data.Array (filter, find, snoc)
import Data.Maybe (Maybe(..), fromMaybe)
import Data.String.Common (trim)
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
        base = model { route = mRoute, page = pageForMaybeRoute mRoute, editProfileForm = Nothing, editMetadataForm = Nothing }
      in
        case mRoute of
          Just Home ->
            Tuple (base { accounts = Loading }) [ pure $ Just FetchAccounts ]
          Just (AccountDetail id) ->
            Tuple (base { selectedAccount = Loading }) [ pure $ Just (FetchAccountDetail id) ]
          Just AccountNew ->
            noMessages $ base { newAccountForm = emptyNewAccountForm }
          _ -> noMessages base

  -- Account list: derive from accountDetails (single source of truth)
  FetchAccounts ->
    let
      accs = map (\d -> d.account) model.accountDetails
    in
      Tuple model [ pure $ Just $ AccountsLoaded accs ]

  AccountsLoaded accs ->
    if model.route == Just Home
      then noMessages $ model { accounts = Loaded accs }
      else noMessages model

  AccountsFailed ->
    if model.route == Just Home
      then noMessages $ model { accounts = Failed }
      else noMessages model

  -- Account detail: look up from accountDetails (single source of truth)
  FetchAccountDetail id ->
    Tuple (model { selectedAccount = Loading })
      [ pure $ Just $ case findDetail id model.accountDetails of
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
      if trimmedName == "" then noMessages model
      else
        let
          accId = "acc_" <> show model.nextId
          acc = AccountResponse
            { id: accId
            , name: trimmedName
            , isBot: form.isBot
            , publicKey: "ed25519:MOCK_" <> show model.nextId
            , createdAt: "2025-03-28T00:00:00Z"
            , moderation: Nothing
            }
          newDetail :: AccountWithDetails
          newDetail = { account: acc, profile: Nothing, metadata: [] }
          newDetails = snoc model.accountDetails newDetail
          url = print routeCodec (AccountDetail accId)
        in
          Tuple (model { accounts = Loaded (map (\d -> d.account) newDetails), accountDetails = newDetails, newAccountForm = emptyNewAccountForm, nextId = model.nextId + 1 })
            [ liftEffect (nav.pushState (unsafeToForeign {}) url) $> Nothing ]

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
          noMessages $ model { editProfileForm = Just form }
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
        let
          AccountResponse acc = d.account
          trimmedDisplayName = trim form.displayName
          trimmedSummary = trim form.summary
          trimmedIconUrl = trim form.iconUrl
          trimmedBannerUrl = trim form.bannerUrl
          allEmpty = trimmedDisplayName == "" && trimmedSummary == "" && trimmedIconUrl == "" && trimmedBannerUrl == ""
          newProfile = if allEmpty then d.profile
            else
              let
                nanoid = case d.profile of
                  Just (ProfileResponse p) -> p.nanoid
                  Nothing -> "prof_" <> show model.nextId
              in Just $ ProfileResponse
                { accountId: acc.id
                , nanoid
                , displayName: if trimmedDisplayName == "" then Nothing else Just trimmedDisplayName
                , summary: if trimmedSummary == "" then Nothing else Just trimmedSummary
                , iconUrl: if trimmedIconUrl == "" then Nothing else Just trimmedIconUrl
                , bannerUrl: if trimmedBannerUrl == "" then Nothing else Just trimmedBannerUrl
                }
          updatedDetail = d { profile = newProfile }
          -- Update nextId only when creating new profile (not empty, was Nothing)
          newNextId = case d.profile, allEmpty of
            Nothing, false -> model.nextId + 1
            _, _ -> model.nextId
        in
          noMessages $ model
            { selectedAccount = Loaded updatedDetail
            , accountDetails = updateDetail acc.id updatedDetail model.accountDetails
            , editProfileForm = Nothing
            , nextId = newNextId
            }
      _, _ -> noMessages model

  CancelEditProfile ->
    noMessages $ model { editProfileForm = Nothing }

  -- Metadata editing
  StartAddMetadata ->
    noMessages $ model { editMetadataForm = Just { id: Nothing, label: "", content: "" } }

  StartEditMetadata nanoid ->
    case model.selectedAccount of
      Loaded d ->
        case find (\(MetadataResponse m) -> m.nanoid == nanoid) d.metadata of
          Just (MetadataResponse m) ->
            noMessages $ model { editMetadataForm = Just { id: Just nanoid, label: m.label, content: m.content } }
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
        let
          trimmedLabel = trim form.label
          trimmedContent = trim form.content
        in
          if trimmedLabel == "" || trimmedContent == "" then noMessages model
          else
            let
              AccountResponse acc = d.account
              newMetadata = case form.id of
                -- Editing existing
                Just nanoid ->
                  map (\(MetadataResponse m) ->
                    if m.nanoid == nanoid
                      then MetadataResponse (m { label = trimmedLabel, content = trimmedContent })
                      else MetadataResponse m
                  ) d.metadata
                -- Adding new: use unique counter-based ID
                Nothing ->
                  snoc d.metadata $ MetadataResponse
                    { accountId: acc.id
                    , nanoid: "meta_" <> show model.nextId
                    , label: trimmedLabel
                    , content: trimmedContent
                    }
              updatedDetail = d { metadata = newMetadata }
              -- Increment nextId only on new metadata
              newNextId = case form.id of
                Nothing -> model.nextId + 1
                Just _ -> model.nextId
            in
              noMessages $ model
                { selectedAccount = Loaded updatedDetail
                , accountDetails = updateDetail acc.id updatedDetail model.accountDetails
                , editMetadataForm = Nothing
                , nextId = newNextId
                }
      _, _ -> noMessages model

  CancelMetadata ->
    noMessages $ model { editMetadataForm = Nothing }

  DeleteMetadata nanoid ->
    case model.selectedAccount of
      Loaded d ->
        let
          AccountResponse acc = d.account
          newMetadata = filter (\(MetadataResponse m) -> m.nanoid /= nanoid) d.metadata
          updatedDetail = d { metadata = newMetadata }
        in
          noMessages $ model
            { selectedAccount = Loaded updatedDetail
            , accountDetails = updateDetail acc.id updatedDetail model.accountDetails
            }
      _ -> noMessages model

-- Helper: find a detail by account ID
findDetail :: String -> Array AccountWithDetails -> Maybe AccountWithDetails
findDetail targetId = find (\d -> let AccountResponse a = d.account in a.id == targetId)

-- Helper: update a detail in the array by account ID
updateDetail :: String -> AccountWithDetails -> Array AccountWithDetails -> Array AccountWithDetails
updateDetail targetId newDetail = map (\d -> let AccountResponse a = d.account in if a.id == targetId then newDetail else d)
