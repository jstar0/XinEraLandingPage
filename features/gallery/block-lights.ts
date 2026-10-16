import * as THREE from "three";

type Source = {
  position: [number, number, number];
  color: string;
  level: number;
  count?: number;
};
export type BlockLightData = {
  unitScale: number;
  sources: Source[];
  clusters?: Source[];
};

/** Emission belongs to every lamp; this bounded pool adds light on nearby surfaces. */
export function createBlockLights(
  root: THREE.Object3D,
  data: BlockLightData,
  maximum = 8,
) {
  const sources = (data.clusters?.length ? data.clusters : data.sources).map(
    (item) => ({
      ...item,
      point: new THREE.Vector3(...item.position),
    }),
  );
  const slots = Array.from(
    { length: Math.min(maximum, sources.length) },
    () => {
      const light = new THREE.PointLight("#ffffff", 0, data.unitScale * 15, 2);
      light.name = "source-block-bounce";
      root.add(light);
      return { light, current: -1, next: -1, weight: 0 };
    },
  );
  const eye = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const scale = new THREE.Vector3();
  let selectionTime = 1;
  return {
    count: sources.length,
    update(
      camera: THREE.Camera,
      target: THREE.Vector3,
      night: number,
      dt: number,
    ) {
      if (!slots.length) return;
      root.updateWorldMatrix(true, false);
      root.worldToLocal(eye.copy(camera.position));
      root.worldToLocal(focus.copy(target));
      root.getWorldScale(scale);
      const unit = data.unitScale * scale.x;
      selectionTime += dt;
      if (selectionTime >= 0.35) {
        selectionTime = 0;
        const retained = new Set(slots.map((slot) => slot.next));
        const chosen = sources
          .map((source, index) => ({
            index,
            score:
              ((eye.distanceToSquared(source.point) * 0.55 +
                focus.distanceToSquared(source.point) * 0.45) /
                (source.level / 15)) *
              (retained.has(index) ? 0.8 : 1),
          }))
          .sort((a, b) => a.score - b.score)
          .slice(0, slots.length)
          .map(({ index }) => index);
        const keep = new Set(chosen);
        const occupied = new Set(
          slots.filter((slot) => keep.has(slot.next)).map((slot) => slot.next),
        );
        const replacements = chosen.filter((index) => !occupied.has(index));
        for (const slot of slots)
          if (!keep.has(slot.next)) slot.next = replacements.shift() ?? -1;
      }
      for (const slot of slots) {
        if (slot.current !== slot.next) {
          slot.weight = Math.max(0, slot.weight - dt * 4);
          if (slot.weight === 0) {
            slot.current = slot.next;
            const source = sources[slot.current];
            if (source) {
              slot.light.position.copy(source.point);
              slot.light.color.set(source.color);
              slot.light.distance = unit * (source.level + 2);
            }
          }
        } else slot.weight = Math.min(1, slot.weight + dt * 3);
        const source = sources[slot.current];
        if (source) slot.light.distance = unit * (source.level + 2);
        slot.light.intensity = source
          ? ((unit * unit * 10 * source.level) / 15) *
            Math.min(2.5, 1 + Math.log2(source.count ?? 1) * 0.22) *
            (1 + night * 0.35) *
            slot.weight
          : 0;
      }
    },
  };
}

export async function readBlockLights(
  path: string,
  signal: AbortSignal,
): Promise<BlockLightData> {
  const response = await fetch(path, { signal });
  if (!response.ok)
    throw new Error(`Block light positions unavailable: ${path}`);
  return response.json();
}
