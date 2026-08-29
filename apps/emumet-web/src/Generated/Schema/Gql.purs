module Generated.Schema.Gql where

import Data.Argonaut.Core as Data.Argonaut.Core
import Data.Maybe as Data.Maybe
import Data.Newtype as Data.Newtype
import Data.Void as Data.Void
import Generated.Directives.Gql (Directives)
import Generated.Schema.Gql.Enum.ModerationType (ModerationType)
import GraphQL.Client.Args (NotNull)
import GraphQL.Client.AsGql (AsGql)
import GraphQL.Client.ID as GraphQL.Client.ID
import GraphQL.Client.Union as GraphQL.Client.Union
import Type.Proxy as Type.Proxy

type Schema =
  { directives :: Type.Proxy.Proxy Directives
  , query :: Query
  , mutation :: Mutation
  , subscription :: Data.Void.Void
  }

type DateTime = String
type Id =
  -- | The `ID` scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as `"4"`) or integer (such as `4`) input value will be accepted as an ID.
  GraphQL.Client.ID.ID

newtype Query = Query
  { accounts :: {} -> AsGql "AccountConnection" AccountConnection
  , account ::
      { id :: NotNull (AsGql "ID" GraphQL.Client.ID.ID) }
      -> AsGql "Account" (Data.Maybe.Maybe (AsGql "Account" Account))
  }

derive instance Data.Newtype.Newtype Query _
newtype Account = Account
  { createdAt :: {} -> AsGql "DateTime" DateTime
  , id :: {} -> AsGql "ID" GraphQL.Client.ID.ID
  , isBot :: {} -> AsGql "Boolean" Boolean
  , metadata :: {} -> Array (AsGql "Metadata" Metadata)
  , moderation :: {} -> AsGql "Moderation" (Data.Maybe.Maybe (AsGql "Moderation" Moderation))
  , name :: {} -> AsGql "String" String
  , profile :: {} -> AsGql "Profile" (Data.Maybe.Maybe (AsGql "Profile" Profile))
  , publicKey :: {} -> AsGql "String" String
  }

derive instance Data.Newtype.Newtype Account _
newtype AccountConnection = AccountConnection
  { first :: {} -> AsGql "String" (Data.Maybe.Maybe (AsGql "String" String))
  , items :: {} -> Array (AsGql "Account" Account)
  , last :: {} -> AsGql "String" (Data.Maybe.Maybe (AsGql "String" String))
  }

derive instance Data.Newtype.Newtype AccountConnection _
newtype Profile = Profile
  { accountId :: {} -> AsGql "ID" GraphQL.Client.ID.ID
  , bannerUrl :: {} -> AsGql "String" (Data.Maybe.Maybe (AsGql "String" String))
  , displayName :: {} -> AsGql "String" (Data.Maybe.Maybe (AsGql "String" String))
  , iconUrl :: {} -> AsGql "String" (Data.Maybe.Maybe (AsGql "String" String))
  , nanoid :: {} -> AsGql "ID" GraphQL.Client.ID.ID
  , summary :: {} -> AsGql "String" (Data.Maybe.Maybe (AsGql "String" String))
  }

derive instance Data.Newtype.Newtype Profile _
newtype Metadata = Metadata
  { accountId :: {} -> AsGql "ID" GraphQL.Client.ID.ID
  , content :: {} -> AsGql "String" String
  , label :: {} -> AsGql "String" String
  , nanoid :: {} -> AsGql "ID" GraphQL.Client.ID.ID
  }

derive instance Data.Newtype.Newtype Metadata _
newtype Moderation = Moderation
  { bannedAt :: {} -> AsGql "DateTime" (Data.Maybe.Maybe (AsGql "DateTime" DateTime))
  , expiresAt :: {} -> AsGql "DateTime" (Data.Maybe.Maybe (AsGql "DateTime" DateTime))
  , reason :: {} -> AsGql "String" String
  , suspendedAt :: {} -> AsGql "DateTime" (Data.Maybe.Maybe (AsGql "DateTime" DateTime))
  , type :: {} -> AsGql "ModerationType" ModerationType
  }

derive instance Data.Newtype.Newtype Moderation _
newtype Mutation = Mutation
  { updateProfile ::
      { accountId :: NotNull (AsGql "ID" GraphQL.Client.ID.ID)
      , input :: NotNull (AsGql "UpdateProfileInput" UpdateProfileInput)
      }
      -> AsGql "Profile" Profile
  , createMetadata ::
      { accountId :: NotNull (AsGql "ID" GraphQL.Client.ID.ID)
      , input :: NotNull (AsGql "UpsertMetadataInput" UpsertMetadataInput)
      }
      -> AsGql "Metadata" Metadata
  , deleteMetadata ::
      { accountId :: NotNull (AsGql "ID" GraphQL.Client.ID.ID)
      , nanoid :: NotNull (AsGql "ID" GraphQL.Client.ID.ID)
      }
      -> AsGql "Boolean" Boolean
  , updateMetadata ::
      { accountId :: NotNull (AsGql "ID" GraphQL.Client.ID.ID)
      , input :: NotNull (AsGql "UpsertMetadataInput" UpsertMetadataInput)
      , nanoid :: NotNull (AsGql "ID" GraphQL.Client.ID.ID)
      }
      -> AsGql "Metadata" Metadata
  , createAccount ::
      { input :: NotNull (AsGql "CreateAccountInput" CreateAccountInput) } -> AsGql "Account" Account
  }

derive instance Data.Newtype.Newtype Mutation _
newtype UpdateProfileInput = UpdateProfileInput
  { bannerUrl :: AsGql "String" String
  , displayName :: AsGql "String" String
  , iconUrl :: AsGql "String" String
  , summary :: AsGql "String" String
  }

derive instance Data.Newtype.Newtype UpdateProfileInput _
newtype UpsertMetadataInput = UpsertMetadataInput
  { content :: NotNull (AsGql "String" String), label :: NotNull (AsGql "String" String) }

derive instance Data.Newtype.Newtype UpsertMetadataInput _
newtype CreateAccountInput = CreateAccountInput
  { isBot :: AsGql "Boolean" Boolean, name :: NotNull (AsGql "String" String) }

derive instance Data.Newtype.Newtype CreateAccountInput _
