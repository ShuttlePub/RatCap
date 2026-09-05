module App.Route where

import Prelude

import Data.Argonaut.Decode.Class (class DecodeJson)
import Data.Argonaut.Decode.Generic (genericDecodeJson)
import Data.Argonaut.Encode.Class (class EncodeJson)
import Data.Argonaut.Encode.Generic (genericEncodeJson)
import Data.Generic.Rep (class Generic)
import Data.Show.Generic (genericShow)
import Routing.Duplex (RouteDuplex', prefix, root)
import Routing.Duplex.Generic (noArgs, sum)

data Route
  = Home
  | ComponentLayout
  | ComponentLink
  | ComponentNotFound
  | ComponentTheme
  | TokensColor
  | TokensRadius
  | TokensShadow

derive instance Generic Route _
derive instance Eq Route

instance Show Route where
  show = genericShow

instance EncodeJson Route where
  encodeJson = genericEncodeJson

instance DecodeJson Route where
  decodeJson = genericDecodeJson

-- | Unlike booskiff-web, the root path "/" is part of the codec: it is the
-- | catalog index. Unknown paths parse to Nothing, which the view maps to
-- | the NotFound showcase.
routeCodec :: RouteDuplex' Route
routeCodec = root $ sum
  { "Home": noArgs
  , "ComponentLayout": prefix "component" (prefix "layout" noArgs)
  , "ComponentLink": prefix "component" (prefix "link" noArgs)
  , "ComponentNotFound": prefix "component" (prefix "not-found" noArgs)
  , "ComponentTheme": prefix "component" (prefix "theme" noArgs)
  , "TokensColor": prefix "tokens" (prefix "color" noArgs)
  , "TokensRadius": prefix "tokens" (prefix "radius" noArgs)
  , "TokensShadow": prefix "tokens" (prefix "shadow" noArgs)
  }
