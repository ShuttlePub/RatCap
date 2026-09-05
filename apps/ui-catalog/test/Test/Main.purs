module Test.Main where

import Prelude

import App.Catalog (catalog, entryUrl, storyUrl)
import App.Model (Model, initialModel)
import App.Route (Route(..), routeCodec)
import Data.Argonaut.Decode (class DecodeJson, decodeJson)
import Data.Argonaut.Encode (class EncodeJson, encodeJson)
import Data.Array (concatMap, length, nub, zip)
import Data.Either (hush)
import Data.Foldable (for_)
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Effect (Effect)
import Effect.Class.Console (log)
import Effect.Exception (throw)
import Routing.Duplex (parse, print)

main :: Effect Unit
main = do
  log "🎨 ui-catalog tests"
  testRouteCodec
  testModelRoundTrip
  testCatalogUrls

assertEqual :: forall a. Eq a => Show a => String -> a -> a -> Effect Unit
assertEqual label actual expected =
  unless (actual == expected)
    (throw (label <> " — expected " <> show expected <> ", got " <> show actual))

assertTrue :: String -> Boolean -> Effect Unit
assertTrue label ok = assertEqual label ok true

-- | encode ∘ decode must be the identity.
roundTrip :: forall a. Eq a => Show a => EncodeJson a => DecodeJson a => String -> a -> Effect Unit
roundTrip label value = case hush (decodeJson (encodeJson value)) of
  Just decoded -> assertEqual label decoded value
  Nothing -> throw (label <> " — decode failed")

allRoutes :: Array Route
allRoutes =
  [ Home
  , ComponentLayout
  , ComponentLink
  , ComponentNotFound
  , ComponentTheme
  , TokensColor
  , TokensRadius
  , TokensShadow
  ]

-- | The canonical page URL list. manifest.test.ts pins the TS-side
-- | /manifest.json entries to the same list, so drift between the catalog
-- | pages and the agent-facing manifest fails in CI.
expectedUrls :: Array String
expectedUrls =
  [ "/"
  , "/component/layout"
  , "/component/link"
  , "/component/not-found"
  , "/component/theme"
  , "/tokens/color"
  , "/tokens/radius"
  , "/tokens/shadow"
  ]

testRouteCodec :: Effect Unit
testRouteCodec = do
  assertEqual "parse / is Home" (hush (parse routeCodec "/")) (Just Home)
  assertEqual "parse unknown path" (hush (parse routeCodec "/nope")) Nothing
  for_ (zip allRoutes expectedUrls) \(Tuple route url) -> do
    assertEqual ("print " <> show route) (print routeCodec route) url
    assertEqual ("round-trip " <> show route) (hush (parse routeCodec (print routeCodec route))) (Just route)

testModelRoundTrip :: Effect Unit
testModelRoundTrip = do
  for_ allRoutes \route ->
    roundTrip ("initial model " <> show route) (initialModel (Just route))
  roundTrip "initial model (unknown route)" (initialModel Nothing)
  roundTrip "hydrated model" hydrated
  where
  hydrated :: Model
  hydrated = (initialModel (Just Home)) { isHydrated = true }

testCatalogUrls :: Effect Unit
testCatalogUrls = do
  assertEqual "catalog page URLs" ([ "/" ] <> map entryUrl catalog) expectedUrls
  for_ catalog \entry -> do
    let ids = map _.id entry.stories
    assertTrue ("stories non-empty: " <> entry.name) (length ids > 0)
    assertEqual ("story ids unique: " <> entry.name) (length (nub ids)) (length ids)
    for_ entry.stories \story ->
      assertEqual ("story URL: " <> entry.name <> "/" <> story.id)
        (storyUrl entry story)
        (entryUrl entry <> "#story-" <> story.id)
  let allIds = concatMap (map _.id <<< _.stories) catalog
  assertTrue "story ids unique across catalog" (length (nub allIds) == length allIds)
