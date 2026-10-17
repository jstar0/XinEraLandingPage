import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { brotliCompress, brotliDecompress, constants } from "node:zlib";

const compress = promisify(brotliCompress);
const decompress = promisify(brotliDecompress);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifestPath = "lib/model-assets.json";
const sources = [
  "hero/cathedral-island",
  ...[
    "volcano",
    "cathedral",
    "cathedral-water",
    "claire",
    "west",
    "asa",
    "royal",
    "north",
  ].map((name) => `gallery/${name}`),
];

async function updateManifest() {
  const manifest = {};
  for (const name of sources) {
    const source = `/xinera/${name}.glb`;
    const bytes = await readFile(`public${source}`);
    const sha256 = hash(bytes);
    manifest[name] = {
      source,
      url: `/xinera/models/${name.replaceAll("/", "-")}-${sha256.slice(0, 16)}.glb.br`,
      bytes: bytes.length,
      sha256,
    };
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

export async function prepareModelTransport(publicRoot) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const cache = process.env.MCXIN_MODEL_CACHE || ".next/cache/model-transport";
  await mkdir(cache, { recursive: true });
  const report = [];
  for (const [name, asset] of Object.entries(manifest)) {
    const original = await readFile(`public${asset.source}`);
    if (original.length !== asset.bytes || hash(original) !== asset.sha256)
      throw new Error(
        `Model manifest is stale: ${name}. Run node scripts/model-transport.mjs --manifest.`,
      );
    const cached = resolve(cache, basename(asset.url));
    let packed;
    try {
      packed = await readFile(cached);
      if (hash(await decompress(packed)) !== asset.sha256) packed = undefined;
    } catch {
      packed = undefined;
    }
    if (!packed) {
      packed = await compress(original, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_SIZE_HINT]: original.length,
        },
      });
      if (hash(await decompress(packed)) !== asset.sha256)
        throw new Error(`Lossless transport validation failed: ${name}`);
      await writeFile(cached, packed);
    }
    const output = resolve(publicRoot, `.${asset.url}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, packed);
    report.push({
      name,
      decoded: original.length,
      transmitted: packed.length,
      sha256: asset.sha256,
    });
    console.log(
      `Model transport: ${name} ${original.length} -> ${packed.length} bytes`,
    );
  }
  await mkdir(".next", { recursive: true });
  await writeFile(
    ".next/model-transport-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv.includes("--manifest")) await updateManifest();
  else
    await prepareModelTransport(process.argv[2] || ".next/standalone/public");
}
