module App.Mock where

import Prelude

import Data.Array (find)
import Data.Maybe (Maybe(..))

import App.Api.Emumet.Types
  ( AccountResponse(..)
  , ProfileResponse(..)
  , MetadataResponse(..)
  )
import App.Model (AccountWithDetails)

-- Single source of truth for accounts
mockAccounts :: Array AccountResponse
mockAccounts =
  [ AccountResponse
      { id: "acc_01"
      , name: "alice"
      , isBot: false
      , publicKey: "ed25519:AAAA"
      , createdAt: "2025-01-15T09:00:00Z"
      , moderation: Nothing
      }
  , AccountResponse
      { id: "acc_02"
      , name: "bob"
      , isBot: false
      , publicKey: "ed25519:BBBB"
      , createdAt: "2025-02-20T14:30:00Z"
      , moderation: Nothing
      }
  , AccountResponse
      { id: "acc_03"
      , name: "bot-news"
      , isBot: true
      , publicKey: "ed25519:CCCC"
      , createdAt: "2025-03-10T00:00:00Z"
      , moderation: Nothing
      }
  ]

-- Profiles keyed by account ID
mockProfileFor :: String -> Maybe ProfileResponse
mockProfileFor = case _ of
  "acc_01" -> Just $ ProfileResponse
    { accountId: "acc_01"
    , nanoid: "prof_01"
    , displayName: Just "Alice Wonderland"
    , summary: Just "Exploring the rabbit hole of federated social networks."
    , iconUrl: Just "https://api.dicebear.com/9.x/thumbs/svg?seed=alice"
    , bannerUrl: Just "https://picsum.photos/seed/alice/800/200"
    }
  "acc_02" -> Just $ ProfileResponse
    { accountId: "acc_02"
    , nanoid: "prof_02"
    , displayName: Just "Bob Builder"
    , summary: Just "Can we fix it? Yes we can!"
    , iconUrl: Just "https://api.dicebear.com/9.x/thumbs/svg?seed=bob"
    , bannerUrl: Nothing
    }
  "acc_03" -> Just $ ProfileResponse
    { accountId: "acc_03"
    , nanoid: "prof_03"
    , displayName: Just "News Bot"
    , summary: Just "Automated news aggregator."
    , iconUrl: Just "https://api.dicebear.com/9.x/thumbs/svg?seed=bot"
    , bannerUrl: Nothing
    }
  _ -> Nothing

-- Metadata keyed by account ID
mockMetadataFor :: String -> Array MetadataResponse
mockMetadataFor = case _ of
  "acc_01" ->
    [ MetadataResponse
        { accountId: "acc_01"
        , nanoid: "meta_01"
        , label: "Website"
        , content: "https://alice.example.com"
        }
    , MetadataResponse
        { accountId: "acc_01"
        , nanoid: "meta_02"
        , label: "Pronouns"
        , content: "she/her"
        }
    ]
  "acc_02" ->
    [ MetadataResponse
        { accountId: "acc_02"
        , nanoid: "meta_03"
        , label: "GitHub"
        , content: "https://github.com/bob"
        }
    ]
  _ -> []

-- Build detail from the single source of truth (mockAccounts)
findMockAccountDetail :: String -> Maybe AccountWithDetails
findMockAccountDetail targetId = do
  account <- find (\(AccountResponse a) -> a.id == targetId) mockAccounts
  let (AccountResponse a) = account
  pure
    { account
    , profile: mockProfileFor a.id
    , metadata: mockMetadataFor a.id
    }
