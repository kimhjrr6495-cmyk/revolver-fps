import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const GAME_VERSION = "STAGE 2 · v2.0.0";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a7c4);
scene.fog = new THREE.Fog(0x87a7c4, 25, 70);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 120);
camera.rotation.order = "YXZ";
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- HUD 확장 ----------
const info = document.getElementById("info");
info.innerHTML = `<strong>${GAME_VERSION}</strong><br>WASD 이동 · Space 점프 · 좌클릭 발사 · R 재장전 · ESC 마우스 해제`;

document.querySelector(".panel h1").textContent = "HTML FPS — Stage 2";
document.querySelector(".panel p").textContent = "리볼버 기본 시스템 테스트";
document.querySelector(".controls").innerHTML = `
  <span>WASD — 이동</span><span>Mouse — 시점</span>
  <span>Space — 점프</span><span>좌클릭 — 발사</span>
  <span>R — 재장전</span><span>ESC — 마우스 해제</span>`;

const ammoHud = document.createElement("div");
ammoHud.id = "ammoHud";
ammoHud.style.cssText = "position:absolute;right:24px;bottom:24px;min-width:150px;padding:12px 16px;border-radius:12px;background:rgba(0,0,0,.52);text-align:right;font-variant-numeric:tabular-nums";
ammoHud.innerHTML = `<div id="weaponState" style="font-size:11px;font-weight:800;letter-spacing:.14em;opacity:.75">REVOLVER</div><div><span id="ammoCurrent" style="font-size:42px;font-weight:900">6</span><span style="margin:0 6px;font-size:21px;opacity:.45">/</span><span id="ammoMax" style="font-size:21px;font-weight:700;opacity:.65">6</span></div>`;
document.getElementById("hud").appendChild(ammoHud);

const hitFeedback = document.createElement("div");
hitFeedback.style.cssText = "position:absolute;left:50%;top:calc(50% + 30px);transform:translate(-50%,-50%);font-size:13px;font-weight:900;letter-spacing:.12em;opacity:0";
hitFeedback.textContent = "HIT";
document.getElementById("hud").appendChild(hitFeedback);

const ammoCurrentElement = document.getElementById("ammoCurrent");
const ammoMaxElement = document.getElementById("ammoMax");
const weaponStateElement = document.getElementById("weaponState");
const fpsElement = document.getElementById("fps");
const stateElement = document.getElementById("state");

// ---------- 조명 ----------
scene.add(new THREE.HemisphereLight(0xdcecff, 0x48515d, 1.35));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(10, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);

// ---------- 월드 ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x66727f, roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const colliders = [];
const raycastWorld = [];

function addBox({ x, y, z, w, h, d, color = 0x39434d }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
  );
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  colliders.push({ minX: x-w/2, maxX: x+w/2, minY: y, maxY: y+h, minZ: z-d/2, maxZ: z+d/2 });
  raycastWorld.push(mesh);
  return mesh;
}

addBox({ x: 0, y: 0, z: -12, w: 24, h: 3.5, d: 0.8 });
addBox({ x: 0, y: 0, z: 12, w: 24, h: 3.5, d: 0.8 });
addBox({ x: -12, y: 0, z: 0, w: 0.8, h: 3.5, d: 24 });
addBox({ x: 12, y: 0, z: 0, w: 0.8, h: 3.5, d: 24 });
addBox({ x: -4.5, y: 0, z: -3.5, w: 3.4, h: 2.2, d: 3.4, color: 0x7b5d45 });
addBox({ x: 4.5, y: 0, z: 2.5, w: 4.2, h: 1.7, d: 2.4, color: 0x526f52 });
addBox({ x: 1.5, y: 0, z: -6.5, w: 2, h: 2.8, d: 2, color: 0x6c5d76 });

const grid = new THREE.GridHelper(24, 24, 0xffffff, 0xffffff);
grid.position.y = 0.005;
grid.material.opacity = 0.12;
grid.material.transparent = true;
scene.add(grid);

function addTarget(x, z) {
  const target = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.6, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xb94444, roughness: 0.65, emissive: 0x000000 })
  );
  target.position.set(x, 0.8, z);
  target.castShadow = true;
  target.userData.isTarget = true;
  scene.add(target);
  raycastWorld.push(target);
}
addTarget(-3, -9.5);
addTarget(0, -10);
addTarget(3.2, -9.2);

// ---------- 플레이어 ----------
const player = {
  position: new THREE.Vector3(0, 0, 6), velocityY: 0,
  radius: 0.36, height: 1.8, eyeHeight: 1.62,
  moveSpeed: 6.4, jumpSpeed: 8.2, gravity: -23, grounded: true,
};
let yaw = Math.PI;
let pitch = 0;
const sensitivity = 0.0021;

function syncCamera() {
  camera.position.set(player.position.x, player.position.y + player.eyeHeight, player.position.z);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}
syncCamera();

// ---------- 리볼버 모델 ----------
const weaponRoot = new THREE.Group();
weaponRoot.position.set(0.42, -0.34, -0.68);
camera.add(weaponRoot);
const metal = new THREE.MeshStandardMaterial({ color: 0x2c3035, metalness: 0.85, roughness: 0.25 });
const dark = new THREE.MeshStandardMaterial({ color: 0x16191c, metalness: 0.65, roughness: 0.4 });
const grip = new THREE.MeshStandardMaterial({ color: 0x5c3524, roughness: 0.85 });
function gunPart(geometry, material, p, r=[0,0,0]) {
  const m = new THREE.Mesh(geometry, material); m.position.set(...p); m.rotation.set(...r); weaponRoot.add(m); return m;
}
gunPart(new THREE.BoxGeometry(0.16,0.12,0.72), metal, [0,0.02,-0.18]);
gunPart(new THREE.CylinderGeometry(0.14,0.14,0.24,12), dark, [0,-0.01,0.10], [Math.PI/2,0,0]);
gunPart(new THREE.BoxGeometry(0.18,0.38,0.16), grip, [0,-0.22,0.19], [-0.22,0,0]);
gunPart(new THREE.BoxGeometry(0.09,0.05,0.18), dark, [0,-0.12,0.07], [0.18,0,0]);

// ---------- 무기 ----------
const weapon = { maxAmmo: 6, ammo: 6, fireInterval: 270, reloadDuration: 1150, lastShotAt: -Infinity, reloading: false, reloadEndsAt: 0 };
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0,0);

function updateAmmoHUD() {
  ammoCurrentElement.textContent = weapon.ammo;
  ammoMaxElement.textContent = weapon.maxAmmo;
  weaponStateElement.textContent = weapon.reloading ? "RELOADING" : (weapon.ammo === 0 ? "EMPTY · R" : "REVOLVER");
}

function showHit() {
  hitFeedback.style.opacity = "1";
  hitFeedback.style.transform = "translate(-50%,-50%) scale(1.2)";
  setTimeout(() => { hitFeedback.style.opacity = "0"; hitFeedback.style.transform = "translate(-50%,-50%) scale(1)"; }, 90);
}

function startReload() {
  if (weapon.reloading || weapon.ammo === weapon.maxAmmo) return;
  weapon.reloading = true;
  weapon.reloadEndsAt = performance.now() + weapon.reloadDuration;
  updateAmmoHUD();
}

function shoot() {
  if (document.pointerLockElement !== renderer.domElement || weapon.reloading) return;
  const now = performance.now();
  if (now - weapon.lastShotAt < weapon.fireInterval) return;
  if (weapon.ammo <= 0) { startReload(); return; }
  weapon.lastShotAt = now;
  weapon.ammo--;
  updateAmmoHUD();

  raycaster.setFromCamera(screenCenter, camera);
  const hits = raycaster.intersectObjects(raycastWorld, false);
  if (hits.length && hits[0].object.userData.isTarget) {
    const t = hits[0].object;
    t.material.emissive.setHex(0xffffff);
    showHit();
    setTimeout(() => t.material.emissive.setHex(0x000000), 90);
  }
}
updateAmmoHUD();

// ---------- 입력 ----------
const keys = new Set();
window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "Space" && player.grounded && document.pointerLockElement === renderer.domElement) {
    player.velocityY = player.jumpSpeed;
    player.grounded = false;
  }
  if (e.code === "KeyR") startReload();
});
window.addEventListener("keyup", e => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
window.addEventListener("mousedown", e => { if (e.button === 0) shoot(); });

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
startButton.addEventListener("click", () => renderer.domElement.requestPointerLock());
renderer.domElement.addEventListener("click", () => {
  if (document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock();
});
document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === renderer.domElement;
  startScreen.classList.toggle("hidden", locked);
  if (!locked) keys.clear();
});
document.addEventListener("mousemove", e => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * sensitivity;
  pitch -= e.movementY * sensitivity;
  pitch = THREE.MathUtils.clamp(pitch, -Math.PI/2 + 0.01, Math.PI/2 - 0.01);
});

// ---------- 충돌 / 이동 ----------
function verticalOverlap(b) {
  return player.position.y + player.height > b.minY && player.position.y < b.maxY;
}
function collidesAt(x,z) {
  const r = player.radius;
  for (const b of colliders) {
    if (!verticalOverlap(b)) continue;
    if (x+r > b.minX && x-r < b.maxX && z+r > b.minZ && z-r < b.maxZ) return true;
  }
  return false;
}
function moveHorizontally(dx,dz) {
  const nx = player.position.x + dx;
  if (!collidesAt(nx, player.position.z)) player.position.x = nx;
  const nz = player.position.z + dz;
  if (!collidesAt(player.position.x, nz)) player.position.z = nz;
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const wish = new THREE.Vector3();
function updateMovement(delta) {
  let x=0, z=0;
  if (keys.has("KeyW")) z++;
  if (keys.has("KeyS")) z--;
  if (keys.has("KeyD")) x++;
  if (keys.has("KeyA")) x--;
  forward.set(-Math.sin(yaw),0,-Math.cos(yaw));
  right.set(Math.cos(yaw),0,-Math.sin(yaw));
  wish.set(0,0,0).addScaledVector(forward,z).addScaledVector(right,x);
  if (wish.lengthSq() > 0) {
    wish.normalize();
    // 핵심 수정: 공중/지상 구분 없이 수평 이동속도를 똑같이 사용.
    const distance = player.moveSpeed * delta;
    moveHorizontally(wish.x * distance, wish.z * distance);
  }
  player.velocityY += player.gravity * delta;
  player.position.y += player.velocityY * delta;
  if (player.position.y <= 0) {
    player.position.y = 0;
    player.velocityY = 0;
    player.grounded = true;
  } else player.grounded = false;
}

// ---------- 게임 루프 ----------
let fpsTimer = 0, fpsFrames = 0;
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (document.pointerLockElement === renderer.domElement) updateMovement(delta);
  if (weapon.reloading && performance.now() >= weapon.reloadEndsAt) {
    weapon.reloading = false;
    weapon.ammo = weapon.maxAmmo;
    updateAmmoHUD();
  }
  syncCamera();
  fpsTimer += delta; fpsFrames++;
  if (fpsTimer >= 0.5) {
    fpsElement.textContent = `FPS: ${Math.round(fpsFrames/fpsTimer)}`;
    fpsTimer = 0; fpsFrames = 0;
  }
  stateElement.textContent = player.grounded ? "GROUND" : "AIR";
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
