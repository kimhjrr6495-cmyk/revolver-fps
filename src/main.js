import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const GAME_VERSION = "STAGE 3 · v3.0.0";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a7c4);
scene.fog = new THREE.Fog(0x87a7c4, 25, 70);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.05,
  120
);
camera.rotation.order = "YXZ";
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- HUD ----------
const info = document.getElementById("info");
info.innerHTML = `<strong>${GAME_VERSION}</strong><br>WASD 이동 · Space 점프 · 좌클릭 발사 · R 재장전 · ESC 마우스 해제`;

document.querySelector(".panel h1").textContent = "HTML FPS — Stage 3";
document.querySelector(".panel p").textContent = "리볼버 손맛 / 반동 / 사운드 테스트";
document.querySelector(".controls").innerHTML = `
  <span>WASD — 이동</span><span>Mouse — 시점</span>
  <span>Space — 점프</span><span>좌클릭 — 발사</span>
  <span>R — 재장전</span><span>ESC — 마우스 해제</span>`;

const ammoHud = document.createElement("div");
ammoHud.id = "ammoHud";
ammoHud.style.cssText =
  "position:absolute;right:24px;bottom:24px;min-width:160px;padding:12px 16px;border-radius:12px;background:rgba(0,0,0,.52);text-align:right;font-variant-numeric:tabular-nums;backdrop-filter:blur(4px)";
ammoHud.innerHTML = `
  <div id="weaponState" style="font-size:11px;font-weight:800;letter-spacing:.14em;opacity:.75">REVOLVER</div>
  <div>
    <span id="ammoCurrent" style="font-size:42px;font-weight:900">6</span>
    <span style="margin:0 6px;font-size:21px;opacity:.45">/</span>
    <span id="ammoMax" style="font-size:21px;font-weight:700;opacity:.65">6</span>
  </div>`;
document.getElementById("hud").appendChild(ammoHud);

const hitFeedback = document.createElement("div");
hitFeedback.id = "hitFeedback";
hitFeedback.style.cssText =
  "position:absolute;left:50%;top:calc(50% + 34px);transform:translate(-50%,-50%) scale(.8);font-size:13px;font-weight:900;letter-spacing:.12em;opacity:0;transition:opacity .07s,transform .07s";
hitFeedback.textContent = "HIT";
document.getElementById("hud").appendChild(hitFeedback);

const shotFlash = document.createElement("div");
shotFlash.style.cssText =
  "position:absolute;inset:0;background:radial-gradient(circle at center,rgba(255,235,185,.08),rgba(255,180,80,.02) 35%,transparent 70%);opacity:0;transition:opacity .06s";
document.getElementById("hud").appendChild(shotFlash);

const ammoCurrentElement = document.getElementById("ammoCurrent");
const ammoMaxElement = document.getElementById("ammoMax");
const weaponStateElement = document.getElementById("weaponState");
const fpsElement = document.getElementById("fps");
const stateElement = document.getElementById("state");
const crosshair = document.getElementById("crosshair");

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

  colliders.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minY: y,
    maxY: y + h,
    minZ: z - d / 2,
    maxZ: z + d / 2,
  });

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
    new THREE.MeshStandardMaterial({
      color: 0xb94444,
      roughness: 0.65,
      emissive: 0x000000,
    })
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
  position: new THREE.Vector3(0, 0, 6),
  velocityY: 0,
  radius: 0.36,
  height: 1.8,
  eyeHeight: 1.62,
  moveSpeed: 6.4,
  jumpSpeed: 8.2,
  gravity: -23,
  grounded: true,
};

let yaw = Math.PI;
let pitch = 0;
const sensitivity = 0.0021;

let recoilPitch = 0;
let recoilYaw = 0;
let shakePitch = 0;
let shakeYaw = 0;
let shakePower = 0;

function syncCamera() {
  camera.position.set(
    player.position.x,
    player.position.y + player.eyeHeight,
    player.position.z
  );

  camera.rotation.y = yaw + recoilYaw + shakeYaw;
  camera.rotation.x = pitch + recoilPitch + shakePitch;
}

syncCamera();

// ---------- 리볼버 모델 ----------
const weaponRoot = new THREE.Group();
const weaponBasePosition = new THREE.Vector3(0.42, -0.34, -0.68);
weaponRoot.position.copy(weaponBasePosition);
camera.add(weaponRoot);

const metal = new THREE.MeshStandardMaterial({
  color: 0x32373d,
  metalness: 0.9,
  roughness: 0.22,
});
const dark = new THREE.MeshStandardMaterial({
  color: 0x15181c,
  metalness: 0.7,
  roughness: 0.35,
});
const grip = new THREE.MeshStandardMaterial({
  color: 0x5c3524,
  roughness: 0.85,
});
const brass = new THREE.MeshStandardMaterial({
  color: 0x9b7335,
  metalness: 0.75,
  roughness: 0.28,
});

function gunPart(geometry, material, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  weaponRoot.add(mesh);
  return mesh;
}

gunPart(new THREE.BoxGeometry(0.17, 0.13, 0.76), metal, [0, 0.02, -0.18]);
const cylinder = gunPart(
  new THREE.CylinderGeometry(0.145, 0.145, 0.25, 12),
  dark,
  [0, -0.01, 0.11],
  [Math.PI / 2, 0, 0]
);
gunPart(new THREE.BoxGeometry(0.18, 0.4, 0.17), grip, [0, -0.23, 0.2], [-0.22, 0, 0]);
gunPart(new THREE.BoxGeometry(0.09, 0.05, 0.19), dark, [0, -0.12, 0.08], [0.18, 0, 0]);
gunPart(new THREE.CylinderGeometry(0.055, 0.055, 0.36, 12), dark, [0, 0.02, -0.58], [Math.PI / 2, 0, 0]);
gunPart(new THREE.BoxGeometry(0.05, 0.035, 0.09), brass, [0, 0.105, -0.43]);

const muzzle = new THREE.Object3D();
muzzle.position.set(0, 0.02, -0.79);
weaponRoot.add(muzzle);

const muzzleFlash = new THREE.Group();
muzzleFlash.position.copy(muzzle.position);
muzzleFlash.visible = false;
weaponRoot.add(muzzleFlash);

const flashCone = new THREE.Mesh(
  new THREE.ConeGeometry(0.12, 0.34, 8),
  new THREE.MeshBasicMaterial({
    color: 0xffd27a,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  })
);
flashCone.rotation.x = -Math.PI / 2;
flashCone.position.z = -0.16;
muzzleFlash.add(flashCone);

const flashCore = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 8, 8),
  new THREE.MeshBasicMaterial({
    color: 0xfff0b0,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  })
);
muzzleFlash.add(flashCore);

const muzzleLight = new THREE.PointLight(0xffb54f, 0, 3);
muzzleFlash.add(muzzleLight);

// ---------- 사운드 ----------
let audioContext = null;

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playGunshotSound() {
  ensureAudio();

  const now = audioContext.currentTime;

  const buffer = audioContext.createBuffer(
    1,
    Math.floor(audioContext.sampleRate * 0.16),
    audioContext.sampleRate
  );

  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] =
      (Math.random() * 2 - 1) *
      Math.pow(1 - t, 3.2) *
      (0.75 + Math.random() * 0.25);
  }

  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;

  const noiseFilter = audioContext.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(900, now);
  noiseFilter.Q.setValueAtTime(0.7, now);

  const noiseGain = audioContext.createGain();
  noiseGain.gain.setValueAtTime(0.62, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

  noise.connect(noiseFilter).connect(noiseGain).connect(audioContext.destination);
  noise.start(now);

  const thump = audioContext.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(95, now);
  thump.frequency.exponentialRampToValueAtTime(48, now + 0.11);

  const thumpGain = audioContext.createGain();
  thumpGain.gain.setValueAtTime(0.5, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  thump.connect(thumpGain).connect(audioContext.destination);
  thump.start(now);
  thump.stop(now + 0.13);

  const crack = audioContext.createOscillator();
  crack.type = "square";
  crack.frequency.setValueAtTime(520, now);

  const crackGain = audioContext.createGain();
  crackGain.gain.setValueAtTime(0.1, now);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  crack.connect(crackGain).connect(audioContext.destination);
  crack.start(now);
  crack.stop(now + 0.04);
}

function playEmptyClick() {
  ensureAudio();
  const now = audioContext.currentTime;

  const osc = audioContext.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(1500, now);

  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(0.065, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  osc.connect(gain).connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function playReloadSound() {
  ensureAudio();
  const now = audioContext.currentTime;

  [0, 0.38, 0.86].forEach((offset, i) => {
    const osc = audioContext.createOscillator();
    osc.type = i === 1 ? "triangle" : "square";
    osc.frequency.setValueAtTime(i === 1 ? 650 : 1050, now + offset);

    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.045, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.055);

    osc.connect(gain).connect(audioContext.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.06);
  });
}

// ---------- 무기 상태 / 이펙트 ----------
const weapon = {
  maxAmmo: 6,
  ammo: 6,
  fireInterval: 285,
  reloadDuration: 1250,
  lastShotAt: -Infinity,
  reloading: false,
  reloadStartedAt: 0,
  reloadEndsAt: 0,
  recoilKick: 0,
  muzzleFlashUntil: 0,
};

const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
const smokeParticles = [];

function updateAmmoHUD() {
  ammoCurrentElement.textContent = weapon.ammo;
  ammoMaxElement.textContent = weapon.maxAmmo;

  if (weapon.reloading) {
    weaponStateElement.textContent = "RELOADING";
  } else if (weapon.ammo === 0) {
    weaponStateElement.textContent = "EMPTY · R";
  } else {
    weaponStateElement.textContent = "REVOLVER";
  }
}

function showHit() {
  hitFeedback.style.opacity = "1";
  hitFeedback.style.transform = "translate(-50%,-50%) scale(1.25)";

  setTimeout(() => {
    hitFeedback.style.opacity = "0";
    hitFeedback.style.transform = "translate(-50%,-50%) scale(.8)";
  }, 85);
}

function pulseCrosshair() {
  crosshair.style.transition = "transform .055s ease-out";
  crosshair.style.transform = "translate(-50%, -50%) scale(1.45)";

  setTimeout(() => {
    crosshair.style.transform = "translate(-50%, -50%) scale(1)";
  }, 60);
}

function flashScreen() {
  shotFlash.style.opacity = "1";
  setTimeout(() => {
    shotFlash.style.opacity = "0";
  }, 38);
}

function spawnSmoke() {
  const position = new THREE.Vector3();
  const direction = new THREE.Vector3();

  muzzle.getWorldPosition(position);
  camera.getWorldDirection(direction);

  for (let i = 0; i < 3; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xbfc2c5,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });

    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 + Math.random() * 0.018, 6, 6),
      material
    );

    puff.position.copy(position);
    scene.add(puff);

    smokeParticles.push({
      mesh: puff,
      velocity: direction
        .clone()
        .multiplyScalar(0.28 + Math.random() * 0.25)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.16,
            0.07 + Math.random() * 0.12,
            (Math.random() - 0.5) * 0.16
          )
        ),
      life: 0.32 + Math.random() * 0.18,
      maxLife: 0.5,
    });
  }
}

function triggerShotFeedback() {
  weapon.recoilKick = 1;

  recoilPitch += 0.028;
  recoilYaw += (Math.random() - 0.5) * 0.009;
  shakePower = Math.min(1, shakePower + 0.7);

  weapon.muzzleFlashUntil = performance.now() + 42;
  muzzleFlash.visible = true;
  muzzleLight.intensity = 2.5;

  flashCone.rotation.z = Math.random() * Math.PI;
  flashCone.scale.setScalar(0.85 + Math.random() * 0.35);
  flashCore.scale.setScalar(0.8 + Math.random() * 0.3);

  pulseCrosshair();
  flashScreen();
  spawnSmoke();
  playGunshotSound();
}

function startReload() {
  if (weapon.reloading || weapon.ammo === weapon.maxAmmo) {
    return;
  }

  const now = performance.now();
  weapon.reloading = true;
  weapon.reloadStartedAt = now;
  weapon.reloadEndsAt = now + weapon.reloadDuration;

  updateAmmoHUD();
  playReloadSound();
}

function shoot() {
  if (
    document.pointerLockElement !== renderer.domElement ||
    weapon.reloading
  ) {
    return;
  }

  const now = performance.now();

  if (now - weapon.lastShotAt < weapon.fireInterval) {
    return;
  }

  weapon.lastShotAt = now;

  if (weapon.ammo <= 0) {
    playEmptyClick();
    weapon.recoilKick = Math.max(weapon.recoilKick, 0.16);
    return;
  }

  weapon.ammo -= 1;
  updateAmmoHUD();

  raycaster.setFromCamera(screenCenter, camera);
  const hits = raycaster.intersectObjects(raycastWorld, false);

  if (hits.length && hits[0].object.userData.isTarget) {
    const target = hits[0].object;
    target.material.emissive.setHex(0xffffff);
    showHit();

    setTimeout(() => {
      target.material.emissive.setHex(0x000000);
    }, 85);
  }

  triggerShotFeedback();
}

updateAmmoHUD();

// ---------- 입력 ----------
const keys = new Set();

window.addEventListener("keydown", (event) => {
  keys.add(event.code);

  if (
    event.code === "Space" &&
    player.grounded &&
    document.pointerLockElement === renderer.domElement
  ) {
    player.velocityY = player.jumpSpeed;
    player.grounded = false;
  }

  if (event.code === "KeyR") {
    startReload();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("blur", () => {
  keys.clear();
});

window.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    shoot();
  }
});

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");

startButton.addEventListener("click", () => {
  ensureAudio();
  renderer.domElement.requestPointerLock();
});

renderer.domElement.addEventListener("click", () => {
  ensureAudio();

  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === renderer.domElement;
  startScreen.classList.toggle("hidden", locked);

  if (!locked) {
    keys.clear();
  }
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== renderer.domElement) {
    return;
  }

  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;
  pitch = THREE.MathUtils.clamp(
    pitch,
    -Math.PI / 2 + 0.01,
    Math.PI / 2 - 0.01
  );
});

// ---------- 충돌 / 이동 ----------
function verticalOverlap(box) {
  return (
    player.position.y + player.height > box.minY &&
    player.position.y < box.maxY
  );
}

function collidesAt(x, z) {
  const radius = player.radius;

  for (const box of colliders) {
    if (!verticalOverlap(box)) {
      continue;
    }

    if (
      x + radius > box.minX &&
      x - radius < box.maxX &&
      z + radius > box.minZ &&
      z - radius < box.maxZ
    ) {
      return true;
    }
  }

  return false;
}

function moveHorizontally(dx, dz) {
  const nextX = player.position.x + dx;
  if (!collidesAt(nextX, player.position.z)) {
    player.position.x = nextX;
  }

  const nextZ = player.position.z + dz;
  if (!collidesAt(player.position.x, nextZ)) {
    player.position.z = nextZ;
  }
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const wishDirection = new THREE.Vector3();

function updateMovement(delta) {
  let inputX = 0;
  let inputZ = 0;

  if (keys.has("KeyW")) inputZ += 1;
  if (keys.has("KeyS")) inputZ -= 1;
  if (keys.has("KeyD")) inputX += 1;
  if (keys.has("KeyA")) inputX -= 1;

  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(Math.cos(yaw), 0, -Math.sin(yaw));

  wishDirection
    .set(0, 0, 0)
    .addScaledVector(forward, inputZ)
    .addScaledVector(right, inputX);

  if (wishDirection.lengthSq() > 0) {
    wishDirection.normalize();

    // 점프 중에도 지상과 동일한 수평 속도 유지.
    const distance = player.moveSpeed * delta;

    moveHorizontally(
      wishDirection.x * distance,
      wishDirection.z * distance
    );
  }

  player.velocityY += player.gravity * delta;
  player.position.y += player.velocityY * delta;

  if (player.position.y <= 0) {
    player.position.y = 0;
    player.velocityY = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }
}

// ---------- 연출 업데이트 ----------
function updateWeaponAnimation(delta, now) {
  if (weapon.muzzleFlashUntil <= now) {
    muzzleFlash.visible = false;
    muzzleLight.intensity = 0;
  }

  weapon.recoilKick = THREE.MathUtils.lerp(
    weapon.recoilKick,
    0,
    1 - Math.exp(-18 * delta)
  );

  const recoil = weapon.recoilKick;

  let reloadDrop = 0;
  let reloadTilt = 0;

  if (weapon.reloading) {
    const t = THREE.MathUtils.clamp(
      (now - weapon.reloadStartedAt) / weapon.reloadDuration,
      0,
      1
    );

    const curve = Math.sin(Math.PI * t);
    reloadDrop = curve * 0.16;
    reloadTilt = curve * 0.5;
    cylinder.rotation.z += delta * 9;
  }

  weaponRoot.position.set(
    weaponBasePosition.x,
    weaponBasePosition.y - reloadDrop - recoil * 0.035,
    weaponBasePosition.z + recoil * 0.115
  );

  weaponRoot.rotation.x = reloadTilt + recoil * 0.16;
  weaponRoot.rotation.z = reloadTilt * -0.28 + recoil * 0.025;
}

function updateCameraFeedback(delta) {
  const recoilDecay = 1 - Math.exp(-13 * delta);
  recoilPitch = THREE.MathUtils.lerp(recoilPitch, 0, recoilDecay);
  recoilYaw = THREE.MathUtils.lerp(recoilYaw, 0, recoilDecay);

  shakePower = Math.max(0, shakePower - delta * 7.5);

  if (shakePower > 0) {
    shakePitch = (Math.random() - 0.5) * 0.006 * shakePower;
    shakeYaw = (Math.random() - 0.5) * 0.006 * shakePower;
  } else {
    shakePitch = 0;
    shakeYaw = 0;
  }
}

function updateSmoke(delta) {
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const particle = smokeParticles[i];

    particle.life -= delta;

    if (particle.life <= 0) {
      scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
      smokeParticles.splice(i, 1);
      continue;
    }

    particle.mesh.position.addScaledVector(particle.velocity, delta);
    particle.velocity.multiplyScalar(Math.pow(0.93, delta * 60));

    const lifeRatio = particle.life / particle.maxLife;
    particle.mesh.material.opacity = Math.max(0, lifeRatio * 0.2);

    const scale = 1 + (1 - lifeRatio) * 2;
    particle.mesh.scale.setScalar(scale);
  }
}

// ---------- 게임 루프 ----------
let fpsTimer = 0;
let fpsFrames = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();

  if (document.pointerLockElement === renderer.domElement) {
    updateMovement(delta);
  }

  if (weapon.reloading && now >= weapon.reloadEndsAt) {
    weapon.reloading = false;
    weapon.ammo = weapon.maxAmmo;
    updateAmmoHUD();
  }

  updateWeaponAnimation(delta, now);
  updateCameraFeedback(delta);
  updateSmoke(delta);
  syncCamera();

  fpsTimer += delta;
  fpsFrames += 1;

  if (fpsTimer >= 0.5) {
    fpsElement.textContent = `FPS: ${Math.round(fpsFrames / fpsTimer)}`;
    fpsTimer = 0;
    fpsFrames = 0;
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
