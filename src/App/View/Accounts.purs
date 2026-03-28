module App.View.Accounts where

import Prelude

import App.Api.Emumet.Types (AccountResponse(..))
import App.Message (Message)
import App.Model (RemoteData(..))
import App.Route as Route
import App.Theme as T
import App.View.Link as Link
import App.Format (formatDate)
import Data.Maybe (Maybe(..))
import Data.String.CodeUnits (take)
import Data.String.Common (toUpper)
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE

view :: RemoteData (Array AccountResponse) -> Maybe String -> Html Message
view accounts errorMsg =
  HE.div [ HA.class' "space-y-8" ]
    [ header
    , errorBanner errorMsg
    , accountsSection accounts
    ]

errorBanner :: Maybe String -> Html Message
errorBanner = case _ of
  Nothing -> HE.text ""
  Just msg ->
    HE.div [ HA.class' ("px-4 py-3 text-sm " <> T.roundedTheme <> " " <> T.textError <> " border " <> T.borderTheme <> " bg-red-500/10") ]
      [ HE.text msg ]

header :: Html Message
header =
  HE.div [ HA.class' "flex items-center justify-between" ]
    [ HE.h1 [ HA.class' ("text-4xl font-bold tracking-tight " <> T.textHeading) ]
        [ HE.text "Accounts" ]
    , newAccountButton
    ]

newAccountButton :: Html Message
newAccountButton =
  Link.link Route.AccountNew
    [ HE.span [ HA.class' ("inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white " <> T.bgAccent <> " " <> T.hoverBgAccent <> " " <> T.roundedTheme <> " transition-colors") ]
        [ HE.text "+ New Account" ]
    ]

accountsSection :: RemoteData (Array AccountResponse) -> Html Message
accountsSection = case _ of
  NotAsked ->
    HE.text ""
  Loading ->
    HE.div [ HA.class' ("flex items-center gap-2 " <> T.textMuted) ]
      [ HE.text "Loading accounts..." ]
  Failed ->
    HE.div [ HA.class' ("flex items-center gap-2 " <> T.textError) ]
      [ HE.text "Failed to load accounts." ]
  Loaded accs ->
    HE.div [ HA.class' "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" ]
      (map accountCard accs)

accountCard :: AccountResponse -> Html Message
accountCard (AccountResponse acc) =
  Link.link (Route.AccountDetail acc.id)
    [ HE.div [ HA.class' (T.surface <> " p-5 hover:border-accent transition-colors cursor-pointer") ]
        [ HE.div [ HA.class' "flex items-center gap-4" ]
            [ avatar acc.name
            , HE.div [ HA.class' "min-w-0 flex-1" ]
                [ HE.div [ HA.class' ("text-lg font-semibold truncate " <> T.textPrimary) ]
                    [ HE.text ("@" <> acc.name) ]
                , HE.div [ HA.class' ("text-sm " <> T.textMuted) ]
                    [ HE.text acc.id ]
                ]
            ]
        , HE.div [ HA.class' ("mt-3 flex items-center gap-2 text-sm " <> T.textSecondary) ]
            [ if acc.isBot
                then HE.span [ HA.class' ("px-2 py-0.5 text-xs font-medium " <> T.bgAccent <> " text-white " <> T.roundedTheme) ]
                  [ HE.text "Bot" ]
                else HE.text ""
            , HE.span [ HA.class' T.textMuted ]
                [ HE.text (formatDate acc.createdAt) ]
            ]
        ]
    ]

avatar :: String -> Html Message
avatar name =
  HE.div [ HA.class' ("w-12 h-12 flex items-center justify-center text-lg font-bold text-white " <> T.bgAccent <> " " <> T.roundedThemeLg) ]
    [ HE.text (toUpper (take 1 name)) ]
