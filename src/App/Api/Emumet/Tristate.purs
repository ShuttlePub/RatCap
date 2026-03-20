module App.Api.Emumet.Tristate where

import Prelude

import Data.Argonaut.Core (Json, isNull, jsonNull)
import Data.Argonaut.Decode (class DecodeJson, decodeJson)
import Data.Argonaut.Decode.Error (JsonDecodeError)
import Data.Argonaut.Encode (class EncodeJson, encodeJson)
import Data.Either (Either(..))
import Data.Maybe (Maybe(..))

import Foreign.Object as FO

-- | Tri-state type for optional+nullable JSON fields.
-- | - `Omitted`  — field is absent from JSON (no change)
-- | - `SetNull`  — field is explicitly `null` (clear value)
-- | - `Value a`  — field has a value
data Tristate a = Omitted | SetNull | Value a

derive instance eqTristate :: Eq a => Eq (Tristate a)

instance showTristate :: Show a => Show (Tristate a) where
  show Omitted = "Omitted"
  show SetNull = "SetNull"
  show (Value a) = "(Value " <> show a <> ")"

instance encodeJsonTristate :: EncodeJson a => EncodeJson (Tristate a) where
  encodeJson Omitted = jsonNull
  encodeJson SetNull = jsonNull
  encodeJson (Value a) = encodeJson a

instance decodeJsonTristate :: DecodeJson a => DecodeJson (Tristate a) where
  decodeJson json = do
    (m :: Maybe a) <- decodeJson json
    pure case m of
      Nothing -> SetNull
      Just a -> Value a

-- | Insert a Tristate field into a Foreign.Object builder.
-- | Omitted → skip, SetNull → insert null, Value → insert encoded.
tristateField :: forall a. EncodeJson a => String -> Tristate a -> FO.Object Json -> FO.Object Json
tristateField _ Omitted obj = obj
tristateField key SetNull obj = FO.insert key jsonNull obj
tristateField key (Value a) obj = FO.insert key (encodeJson a) obj

-- | Decode a Tristate field from a decoded JSON object.
-- | Key absent → Omitted, key present+null → SetNull, key present+value → Value.
tristateDecodeField :: forall a. DecodeJson a => FO.Object Json -> String -> Either JsonDecodeError (Tristate a)
tristateDecodeField obj key = case FO.lookup key obj of
  Nothing -> Right Omitted
  Just json
    | isNull json -> Right SetNull
    | otherwise -> case decodeJson json of
        Left err -> Left err
        Right a -> Right (Value a)
