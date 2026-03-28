module App.View.AccountDetail where

import Prelude

import App.Api.Emumet.Types (AccountResponse(..), MetadataResponse(..), ProfileResponse(..))
import App.Format (formatDate)
import App.Message (Message(..))
import App.Model (AccountWithDetails, EditMetadataForm, EditProfileForm, RemoteData(..))
import App.Theme as T
import Data.Array (null) as Array
import Data.Maybe (Maybe(..), fromMaybe)
import Data.String.CodeUnits (take)
import Data.String.Common (toUpper, trim)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: RemoteData AccountWithDetails -> Maybe EditProfileForm -> Maybe EditMetadataForm -> Html Message
view detail editProfile editMetadata =
  case detail of
    NotAsked ->
      HE.text ""
    Loading ->
      HE.div [ HA.class' ("flex items-center justify-center py-16 " <> T.textMuted) ]
        [ HE.text "Loading account..." ]
    Failed ->
      HE.div [ HA.class' ("flex items-center justify-center py-16 " <> T.textError) ]
        [ HE.text "Failed to load account." ]
    Loaded d ->
      detailView d editProfile editMetadata

detailView :: AccountWithDetails -> Maybe EditProfileForm -> Maybe EditMetadataForm -> Html Message
detailView d editProfile editMetadata =
  let
    AccountResponse acc = d.account
  in
    HE.div [ HA.class' "space-y-6" ]
      [ bannerSection d.profile
      , profileHeader acc d.profile
      , case editProfile of
          Just form -> editProfileSection form
          Nothing -> profileSection d.profile
      , metadataSection d.metadata editMetadata
      , accountInfoSection acc
      ]

-- Banner (full-width image or gradient fallback)
bannerSection :: Maybe ProfileResponse -> Html Message
bannerSection profile =
  let
    bannerUrl = case profile of
      Just (ProfileResponse p) -> p.bannerUrl
      Nothing -> Nothing
  in
    case bannerUrl of
      Just url ->
        HE.div [ HA.class' ("w-full h-48 bg-cover bg-center " <> T.roundedThemeLg), HA.createAttribute "style" ("background-image: url(" <> url <> ")") ]
          []
      Nothing ->
        HE.div [ HA.class' ("w-full h-48 bg-gradient-to-r from-accent/30 to-accent/10 " <> T.roundedThemeLg) ]
          []

-- Icon + display name + @handle
profileHeader :: forall r. { name :: String, isBot :: Boolean | r } -> Maybe ProfileResponse -> Html Message
profileHeader acc profile =
  let
    displayName = case profile of
      Just (ProfileResponse p) -> fromMaybe acc.name p.displayName
      Nothing -> acc.name
    iconUrl = case profile of
      Just (ProfileResponse p) -> p.iconUrl
      Nothing -> Nothing
  in
    HE.div [ HA.class' "flex items-end gap-4 -mt-10 px-4" ]
      [ iconView iconUrl acc.name
      , HE.div [ HA.class' "pb-1" ]
          [ HE.h1 [ HA.class' ("text-2xl font-bold " <> T.textHeading) ]
              [ HE.text displayName ]
          , HE.div [ HA.class' ("flex items-center gap-2 " <> T.textMuted) ]
              [ HE.text ("@" <> acc.name)
              , if acc.isBot
                  then HE.span [ HA.class' ("px-2 py-0.5 text-xs font-medium " <> T.bgAccent <> " text-white " <> T.roundedTheme) ]
                    [ HE.text "Bot" ]
                  else HE.text ""
              ]
          ]
      ]

iconView :: Maybe String -> String -> Html Message
iconView mbUrl name =
  case mbUrl of
    Just url ->
      HE.img [ HA.class' ("w-20 h-20 border-4 border-bg-primary object-cover " <> T.roundedThemeLg), HA.src url, HA.alt name ]
    Nothing ->
      HE.div [ HA.class' ("w-20 h-20 border-4 border-bg-primary flex items-center justify-center text-2xl font-bold text-white " <> T.bgAccent <> " " <> T.roundedThemeLg) ]
        [ HE.text (toUpper (take 1 name)) ]

-- Summary / bio (read-only) with edit button
profileSection :: Maybe ProfileResponse -> Html Message
profileSection profile =
  HE.div [ HA.class' (T.surface <> " p-5") ]
    [ HE.div [ HA.class' "flex items-center justify-between mb-2" ]
        [ HE.h2 [ HA.class' ("text-lg font-semibold " <> T.textHeading) ]
            [ HE.text "Profile" ]
        , HE.button
            [ HA.class' ("px-3 py-1 text-xs font-medium " <> T.textAccent <> " border " <> T.borderTheme <> " " <> T.roundedTheme <> " hover:opacity-80 transition-opacity")
            , HA.onClick StartEditProfile
            ]
            [ HE.text "Edit" ]
        ]
    , case profile of
        Just (ProfileResponse p) ->
          HE.div [ HA.class' "space-y-2" ]
            [ profileRow "Display Name" (fromMaybe "—" p.displayName)
            , profileRow "Summary" (fromMaybe "—" p.summary)
            , profileRow "Icon URL" (fromMaybe "—" p.iconUrl)
            , profileRow "Banner URL" (fromMaybe "—" p.bannerUrl)
            ]
        Nothing ->
          HE.p [ HA.class' (T.textMuted <> " text-sm") ]
            [ HE.text "No profile set. Click Edit to create one." ]
    ]

profileRow :: String -> String -> Html Message
profileRow label value =
  HE.div [ HA.class' ("flex items-start gap-3 py-2 border-b last:border-0 " <> T.borderTheme) ]
    [ HE.span [ HA.class' ("text-sm font-medium min-w-[100px] shrink-0 " <> T.textMuted) ]
        [ HE.text label ]
    , HE.span [ HA.class' ("text-sm break-all " <> T.textPrimary) ]
        [ HE.text value ]
    ]

-- Profile edit form (inline)
editProfileSection :: EditProfileForm -> Html Message
editProfileSection form =
  HE.div [ HA.class' (T.surface <> " p-5") ]
    [ HE.div [ HA.class' "flex items-center justify-between mb-4" ]
        [ HE.h2 [ HA.class' ("text-lg font-semibold " <> T.textHeading) ]
            [ HE.text "Edit Profile" ]
        , HE.div [ HA.class' "flex gap-2" ]
            [ HE.button
                [ HA.class' ("px-3 py-1 text-xs font-medium " <> T.textMuted <> " border " <> T.borderTheme <> " " <> T.roundedTheme <> " hover:opacity-80 transition-opacity")
                , HA.onClick CancelEditProfile
                ]
                [ HE.text "Cancel" ]
            , HE.button
                [ HA.class' ("px-3 py-1 text-xs font-medium text-white " <> T.bgAccent <> " " <> T.hoverBgAccent <> " " <> T.roundedTheme <> " transition-colors")
                , HA.onClick SaveProfile
                ]
                [ HE.text "Save" ]
            ]
        ]
    , HE.div [ HA.class' "space-y-3" ]
        [ editField "Display Name" form.displayName SetEditProfileDisplayName
        , editTextarea "Summary" form.summary SetEditProfileSummary
        , editField "Icon URL" form.iconUrl SetEditProfileIconUrl
        , editField "Banner URL" form.bannerUrl SetEditProfileBannerUrl
        ]
    ]

editField :: String -> String -> (String -> Message) -> Html Message
editField label value handler =
  HE.div [ HA.class' "space-y-1" ]
    [ HE.label [ HA.class' ("block text-xs font-medium " <> T.textMuted) ]
        [ HE.text label ]
    , HE.input
        [ HA.class' inputClass
        , HA.type' "text"
        , HA.value value
        , HA.onInput handler
        ]
    ]

editTextarea :: String -> String -> (String -> Message) -> Html Message
editTextarea label value handler =
  HE.div [ HA.class' "space-y-1" ]
    [ HE.label [ HA.class' ("block text-xs font-medium " <> T.textMuted) ]
        [ HE.text label ]
    , HE.textarea
        [ HA.class' (inputClass <> " min-h-[80px] resize-y")
        , HA.value value
        , HA.onInput handler
        ]
        []
    ]

-- Metadata key-value pairs with CRUD
metadataSection :: Array MetadataResponse -> Maybe EditMetadataForm -> Html Message
metadataSection metadata editForm =
  HE.div [ HA.class' (T.surface <> " p-5") ]
    [ HE.div [ HA.class' "flex items-center justify-between mb-3" ]
        [ HE.h2 [ HA.class' ("text-lg font-semibold " <> T.textHeading) ]
            [ HE.text "Metadata" ]
        , case editForm of
            Just _ -> HE.text ""
            Nothing ->
              HE.button
                [ HA.class' ("px-3 py-1 text-xs font-medium " <> T.textAccent <> " border " <> T.borderTheme <> " " <> T.roundedTheme <> " hover:opacity-80 transition-opacity")
                , HA.onClick StartAddMetadata
                ]
                [ HE.text "+ Add" ]
        ]
    , if Array.null metadata && editForm == Nothing
        then HE.p [ HA.class' (T.textMuted <> " text-sm") ] [ HE.text "No metadata yet." ]
        else HE.div [ HA.class' "space-y-2" ] (map (metadataRow editForm) metadata)
    , case editForm of
        Just form -> editMetadataSection form
        Nothing -> HE.text ""
    ]

metadataRow :: Maybe EditMetadataForm -> MetadataResponse -> Html Message
metadataRow editForm (MetadataResponse m) =
  let
    isEditing = case editForm of
      Just f -> f.id == Just m.nanoid
      Nothing -> false
  in
    if isEditing
      then HE.text "" -- Shown via editMetadataSection
      else
        HE.div [ HA.class' ("flex items-center gap-3 py-2 border-b last:border-0 " <> T.borderTheme) ]
          [ HE.span [ HA.class' ("text-sm font-medium min-w-[100px] " <> T.textMuted) ]
              [ HE.text m.label ]
          , HE.span [ HA.class' ("text-sm flex-1 " <> T.textPrimary) ]
              [ HE.text m.content ]
          , HE.div [ HA.class' "flex gap-1 shrink-0" ]
              [ HE.button
                  [ HA.class' ("px-2 py-0.5 text-xs " <> T.textAccent <> " hover:opacity-80")
                  , HA.onClick (StartEditMetadata m.nanoid)
                  ]
                  [ HE.text "Edit" ]
              , HE.button
                  [ HA.class' ("px-2 py-0.5 text-xs " <> T.textError <> " hover:opacity-80")
                  , HA.onClick (DeleteMetadata m.nanoid)
                  ]
                  [ HE.text "Delete" ]
              ]
          ]

-- Metadata add/edit form (inline, shown below the list)
editMetadataSection :: EditMetadataForm -> Html Message
editMetadataSection form =
  HE.div [ HA.class' ("mt-3 p-3 border " <> T.borderTheme <> " " <> T.roundedTheme <> " space-y-3") ]
    [ HE.div [ HA.class' "flex gap-3" ]
        [ HE.div [ HA.class' "flex-1 space-y-1" ]
            [ HE.label [ HA.class' ("block text-xs font-medium " <> T.textMuted) ]
                [ HE.text "Label" ]
            , HE.input
                [ HA.class' inputClass
                , HA.type' "text"
                , HA.placeholder "e.g. Website"
                , HA.value form.label
                , HA.onInput SetMetadataLabel
                ]
            ]
        , HE.div [ HA.class' "flex-1 space-y-1" ]
            [ HE.label [ HA.class' ("block text-xs font-medium " <> T.textMuted) ]
                [ HE.text "Content" ]
            , HE.input
                [ HA.class' inputClass
                , HA.type' "text"
                , HA.placeholder "e.g. https://example.com"
                , HA.value form.content
                , HA.onInput SetMetadataContent
                ]
            ]
        ]
    , HE.div [ HA.class' "flex gap-2 justify-end" ]
        [ HE.button
            [ HA.class' ("px-3 py-1 text-xs font-medium " <> T.textMuted <> " border " <> T.borderTheme <> " " <> T.roundedTheme <> " hover:opacity-80 transition-opacity")
            , HA.onClick CancelMetadata
            ]
            [ HE.text "Cancel" ]
        , HE.button
            [ HA.class' ("px-3 py-1 text-xs font-medium text-white " <> T.bgAccent <> " " <> T.hoverBgAccent <> " " <> T.roundedTheme <> " transition-colors")
            , HA.onClick SaveMetadata
            , HA.disabled (trim form.label == "" || trim form.content == "")
            ]
            [ HE.text "Save" ]
        ]
    ]

-- Account settings / info
accountInfoSection :: forall r. { id :: String, publicKey :: String, createdAt :: String | r } -> Html Message
accountInfoSection acc =
  HE.div [ HA.class' (T.surface <> " p-5") ]
    [ HE.h2 [ HA.class' ("text-lg font-semibold mb-3 " <> T.textHeading) ]
        [ HE.text "Account Info" ]
    , HE.div [ HA.class' "space-y-2" ]
        [ infoRow "ID" acc.id
        , infoRow "Public Key" acc.publicKey
        , infoRow "Created" (formatDate acc.createdAt)
        ]
    ]

infoRow :: String -> String -> Html Message
infoRow label value =
  HE.div [ HA.class' ("flex items-center gap-3 py-2 border-b last:border-0 " <> T.borderTheme) ]
    [ HE.span [ HA.class' ("text-sm font-medium min-w-[100px] " <> T.textMuted) ]
        [ HE.text label ]
    , HE.span [ HA.class' ("text-sm font-mono " <> T.textPrimary) ]
        [ HE.text value ]
    ]

inputClass :: String
inputClass = "w-full px-3 py-2 text-sm border " <> T.borderTheme <> " " <> T.bgSurface <> " " <> T.textPrimary <> " " <> T.roundedTheme <> " focus:outline-none focus:ring-2 focus:ring-accent/50"
