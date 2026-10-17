/** Decode actual shipped Meshopt views and check the bounded asset edits. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, "../..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const alphaReport = JSON.parse(await readFile(path.join(directory, "volcano-alpha-verification.json"), "utf8"));
const waterReport = JSON.parse(await readFile(path.join(directory, "cathedral-water-verification.json"), "utf8"));
await MeshoptDecoder.ready;
const results = [];
for (const scene of ["volcano", "cathedral-water"]) {
  const raw = await readFile(path.join(root, "public/xinera/gallery", `${scene}.glb`));
  const jsonLength = raw.readUInt32LE(12);
  const document = JSON.parse(raw.subarray(20, 20 + jsonLength));
  const binary = raw.subarray(28 + jsonLength);
  const views = new Map();
  let decodedBytes = 0;
  for (const [index, view] of document.bufferViews.entries()) {
    const compressed = view.extensions?.EXT_meshopt_compression;
    if (!compressed) continue;
    const destination = new Uint8Array(compressed.count * compressed.byteStride);
    const source = binary.subarray(compressed.byteOffset || 0, (compressed.byteOffset || 0) + compressed.byteLength);
    MeshoptDecoder.decodeGltfBuffer(destination, compressed.count, compressed.byteStride, source, compressed.mode, compressed.filter);
    views.set(index, destination);
    decodedBytes += destination.length;
  }
  assert(views.size > 0);
  const triangles = document.meshes.reduce((count, mesh) => count + mesh.primitives.reduce((total, primitive) => total + document.accessors[primitive.indices].count / 3, 0), 0);
  const result = { scene, bytes: raw.length, sha256: hash(raw), decodedMeshoptViews: views.size, decodedBytes, triangles };
  if (scene === "volcano") {
    assert.equal(hash(binary.subarray(0, alphaReport.preservedBinPrefixBytes)), alphaReport.preservedBinPrefixSha256);
    assert.equal(result.sha256, alphaReport.afterSha256);
    assert.equal(triangles, 549732);
    result.originalBinPrefixUnchanged = true;
  } else {
    assert.equal(triangles, waterReport.triangles);
    assert.equal(document.meshes[0].name, "water");
    const position = document.accessors[document.meshes[0].primitives[0].attributes.POSITION];
    const view = document.bufferViews[position.bufferView];
    const bytes = views.get(position.bufferView);
    assert(bytes);
    assert.equal(position.componentType, 5122);
    assert(position.normalized);
    const values = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const node = document.nodes.find((entry) => entry.mesh === 0);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < position.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        const local = Math.max(values.getInt16((position.byteOffset || 0) + i * view.byteStride + axis * 2, true) / 32767, -1);
        const world = local * (node.scale?.[axis] ?? 1) + (node.translation?.[axis] ?? 0);
        assert(Number.isFinite(world));
        min[axis] = Math.min(min[axis], world);
        max[axis] = Math.max(max[axis], world);
      }
    }
    result.localBoundsAfterDecode = [min, max];
    result.maxBoundsError = Math.max(...min.map((value, axis) => Math.abs(value - waterReport.localBounds[0][axis])), ...max.map((value, axis) => Math.abs(value - waterReport.localBounds[1][axis])));
    // Meshopt's default 14-bit positions span an 18.4-unit scene; the resulting
    // coordinate error must stay below one hundredth of one Minecraft block.
    assert(result.maxBoundsError < 0.001);
    const main = await readFile(path.join(root, "public/xinera/gallery/cathedral.glb"));
    assert.equal(hash(main), waterReport.cathedralMainGlbSha256);
    result.mainCathedralUnchanged = true;
    result.rawBytes = waterReport.bytes;
    result.geometrySimplification = false;
  }
  results.push(result);
  console.log(JSON.stringify(result));
}
await writeFile(path.join(directory, "binary-verification.json"), JSON.stringify(results, null, 2) + "\n");
