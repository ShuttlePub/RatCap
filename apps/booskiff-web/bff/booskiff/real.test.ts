// ============================================================
// RealBooskiffClient REST 契約テスト — global fetch を stub し、
// 全メソッドの HTTP method/path/query/Authorization と
// snake_case → camelCase 変換を検証する。
// streaming upload は duplex:"half" + ReadableStream body + verbatim
// Content-Length を呼出側で検証する。
// ============================================================

import { afterEach, describe, expect, test } from "bun:test";
import { createBooskiffClient } from "./real.ts";
import { BooskiffApiError, type BooskiffClient, type UploadInput } from "./client.ts";
import { jsonResponse, jsonBody, stubFetch } from "../test-utils.ts";

const CORE = "http://core.test";
const TOKEN = "test-access-token";

function makeClient(): BooskiffClient {
  return createBooskiffClient({ coreApiUrl: CORE }, TOKEN);
}

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

function uploadInput(overrides: Partial<UploadInput> = {}): UploadInput {
  return {
    name: "a.txt",
    mime: "text/plain",
    folderId: null,
    contentType: "text/plain",
    contentLength: "3",
    body: streamOf("abc"),
    ...overrides,
  };
}

const wireFile = {
  id: "file_1",
  name: "a.txt",
  mime_type: "text/plain",
  size_bytes: 3,
  folder_id: null,
  is_public: false,
  created_at: "2026-01-01T00:00:00Z",
};
const camelFile = {
  id: "file_1",
  name: "a.txt",
  mimeType: "text/plain",
  sizeBytes: 3,
  folderId: null,
  isPublic: false,
  createdAt: "2026-01-01T00:00:00Z",
};
const wireFolder = { id: "f1", name: "docs", created_at: "2026-01-01T00:00:00Z" };
const camelFolder = { id: "f1", name: "docs", createdAt: "2026-01-01T00:00:00Z" };

const originalFetch = globalThis.fetch;
afterEach(() => {
  Object.assign(globalThis, { fetch: originalFetch });
});

describe("files", () => {
  test("listFiles: GET /v1/files?folder_id= with Bearer, maps to camelCase", async () => {
    const { calls } = stubFetch((call) => {
      expect(call.method).toBe("GET");
      expect(call.url).toBe(`${CORE}/v1/files?folder_id=f1`);
      return jsonResponse(200, { items: [{ ...wireFile, folder_id: "f1" }] });
    });
    const result = await makeClient().listFiles("f1");
    expect(calls[0]?.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(result).toEqual([{ ...camelFile, folderId: "f1" }]);
  });

  test("listFiles without folderId → bare /v1/files", async () => {
    const { calls } = stubFetch(() => jsonResponse(200, { items: [wireFile] }));
    const result = await makeClient().listFiles();
    expect(calls[0]?.url).toBe(`${CORE}/v1/files`);
    expect(result).toEqual([camelFile]);
  });

  test("uploadFile: POST /v1/files with stream body, duplex half, verbatim Content-Length, encoded query", async () => {
    const { calls } = stubFetch(() => jsonResponse(201, { ...wireFile, folder_id: "f1" }));
    const input = uploadInput({
      name: "my file.txt",
      mime: "image/png",
      contentType: "image/png",
      folderId: "f/1",
      contentLength: "999",
      body: streamOf("abc"),
    });
    const result = await makeClient().uploadFile(input);

    const call = calls[0];
    expect(call.method).toBe("POST");
    const upstream = new URL(call.url);
    expect(upstream.origin + upstream.pathname).toBe(`${CORE}/v1/files`);
    expect(upstream.searchParams.get("name")).toBe("my file.txt");
    expect(upstream.searchParams.get("mime")).toBe("image/png");
    expect(upstream.searchParams.get("folder_id")).toBe("f/1");
    expect(call.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(call.headers["Content-Type"]).toBe("image/png");
    expect(call.headers["Content-Length"]).toBe("999");
    expect(call.duplex).toBe("half");
    expect(call.body).toBeInstanceOf(ReadableStream);
    expect(result).toEqual({ ...camelFile, folderId: "f1" });
  });

  test("uploadFile: null mime/folderId are omitted from the query", async () => {
    const { calls } = stubFetch(() => jsonResponse(201, wireFile));
    await makeClient().uploadFile(uploadInput({ mime: null, folderId: null }));
    expect(calls[0]?.url).toBe(`${CORE}/v1/files?name=a.txt`);
  });

  test("uploadFile: core 413 → BooskiffApiError with status + raw body", async () => {
    stubFetch(() => jsonResponse(413, { error: { code: "file_too_large", message: "too big" } }));
    const err = await makeClient().uploadFile(uploadInput()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BooskiffApiError);
    const apiErr = err as BooskiffApiError;
    expect(apiErr.status).toBe(413);
    expect(apiErr.body).toBe(JSON.stringify({ error: { code: "file_too_large", message: "too big" } }));
  });

  test("deleteFile: DELETE /v1/files/:id → 204", async () => {
    const { calls } = stubFetch((call) => {
      expect(call.method).toBe("DELETE");
      expect(call.url).toBe(`${CORE}/v1/files/file_1`);
      return new Response(null, { status: 204 });
    });
    await makeClient().deleteFile("file_1");
    expect(calls[0]?.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  test("deleteFile: core 404 → BooskiffApiError", async () => {
    stubFetch(() => jsonResponse(404, { error: { code: "not_found", message: "no such file" } }));
    await expect(makeClient().deleteFile("missing")).rejects.toBeInstanceOf(BooskiffApiError);
  });

  test("getDownloadUrl: GET /v1/files/:id/download-url → returns url string", async () => {
    const { calls } = stubFetch((call) => {
      expect(call.method).toBe("GET");
      expect(call.url).toBe(`${CORE}/v1/files/file_1/download-url`);
      return jsonResponse(200, { url: "http://minio:9000/b/k?sig=abc" });
    });
    const url = await makeClient().getDownloadUrl("file_1");
    expect(url).toBe("http://minio:9000/b/k?sig=abc");
    expect(calls).toHaveLength(1);
  });

  test("getDownloadUrl: core 404 → BooskiffApiError", async () => {
    stubFetch(() => jsonResponse(404, { error: { code: "not_found", message: "no such file" } }));
    await expect(makeClient().getDownloadUrl("missing")).rejects.toBeInstanceOf(BooskiffApiError);
  });
});

describe("folders", () => {
  test("listFolders: GET /v1/folders → camelCase items", async () => {
    stubFetch((call) => {
      expect(call.method).toBe("GET");
      expect(call.url).toBe(`${CORE}/v1/folders`);
      return jsonResponse(200, { items: [wireFolder] });
    });
    expect(await makeClient().listFolders()).toEqual([camelFolder]);
  });

  test("getFolder: GET /v1/folders/:id → camelCase", async () => {
    stubFetch((call) => {
      expect(call.url).toBe(`${CORE}/v1/folders/f1`);
      return jsonResponse(200, wireFolder);
    });
    expect(await makeClient().getFolder("f1")).toEqual(camelFolder);
  });

  test("createFolder: POST /v1/folders {name} → 201 camelCase", async () => {
    const { calls } = stubFetch((call) => {
      expect(call.method).toBe("POST");
      expect(jsonBody(call)).toEqual({ name: "docs" });
      return jsonResponse(201, wireFolder);
    });
    expect(await makeClient().createFolder("docs")).toEqual(camelFolder);
    expect(calls[0]?.headers["Content-Type"]).toBe("application/json");
  });

  test("createFolder: 409 → BooskiffApiError", async () => {
    stubFetch(() => jsonResponse(409, { error: { code: "folder_already_exists", message: "exists" } }));
    await expect(makeClient().createFolder("docs")).rejects.toBeInstanceOf(BooskiffApiError);
  });

  test("renameFolder: PATCH /v1/folders/:id {name} → 200 camelCase", async () => {
    const { calls } = stubFetch((call) => {
      expect(call.method).toBe("PATCH");
      expect(call.url).toBe(`${CORE}/v1/folders/f1`);
      expect(jsonBody(call)).toEqual({ name: "renamed" });
      return jsonResponse(200, { ...wireFolder, name: "renamed" });
    });
    expect(await makeClient().renameFolder("f1", "renamed")).toEqual({ ...camelFolder, name: "renamed" });
  });

  test("deleteFolder: DELETE /v1/folders/:id → 204", async () => {
    const { calls } = stubFetch((call) => {
      expect(call.method).toBe("DELETE");
      expect(call.url).toBe(`${CORE}/v1/folders/f1`);
      return new Response(null, { status: 204 });
    });
    await makeClient().deleteFolder("f1");
    expect(calls).toHaveLength(1);
  });
});

describe("billing", () => {
  test("billingStatus: GET /v1/billing/status → camelCase mapping", async () => {
    stubFetch((call) => {
      expect(call.method).toBe("GET");
      expect(call.url).toBe(`${CORE}/v1/billing/status`);
      return jsonResponse(200, { used_bytes: 10, storage_quota_bytes: 100, max_file_bytes: 50, rate_limit_rpm: 60 });
    });
    expect(await makeClient().billingStatus()).toEqual({
      usedBytes: 10,
      storageQuotaBytes: 100,
      maxFileBytes: 50,
      rateLimitRpm: 60,
    });
  });
});
