import * as THREE from "three";

// Stage 8.5.2 visibility patch
// Adds a two-layer silhouette outline only to meshes that main85 marks as enemy hitboxes.
// This keeps the world/weapon untouched and avoids adding extra raycast targets.
const originalAdd = THREE.Object3D.prototype.add;

const outerMaterial = new THREE.MeshBasicMaterial({
  color: 0x010407,
  side: THREE.BackSide,
  transparent: true,
  opacity: 0.96,
  depthWrite: false,
  toneMapped: false,
});

const rimMaterial = new THREE.MeshBasicMaterial({
  color: 0x74ddff,
  side: THREE.BackSide,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
  toneMapped: false,
});

function makeShell(source, material, scale) {
  const shell = new THREE.Mesh(source.geometry, material);
  shell.name = "enemy-visibility-outline";
  shell.scale.setScalar(scale);
  shell.frustumCulled = true;
  shell.castShadow = false;
  shell.receiveShadow = false;
  shell.raycast = () => {};
  return shell;
}

function applyEnemyOutline(mesh) {
  if (!mesh?.isMesh || mesh.userData.__visibilityOutlineApplied) return;
  if (!mesh.userData.enemy || !mesh.userData.zone) return;

  mesh.userData.__visibilityOutlineApplied = true;

  const isHead = mesh.userData.zone === "head";
  const rimScale = isHead ? 1.060 : 1.042;
  const outerScale = isHead ? 1.095 : 1.070;

  const outer = makeShell(mesh, outerMaterial, outerScale);
  const rim = makeShell(mesh, rimMaterial, rimScale);

  // Use the unpatched add here so helper meshes do not recurse back through the patch.
  originalAdd.call(mesh, outer);
  originalAdd.call(mesh, rim);
}

THREE.Object3D.prototype.add = function (...objects) {
  const result = originalAdd.apply(this, objects);

  for (const object of objects) {
    if (!object?.isMesh) continue;
    // main85 tags enemy meshes immediately after root.add(mesh), so defer until that tag exists.
    queueMicrotask(() => applyEnemyOutline(object));
  }

  return result;
};
