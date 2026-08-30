module Client.Upload where

import Prelude

import Data.Argonaut.Core (Json)
import Data.Argonaut.Decode (class DecodeJson, decodeJson, printJsonDecodeError)
import Data.Argonaut.Parser (jsonParser)
import Data.Bifunctor (lmap)
import Data.Either (Either(..))
import Effect (Effect)
import Effect.Aff (Aff, makeAff)

-- | Progress reported by the XHR upload.
type Progress = { loaded :: Number, total :: Number }

-- | FFI: starts uploading the file currently selected in the file input
-- | matched by `selector`. The JS side performs the multipart XHR and reports
-- | back through plain callbacks: progress events, the success response body,
-- | or an error message. See Client/Upload.js.
foreign import uploadInputImpl
  :: String
  -> (Progress -> Effect Unit)
  -> (String -> Effect Unit)
  -> (String -> Effect Unit)
  -> Effect Unit

-- | Upload the selected file, reporting progress and finishing with the
-- | parsed response JSON (Left = error message).
uploadInput :: String -> (Progress -> Effect Unit) -> (Either String Json -> Effect Unit) -> Effect Unit
uploadInput selector onProgress onDone =
  uploadInputImpl selector onProgress
    (onDone <<< jsonParser)
    (onDone <<< Left)

-- | Run the upload as an Aff, decoding the response body into `a`.
-- | The file input is expected at `selector` (e.g. "[data-testid='upload-input']")
-- | and the upload is triggered by the StartUpload message from the update loop.
uploadFile :: forall a. DecodeJson a => String -> (Progress -> Effect Unit) -> Aff (Either String a)
uploadFile selector onProgress = makeAff \resolve -> do
  uploadInput selector onProgress
    (\result -> resolve (Right (result >>= \json -> lmap printJsonDecodeError (decodeJson json))))
  pure mempty
