module App.Route where

import Prelude

import Data.Argonaut.Decode (class DecodeJson)
import Data.Argonaut.Decode.Generic (genericDecodeJson)
import Data.Argonaut.Encode (class EncodeJson)
import Data.Argonaut.Encode.Generic (genericEncodeJson)
import Data.Generic.Rep (class Generic)
import Routing.Duplex (RouteDuplex', root, prefix)
import Routing.Duplex.Generic (noArgs, sum)

data Route = Home | About | Settings

derive instance Generic Route _
derive instance Eq Route

instance EncodeJson Route where
  encodeJson = genericEncodeJson

instance DecodeJson Route where
  decodeJson = genericDecodeJson

routeCodec :: RouteDuplex' Route
routeCodec = root $ sum
  { "Home": noArgs
  , "About": prefix "about" noArgs
  , "Settings": prefix "settings" noArgs
  }
