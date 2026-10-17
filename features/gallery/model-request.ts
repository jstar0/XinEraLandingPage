import { galleryModelAsset } from "@/lib/model-assets";
import type { GalleryPlace } from "./content";

export const GALLERY_DOWNLOAD_IDLE_TIMEOUT = 30_000;
export const GALLERY_PREPARATION_TIMEOUT = 45_000;

/** Fetch streams contain decoded bytes, even when the response uses Brotli. */
export async function requestGalleryModel(
  place: GalleryPlace,
  parentSignal: AbortSignal,
  report: (progress: number) => void = () => {},
  idleTimeout = GALLERY_DOWNLOAD_IDLE_TIMEOUT,
): Promise<ArrayBuffer> {
  parentSignal.throwIfAborted();
  const asset = galleryModelAsset(place);
  const request = new AbortController();
  const signal = AbortSignal.any([parentSignal, request.signal]);
  let watchdog: ReturnType<typeof setTimeout>;
  const received = () => {
    clearTimeout(watchdog);
    watchdog = setTimeout(
      () =>
        request.abort(
          new DOMException("Gallery download stalled", "TimeoutError"),
        ),
      idleTimeout,
    );
  };
  received();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancelRead = () => {
    // Explicitly cancel the reader as well as fetch, including a pending read.
    void reader?.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener("abort", cancelRead, { once: true });
  performance.mark(`gallery:${place}:request`);
  try {
    const response = await fetch(asset.url, { signal, priority: "high" });
    signal.throwIfAborted();
    if (!response.ok)
      throw new Error(`Gallery model request failed: ${response.status}`);
    received();
    let bytes: ArrayBuffer;
    if (!response.body) {
      bytes = await response.arrayBuffer();
    } else {
      reader = response.body.getReader();
      const parts: Uint8Array[] = [];
      let loaded = 0;
      let lastPercent = -1;
      while (true) {
        const { done, value } = await reader.read();
        signal.throwIfAborted();
        if (done) break;
        if (!value.byteLength) continue;
        received();
        parts.push(value);
        loaded += value.byteLength;
        if (loaded > asset.bytes)
          throw new Error("Gallery model size does not match its version");
        const percent = Math.floor((loaded / asset.bytes) * 100);
        if (percent !== lastPercent) {
          lastPercent = percent;
          report(loaded / asset.bytes);
        }
      }
      const joined = new Uint8Array(loaded);
      let offset = 0;
      for (const part of parts) {
        joined.set(part, offset);
        offset += part.byteLength;
      }
      bytes = joined.buffer;
    }
    signal.throwIfAborted();
    if (bytes.byteLength !== asset.bytes)
      throw new Error("Gallery model download is incomplete");
    report(1);
    performance.mark(`gallery:${place}:downloaded`);
    return bytes;
  } catch (error) {
    // Stop the transport on read/validation failure, without aborting siblings
    // owned by a newer viewer. The Island effect decides when to show fallback.
    request.abort(error);
    throw error;
  } finally {
    clearTimeout(watchdog!);
    signal.removeEventListener("abort", cancelRead);
    reader?.releaseLock();
  }
}
