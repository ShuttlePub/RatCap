module App.Format where

import Prelude

import Data.Argonaut.Decode.Class (decodeJson)
import Data.Argonaut.Decode.Combinators ((.:))
import Data.Argonaut.Parser (jsonParser)
import Data.Array (length, (!!))
import Data.Either (hush)
import Data.Int (floor)
import Data.Maybe (Maybe(..), fromMaybe)
import Data.String (Pattern(..), contains)

-- | Format a byte count into a human-readable string with one decimal place
-- | for KiB and above, raw bytes for values below 1 KiB.
-- | 0 -> "0 B", 512 -> "512 B", 1024 -> "1.0 KiB", 104857600 -> "100.0 MiB".
humanize :: Number -> String
humanize bytes = go bytes 0
  where
  units :: Array String
  units = [ "B", "KiB", "MiB", "GiB", "TiB" ]

  go :: Number -> Int -> String
  go n i =
    let
      unit = fromMaybe "B" (units !! i)
    in
      if i >= length units - 1 || n < 1024.0 then
        if i == 0 then show (floor n) <> " " <> unit
        else formatOneDecimal n <> " " <> unit
      else go (n / 1024.0) (i + 1)

formatOneDecimal :: Number -> String
formatOneDecimal n =
  let
    scaled = floor (n * 10.0)
    whole = scaled `div` 10
    frac = scaled `mod` 10
  in
    show whole <> "." <> show frac

decodeCoreErrorCode :: String -> Maybe String
decodeCoreErrorCode s = do
  json <- hush (jsonParser s)
  obj <- hush (decodeJson json)
  errorObj <- hush (obj .: "error")
  code <- hush (errorObj .: "code")
  pure code

uploadErrorMessage :: Maybe Number -> String -> String
uploadErrorMessage mMax err =
  case decodeCoreErrorCode err of
    Just code
      | code == "payload_too_large" ->
          "ファイルサイズが上限を超えています (size limit: " <> humanize (fromMaybe (100.0 * 1024.0 * 1024.0) mMax) <> "/file)"
      | code == "insufficient_storage" ->
          "ストレージ容量が不足しています (size limit: " <> humanize (fromMaybe 0.0 mMax) <> " total)"
      | code == "unauthorized" ->
          "認証が必要です。再度ログインしてください。"
    _ ->
      "アップロードに失敗しました: " <> err

-- | Predicate used by tests to assert the size error carries "size limit".
mentionsSizeLimit :: String -> Boolean
mentionsSizeLimit s = contains (Pattern "size limit") s
