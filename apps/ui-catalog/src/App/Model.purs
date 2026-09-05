module App.Model where

import App.Route (Route)
import Data.Maybe (Maybe)

-- | Record encode/decode instances come from argonaut-codecs (EncodeRecord),
-- | so the Flame serialized state round-trips without hand-written instances.
type Model =
  { route :: Maybe Route
  , isHydrated :: Boolean
  }

-- | Initial model used by SSR (and as the base for tests).
initialModel :: Maybe Route -> Model
initialModel route = { route, isHydrated: false }
