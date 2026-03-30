module Client.Auth where

import Prelude

import Data.Maybe (Maybe)
import Data.Nullable (Nullable, toMaybe)
import Effect (Effect)

foreign import _getItem :: String -> Effect (Nullable String)
foreign import _setItem :: String -> String -> Effect Unit
foreign import _removeItem :: String -> Effect Unit

tokenKey :: String
tokenKey = "ratcap-auth-token"

usernameKey :: String
usernameKey = "ratcap-auth-username"

getToken :: Effect (Maybe String)
getToken = toMaybe <$> _getItem tokenKey

setToken :: String -> Effect Unit
setToken = _setItem tokenKey

removeToken :: Effect Unit
removeToken = _removeItem tokenKey

getUsername :: Effect (Maybe String)
getUsername = toMaybe <$> _getItem usernameKey

setUsername :: String -> Effect Unit
setUsername = _setItem usernameKey

removeUsername :: Effect Unit
removeUsername = _removeItem usernameKey
