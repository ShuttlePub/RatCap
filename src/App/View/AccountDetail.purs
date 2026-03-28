module App.View.AccountDetail where

import Prelude

import App.Api.Emumet.Types (AccountResponse(..), MetadataResponse(..), ProfileResponse(..))
import App.Format (formatDate)
import App.Message (Message)
import App.Model (AccountWithDetails, RemoteData(..))
import App.Theme as T
import Data.Array (null) as Array
import Data.Maybe (Maybe(..), fromMaybe)
import Data.String.CodeUnits (take)
import Data.String.Common (toUpper)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: RemoteData AccountWithDetails -> Html Message
view detail =
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
      detailView d

detailView :: AccountWithDetails -> Html Message
detailView d =
  let
    AccountResponse acc = d.account
  in
    HE.div [ HA.class' "space-y-6" ]
      [ bannerSection d.profile
      , profileHeader acc d.profile
      , profileSection d.profile
      , metadataSection d.metadata
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

-- Summary / bio
profileSection :: Maybe ProfileResponse -> Html Message
profileSection profile =
  case profile of
    Just (ProfileResponse p) ->
      case p.summary of
        Just summary ->
          HE.div [ HA.class' (T.surface <> " p-5") ]
            [ HE.h2 [ HA.class' ("text-lg font-semibold mb-2 " <> T.textHeading) ]
                [ HE.text "About" ]
            , HE.p [ HA.class' ("leading-relaxed " <> T.textSecondary) ]
                [ HE.text summary ]
            ]
        Nothing -> HE.text ""
    Nothing -> HE.text ""

-- Metadata key-value pairs
metadataSection :: Array MetadataResponse -> Html Message
metadataSection metadata =
  if Array.null metadata
    then HE.text ""
    else
      HE.div [ HA.class' (T.surface <> " p-5") ]
        [ HE.h2 [ HA.class' ("text-lg font-semibold mb-3 " <> T.textHeading) ]
            [ HE.text "Metadata" ]
        , HE.div [ HA.class' "space-y-2" ]
            (map metadataRow metadata)
        ]

metadataRow :: MetadataResponse -> Html Message
metadataRow (MetadataResponse m) =
  HE.div [ HA.class' ("flex items-center gap-3 py-2 border-b last:border-0 " <> T.borderTheme) ]
    [ HE.span [ HA.class' ("text-sm font-medium min-w-[100px] " <> T.textMuted) ]
        [ HE.text m.label ]
    , HE.span [ HA.class' ("text-sm " <> T.textPrimary) ]
        [ HE.text m.content ]
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
