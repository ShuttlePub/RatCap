module App.View.Layout where

import Prelude

import App.Catalog (Entry, catalog, entryUrl)
import App.Message (Message(..))
import App.Model (Model)
import App.Route (Route(..))
import Flame (Html)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import ShuttlePub.UI.Layout as UI
import ShuttlePub.UI.Link as Link
import ShuttlePub.UI.Theme as T

page :: Model -> Array (Html Message) -> Html Message
page model content =
  UI.shell [ nav model, UI.contentArea content ]

nav :: Model -> Html Message
nav model =
  UI.navBar brand
    ( [ HE.li_ [ Link.navLink "/" (Navigate Home) [ HE.text "Index" ] ] ]
        <> map navItem catalog
        <> [ themeSwitcher, hydrationBadge model ]
    )

brand :: Html Message
brand =
  HE.span [ HA.class' ("text-lg font-bold tracking-tight " <> T.textHeading) ] [ HE.text "UI Catalog" ]

navItem :: Entry -> Html Message
navItem entry =
  HE.li_ [ Link.navLink (entryUrl entry) (Navigate entry.route) [ HE.text entry.name ] ]

-- | Theme switching is handled by the delegated click listener in
-- | src/Client.js (data-color-option / data-shape-option), matching
-- | packages/design-tokens/theme.js and the active-option highlight in
-- | packages/styles/index.css. No Flame message involved.
themeSwitcher :: Html Message
themeSwitcher =
  HE.li [ HA.class' "flex items-center gap-1 ml-2" ]
    [ optionButton "data-color-option" "catppuccin-mocha" "Catppuccin"
    , optionButton "data-color-option" "tokyo-night" "Tokyo Night"
    , optionButton "data-shape-option" "rounded" "Rounded"
    , optionButton "data-shape-option" "sharp" "Sharp"
    ]

optionButton :: String -> String -> String -> Html Message
optionButton attr value label =
  HE.button
    [ HA.type' "button"
    , HA.createAttribute attr value
    , HA.class' ("px-2 py-1 text-xs border " <> T.borderTheme <> " " <> T.roundedTheme <> " " <> T.textSecondary <> " " <> T.hoverTextAccent)
    ]
    [ HE.text label ]

-- | SSR renders "ssr"; the first UrlChanged after resumeMount flips it to
-- | "hydrated" — the observable proof that hydration completed.
hydrationBadge :: Model -> Html Message
hydrationBadge model =
  HE.li_
    [ HE.span
        [ HA.createAttribute "data-testid" "hydration-state"
        , HA.class' ("px-2 py-1 text-xs font-mono border " <> T.borderTheme <> " " <> T.roundedTheme <> " " <> T.textMuted)
        ]
        [ HE.text (if model.isHydrated then "hydrated" else "ssr") ]
    ]
