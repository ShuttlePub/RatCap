module App.Format where

import Prelude

import Data.Int (fromString)
import Data.Maybe (fromMaybe)
import Data.String.CodeUnits (drop, take)

-- | Format ISO 8601 date string to "YYYY年M月D日"
-- | e.g. "2025-01-15T09:00:00Z" → "2025年1月15日"
formatDate :: String -> String
formatDate iso =
  let
    yearStr = take 4 iso
    monthStr = take 2 (drop 5 iso)
    dayStr = take 2 (drop 8 iso)
    month = fromMaybe monthStr (map show (fromString monthStr))
    day = fromMaybe dayStr (map show (fromString dayStr))
  in
    yearStr <> "年" <> month <> "月" <> day <> "日"
