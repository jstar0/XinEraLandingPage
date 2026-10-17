import assert from "node:assert/strict";
import test from "node:test";
import { galleryModelAsset } from "../lib/model-assets";
import { requestGalleryModel } from "../features/gallery/model-request";

const asset = galleryModelAsset("courtyard");

async function flushPromises() {
  for (let index = 0; index < 8; index++) await Promise.resolve();
}

test("gallery progress uses decoded model bytes, ignoring compressed Content-Length", async (t) => {
  const progress: number[] = [];
  const first = Math.floor(asset.bytes / 2);
  let requested: unknown;
  t.mock.method(globalThis, "fetch", async (url: unknown) => {
    requested = url;
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(first));
          controller.enqueue(new Uint8Array(asset.bytes - first));
          controller.close();
        },
      }),
      { headers: { "Content-Length": "1024", "Content-Encoding": "br" } },
    );
  });
  const bytes = await requestGalleryModel(
    "courtyard",
    new AbortController().signal,
    (value) => progress.push(value),
  );
  assert.equal(requested, asset.url);
  assert.equal(bytes.byteLength, asset.bytes);
  assert.equal(progress[0], first / asset.bytes);
  assert.equal(progress.at(-1), 1);
  assert.ok(progress.every((value) => value >= 0 && value <= 1));
  assert.equal(galleryModelAsset("hall").url, asset.url);
});

test("a download that keeps receiving bytes can last longer than 45 seconds", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  let requestSignal: AbortSignal | undefined;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      requestSignal = init.signal ?? undefined;
      return new Response(
        new ReadableStream({
          start: (value) => {
            stream = value;
          },
        }),
      );
    },
  );
  const task = requestGalleryModel("courtyard", new AbortController().signal);
  await flushPromises();
  const chunk = Math.floor(asset.bytes / 3);
  for (const size of [chunk, chunk, asset.bytes - chunk * 2]) {
    t.mock.timers.tick(20_000);
    stream.enqueue(new Uint8Array(size));
    await flushPromises();
    assert.equal(requestSignal?.aborted, false);
  }
  stream.close();
  assert.equal((await task).byteLength, asset.bytes);
  t.mock.timers.tick(30_000);
  assert.equal(
    requestSignal?.aborted,
    false,
    "completed request clears its timer",
  );
});

test("a stalled stream times out, cancels its reader and reports no completion", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const cancellations: unknown[] = [];
  let requestSignal: AbortSignal | undefined;
  let body!: ReadableStream<Uint8Array>;
  const progress: number[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      requestSignal = init.signal ?? undefined;
      body = new ReadableStream({
        start: (value) => {
          stream = value;
        },
        cancel: (reason) => {
          cancellations.push(reason);
        },
      });
      return new Response(body);
    },
  );
  const task = requestGalleryModel(
    "courtyard",
    new AbortController().signal,
    (value) => progress.push(value),
  );
  const rejected = assert.rejects(task, { name: "TimeoutError" });
  await flushPromises();
  stream.enqueue(new Uint8Array(1024));
  await flushPromises();
  t.mock.timers.tick(29_999);
  assert.equal(cancellations.length, 0);
  t.mock.timers.tick(1);
  await rejected;
  assert.equal((cancellations[0] as DOMException).name, "TimeoutError");
  assert.equal(requestSignal?.aborted, true);
  assert.equal(body.locked, false);
  assert.deepEqual(progress, [1024 / asset.bytes]);
});

test("waiting for response headers also has a no-progress timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(
    globalThis,
    "fetch",
    (_url: unknown, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener(
          "abort",
          () => reject(init.signal?.reason),
          { once: true },
        );
      }),
  );
  const rejected = assert.rejects(
    requestGalleryModel("courtyard", new AbortController().signal),
    { name: "TimeoutError" },
  );
  t.mock.timers.tick(30_000);
  await rejected;
});

test("changing scenes cancels a pending old read without affecting the new request", async (t) => {
  const streams: ReadableStreamDefaultController<Uint8Array>[] = [];
  const cancelled: unknown[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        new ReadableStream({
          start: (value) => {
            streams.push(value);
          },
          cancel: (reason) => {
            cancelled.push(reason);
          },
        }),
      ),
  );
  const oldController = new AbortController();
  const oldProgress: number[] = [];
  const newProgress: number[] = [];
  const oldTask = requestGalleryModel(
    "courtyard",
    oldController.signal,
    (value) => oldProgress.push(value),
  );
  const rejected = assert.rejects(oldTask, { name: "AbortError" });
  const newTask = requestGalleryModel(
    "hall",
    new AbortController().signal,
    (value) => newProgress.push(value),
  );
  await flushPromises();
  oldController.abort();
  await rejected;
  streams[1].enqueue(new Uint8Array(asset.bytes));
  streams[1].close();
  assert.equal((await newTask).byteLength, asset.bytes);
  assert.equal(cancelled.length, 1);
  assert.deepEqual(oldProgress, []);
  assert.equal(newProgress.at(-1), 1);
});

test("failed responses, truncated downloads and stream errors reject without fabricated completion", async (t) => {
  const cases = [
    { response: () => new Response("", { status: 503 }), error: /503/ },
    { response: () => new Response(new Uint8Array(1024)), error: /incomplete/ },
    {
      response: () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("connection reset"));
            },
          }),
        ),
      error: /connection reset/,
    },
  ];
  for (const { response, error } of cases) {
    const progress: number[] = [];
    const mocked = t.mock.method(globalThis, "fetch", async () => response());
    await assert.rejects(
      requestGalleryModel("courtyard", new AbortController().signal, (value) =>
        progress.push(value),
      ),
      error,
    );
    assert.ok(progress.every((value) => value < 1));
    mocked.mock.restore();
  }
});

test("an already-aborted viewer never starts a model request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(requestGalleryModel("courtyard", controller.signal), {
    name: "AbortError",
  });
  assert.equal(fetch.mock.calls.length, 0);
});
