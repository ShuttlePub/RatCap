// ============================================================
// env デフォルトの確定 — index.ts / テストの「どの import よりも先」に
// 読まれること。@shuttlepub/auth-bun はモジュール定数 (SESSION_COOKIE_NAME
// 等) を import 時に process.env から解決するため、静的 import の評価順に
// 乗って、auth-bun より前にデフォルトを確定させる必要がある。
// ============================================================

// DEV-ONLY: mock モード専用の固定 32 バイト鍵 (base64)。本番
// (USE_MOCK=false) では必ず環境変数 COOKIE_SECRET_BASE64 で上書きする。
const DEV_ONLY_SECRET_RAW = "booskiff-dev-only-secret-key-32b";

// 空文字列の環境変数は「未設定」と同じ扱いにする (??= は空文字列を
// 値ありと見なすため ||= を使う)
process.env.SESSION_COOKIE_NAME ||= "booskiff_session";
process.env.OAUTH_COOKIE_NAME ||= "booskiff_oauth";
if (process.env.USE_MOCK !== "false") {
  process.env.COOKIE_SECRET_BASE64 ||= btoa(DEV_ONLY_SECRET_RAW);
}
