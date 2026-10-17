import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCelestial } from "../features/world/scene/celestial";
import { sampleWorldTime } from "../features/world/scene/world-time";

test("arrival fades sky bodies and their halos without moving them or dimming scene lighting", () => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => ({
        width: 16,
        height: 16,
        getContext: () => ({ fillStyle: "", fillRect() {} }),
      }),
    },
  });
  const scene = new THREE.Scene();
  try {
    const camera = new THREE.PerspectiveCamera(35, 1.6, 0.1, 140);
    camera.position.set(0, 0, 14.4);
    const sky = createCelestial(scene);
    for (const hour of [12, 21]) {
      const time = sampleWorldTime(hour);
      const body = scene.getObjectByName(
        hour === 12 ? "minecraft-sun" : "minecraft-moon",
      ) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      const light = sky.update(time, false, camera, 0);
      const position = light.position.clone();
      const strength = light.strength;
      const bodyPosition = body.position.clone();
      assert.equal(body.material.opacity, 0);
      assert.equal(
        body.visible,
        true,
        "hidden appearance still warms its real material",
      );
      assert.ok(
        strength > 0.9,
        "the building is fully lit before celestial reveal",
      );
      const material = (
        scene.children[0] as THREE.Mesh<
          THREE.PlaneGeometry,
          THREE.ShaderMaterial
        >
      ).material;
      const halo = hour === 12 ? "sunVisibility" : "moonVisibility";
      assert.equal(material.uniforms[halo].value, 0);
      for (const reveal of [0.2, 0.5, 1]) {
        const next = sky.update(time, false, camera, reveal);
        assert.equal(next.strength, strength);
        assert.ok(next.position.equals(position));
        assert.ok(body.position.equals(bodyPosition));
        assert.ok(Math.abs(body.material.opacity - strength * reveal) < 1e-9);
        assert.equal(material.uniforms[halo].value, body.material.opacity);
      }
    }
  } finally {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        for (const material of Array.isArray(object.material)
          ? object.material
          : [object.material]) {
          if (material instanceof THREE.MeshBasicMaterial)
            material.map?.dispose();
          material.dispose();
        }
      }
    });
    if (documentDescriptor)
      Object.defineProperty(globalThis, "document", documentDescriptor);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
