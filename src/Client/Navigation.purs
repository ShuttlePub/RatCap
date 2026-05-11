module Client.Navigation where

import Prelude

import Effect (Effect)

foreign import _navigateToUrl :: String -> Effect Unit
