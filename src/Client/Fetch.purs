module Client.Fetch where

import Effect.Aff (Aff)
import Effect.Aff.Compat (EffectFnAff, fromEffectFnAff)

foreign import _fetchText :: String -> EffectFnAff String

fetchText :: String -> Aff String
fetchText url = fromEffectFnAff (_fetchText url)
