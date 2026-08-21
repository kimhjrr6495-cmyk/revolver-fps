import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a7c4);
scene.fog = new THREE.Fog(0x87a7c4, 25, 70);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.05,
  120
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

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

function addBox({
  x,
  y,
  z,
  w,
  h,
  d,
  color = 0x39434d,
}) {
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

  return mesh;
}

// 외곽 벽
addBox({ x: 0, y: 0, z: -12, w: 24, h: 3.5, d: 0.8 });
addBox({ x: 0, y: 0, z: 12, w: 24, h: 3.5, d: 0.8 });
addBox({ x: -12, y: 0, z: 0, w: 0.8, h: 3.5, d: 24 });
addBox({ x: 12, y: 0, z: 0, w: 0.8, h: 3.5, d: 24 });

// 충돌 테스트용 구조물
addBox({ x: -4.5, y: 0, z: -3.5, w: 3.4, h: 2.2, d: 3.4, color: 0x7b5d45 });
addBox({ x: 4.5, y: 0, z: 2.5, w: 4.2, h: 1.7, d: 2.4, color: 0x526f52 });
addBox({ x: 1.5, y: 0, z: -6.5, w: 2.0, h: 2.8, d: 2.0, color: 0x6c5d76 });

// 바닥 위치를 알기 쉽게 만드는 그리드
const grid = new THREE.GridHelper(24, 24, 0xffffff, 0xffffff);
grid.position.y = 0.005;
grid.material.opacity = 0.12;
grid.material.transparent = true;
scene.add(grid);

// ---------- 플레이어 ----------
const player = {
  position: new THREE.Vector3(0, 0, 6),
  velocityY: 0,
  radius: 0.36,
  height: 1.8,
  eyeHeight: 1.62,

  moveSpeed: 6.4,
  airControl: 0.42,
  jumpSpeed: 8.2,
  gravity: -23.0,

  grounded: true,
};

let yaw = Math.PI;
let pitch = 0;
const sensitivity = 0.0021;

camera.rotation.order = "YXZ";

function syncCamera() {
  camera.position.set(
    player.position.x,
    player.position.y + player.eyeHeight,
    player.position.z
  );

  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

syncCamera();

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
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("blur", () => {
  keys.clear();
});

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");

startButton.addEventListener("click", () => {
  renderer.domElement.requestPointerLock();
});

renderer.domElement.addEventListener("click", () => {
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
  if (document.pointerLockElement !== renderer.domElement) return;

  yaw -= event.movementX * sensitivity;
  pitch -= event.movementY * sensitivity;

  const pitchLimit = Math.PI / 2 - 0.01;
  pitch = THREE.MathUtils.clamp(pitch, -pitchLimit, pitchLimit);
});

// ---------- 충돌 ----------
function verticalOverlap(box) {
  const playerBottom = player.position.y;
  const playerTop = player.position.y + player.height;

  return playerTop > box.minY && playerBottom < box.maxY;
}

function collidesAt(x, z) {
  const r = player.radius;

  for (const box of colliders) {
    if (!verticalOverlap(box)) continue;

    const overlapsX = x + r > box.minX && x - r < box.maxX;
    const overlapsZ = z + r > box.minZ && z - r < box.maxZ;

    if (overlapsX && overlapsZ) {
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

// ---------- 이동 ----------
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

  wishDirection.set(0, 0, 0);
  wishDirection.addScaledVector(forward, inputZ);
  wishDirection.addScaledVector(right, inputX);

  if (wishDirection.lengthSq() > 0) {
    wishDirection.normalize();

    const control = player.grounded ? 1 : player.airControl;
    const distance = player.moveSpeed * control * delta;

    moveHorizontally(
      wishDirection.x * distance,
      wishDirection.z * distance
    );
  }

  // 중력
  player.velocityY += player.gravity * delta;
  player.position.y += player.velocityY * delta;

  // 이번 단계에서는 평평한 바닥만 수직 충돌 대상으로 사용.
  if (player.position.y <= 0) {
    player.position.y = 0;
    player.velocityY = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }
}

// ---------- FPS 표시 ----------
const fpsElement = document.getElementById("fps");
const stateElement = document.getElementById("state");

let fpsTimer = 0;
let fpsFrames = 0;

function updateDebug(delta) {
  fpsTimer += delta;
  fpsFrames += 1;

  if (fpsTimer >= 0.5) {
    fpsElement.textContent = `FPS: ${Math.round(fpsFrames / fpsTimer)}`;
    fpsTimer = 0;
    fpsFrames = 0;
  }

  stateElement.textContent = player.grounded ? "GROUND" : "AIR";
}

// ---------- 게임 루프 ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (document.pointerLockElement === renderer.domElement) {
    updateMovement(delta);
  }

  syncCamera();
  updateDebug(delta);
  renderer.render(scene, camera);
}

animate();

// ---------- 리사이즈 ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
