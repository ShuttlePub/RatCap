// ============================================================
// MockBooskiffClient 単体テスト — インメモリ実装のクォータ会計と
// エラー形状 (core と同じ {"error":{code,message}}) を検証する。
// このクライアントは bun test 専用 (USE_MOCK には配線しない)。
// ============================================================

import { describe, expect, test } from "bun:test";
import { createMockBooskiffClient } from "./mock.ts";
import { BooskiffApiError } from "./client.ts";

const KB = 1024;

function streamOfSize(bytes: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}

async function errorOf(promise: Promise<unknown>): Promise<BooskiffApiError> {
  const err = await promise.catch((e: unknown) => e);
  if (!(err instanceof BooskiffApiError)) throw new Error(`expected BooskiffApiError, got: ${String(err)}`);
  return err;
}

describe("upload quota accounting", () => {
  test("within limits → stored and listed", async () => {
    const client = createMockBooskiffClient();
    const file = await client.uploadFile({
      name: "a.txt",
      mime: "text/plain",
      folderId: null,
      contentType: "text/plain",
      contentLength: "10",
      body: streamOfSize(10),
    });
    expect(file.sizeBytes).toBe(10);
    expect(file.mimeType).toBe("text/plain");
    expect(file.isPublic).toBe(false);
    expect(await client.listFiles()).toEqual([file]);
  });

  test("over maxFileBytes → 413 file_too_large shaped error", async () => {
    const client = createMockBooskiffClient({ maxFileBytes: 10, storageQuotaBytes: 1000 });
    const err = await errorOf(client.uploadFile({
      name: "big.bin",
      mime: null,
      folderId: null,
      contentType: "application/octet-stream",
      contentLength: "11",
      body: streamOfSize(11),
    }));
    expect(err.status).toBe(413);
    expect(JSON.parse(err.body)).toEqual({ error: { code: "file_too_large", message: expect.any(String) } });
  });

  test("over storage quota → 507 insufficient_storage shaped error", async () => {
    const client = createMockBooskiffClient({ maxFileBytes: 100, storageQuotaBytes: 15 });
    await client.uploadFile({
      name: "first.bin",
      mime: null,
      folderId: null,
      contentType: "application/octet-stream",
      contentLength: "10",
      body: streamOfSize(10),
    });
    const err = await errorOf(client.uploadFile({
      name: "second.bin",
      mime: null,
      folderId: null,
      contentType: "application/octet-stream",
      contentLength: "10",
      body: streamOfSize(10),
    }));
    expect(err.status).toBe(507);
    expect(JSON.parse(err.body)).toEqual({ error: { code: "insufficient_storage", message: expect.any(String) } });
  });

  test("billingStatus reflects used bytes and configured limits", async () => {
    const client = createMockBooskiffClient({ maxFileBytes: 5 * KB, storageQuotaBytes: 10 * KB });
    await client.uploadFile({
      name: "a.bin",
      mime: null,
      folderId: null,
      contentType: "application/octet-stream",
      contentLength: String(2 * KB),
      body: streamOfSize(2 * KB),
    });
    expect(await client.billingStatus()).toEqual({
      usedBytes: 2 * KB,
      storageQuotaBytes: 10 * KB,
      maxFileBytes: 5 * KB,
      rateLimitRpm: 60,
    });
  });
});

describe("folders", () => {
  test("duplicate folder name → 409 folder_already_exists shaped error", async () => {
    const client = createMockBooskiffClient();
    await client.createFolder("docs");
    const err = await errorOf(client.createFolder("docs"));
    expect(err.status).toBe(409);
    expect(JSON.parse(err.body)).toEqual({ error: { code: "folder_already_exists", message: expect.any(String) } });
  });

  test("deleteFolder detaches files (folderId → null)", async () => {
    const client = createMockBooskiffClient();
    const folder = await client.createFolder("docs");
    const file = await client.uploadFile({
      name: "a.txt",
      mime: "text/plain",
      folderId: folder.id,
      contentType: "text/plain",
      contentLength: "1",
      body: streamOfSize(1),
    });
    expect(file.folderId).toBe(folder.id);

    await client.deleteFolder(folder.id);

    const remaining = await client.listFiles();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.folderId).toBeNull();
    expect(await client.listFolders()).toEqual([]);
  });

  test("renameFolder updates the name; getFolder on missing id → 404", async () => {
    const client = createMockBooskiffClient();
    const folder = await client.createFolder("docs");
    const renamed = await client.renameFolder(folder.id, "documents");
    expect(renamed.name).toBe("documents");
    expect((await client.getFolder(folder.id)).name).toBe("documents");
    const err = await errorOf(client.getFolder("missing"));
    expect(err.status).toBe(404);
  });
});
