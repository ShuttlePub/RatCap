module Generated.Schema.Gql.Enum.ModerationType where

import Prelude

import Data.Argonaut.Decode (class DecodeJson, JsonDecodeError(..), decodeJson)
import Data.Argonaut.Encode (class EncodeJson, encodeJson)
import Data.Bounded (class Bounded)
import Data.Enum (class Enum, class BoundedEnum, Cardinality(..))
import Data.Either (Either(..))
import Data.Function (on)
import Data.Maybe (Maybe(..))
import GraphQL.Client.ToGqlString (class GqlArgString)
import GraphQL.Hasura.Decode (class DecodeHasura)
import GraphQL.Hasura.Encode (class EncodeHasura)

data ModerationType
  = SUSPENDED
  | BANNED

instance eqModerationType :: Eq ModerationType where
  eq = eq `on` show

instance ordModerationType :: Ord ModerationType where
  compare = compare `on` show

instance gqlArgStringModerationType :: GqlArgString ModerationType where
  toGqlArgStringImpl = show

instance decodeJsonModerationType :: DecodeJson ModerationType where
  decodeJson = decodeJson >=> case _ of
    "SUSPENDED" -> pure SUSPENDED
    "BANNED" -> pure BANNED
    s -> Left $ TypeMismatch $ "Not a ModerationType: " <> s

instance encodeJsonModerationType :: EncodeJson ModerationType where
  encodeJson = show >>> encodeJson

instance decdoeHasuraModerationType :: DecodeHasura ModerationType where
  decodeHasura = decodeJson

instance encodeHasuraModerationType :: EncodeHasura ModerationType where
  encodeHasura = encodeJson

instance showModerationType :: Show ModerationType where
  show a = case a of
    SUSPENDED -> "SUSPENDED"
    BANNED -> "BANNED"

instance enumModerationType :: Enum ModerationType where
  succ a = case a of
    SUSPENDED -> Just BANNED
    BANNED -> Nothing
  pred a = case a of
    SUSPENDED -> Nothing
    BANNED -> Just SUSPENDED

instance boundedModerationType :: Bounded ModerationType where
  top = BANNED
  bottom = SUSPENDED

instance boundedEnumModerationType :: BoundedEnum ModerationType where
  cardinality = Cardinality 2
  toEnum a = case a of
    0 -> Just SUSPENDED
    1 -> Just BANNED
    _ -> Nothing
  fromEnum a = case a of
    SUSPENDED -> 0
    BANNED -> 1

