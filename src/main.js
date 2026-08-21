import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const GAME_VERSION = "STAGE 5 · v5.0.0";
const SENSITIVITY_BASE = 0.0021;
const SENSITIVITY_KEY = "revolverFpsSensitivity";

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

// ---------- UI ----------
const info = document.getElementById("info");
info.innerHTML = `<strong>${GAME_VERSION}</strong><br>1 AR-01 · 2 REVOLVER · 좌클릭 발사 · R 재장전 · P 감도 설정 · T 적 리셋`;

document.querySelector(".panel h1").textContent = "HTML FPS — Stage 5";
document.querySelector(".panel p").textContent = "헤드샷 피드백 / 킬 피드 / 감도 설정 테스트";
document.querySelector(".controls").innerHTML = `
  <span>WASD — 이동</span><span>Mouse — 시점</span>
  <span>Space — 점프</span><span>좌클릭 — 발사</span>
  <span>1 — AR-01</span><span>2 — REVOLVER</span>
  <span>R — 재장전</span><span>P — 감도 설정</span>
  <span>T — 적 리셋</span><span>ESC — 마우스 해제</span>`;

const runtimeStyle = document.createElement("style");
runtimeStyle.textContent = `
  #weaponHud { position:absolute; right:24px; bottom:24px; width:235px; padding:14px 16px; border-radius:14px; background:rgba(0,0,0,.56); backdrop-filter:blur(5px); font-variant-numeric:tabular-nums; }
  #weaponSlots { display:grid; gap:5px; margin-bottom:10px; }
  .weapon-slot { display:flex; align-items:center; justify-content:space-between; padding:5px 8px; border-radius:7px; font-size:11px; letter-spacing:.08em; opacity:.48; transition:.12s ease; }
  .weapon-slot.active { opacity:1; background:rgba(255,255,255,.12); transform:translateX(-3px); }
  .weapon-slot .slot-key { min-width:20px; font-weight:900; opacity:.72; }
  .weapon-slot .slot-ammo { font-weight:800; opacity:.72; }
  #weaponState { font-size:11px; font-weight:900; letter-spacing:.15em; opacity:.76; text-align:right; }
  #ammoLine { text-align:right; line-height:1; margin-top:3px; }
  #ammoCurrent { font-size:43px; font-weight:950; }
  #ammoMax { font-size:21px; font-weight:800; opacity:.58; }
  #switchToast { position:absolute; left:50%; bottom:72px; transform:translateX(-50%) translateY(8px); padding:7px 13px; border-radius:8px; background:rgba(0,0,0,.46); font-size:12px; font-weight:900; letter-spacing:.14em; opacity:0; transition:opacity .12s, transform .12s; }
  #switchToast.show { opacity:1; transform:translateX(-50%) translateY(0); }
  #hitFeedback { position:absolute; left:50%; top:calc(50% + 36px); transform:translate(-50%,-50%) scale(.8); font-size:13px; font-weight:950; letter-spacing:.12em; opacity:0; transition:opacity .07s, transform .07s; text-shadow:0 2px 7px rgba(0,0,0,.65); }
  #hitMarker { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(.65); font-size:30px; line-height:1; font-weight:300; opacity:0; text-shadow:0 2px 8px rgba(0,0,0,.8); transition:opacity .05s, transform .07s; }
  #enemyHud { position:absolute; left:18px; top:82px; padding:9px 12px; border-radius:9px; background:rgba(0,0,0,.45); font-size:12px; font-weight:850; letter-spacing:.08em; font-variant-numeric:tabular-nums; line-height:1.55; }
  #clearNotice { position:absolute; left:50%; top:27%; transform:translate(-50%,-50%) scale(.96); padding:12px 18px; border-radius:11px; background:rgba(0,0,0,.58); font-size:18px; font-weight:950; letter-spacing:.12em; opacity:0; transition:.18s ease; }
  #clearNotice.show { opacity:1; transform:translate(-50%,-50%) scale(1); }
  #killBanner { position:absolute; left:50%; top:37%; transform:translate(-50%,-50%) scale(.82); font-size:24px; font-weight:950; letter-spacing:.16em; opacity:0; text-shadow:0 3px 12px rgba(0,0,0,.8); transition:opacity .08s, transform .12s; }
  #killBanner.show { opacity:1; transform:translate(-50%,-50%) scale(1); }
  #killFeed { position:absolute; right:18px; top:82px; display:grid; gap:6px; justify-items:end; }
  .kill-feed-item { padding:6px 9px; border-radius:7px; background:rgba(0,0,0,.42); font-size:11px; font-weight:850; letter-spacing:.07em; animation:feedIn .18s ease-out; }
  .damage-number { position:absolute; transform:translate(-50%,-50%); font-size:19px; font-weight:950; pointer-events:none; text-shadow:0 2px 7px rgba(0,0,0,.8); animation:damageFloat .62s ease-out forwards; }
  .damage-number.head { font-size:22px; }
  #headshotPulse { position:absolute; inset:0; pointer-events:none; opacity:0; background:radial-gradient(circle at center, transparent 0 7%, rgba(255,200,90,.16) 16%, transparent 44%); transition:opacity .11s; }
  #settingsPanel { position:fixed; inset:0; z-index:30; display:none; place-items:center; background:rgba(5,7,11,.78); backdrop-filter:blur(8px); color:#fff; }
  #settingsPanel.show { display:grid; }
  #settingsCard { width:min(430px,calc(100vw - 36px)); padding:26px; border-radius:18px; background:rgba(18,22,29,.97); border:1px solid rgba(255,255,255,.14); box-shadow:0 24px 70px rgba(0,0,0,.5); }
  #settingsCard h2 { margin:0 0 6px; font-size:25px; }
  #settingsCard p { margin:0 0 22px; opacity:.62; font-size:13px; line-height:1.5; }
  .setting-row { display:grid; grid-template-columns:1fr auto; gap:12px; align-items:center; margin:14px 0 8px; }
  #sensitivitySlider { width:100%; accent-color:white; }
  #sensitivityValue { min-width:62px; text-align:right; font-weight:900; font-variant-numeric:tabular-nums; }
  .settings-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:22px; }
  .settings-actions button, #settingsButton { padding:11px 14px; border:0; border-radius:9px; cursor:pointer; font-weight:850; }
  #settingsButton { width:100%; margin-top:10px; background:rgba(255,255,255,.12); color:#fff; border:1px solid rgba(255,255,255,.14); }
  @keyframes damageFloat { 0% { opacity:0; transform:translate(-50%,-30%) scale(.7); } 18% { opacity:1; transform:translate(-50%,-55%) scale(1.15); } 100% { opacity:0; transform:translate(-50%,-120%) scale(.92); } }
  @keyframes feedIn { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }
`;
document.head.appendChild(runtimeStyle);

const hud = document.getElementById("hud");
const weaponHud = document.createElement("div");
weaponHud.id = "weaponHud";
weaponHud.innerHTML = `
  <div id="weaponSlots">
    <div class="weapon-slot active" data-slot="1"><span><span class="slot-key">[1]</span> AR-01</span><span class="slot-ammo" id="slotAmmo1">30 / 30</span></div>
    <div class="weapon-slot" data-slot="2"><span><span class="slot-key">[2]</span> REVOLVER</span><span class="slot-ammo" id="slotAmmo2">6 / 6</span></div>
  </div>
  <div id="weaponState">AR-01</div>
  <div id="ammoLine"><span id="ammoCurrent">30</span><span style="margin:0 6px;font-size:21px;opacity:.42">/</span><span id="ammoMax">30</span></div>`;
hud.appendChild(weaponHud);

const switchToast = document.createElement("div");
switchToast.id = "switchToast";
hud.appendChild(switchToast);

const hitFeedback = document.createElement("div");
hitFeedback.id = "hitFeedback";
hitFeedback.textContent = "HIT";
hud.appendChild(hitFeedback);

const hitMarker = document.createElement("div");
hitMarker.id = "hitMarker";
hitMarker.textContent = "×";
hud.appendChild(hitMarker);

const enemyHud = document.createElement("div");
enemyHud.id = "enemyHud";
hud.appendChild(enemyHud);

const clearNotice = document.createElement("div");
clearNotice.id = "clearNotice";
clearNotice.textContent = "ALL TARGETS DOWN · T TO RESET";
hud.appendChild(clearNotice);

const killBanner = document.createElement("div");
killBanner.id = "killBanner";
hud.appendChild(killBanner);

const killFeed = document.createElement("div");
killFeed.id = "killFeed";
hud.appendChild(killFeed);

const headshotPulse = document.createElement("div");
headshotPulse.id = "headshotPulse";
hud.appendChild(headshotPulse);

const shotFlash = document.createElement("div");
shotFlash.style.cssText = "position:absolute;inset:0;background:radial-gradient(circle at center,rgba(255,235,185,.08),rgba(255,180,80,.02) 35%,transparent 70%);opacity:0;transition:opacity .045s";
hud.appendChild(shotFlash);

const ammoCurrentElement = document.getElementById("ammoCurrent");
const ammoMaxElement = document.getElementById("ammoMax");
const weaponStateElement = document.getElementById("weaponState");
const slotAmmo1 = document.getElementById("slotAmmo1");
const slotAmmo2 = document.getElementById("slotAmmo2");
const fpsElement = document.getElementById("fps");
const stateElement = document.getElementById("state");
const crosshair = document.getElementById("crosshair");

// ---------- 감도 설정 ----------
let sensitivityMultiplier = Number(localStorage.getItem(SENSITIVITY_KEY));
if (!Number.isFinite(sensitivityMultiplier)) sensitivityMultiplier = 1;
sensitivityMultiplier = THREE.MathUtils.clamp(sensitivityMultiplier, 0.2, 3);

const settingsPanel = document.createElement("div");
settingsPanel.id = "settingsPanel";
settingsPanel.innerHTML = `
  <div id="settingsCard">
    <h2>마우스 감도</h2>
    <p>게임 중 P를 누르거나 시작 화면의 설정 버튼에서 언제든 바꿀 수 있어. 값은 브라우저에 자동 저장됨.</p>
    <div class="setting-row"><strong>SENSITIVITY</strong><span id="sensitivityValue">1.00×</span></div>
    <input id="sensitivitySlider" type="range" min="0.2" max="3" step="0.05" value="${sensitivityMultiplier}" />
    <div class="settings-actions"><button id="resetSensitivity">기본값</button><button id="closeSettings">완료</button></div>
  </div>`;
document.body.appendChild(settingsPanel);

const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");
const startPanel = document.querySelector("#startScreen .panel");
const settingsButton = document.createElement("button");
settingsButton.id = "settingsButton";
settingsButton.textContent = "감도 설정";
startPanel.insertBefore(settingsButton, startPanel.querySelector(".controls"));

function updateSensitivityUI(){ sensitivityValue.textContent = `${sensitivityMultiplier.toFixed(2)}×`; sensitivitySlider.value = String(sensitivityMultiplier); }
function setSensitivity(value){ sensitivityMultiplier = THREE.MathUtils.clamp(Number(value) || 1, 0.2, 3); localStorage.setItem(SENSITIVITY_KEY, String(sensitivityMultiplier)); updateSensitivityUI(); }
function openSettings(){ mouseHeld=false; settingsPanel.classList.add("show"); updateSensitivityUI(); }
function closeSettings(){ settingsPanel.classList.remove("show"); }
sensitivitySlider.addEventListener("input", e => setSensitivity(e.target.value));
document.getElementById("resetSensitivity").addEventListener("click", () => setSensitivity(1));
document.getElementById("closeSettings").addEventListener("click", closeSettings);
settingsButton.addEventListener("click", openSettings);
updateSensitivityUI();

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
const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0x66727f, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const colliders = [];
const raycastWorld = [];
function addBox({ x, y, z, w, h, d, color = 0x39434d }) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  colliders.push({ minX:x-w/2, maxX:x+w/2, minY:y, maxY:y+h, minZ:z-d/2, maxZ:z+d/2 });
  raycastWorld.push(mesh);
  return mesh;
}
addBox({ x:0, y:0, z:-12, w:24, h:3.5, d:0.8 });
addBox({ x:0, y:0, z:12, w:24, h:3.5, d:0.8 });
addBox({ x:-12, y:0, z:0, w:0.8, h:3.5, d:24 });
addBox({ x:12, y:0, z:0, w:0.8, h:3.5, d:24 });
addBox({ x:-4.5, y:0, z:-3.5, w:3.4, h:2.2, d:3.4, color:0x7b5d45 });
addBox({ x:4.5, y:0, z:2.5, w:4.2, h:1.7, d:2.4, color:0x526f52 });
addBox({ x:1.5, y:0, z:-6.5, w:2, h:2.8, d:2, color:0x6c5d76 });
const grid = new THREE.GridHelper(24, 24, 0xffffff, 0xffffff);
grid.position.y = 0.005;
grid.material.opacity = 0.12;
grid.material.transparent = true;
scene.add(grid);

// ---------- 플레이어 ----------
const player = { position:new THREE.Vector3(0,0,6), velocityY:0, radius:0.36, height:1.8, eyeHeight:1.62, moveSpeed:6.4, jumpSpeed:8.2, gravity:-23, grounded:true };
let yaw = Math.PI;
let pitch = 0;
let recoilPitch = 0, recoilYaw = 0, shakePitch = 0, shakeYaw = 0, shakePower = 0;
function syncCamera(){
  camera.position.set(player.position.x, player.position.y + player.eyeHeight, player.position.z);
  camera.rotation.y = yaw + recoilYaw + shakeYaw;
  camera.rotation.x = pitch + recoilPitch + shakePitch;
}
syncCamera();

// ---------- 적 시스템 ----------
const enemies = [];
let enemySerial = 0;
let totalKills = 0;
let headshotKills = 0;
const enemySpawnPoints = [
  { x:0, z:9, rotationY:Math.PI }, { x:-6.8, z:5.5, rotationY:Math.PI*0.7 }, { x:7.4, z:7.5, rotationY:-Math.PI*0.75 },
  { x:-7, z:-7.8, rotationY:Math.PI*0.2 }, { x:6.8, z:-8.2, rotationY:-Math.PI*0.2 }, { x:0, z:-9.3, rotationY:0 },
];

function makeEnemyMaterial(color){ return new THREE.MeshStandardMaterial({color,roughness:0.62,metalness:0.08,emissive:0x000000}); }
function createHealthBar(){
  const group=new THREE.Group(); group.position.set(0,2.25,0);
  const bg=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.09),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:0.75,depthTest:false})); bg.renderOrder=20; group.add(bg);
  const fill=new THREE.Mesh(new THREE.PlaneGeometry(0.91,0.055),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:false})); fill.position.z=0.002; fill.renderOrder=21; group.add(fill);
  return {group,fill};
}
function tagEnemyHitbox(mesh,enemy,zone){ mesh.userData.enemy=enemy; mesh.userData.hitZone=zone; raycastWorld.push(mesh); enemy.hitboxes.push(mesh); }
function createEnemy(x,z,rotationY=0){
  const enemy={id:++enemySerial,maxHp:100,hp:100,alive:true,dying:false,deathStartedAt:0,hitKick:0,hitDirection:new THREE.Vector3(),hitboxes:[],materials:[],root:new THREE.Group(),basePosition:new THREE.Vector3(x,0,z),baseRotationY:rotationY};
  enemy.root.position.copy(enemy.basePosition); enemy.root.rotation.y=rotationY; scene.add(enemy.root);
  const bodyMaterial=makeEnemyMaterial(0x455b73), headMaterial=makeEnemyMaterial(0xc1a07a), limbMaterial=makeEnemyMaterial(0x344454), accentMaterial=makeEnemyMaterial(0x9c3f3f);
  enemy.materials.push(bodyMaterial,headMaterial,limbMaterial,accentMaterial);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.92,0.42),bodyMaterial); torso.position.set(0,1.14,0); torso.castShadow=true; enemy.root.add(torso); tagEnemyHitbox(torso,enemy,"body");
  const head=new THREE.Mesh(new THREE.BoxGeometry(0.46,0.46,0.42),headMaterial); head.position.set(0,1.86,0); head.castShadow=true; enemy.root.add(head); tagEnemyHitbox(head,enemy,"head");
  const leftLeg=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.72,0.28),limbMaterial); leftLeg.position.set(-0.2,0.36,0); leftLeg.castShadow=true; enemy.root.add(leftLeg); tagEnemyHitbox(leftLeg,enemy,"body");
  const rightLeg=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.72,0.28),limbMaterial); rightLeg.position.set(0.2,0.36,0); rightLeg.castShadow=true; enemy.root.add(rightLeg); tagEnemyHitbox(rightLeg,enemy,"body");
  const leftArm=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.78,0.24),limbMaterial); leftArm.position.set(-0.48,1.12,0); leftArm.rotation.z=0.08; leftArm.castShadow=true; enemy.root.add(leftArm); tagEnemyHitbox(leftArm,enemy,"body");
  const rightArm=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.78,0.24),limbMaterial); rightArm.position.set(0.48,1.12,0); rightArm.rotation.z=-0.08; rightArm.castShadow=true; enemy.root.add(rightArm); tagEnemyHitbox(rightArm,enemy,"body");
  const headMark=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.08,0.025),accentMaterial); headMark.position.set(0,1.87,-0.225); enemy.root.add(headMark); tagEnemyHitbox(headMark,enemy,"head");
  const health=createHealthBar(); enemy.healthBar=health; enemy.root.add(health.group); enemies.push(enemy); return enemy;
}
function removeFromRaycast(mesh){ const i=raycastWorld.indexOf(mesh); if(i!==-1)raycastWorld.splice(i,1); }
function updateEnemyHealthBar(enemy){ const ratio=THREE.MathUtils.clamp(enemy.hp/enemy.maxHp,0,1); enemy.healthBar.fill.scale.x=Math.max(0.001,ratio); enemy.healthBar.fill.position.x=-0.455*(1-ratio); }
function flashEnemy(enemy,isHeadshot){ const color=isHeadshot?0xffaa55:0xffffff; enemy.materials.forEach(m=>m.emissive.setHex(color)); setTimeout(()=>{if(!enemy.alive)return;enemy.materials.forEach(m=>m.emissive.setHex(0x000000));},70); }
function spawnDamageNumber(position,damage,isHeadshot){
  const projected=position.clone().project(camera); if(projected.z<-1||projected.z>1)return;
  const element=document.createElement("div"); element.className=`damage-number${isHeadshot?" head":""}`; element.textContent=isHeadshot?`${damage} HEAD`:`${damage}`;
  element.style.left=`${(projected.x*0.5+0.5)*window.innerWidth}px`; element.style.top=`${(-projected.y*0.5+0.5)*window.innerHeight}px`; element.style.color=isHeadshot?"#ffd27a":"#ffffff"; hud.appendChild(element); setTimeout(()=>element.remove(),650);
}
let hitTimer=null, markerTimer=null, killBannerTimer=null;
function showHit(isHeadshot,isKill){
  hitFeedback.textContent=isKill?(isHeadshot?"HEADSHOT KILL":"KILL"):(isHeadshot?"HEADSHOT":"HIT");
  hitFeedback.style.color=isHeadshot?"#ffd27a":"#ffffff"; hitFeedback.style.opacity="1"; hitFeedback.style.transform="translate(-50%,-50%) scale(1.3)";
  hitMarker.style.color=isHeadshot?"#ffd27a":"#ffffff"; hitMarker.style.opacity="1"; hitMarker.style.transform=`translate(-50%,-50%) scale(${isHeadshot?1.25:1}) rotate(${isHeadshot?45:0}deg)`;
  clearTimeout(hitTimer); clearTimeout(markerTimer);
  hitTimer=setTimeout(()=>{hitFeedback.style.opacity="0";hitFeedback.style.transform="translate(-50%,-50%) scale(.8)";},isHeadshot?155:92);
  markerTimer=setTimeout(()=>{hitMarker.style.opacity="0";hitMarker.style.transform="translate(-50%,-50%) scale(.65)";},isHeadshot?150:85);
  if(isHeadshot){ headshotPulse.style.opacity=isKill?"1":".72"; setTimeout(()=>headshotPulse.style.opacity="0",120); }
}
function showKillBanner(isHeadshot){
  killBanner.textContent=isHeadshot?"HEADSHOT KILL":"TARGET DOWN"; killBanner.style.color=isHeadshot?"#ffd27a":"#ffffff"; killBanner.classList.add("show");
  clearTimeout(killBannerTimer); killBannerTimer=setTimeout(()=>killBanner.classList.remove("show"),520);
}
function addKillFeed(weaponName,isHeadshot){
  const item=document.createElement("div"); item.className="kill-feed-item"; item.style.color=isHeadshot?"#ffd27a":"#ffffff"; item.textContent=`${weaponName} · ${isHeadshot?"HEADSHOT":"KILL"}`; killFeed.prepend(item);
  while(killFeed.children.length>4) killFeed.lastElementChild.remove(); setTimeout(()=>item.remove(),2600);
}
function killEnemy(enemy,isHeadshot,weaponName){
  if(!enemy.alive)return; enemy.alive=false; enemy.dying=true; enemy.deathStartedAt=performance.now(); enemy.hp=0; totalKills++; if(isHeadshot)headshotKills++;
  updateEnemyHealthBar(enemy); enemy.healthBar.group.visible=false; enemy.hitboxes.forEach(removeFromRaycast); showKillBanner(isHeadshot); addKillFeed(weaponName,isHeadshot); updateEnemyHUD();
}
function damageEnemy(enemy,zone,weapon,hitPoint){
  if(!enemy||!enemy.alive)return; const isHeadshot=zone==="head"; const damage=isHeadshot?weapon.headDamage:weapon.damage; const willKill=enemy.hp-damage<=0;
  enemy.hp=Math.max(0,enemy.hp-damage); enemy.hitKick=1; const shotDirection=new THREE.Vector3(); camera.getWorldDirection(shotDirection); enemy.hitDirection.copy(shotDirection).multiplyScalar(0.08);
  flashEnemy(enemy,isHeadshot); showHit(isHeadshot,willKill); spawnDamageNumber(hitPoint,damage,isHeadshot); updateEnemyHealthBar(enemy);
  if(isHeadshot){ shakePower=Math.min(1,shakePower+(willKill?0.42:0.26)); playHeadshotSound(willKill); }
  if(willKill) killEnemy(enemy,isHeadshot,weapon.name);
}
function clearEnemies(){
  for(const enemy of enemies){ enemy.hitboxes.forEach(removeFromRaycast); scene.remove(enemy.root); enemy.root.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose();}); enemy.materials.forEach(m=>m.dispose()); }
  enemies.length=0;
}
function spawnTestEnemies(){ clearEnemies(); enemySerial=0; enemySpawnPoints.forEach(p=>createEnemy(p.x,p.z,p.rotationY)); clearNotice.classList.remove("show"); updateEnemyHUD(); }
function updateEnemyHUD(){ const alive=enemies.filter(e=>e.alive).length; enemyHud.innerHTML=`ENEMIES ${alive} / ${enemies.length}<br>KILLS ${totalKills} · HS ${headshotKills}`; clearNotice.classList.toggle("show",enemies.length>0&&alive===0); }
function updateEnemies(delta,now){
  for(const enemy of enemies){
    if(enemy.alive){ enemy.healthBar.group.quaternion.copy(camera.quaternion); const hitDecay=1-Math.exp(-18*delta); enemy.hitKick=THREE.MathUtils.lerp(enemy.hitKick,0,hitDecay); const kick=enemy.hitKick; enemy.root.position.copy(enemy.basePosition).addScaledVector(enemy.hitDirection,kick); enemy.root.rotation.y=enemy.baseRotationY; enemy.root.rotation.z=Math.sin(now*0.035+enemy.id)*0.012*kick; continue; }
    if(enemy.dying){ const t=THREE.MathUtils.clamp((now-enemy.deathStartedAt)/520,0,1), eased=1-Math.pow(1-t,3); enemy.root.rotation.z=-eased*1.35; enemy.root.position.y=-eased*0.2; enemy.root.scale.setScalar(1-eased*0.08); enemy.materials.forEach(m=>m.emissive.setHex(0x000000)); if(t>=1)enemy.dying=false; }
  }
}

// ---------- 무기 모델 ----------
const weaponRig = new THREE.Group();
const weaponBasePosition = new THREE.Vector3(0.42,-0.34,-0.68);
weaponRig.position.copy(weaponBasePosition);
camera.add(weaponRig);
const matMetal = new THREE.MeshStandardMaterial({color:0x32373d,metalness:0.9,roughness:0.22});
const matDark = new THREE.MeshStandardMaterial({color:0x15181c,metalness:0.72,roughness:0.35});
const matGrip = new THREE.MeshStandardMaterial({color:0x5c3524,roughness:0.85});
const matBrass = new THREE.MeshStandardMaterial({color:0x9b7335,metalness:0.75,roughness:0.28});
const matPolymer = new THREE.MeshStandardMaterial({color:0x252b30,roughness:0.55,metalness:0.25});
function addPart(parent,geometry,material,position,rotation=[0,0,0]){const m=new THREE.Mesh(geometry,material);m.position.set(...position);m.rotation.set(...rotation);parent.add(m);return m;}
function createMuzzleFlash(){
  const group=new THREE.Group(); group.visible=false;
  const cone=new THREE.Mesh(new THREE.ConeGeometry(0.11,0.32,8),new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0.95,depthWrite:false})); cone.rotation.x=-Math.PI/2; cone.position.z=-0.15; group.add(cone);
  const core=new THREE.Mesh(new THREE.SphereGeometry(0.07,8,8),new THREE.MeshBasicMaterial({color:0xfff0b0,transparent:true,opacity:0.95,depthWrite:false})); group.add(core);
  const light=new THREE.PointLight(0xffb54f,0,3); group.add(light); return {group,cone,core,light};
}
function buildRevolver(){
  const group=new THREE.Group(); weaponRig.add(group); addPart(group,new THREE.BoxGeometry(0.17,0.13,0.76),matMetal,[0,0.02,-0.18]);
  const cylinder=addPart(group,new THREE.CylinderGeometry(0.145,0.145,0.25,12),matDark,[0,-0.01,0.11],[Math.PI/2,0,0]);
  addPart(group,new THREE.BoxGeometry(0.18,0.4,0.17),matGrip,[0,-0.23,0.2],[-0.22,0,0]); addPart(group,new THREE.BoxGeometry(0.09,0.05,0.19),matDark,[0,-0.12,0.08],[0.18,0,0]); addPart(group,new THREE.CylinderGeometry(0.055,0.055,0.36,12),matDark,[0,0.02,-0.58],[Math.PI/2,0,0]); addPart(group,new THREE.BoxGeometry(0.05,0.035,0.09),matBrass,[0,0.105,-0.43]);
  const muzzle=new THREE.Object3D(); muzzle.position.set(0,0.02,-0.79); group.add(muzzle); const flash=createMuzzleFlash(); flash.group.position.copy(muzzle.position); group.add(flash.group); return {group,muzzle,flash,cylinder};
}
function buildAssaultRifle(){
  const group=new THREE.Group(); group.position.set(-0.02,-0.01,0.02); weaponRig.add(group); addPart(group,new THREE.BoxGeometry(0.21,0.18,0.72),matMetal,[0,0.01,-0.12]); addPart(group,new THREE.BoxGeometry(0.17,0.12,0.42),matDark,[0,0.06,-0.58]); addPart(group,new THREE.CylinderGeometry(0.035,0.035,0.58,10),matDark,[0,0.04,-0.96],[Math.PI/2,0,0]); addPart(group,new THREE.BoxGeometry(0.25,0.07,0.18),matDark,[0,0.14,-0.21]); addPart(group,new THREE.BoxGeometry(0.08,0.19,0.12),matGrip,[0,-0.13,0.02],[-0.2,0,0]); addPart(group,new THREE.BoxGeometry(0.18,0.12,0.38),matPolymer,[0,0.02,0.42]);
  const magazine=addPart(group,new THREE.BoxGeometry(0.15,0.32,0.19),matPolymer,[0,-0.22,-0.15],[-0.12,0,0]); addPart(group,new THREE.BoxGeometry(0.12,0.06,0.1),matBrass,[0,0.16,-0.48]);
  const muzzle=new THREE.Object3D(); muzzle.position.set(0,0.04,-1.27); group.add(muzzle); const flash=createMuzzleFlash(); flash.group.position.copy(muzzle.position); flash.group.scale.setScalar(0.72); group.add(flash.group); return {group,muzzle,flash,magazine,magazineBaseY:magazine.position.y};
}
const models={assaultRifle:buildAssaultRifle(),revolver:buildRevolver()}; models.revolver.group.visible=false;

// ---------- 무기 데이터 ----------
const weapons={
  assaultRifle:{id:"assaultRifle",slot:1,name:"AR-01",automatic:true,ammo:30,maxAmmo:30,damage:20,headDamage:40,fireInterval:60000/700,reloadDuration:1500,lastShotAt:-Infinity,reloading:false,reloadStartedAt:0,reloadEndsAt:0,baseSpread:0.0018,currentSpread:0.0018,maxSpread:0.016,spreadPerShot:0.00155,spreadRecovery:0.022,recoilPitch:0.0062,recoilYaw:0.0045,cameraShake:0.22,recoilKick:0,muzzleFlashUntil:0,crosshairBaseScale:1.16},
  revolver:{id:"revolver",slot:2,name:"REVOLVER",automatic:false,ammo:6,maxAmmo:6,damage:55,headDamage:120,fireInterval:285,reloadDuration:1250,lastShotAt:-Infinity,reloading:false,reloadStartedAt:0,reloadEndsAt:0,baseSpread:0.00025,currentSpread:0.00025,maxSpread:0.003,spreadPerShot:0.00035,spreadRecovery:0.02,recoilPitch:0.028,recoilYaw:0.009,cameraShake:0.72,recoilKick:0,muzzleFlashUntil:0,crosshairBaseScale:0.96}
};
let currentWeaponId="assaultRifle", mouseHeld=false;
const switching={active:false,targetId:null,startedAt:0,duration:360,swapped:false};
const currentWeapon=()=>weapons[currentWeaponId], currentModel=()=>models[currentWeaponId];

// ---------- 사운드 ----------
let audioContext=null;
function ensureAudio(){ if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)(); if(audioContext.state==="suspended")audioContext.resume(); }
function makeNoiseBurst(duration,volume,bandFrequency){
  const now=audioContext.currentTime, buffer=audioContext.createBuffer(1,Math.floor(audioContext.sampleRate*duration),audioContext.sampleRate), data=buffer.getChannelData(0); for(let i=0;i<data.length;i++){const t=i/data.length;data[i]=(Math.random()*2-1)*Math.pow(1-t,2.8);}
  const source=audioContext.createBufferSource(); source.buffer=buffer; const filter=audioContext.createBiquadFilter(); filter.type="bandpass"; filter.frequency.setValueAtTime(bandFrequency,now); filter.Q.setValueAtTime(0.8,now); const gain=audioContext.createGain(); gain.gain.setValueAtTime(volume,now); gain.gain.exponentialRampToValueAtTime(0.001,now+duration); source.connect(filter).connect(gain).connect(audioContext.destination); source.start(now);
}
function playGunshotSound(id){
  ensureAudio(); const now=audioContext.currentTime;
  if(id==="revolver"){makeNoiseBurst(0.16,0.62,900);const o=audioContext.createOscillator();o.type="sine";o.frequency.setValueAtTime(95,now);o.frequency.exponentialRampToValueAtTime(48,now+0.11);const g=audioContext.createGain();g.gain.setValueAtTime(0.5,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.12);o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+0.13);}else{makeNoiseBurst(0.075,0.32,1450);const o=audioContext.createOscillator();o.type="square";o.frequency.setValueAtTime(280,now);o.frequency.exponentialRampToValueAtTime(150,now+0.045);const g=audioContext.createGain();g.gain.setValueAtTime(0.12,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.05);o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+0.055);}
}
function playHeadshotSound(kill){
  ensureAudio(); const now=audioContext.currentTime;
  const ping=audioContext.createOscillator(); ping.type="sine"; ping.frequency.setValueAtTime(kill?1900:1650,now); ping.frequency.exponentialRampToValueAtTime(kill?1150:1050,now+0.11);
  const gain=audioContext.createGain(); gain.gain.setValueAtTime(kill?0.13:0.09,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.13); ping.connect(gain).connect(audioContext.destination); ping.start(now); ping.stop(now+0.14);
  if(kill){ const low=audioContext.createOscillator(); low.type="triangle"; low.frequency.setValueAtTime(230,now); low.frequency.exponentialRampToValueAtTime(120,now+0.12); const lg=audioContext.createGain(); lg.gain.setValueAtTime(0.08,now); lg.gain.exponentialRampToValueAtTime(0.001,now+0.13); low.connect(lg).connect(audioContext.destination); low.start(now); low.stop(now+0.14); }
}
function playEmptyClick(){ensureAudio();const now=audioContext.currentTime,o=audioContext.createOscillator();o.type="square";o.frequency.setValueAtTime(1500,now);const g=audioContext.createGain();g.gain.setValueAtTime(0.06,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.035);o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+0.04);}
function playReloadSound(id){ensureAudio();const now=audioContext.currentTime,seq=id==="assaultRifle"?[[0,720],[0.48,460],[1.02,920]]:[[0,1050],[0.38,650],[0.86,1050]];seq.forEach(([off,f],i)=>{const o=audioContext.createOscillator();o.type=i===1?"triangle":"square";o.frequency.setValueAtTime(f,now+off);const g=audioContext.createGain();g.gain.setValueAtTime(0.04,now+off);g.gain.exponentialRampToValueAtTime(0.001,now+off+0.055);o.connect(g).connect(audioContext.destination);o.start(now+off);o.stop(now+off+0.06);});}
function playSwitchSound(){ensureAudio();const now=audioContext.currentTime,o=audioContext.createOscillator();o.type="triangle";o.frequency.setValueAtTime(260,now);o.frequency.exponentialRampToValueAtTime(120,now+0.09);const g=audioContext.createGain();g.gain.setValueAtTime(0.035,now);g.gain.exponentialRampToValueAtTime(0.001,now+0.1);o.connect(g).connect(audioContext.destination);o.start(now);o.stop(now+0.11);}

// ---------- 무기 UI / 전환 ----------
let toastTimer=null;
function showWeaponToast(text){switchToast.textContent=text;switchToast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>switchToast.classList.remove("show"),700);}
function updateWeaponHUD(){const w=currentWeapon();ammoCurrentElement.textContent=w.ammo;ammoMaxElement.textContent=w.maxAmmo;weaponStateElement.textContent=w.reloading?"RELOADING":w.ammo===0?`${w.name} · EMPTY`:w.name;slotAmmo1.textContent=`${weapons.assaultRifle.ammo} / ${weapons.assaultRifle.maxAmmo}`;slotAmmo2.textContent=`${weapons.revolver.ammo} / ${weapons.revolver.maxAmmo}`;document.querySelectorAll(".weapon-slot").forEach(e=>e.classList.toggle("active",Number(e.dataset.slot)===w.slot));}
function cancelReload(w){if(!w.reloading)return;w.reloading=false;w.reloadStartedAt=0;w.reloadEndsAt=0;}
function beginWeaponSwitch(targetId){if(switching.active||targetId===currentWeaponId||!weapons[targetId])return;cancelReload(currentWeapon());mouseHeld=false;switching.active=true;switching.targetId=targetId;switching.startedAt=performance.now();switching.swapped=false;playSwitchSound();}
function finishModelSwap(){models[currentWeaponId].group.visible=false;currentWeaponId=switching.targetId;models[currentWeaponId].group.visible=true;switching.swapped=true;showWeaponToast(currentWeapon().name);updateWeaponHUD();}

// ---------- 사격 ----------
const raycaster=new THREE.Raycaster(), smokeParticles=[];
function flashScreen(id){shotFlash.style.opacity=id==="revolver"?"1":".45";setTimeout(()=>shotFlash.style.opacity="0",id==="revolver"?38:24);}
function spawnSmoke(id){const model=currentModel(),position=new THREE.Vector3(),direction=new THREE.Vector3();model.muzzle.getWorldPosition(position);camera.getWorldDirection(direction);const count=id==="revolver"?3:1;for(let i=0;i<count;i++){const material=new THREE.MeshBasicMaterial({color:0xbfc2c5,transparent:true,opacity:id==="revolver"?0.22:0.12,depthWrite:false});const puff=new THREE.Mesh(new THREE.SphereGeometry(0.022+Math.random()*0.016,6,6),material);puff.position.copy(position);scene.add(puff);smokeParticles.push({mesh:puff,velocity:direction.clone().multiplyScalar(0.25+Math.random()*0.22).add(new THREE.Vector3((Math.random()-0.5)*0.13,0.06+Math.random()*0.1,(Math.random()-0.5)*0.13)),life:0.28+Math.random()*0.16,maxLife:0.44});}}
function triggerShotFeedback(w){const model=currentModel();w.recoilKick=1;recoilPitch+=w.recoilPitch;recoilYaw+=(Math.random()-0.5)*w.recoilYaw;shakePower=Math.min(1,shakePower+w.cameraShake);w.muzzleFlashUntil=performance.now()+(w.id==="revolver"?42:28);model.flash.group.visible=true;model.flash.light.intensity=w.id==="revolver"?2.5:1.45;model.flash.cone.rotation.z=Math.random()*Math.PI;model.flash.cone.scale.setScalar(0.8+Math.random()*0.3);model.flash.core.scale.setScalar(0.78+Math.random()*0.25);if(w.id==="revolver")model.cylinder.rotation.z+=Math.PI/3;flashScreen(w.id);spawnSmoke(w.id);playGunshotSound(w.id);}
function startReload(){if(switching.active)return;const w=currentWeapon();if(w.reloading||w.ammo===w.maxAmmo)return;const now=performance.now();w.reloading=true;w.reloadStartedAt=now;w.reloadEndsAt=now+w.reloadDuration;mouseHeld=false;updateWeaponHUD();playReloadSound(w.id);}
function getShotNdc(w){const air=w.id==="assaultRifle"&&!player.grounded?1.15:1, spread=w.currentSpread*air;return new THREE.Vector2((Math.random()-0.5)*spread*2,(Math.random()-0.5)*spread*2);}
function fireCurrentWeapon(){
  if(document.pointerLockElement!==renderer.domElement||switching.active)return; const w=currentWeapon(); if(w.reloading)return; const now=performance.now(); if(now-w.lastShotAt<w.fireInterval)return; w.lastShotAt=now;
  if(w.ammo<=0){playEmptyClick();w.recoilKick=Math.max(w.recoilKick,0.12);return;}
  w.ammo--; w.currentSpread=Math.min(w.maxSpread,w.currentSpread+w.spreadPerShot); updateWeaponHUD(); raycaster.setFromCamera(getShotNdc(w),camera); const hits=raycaster.intersectObjects(raycastWorld,false);
  if(hits.length>0){const hit=hits[0], enemy=hit.object.userData.enemy, zone=hit.object.userData.hitZone; if(enemy&&zone)damageEnemy(enemy,zone,w,hit.point);}
  triggerShotFeedback(w);
}

// ---------- 입력 ----------
const keys=new Set();
window.addEventListener("keydown",e=>{
  if(settingsPanel.classList.contains("show")){ if(e.code==="Escape"||e.code==="KeyP") closeSettings(); return; }
  keys.add(e.code);
  if(e.code==="Space"&&player.grounded&&document.pointerLockElement===renderer.domElement){player.velocityY=player.jumpSpeed;player.grounded=false;}
  if(e.code==="KeyR")startReload();
  if(e.code==="Digit1")beginWeaponSwitch("assaultRifle");
  if(e.code==="Digit2")beginWeaponSwitch("revolver");
  if(e.code==="KeyT")spawnTestEnemies();
  if(e.code==="KeyP"){ if(document.pointerLockElement===renderer.domElement)document.exitPointerLock(); openSettings(); }
});
window.addEventListener("keyup",e=>keys.delete(e.code));
window.addEventListener("blur",()=>{keys.clear();mouseHeld=false;});
window.addEventListener("mousedown",e=>{if(e.button!==0||settingsPanel.classList.contains("show"))return;mouseHeld=true;if(!currentWeapon().automatic)fireCurrentWeapon();});
window.addEventListener("mouseup",e=>{if(e.button===0)mouseHeld=false;});
const startScreen=document.getElementById("startScreen"), startButton=document.getElementById("startButton");
startButton.addEventListener("click",()=>{ensureAudio();closeSettings();renderer.domElement.requestPointerLock();});
renderer.domElement.addEventListener("click",()=>{ensureAudio();if(document.pointerLockElement!==renderer.domElement&&!settingsPanel.classList.contains("show"))renderer.domElement.requestPointerLock();});
document.addEventListener("pointerlockchange",()=>{const locked=document.pointerLockElement===renderer.domElement;startScreen.classList.toggle("hidden",locked);if(locked)closeSettings();else{keys.clear();mouseHeld=false;}});
document.addEventListener("mousemove",e=>{if(document.pointerLockElement!==renderer.domElement)return;const sensitivity=SENSITIVITY_BASE*sensitivityMultiplier;yaw-=e.movementX*sensitivity;pitch-=e.movementY*sensitivity;pitch=THREE.MathUtils.clamp(pitch,-Math.PI/2+0.01,Math.PI/2-0.01);});

// ---------- 이동 / 충돌 ----------
function verticalOverlap(b){return player.position.y+player.height>b.minY&&player.position.y<b.maxY;}
function collidesAt(x,z){const r=player.radius;for(const b of colliders){if(!verticalOverlap(b))continue;if(x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ)return true;}return false;}
function moveHorizontally(dx,dz){const nx=player.position.x+dx;if(!collidesAt(nx,player.position.z))player.position.x=nx;const nz=player.position.z+dz;if(!collidesAt(player.position.x,nz))player.position.z=nz;}
const forward=new THREE.Vector3(), right=new THREE.Vector3(), wishDirection=new THREE.Vector3();
function updateMovement(delta){let x=0,z=0;if(keys.has("KeyW"))z++;if(keys.has("KeyS"))z--;if(keys.has("KeyD"))x++;if(keys.has("KeyA"))x--;forward.set(-Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));wishDirection.set(0,0,0).addScaledVector(forward,z).addScaledVector(right,x);if(wishDirection.lengthSq()>0){wishDirection.normalize();const distance=player.moveSpeed*delta;moveHorizontally(wishDirection.x*distance,wishDirection.z*distance);}player.velocityY+=player.gravity*delta;player.position.y+=player.velocityY*delta;if(player.position.y<=0){player.position.y=0;player.velocityY=0;player.grounded=true;}else player.grounded=false;}

// ---------- 프레임 업데이트 ----------
function updateWeaponSwitch(now){if(!switching.active)return 0;const t=THREE.MathUtils.clamp((now-switching.startedAt)/switching.duration,0,1);if(t>=0.5&&!switching.swapped)finishModelSwap();const half=t<0.5?t*2:(1-t)*2,eased=1-Math.pow(1-half,3),drop=eased*0.42;if(t>=1){switching.active=false;switching.targetId=null;switching.swapped=false;return 0;}return drop;}
function updateReloadState(now){Object.values(weapons).forEach(w=>{if(w.reloading&&now>=w.reloadEndsAt){w.reloading=false;w.ammo=w.maxAmmo;w.reloadStartedAt=0;w.reloadEndsAt=0;updateWeaponHUD();}});}
function updateWeaponAnimation(delta,now,switchDrop){
  const w=currentWeapon(),model=currentModel(); Object.entries(weapons).forEach(([id,data])=>{const m=models[id];if(data.muzzleFlashUntil<=now){m.flash.group.visible=false;m.flash.light.intensity=0;}data.recoilKick=THREE.MathUtils.lerp(data.recoilKick,0,1-Math.exp(-18*delta));});
  let reloadDrop=0,reloadTilt=0;if(w.reloading){const t=THREE.MathUtils.clamp((now-w.reloadStartedAt)/w.reloadDuration,0,1),curve=Math.sin(Math.PI*t);reloadDrop=curve*(w.id==="assaultRifle"?0.19:0.16);reloadTilt=curve*(w.id==="assaultRifle"?0.34:0.5);if(w.id==="revolver")model.cylinder.rotation.z+=delta*9;else{const magCurve=t<0.5?Math.sin(Math.PI*(t/0.5))*0.17:Math.sin(Math.PI*((1-t)/0.5))*0.11;model.magazine.position.y=model.magazineBaseY-Math.max(0,magCurve);}}else if(w.id==="assaultRifle")model.magazine.position.y=THREE.MathUtils.lerp(model.magazine.position.y,model.magazineBaseY,1-Math.exp(-22*delta));
  const recoil=w.recoilKick;weaponRig.position.set(weaponBasePosition.x,weaponBasePosition.y-switchDrop-reloadDrop-recoil*0.03,weaponBasePosition.z+recoil*(w.id==="revolver"?0.115:0.065));weaponRig.rotation.x=reloadTilt+recoil*(w.id==="revolver"?0.16:0.07);weaponRig.rotation.z=reloadTilt*-0.24+recoil*(w.id==="revolver"?0.025:0.012);
}
function updateCameraFeedback(delta){const decay=1-Math.exp(-13*delta);recoilPitch=THREE.MathUtils.lerp(recoilPitch,0,decay);recoilYaw=THREE.MathUtils.lerp(recoilYaw,0,decay);shakePower=Math.max(0,shakePower-delta*7.5);if(shakePower>0){shakePitch=(Math.random()-0.5)*0.006*shakePower;shakeYaw=(Math.random()-0.5)*0.006*shakePower;}else{shakePitch=0;shakeYaw=0;}}
function updateSmoke(delta){for(let i=smokeParticles.length-1;i>=0;i--){const p=smokeParticles[i];p.life-=delta;if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();smokeParticles.splice(i,1);continue;}p.mesh.position.addScaledVector(p.velocity,delta);p.velocity.multiplyScalar(Math.pow(0.93,delta*60));const ratio=p.life/p.maxLife;p.mesh.material.opacity=Math.max(0,ratio*0.2);p.mesh.scale.setScalar(1+(1-ratio)*2);}}
function updateSpread(delta){Object.values(weapons).forEach(w=>w.currentSpread=Math.max(w.baseSpread,w.currentSpread-w.spreadRecovery*delta));const w=currentWeapon(),ratio=w.maxSpread>w.baseSpread?(w.currentSpread-w.baseSpread)/(w.maxSpread-w.baseSpread):0,scale=w.crosshairBaseScale+ratio*(w.id==="assaultRifle"?1.35:0.3);crosshair.style.transition="transform .04s linear";crosshair.style.transform=`translate(-50%, -50%) scale(${scale})`;}

// ---------- 게임 루프 ----------
spawnTestEnemies();
updateWeaponHUD();
let fpsTimer=0,fpsFrames=0;const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);const delta=Math.min(clock.getDelta(),0.05),now=performance.now();
  if(document.pointerLockElement===renderer.domElement){updateMovement(delta);if(mouseHeld&&!switching.active&&currentWeapon().automatic)fireCurrentWeapon();}
  updateReloadState(now);const switchDrop=updateWeaponSwitch(now);updateWeaponAnimation(delta,now,switchDrop);updateCameraFeedback(delta);updateSmoke(delta);updateSpread(delta);updateEnemies(delta,now);syncCamera();
  fpsTimer+=delta;fpsFrames++;if(fpsTimer>=0.5){fpsElement.textContent=`FPS: ${Math.round(fpsFrames/fpsTimer)}`;fpsTimer=0;fpsFrames=0;}stateElement.textContent=player.grounded?"GROUND":"AIR";renderer.render(scene,camera);
}
animate();
window.addEventListener("resize",()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));});
