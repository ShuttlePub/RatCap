module Server where

import Prelude

import App.Message (Message)
import App.Mock (mockAccountDetails)
import App.Model (Model, RemoteData(..), pageForMaybeRoute)
import App.Route (routeCodec)
import App.View (view)
import App.View.Layout as Layout
import Data.Either (hush)
import Data.Maybe (Maybe(..))
import Effect (Effect)
import Flame.Application.Internal.PreMount (injectState, tagSerializedState, idSerializedState, attributeSerializedState, onlyLetters)
import Flame.Html.Attribute as HA
import Flame.Html.Element as HE
import Flame.Renderer.String as FRS
import Flame.Serialization as FS
import Flame.Types (Html)
import Routing.Duplex (parse)

selector :: String
selector = "main#app"

renderPage :: String -> Effect String
renderPage urlPath = do
  let
    mRoute = hush $ parse routeCodec urlPath
    page = pageForMaybeRoute mRoute
    model = { route: mRoute, page, isHydrated: false, accounts: NotAsked, selectedAccount: NotAsked, accountDetails: mockAccountDetails, nextId: 100, newAccountForm: { name: "", isBot: false }, editProfileForm: Nothing, editMetadataForm: Nothing }
    appView = view model
    stateEl = mkStateElement model
    withState = injectState stateEl appView
    fullDoc = Layout.document withState
  FRS.render fullDoc

mkStateElement :: Model -> Html Message
mkStateElement model =
  HE.createElement tagSerializedState
    [ HA.style { display: "none" }
    , HA.id $ idSerializedState sanitizedSelector
    , HA.createAttribute (attributeSerializedState sanitizedSelector) sanitizedSelector
    ]
    [ HE.text $ FS.serialize model ]
  where
  sanitizedSelector = onlyLetters selector
