// ============================================================
// DataLoader — リクエスト単位のバッチローダ
// EmumetClient のバッチ契約メソッド (listProfiles/listMetadata) を
// batchFn から 1 回だけ呼び、keys の順序に再整列して返す。
//
// DataLoader batchFn 契約 (厳守):
//   (a) 常に keys と同じ長さの配列を返す
//   (b) 各結果が対応 key と同じ添字に置かれる
//   (c) 個別の欠損は該当位置を null / [] とし、位置を詰めない
//       (filter 等による除外は誤割当の原因となるため禁止)
//   (d) バッチリクエスト自体の失敗は Promise の reject で伝播する
// 参照: https://github.com/graphql/dataloader#batch-function
// ============================================================

import DataLoader from "dataloader";
import { GraphQLError } from "graphql";
import type { EmumetClient, Metadata, Profile } from "./emumet/client.ts";

export type Loaders = {
  /** accountId → Profile (未作成なら null) */
  readonly profile: DataLoader<string, Profile | null>;
  /** accountId → Metadata 配列 (0 件なら []) */
  readonly metadata: DataLoader<string, readonly Metadata[]>;
};

/** 認証済みコンテキスト用: EmumetClient にクロージャで束縛した実ローダを構築する */
export function makeLoaders(emumet: EmumetClient): Loaders {
  return {
    profile: new DataLoader<string, Profile | null>(async (keys) => {
      const profiles = await emumet.listProfiles(keys);
      const byAccountId = new Map(profiles.map((profile) => [profile.accountId, profile]));
      return keys.map((key) => byAccountId.get(key) ?? null);
    }),
    metadata: new DataLoader<string, readonly Metadata[]>(async (keys) => {
      const metadata = await emumet.listMetadata(keys);
      const byAccountId = new Map<string, Metadata[]>();
      for (const item of metadata) {
        const group = byAccountId.get(item.accountId);
        if (group) {
          group.push(item);
        } else {
          byAccountId.set(item.accountId, [item]);
        }
      }
      return keys.map((key) => byAccountId.get(key) ?? []);
    }),
  };
}

function rejectUnauthenticated(): Promise<never> {
  return Promise.reject(new GraphQLError("Unauthenticated", { extensions: { code: "UNAUTHENTICATED" } }));
}

/**
 * 未認証コンテキスト用の不活性 Loaders (T4 の空オブジェクト返却の置き換え)。
 * リゾルバは必ず先に requireEmumet で認証を確認するため実際には到達しないが、
 * 万一 load されても素の TypeError ではなく UNAUTHENTICATED で失敗する。
 * 常に失敗するだけの不活性オブジェクトなのでリクエスト間で共有してよい。
 */
export const emptyLoaders: Loaders = {
  profile: new DataLoader<string, Profile | null>(rejectUnauthenticated),
  metadata: new DataLoader<string, readonly Metadata[]>(rejectUnauthenticated),
};
