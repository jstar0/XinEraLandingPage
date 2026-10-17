import assert from "node:assert/strict";
import test from "node:test";
import {
  requestHero,
  type JourneyLoadState,
} from "../features/world/scene/hero-request";

test("hero progress measures decoded bytes rather than compressed Content-Length", async () => {
  const previous = globalThis.fetch;
  const total = 6_285_236;
  const events: JourneyLoadState[] = [];
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(total / 2));
          controller.enqueue(new Uint8Array(total / 2));
          controller.close();
        },
      }),
      { headers: { "Content-Length": "1619513", "Content-Encoding": "gzip" } },
    );
  try {
    const bytes = await requestHero(new AbortController().signal, (state) =>
      events.push(state),
    );
    assert.equal(bytes.byteLength, total);
    assert.deepEqual(events, [
      { stage: "loading", progress: 0.5 },
      { stage: "loading", progress: 1 },
      { stage: "preparing" },
    ]);
    assert.ok(events.every((event) => event.stage !== "ready"));
  } finally {
    globalThis.fetch = previous;
  }
});

test("failed hero response never reports fabricated completion", async () => {
  const previous = globalThis.fetch;
  const events: JourneyLoadState[] = [];
  globalThis.fetch = async () => new Response("", { status: 503 });
  try {
    await assert.rejects(
      requestHero(new AbortController().signal, (state) => events.push(state)),
      /503/,
    );
    assert.deepEqual(events, []);
  } finally {
    globalThis.fetch = previous;
  }
});
