import { modelAsset } from "@/lib/model-assets";

export type JourneyLoadState = {
  stage: "loading" | "preparing" | "ready" | "fallback";
  progress?: number;
};

const asset = modelAsset("hero/cathedral-island");
export const HERO_URL = asset.url;
// The decoded size belongs to this exact version. Fetch streams decoded bytes,
// so a compressed Content-Length must not be used as the progress denominator.
const HERO_BYTES = asset.bytes;

export async function requestHero(
  signal: AbortSignal,
  report: (state: JourneyLoadState) => void,
  onActivity: () => void = () => {},
): Promise<ArrayBuffer> {
  const response = await fetch(HERO_URL, { signal, priority: "high" });
  if (!response.ok) throw new Error(`Hero request failed: ${response.status}`);
  onActivity();
  if (!response.body) {
    const bytes = await response.arrayBuffer();
    report({ stage: "preparing" });
    return bytes;
  }
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let loaded = 0,
    lastPercent = -1;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      if (value.byteLength) onActivity();
      parts.push(value);
      loaded += value.byteLength;
      const percent = Math.floor((loaded / HERO_BYTES) * 100);
      if (percent !== lastPercent) {
        lastPercent = percent;
        report({
          stage: "loading",
          progress: loaded <= HERO_BYTES ? loaded / HERO_BYTES : undefined,
        });
      }
    }
  } finally {
    reader.releaseLock();
  }
  signal.throwIfAborted();
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  report({ stage: "preparing" });
  return bytes.buffer;
}
