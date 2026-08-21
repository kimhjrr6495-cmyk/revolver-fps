import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const GAME_VERSION = "STAGE 7 · PLAYER COMBAT";
const SETTINGS_KEY = "revolverFpsPolishSettings";
const saved = (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; } })();
const settings = {
  sensitivity: Number.isFinite(saved.sensitivity) ? THREE.MathUtils.clamp(saved.sensitivity, 0.2, 3) : 1,
  damageNumbers: saved.damageNumbers ?? false,
  hitSound: saved.hitSound ?? true,
};
const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ca6bc);
scene.fog = new THREE.Fog(0x8ca6bc, 25, 70);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 120);
camera.rotation.order = "YXZ";
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x46515c, 1.3));
const sun = new THREE.DirectionalLight(0xffffff, 1.7);
sun.position.set(9, 17, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);

const hud = document.getElementById("hud");
const info = document.getElementById("info");
const fpsElement = document.getElementById("fps");
const stateElement = document.getElementById("state");
const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");
const panel = document.querySelector("#startScreen .panel");
const controls = document.querySelector(".controls");

document.querySelector(".panel h1").textContent = "HTML FPS — Stage 7";
document.querySelector(".panel p").textContent = "Player HP · Damage Direction · Death / Restart";
controls.innerHTML = `<span>WASD — 이동</span><span>Mouse — 시점</span><span>Space — 점프</span><span>좌클릭 — 발사</span><span>1 / 2 — 무기 전환</span><span>R — 재장전</span><span>P — 설정</span><span>T — 전투 리셋</span>`;
info.innerHTML = `<strong>${GAME_VERSION}</strong><br><span style="opacity:.66">HEAD = RED · BODY = ORANGE · P 설정 · T 리셋</span>`;

const style = document.createElement("style");
style.textContent = `
  :root{--hud-line:rgba(255,255,255,.12);--body:#ff9a3c;--head:#ff4655;--danger:#ff4b55}
  #info{padding:8px 10px!important;border-radius:8px!important;background:rgba(6,10,14,.38)!important;font-size:11px!important;line-height:1.45!important;letter-spacing:.04em!important;backdrop-filter:blur(5px)}
  #debug{opacity:.45!important;transform:scale(.88);transform-origin:top right}
  #crosshair{width:4px!important;height:4px!important;border-radius:50%;background:rgba(255,255,255,.96);box-shadow:0 0 0 1px rgba(0,0,0,.45),0 0 8px rgba(255,255,255,.15)}#crosshair::before,#crosshair::after{display:none!important}
  #reticle{position:absolute;left:50%;top:50%;width:58px;height:58px;transform:translate(-50%,-50%);pointer-events:none}.reticle-line{position:absolute;background:rgba(255,255,255,.9);border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.38)}.reticle-line.t,.reticle-line.b{width:2px;height:8px;left:28px}.reticle-line.t{top:15px}.reticle-line.b{bottom:15px}.reticle-line.l,.reticle-line.r{height:2px;width:8px;top:28px}.reticle-line.l{left:15px}.reticle-line.r{right:15px}
  #hitBracket{position:absolute;left:50%;top:50%;width:50px;height:50px;transform:translate(-50%,-50%) scale(.72);opacity:0;pointer-events:none;transition:opacity .04s,transform .065s}.hb{position:absolute;width:12px;height:12px;border-color:var(--body);border-style:solid;filter:drop-shadow(0 0 4px rgba(255,154,60,.46))}.hb.a{left:2px;top:2px;border-width:2px 0 0 2px}.hb.b{right:2px;top:2px;border-width:2px 2px 0 0}.hb.c{left:2px;bottom:2px;border-width:0 0 2px 2px}.hb.d{right:2px;bottom:2px;border-width:0 2px 2px 0}#hitBracket.head .hb{border-color:var(--head);filter:drop-shadow(0 0 6px rgba(255,70,85,.62))}#hitBracket.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
  #combatText{position:absolute;left:50%;top:calc(50% + 47px);transform:translate(-50%,-50%);font-size:10px;font-weight:900;letter-spacing:.19em;opacity:0;transition:opacity .055s,transform .075s;text-shadow:0 2px 8px rgba(0,0,0,.7)}#combatText.show{opacity:.94;transform:translate(-50%,-53%)}
  #killPulse{position:absolute;left:50%;top:50%;width:72px;height:72px;border:1px solid rgba(255,70,85,.76);border-radius:50%;transform:translate(-50%,-50%) scale(.55);opacity:0;pointer-events:none}#killPulse.show{animation:killPulse .22s ease-out}
  #weaponHud{position:absolute;right:22px;bottom:22px;width:190px;padding:12px 13px;border:1px solid var(--hud-line);border-radius:12px;background:linear-gradient(145deg,rgba(8,12,17,.66),rgba(8,12,17,.35));backdrop-filter:blur(8px);font-variant-numeric:tabular-nums}#weaponName{font-size:10px;font-weight:900;letter-spacing:.16em;opacity:.65;text-align:right}#ammoRow{display:flex;align-items:flex-end;justify-content:flex-end;gap:6px;margin-top:3px;line-height:1}#ammoCurrent{font-size:39px;font-weight:950}#ammoMax{font-size:15px;font-weight:850;opacity:.45;margin-bottom:4px}#slotRow{display:flex;gap:5px;justify-content:flex-end;margin-top:8px}.slot-chip{padding:4px 7px;border:1px solid rgba(255,255,255,.09);border-radius:7px;font-size:9px;font-weight:850;opacity:.38}.slot-chip.active{opacity:.92;background:rgba(255,255,255,.08)}
  #enemyHud{position:absolute;left:18px;top:78px;padding:7px 9px;border-left:2px solid rgba(255,255,255,.35);font-size:10px;font-weight:900;line-height:1.6;letter-spacing:.1em;background:linear-gradient(90deg,rgba(7,10,14,.34),transparent)}#killFeed{position:absolute;right:18px;top:78px;display:grid;gap:5px;justify-items:end}.feed{padding:5px 8px;border-radius:6px;background:rgba(7,10,14,.42);font-size:9px;font-weight:850;letter-spacing:.08em;animation:feed .15s ease-out}
  #playerHud{position:absolute;left:22px;bottom:22px;width:220px;padding:12px 13px;border:1px solid var(--hud-line);border-radius:12px;background:linear-gradient(145deg,rgba(8,12,17,.66),rgba(8,12,17,.35));backdrop-filter:blur(8px);font-variant-numeric:tabular-nums}#hpTop{display:flex;align-items:flex-end;justify-content:space-between}#hpLabel{font-size:9px;font-weight:900;letter-spacing:.16em;opacity:.5}#hpNumber{font-size:29px;font-weight:950;line-height:1}#hpTrack{height:5px;margin-top:8px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}#hpFill{height:100%;width:100%;background:#edf4f7;transform-origin:left center;transition:width .13s ease,background .13s ease}
  #damageVignette{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(circle at center,transparent 40%,rgba(255,42,52,.11) 67%,rgba(255,28,38,.52) 112%);transition:opacity .16s ease}#damageVignette.hit{transition:none}
  #damageIndicator{position:absolute;left:50%;top:50%;width:116px;height:116px;transform:translate(-50%,-50%);pointer-events:none;opacity:0}#damageIndicator::before{content:"";position:absolute;left:50%;top:2px;width:26px;height:5px;border-radius:99px;background:#ff4c57;box-shadow:0 0 10px rgba(255,58,70,.8);transform:translateX(-50%)}#damageIndicator.show{opacity:1}
  .damage-number{position:absolute;transform:translate(-50%,-50%);font-size:14px;font-weight:950;text-shadow:0 2px 5px #000;animation:damage .48s ease-out forwards;pointer-events:none}
  .pulse-shot{position:absolute;width:6px;height:6px;border-radius:50%;background:#ff695e;box-shadow:0 0 10px rgba(255,95,80,.82);pointer-events:none}
  #deathScreen{position:fixed;inset:0;z-index:50;display:none;place-items:center;background:rgba(5,7,10,.72);backdrop-filter:blur(5px);color:#fff}#deathScreen.show{display:grid}#deathCard{width:min(390px,calc(100vw - 36px));padding:28px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(13,17,23,.96);text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.5)}#deathCard h2{margin:0;font-size:32px;letter-spacing:.08em}#deathCard p{margin:8px 0 20px;opacity:.55;font-size:12px}#restartButton{width:100%;padding:12px;border:0;border-radius:9px;font-weight:900;cursor:pointer}
  #settingsPanel{position:fixed;inset:0;z-index:40;display:none;place-items:center;background:rgba(4,7,11,.76);backdrop-filter:blur(8px);color:#fff}#settingsPanel.show{display:grid}#settingsCard{width:min(430px,calc(100vw - 36px));padding:24px;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(14,18,24,.97)}#settingsCard h2{margin:0 0 4px;font-size:23px}#settingsCard p{margin:0 0 18px;font-size:12px;opacity:.58}.setting{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:11px 0;border-top:1px solid rgba(255,255,255,.08);font-size:12px;font-weight:800}.setting input[type=range]{grid-column:1/-1;width:100%;accent-color:#fff}.toggle{width:42px;height:23px;border:0;border-radius:99px;background:#3a4149;cursor:pointer;position:relative}.toggle::after{content:"";position:absolute;width:17px;height:17px;border-radius:50%;background:#fff;left:3px;top:3px;transition:.15s}.toggle.on{background:#5d7485}.toggle.on::after{left:22px}.settings-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:17px}.settings-actions button,#settingsButton{padding:10px 12px;border:0;border-radius:8px;font-weight:850;cursor:pointer}#settingsButton{width:100%;margin-top:9px;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.12)}
  @keyframes feed{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}@keyframes killPulse{0%{opacity:.85;transform:translate(-50%,-50%) scale(.55)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.16)}}@keyframes damage{0%{opacity:0;transform:translate(-50%,-20%) scale(.85)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-90%) scale(.95)}}
`;
document.head.appendChild(style);

const reticle=document.createElement("div");reticle.id="reticle";for(const c of ["t","r","b","l"]){const e=document.createElement("i");e.className=`reticle-line ${c}`;reticle.appendChild(e);}hud.appendChild(reticle);
const hitBracket=document.createElement("div");hitBracket.id="hitBracket";for(const c of ["a","b","c","d"]){const e=document.createElement("i");e.className=`hb ${c}`;hitBracket.appendChild(e);}hud.appendChild(hitBracket);
const combatText=document.createElement("div");combatText.id="combatText";hud.appendChild(combatText);
const killPulse=document.createElement("div");killPulse.id="killPulse";hud.appendChild(killPulse);
const enemyHud=document.createElement("div");enemyHud.id="enemyHud";hud.appendChild(enemyHud);
const killFeed=document.createElement("div");killFeed.id="killFeed";hud.appendChild(killFeed);
const damageVignette=document.createElement("div");damageVignette.id="damageVignette";hud.appendChild(damageVignette);
const damageIndicator=document.createElement("div");damageIndicator.id="damageIndicator";hud.appendChild(damageIndicator);

const playerHud=document.createElement("div");playerHud.id="playerHud";playerHud.innerHTML=`<div id="hpTop"><span id="hpLabel">VITAL</span><span id="hpNumber">100</span></div><div id="hpTrack"><div id="hpFill"></div></div>`;hud.appendChild(playerHud);
const hpNumber=document.getElementById("hpNumber"),hpFill=document.getElementById("hpFill");

const weaponHud=document.createElement("div");weaponHud.id="weaponHud";weaponHud.innerHTML=`<div id="weaponName">AR-01</div><div id="ammoRow"><span id="ammoCurrent">30</span><span id="ammoMax">/ 30</span></div><div id="slotRow"><span class="slot-chip active" data-slot="1">1 AR</span><span class="slot-chip" data-slot="2">2 REV</span></div>`;hud.appendChild(weaponHud);
const ammoCurrentEl=document.getElementById("ammoCurrent"),ammoMaxEl=document.getElementById("ammoMax"),weaponNameEl=document.getElementById("weaponName");

const deathScreen=document.createElement("div");deathScreen.id="deathScreen";deathScreen.innerHTML=`<div id="deathCard"><h2>SYSTEM DOWN</h2><p>전투를 다시 시작하면 체력과 탄약, 적 상태가 초기화됨.</p><button id="restartButton">다시 시작</button></div>`;document.body.appendChild(deathScreen);
const restartButton=document.getElementById("restartButton");

const settingsPanel=document.createElement("div");settingsPanel.id="settingsPanel";settingsPanel.innerHTML=`<div id="settingsCard"><h2>설정</h2><p>감도와 전투 피드백을 조절할 수 있어.</p><div class="setting"><span>마우스 감도</span><strong id="sensValue"></strong><input id="sensSlider" type="range" min="0.2" max="3" step="0.05"></div><div class="setting"><span>데미지 숫자</span><button id="damageToggle" class="toggle"></button></div><div class="setting"><span>명중 확인음</span><button id="soundToggle" class="toggle"></button></div><div class="settings-actions"><button id="resetSettings">기본값</button><button id="closeSettings">완료</button></div></div>`;document.body.appendChild(settingsPanel);
const settingsButton=document.createElement("button");settingsButton.id="settingsButton";settingsButton.textContent="설정";panel.insertBefore(settingsButton,controls);
const sensSlider=document.getElementById("sensSlider"),sensValue=document.getElementById("sensValue"),damageToggle=document.getElementById("damageToggle"),soundToggle=document.getElementById("soundToggle");
function syncSettings(){sensSlider.value=settings.sensitivity;sensValue.textContent=`${settings.sensitivity.toFixed(2)}×`;damageToggle.classList.toggle("on",settings.damageNumbers);soundToggle.classList.toggle("on",settings.hitSound);}
function openSettings(){if(game.dead)return;mouseHeld=false;if(document.pointerLockElement)document.exitPointerLock();settingsPanel.classList.add("show");syncSettings();}
function closeSettings(){settingsPanel.classList.remove("show");}
sensSlider.oninput=e=>{settings.sensitivity=Number(e.target.value);saveSettings();syncSettings();};damageToggle.onclick=()=>{settings.damageNumbers=!settings.damageNumbers;saveSettings();syncSettings();};soundToggle.onclick=()=>{settings.hitSound=!settings.hitSound;saveSettings();syncSettings();};document.getElementById("resetSettings").onclick=()=>{settings.sensitivity=1;settings.damageNumbers=false;settings.hitSound=true;saveSettings();syncSettings();};document.getElementById("closeSettings").onclick=closeSettings;settingsButton.onclick=openSettings;syncSettings();

const floor=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:0x65717d,roughness:.96}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const colliders=[],raycastWorld=[],solidMeshes=[];
function addBox(x,y,z,w,h,d,color=0x39434d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.82}));m.position.set(x,y+h/2,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);colliders.push({minX:x-w/2,maxX:x+w/2,minY:y,maxY:y+h,minZ:z-d/2,maxZ:z+d/2});raycastWorld.push(m);solidMeshes.push(m);return m;}
addBox(0,0,-12,24,3.5,.8);addBox(0,0,12,24,3.5,.8);addBox(-12,0,0,.8,3.5,24);addBox(12,0,0,.8,3.5,24);addBox(-4.5,0,-3.5,3.4,2.2,3.4,0x765b47);addBox(4.5,0,2.5,4.2,1.7,2.4,0x526b57);addBox(1.5,0,-6.5,2,2.8,2,0x665b72);
const grid=new THREE.GridHelper(24,24,0xffffff,0xffffff);grid.position.y=.005;grid.material.opacity=.1;grid.material.transparent=true;scene.add(grid);

const player={position:new THREE.Vector3(0,0,6),velocityY:0,radius:.36,height:1.8,eyeHeight:1.62,moveSpeed:6.4,jumpSpeed:8.2,gravity:-23,grounded:true,maxHp:100,hp:100};
const game={dead:false,lastDamageAt:-Infinity};
let yaw=Math.PI,pitch=0,recoilPitch=0,recoilYaw=0,shakePitch=0,shakeYaw=0,shakePower=0;
function syncCamera(){camera.position.set(player.position.x,player.position.y+player.eyeHeight,player.position.z);camera.rotation.y=yaw+recoilYaw+shakeYaw;camera.rotation.x=pitch+recoilPitch+shakePitch;}
function updatePlayerHud(){const r=THREE.MathUtils.clamp(player.hp/player.maxHp,0,1);hpNumber.textContent=Math.ceil(player.hp);hpFill.style.width=`${r*100}%`;hpFill.style.background=r<.3?"#ff4c57":r<.6?"#ff9a3c":"#edf4f7";}

let audioCtx=null;
function audio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx;}
function tone(a,freq,start,dur,vol,type="sine",endFreq=null){const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,start+dur);g.gain.setValueAtTime(vol,start);g.gain.exponentialRampToValueAtTime(.001,start+dur);o.connect(g).connect(a.destination);o.start(start);o.stop(start+dur+.01);}
function hitConfirmSound(head=false,kill=false){if(!settings.hitSound)return;const a=audio(),now=a.currentTime;if(head){tone(a,1880,now,.052,.05,"sine",1320);tone(a,2380,now+.012,.055,.025,"triangle",1750);}else{tone(a,760,now,.038,.036,"triangle",590);tone(a,1120,now+.006,.032,.018,"sine",900);}if(kill)tone(a,520,now+.025,.075,.026,"triangle",300);}
function fireSound(id){const a=audio(),now=a.currentTime;if(id==="revolver"){tone(a,175,now,.08,.07,"triangle",82);tone(a,510,now,.035,.032,"square",310);}else{tone(a,260,now,.042,.033,"triangle",150);tone(a,920,now,.025,.018,"square",620);}}
function playerHitSound(){const a=audio(),now=a.currentTime;tone(a,150,now,.085,.045,"triangle",74);tone(a,390,now,.035,.02,"square",210);}

function showDamageDirection(source){const dx=source.x-player.position.x,dz=source.z-player.position.z;const angleToSource=Math.atan2(dx,dz);let relative=angleToSource-yaw;while(relative>Math.PI)relative-=Math.PI*2;while(relative<-Math.PI)relative+=Math.PI*2;damageIndicator.style.transform=`translate(-50%,-50%) rotate(${THREE.MathUtils.radToDeg(-relative)}deg)`;damageIndicator.classList.add("show");setTimeout(()=>damageIndicator.classList.remove("show"),230);}
function damagePlayer(amount,source){if(game.dead)return;player.hp=Math.max(0,player.hp-amount);game.lastDamageAt=performance.now();updatePlayerHud();showDamageDirection(source);damageVignette.classList.add("hit");damageVignette.style.opacity=String(.38+(1-player.hp/player.maxHp)*.38);setTimeout(()=>{damageVignette.classList.remove("hit");damageVignette.style.opacity=String(player.hp<30?.12:0);},85);shakePower=Math.min(1,shakePower+.34);playerHitSound();if(player.hp<=0)killPlayer();}
function killPlayer(){if(game.dead)return;game.dead=true;mouseHeld=false;keys.clear();if(document.pointerLockElement)document.exitPointerLock();deathScreen.classList.add("show");damageVignette.style.opacity=".3";}

const enemies=[];let totalKills=0,headshotKills=0,enemySerial=0;
const spawns=[[0,9,Math.PI],[-6.8,5.5,2.2],[7.4,7.5,-2.35],[-7,-7.8,.65],[6.8,-8.2,-.65],[0,-9.3,0]];
function enemyMat(color){return new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.05,emissive:0});}
function tag(mesh,e,zone){mesh.userData.enemy=e;mesh.userData.hitZone=zone;e.hitboxes.push(mesh);raycastWorld.push(mesh);}
function makeHpBar(){const g=new THREE.Group();g.position.y=2.22;const bg=new THREE.Mesh(new THREE.PlaneGeometry(.8,.055),new THREE.MeshBasicMaterial({color:0x10151b,transparent:true,opacity:.65,depthTest:false}));const fill=new THREE.Mesh(new THREE.PlaneGeometry(.76,.035),new THREE.MeshBasicMaterial({color:0xeef3f6,depthTest:false}));fill.position.z=.002;g.add(bg,fill);return{group:g,fill};}
function createEnemy(x,z,rot){const e={id:++enemySerial,maxHp:100,hp:100,alive:true,dying:false,deathAt:0,hitKick:0,hitboxes:[],materials:[],root:new THREE.Group(),base:new THREE.Vector3(x,0,z),rot,speed:1.15+Math.random()*.5,preferred:4.6+Math.random(),strafe:Math.random()<.5?-1:1,strafeTimer:.5+Math.random(),attackCooldown:.65+Math.random()*1.1,damage:10+Math.floor(Math.random()*4)};e.root.position.copy(e.base);e.root.rotation.y=rot;scene.add(e.root);const body=enemyMat(0x41566b),head=enemyMat(0xc2a383),limb=enemyMat(0x324455),accentM=enemyMat(0xa23d4b);e.materials.push(body,head,limb,accentM);const torso=new THREE.Mesh(new THREE.BoxGeometry(.7,.9,.4),body);torso.position.y=1.13;e.root.add(torso);tag(torso,e,"body");const h=new THREE.Mesh(new THREE.BoxGeometry(.44,.44,.4),head);h.position.y=1.84;e.root.add(h);tag(h,e,"head");for(const [px,py,sx,sy] of [[-.2,.36,.23,.7],[.2,.36,.23,.7],[-.47,1.13,.18,.75],[.47,1.13,.18,.75]]){const p=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,.25),limb);p.position.set(px,py,0);e.root.add(p);tag(p,e,"body");}const mark=new THREE.Mesh(new THREE.BoxGeometry(.16,.06,.02),accentM);mark.position.set(0,1.86,-.21);e.root.add(mark);tag(mark,e,"head");const hp=makeHpBar();e.hpBar=hp;e.root.add(hp.group);e.root.traverse(o=>{if(o.isMesh)o.castShadow=true;});enemies.push(e);return e;}
function removeRay(m){const i=raycastWorld.indexOf(m);if(i>=0)raycastWorld.splice(i,1);}
function updateHp(e){const r=THREE.MathUtils.clamp(e.hp/e.maxHp,0,1);e.hpBar.fill.scale.x=Math.max(.001,r);e.hpBar.fill.position.x=-.38*(1-r);}
function clearEnemies(){for(const e of enemies){e.hitboxes.forEach(removeRay);scene.remove(e.root);}enemies.length=0;}
function spawnEnemies(){clearEnemies();enemySerial=0;spawns.forEach(s=>createEnemy(...s));updateEnemyHud();}
function updateEnemyHud(){const alive=enemies.filter(e=>e.alive).length;enemyHud.innerHTML=`TARGETS ${alive}/${enemies.length}<br><span style="opacity:.48">K ${totalKills} · HS ${headshotKills}</span>`;}
function addFeed(text,head=false){const d=document.createElement("div");d.className="feed";d.style.color=head?"#ff5966":"#eef4f7";d.textContent=text;killFeed.prepend(d);while(killFeed.children.length>3)killFeed.lastElementChild.remove();setTimeout(()=>d.remove(),2200);}
function damageNumber(point,n,head){if(!settings.damageNumbers)return;const p=point.clone().project(camera);if(p.z<-1||p.z>1)return;const d=document.createElement("div");d.className="damage-number";d.style.left=`${(p.x*.5+.5)*innerWidth}px`;d.style.top=`${(-p.y*.5+.5)*innerHeight}px`;d.style.color=head?"#ff4655":"#ff9a3c";d.textContent=n;hud.appendChild(d);setTimeout(()=>d.remove(),500);}
let hitTimer=null,textTimer=null;
function showHitFeedback({head=false,kill=false}){hitBracket.classList.toggle("head",head);hitBracket.classList.add("show");combatText.textContent=kill?(head?"HEADSHOT · ELIMINATED":"ELIMINATED"):(head?"HEADSHOT":"");combatText.style.color=head?"#ff4655":"#ff9a3c";if(combatText.textContent)combatText.classList.add("show");clearTimeout(hitTimer);clearTimeout(textTimer);hitTimer=setTimeout(()=>hitBracket.classList.remove("show"),head?145:86);textTimer=setTimeout(()=>combatText.classList.remove("show"),kill?420:head?170:70);if(kill){killPulse.classList.remove("show");void killPulse.offsetWidth;killPulse.classList.add("show");}}
function flashEnemy(e,head){const c=head?0xff3d4d:0xff8a32;e.materials.forEach(m=>m.emissive.setHex(c));setTimeout(()=>{if(e.alive)e.materials.forEach(m=>m.emissive.setHex(0));},65);}
function killEnemy(e,head,w){e.alive=false;e.dying=true;e.deathAt=performance.now();e.hp=0;e.hitboxes.forEach(removeRay);e.hpBar.group.visible=false;totalKills++;if(head)headshotKills++;addFeed(`${w.name} · ${head?"HEADSHOT":"ELIM"}`,head);updateEnemyHud();}
function damageEnemy(e,zone,w,point){if(!e?.alive||game.dead)return;const head=zone==="head",damage=head?w.headDamage:w.damage,kill=e.hp-damage<=0;e.hp=Math.max(0,e.hp-damage);e.hitKick=1;updateHp(e);flashEnemy(e,head);damageNumber(point,damage,head);showHitFeedback({head,kill});hitConfirmSound(head,kill);if(head)shakePower=Math.min(1,shakePower+(kill?.26:.14));if(kill)killEnemy(e,head,w);}

const losRay=new THREE.Raycaster();
function hasLineOfSight(e){const origin=new THREE.Vector3(e.root.position.x,1.4,e.root.position.z);const target=new THREE.Vector3(player.position.x,player.position.y+1.2,player.position.z);const dir=target.clone().sub(origin),distance=dir.length();dir.normalize();losRay.set(origin,dir);losRay.far=distance;return losRay.intersectObjects(solidMeshes,false).length===0;}
function enemyBlockedAt(x,z,self){const r=.38;for(const b of colliders){if(x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ)return true;}for(const e of enemies){if(e===self||!e.alive)continue;const dx=x-e.root.position.x,dz=z-e.root.position.z;if(dx*dx+dz*dz<.58*.58)return true;}return false;}
function moveEnemy(e,dx,dz){const nx=e.root.position.x+dx;if(!enemyBlockedAt(nx,e.root.position.z,e))e.root.position.x=nx;const nz=e.root.position.z+dz;if(!enemyBlockedAt(e.root.position.x,nz,e))e.root.position.z=nz;}
function spawnEnemyPulse(e,willHit){const projected=new THREE.Vector3(e.root.position.x,1.45,e.root.position.z).project(camera);if(projected.z<-1||projected.z>1){if(willHit)damagePlayer(e.damage,e.root.position);return;}const d=document.createElement("div");d.className="pulse-shot";d.style.left=`${(projected.x*.5+.5)*innerWidth}px`;d.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;hud.appendChild(d);const startX=parseFloat(d.style.left),startY=parseFloat(d.style.top),targetX=innerWidth*.5+(willHit?0:(Math.random()-.5)*130),targetY=innerHeight*.5+(willHit?0:(Math.random()-.5)*90),start=performance.now(),duration=340;const tick=()=>{const t=Math.min(1,(performance.now()-start)/duration),q=1-Math.pow(1-t,2);d.style.left=`${THREE.MathUtils.lerp(startX,targetX,q)}px`;d.style.top=`${THREE.MathUtils.lerp(startY,targetY,q)}px`;d.style.opacity=String(1-t*.6);if(t<1)requestAnimationFrame(tick);else{d.remove();if(willHit&&!game.dead)damagePlayer(e.damage,e.root.position);}};requestAnimationFrame(tick);}
function updateEnemies(delta,now){for(const e of enemies){if(!e.alive){if(e.dying){const t=THREE.MathUtils.clamp((now-e.deathAt)/480,0,1),q=1-Math.pow(1-t,3);e.root.rotation.z=-q*1.25;e.root.position.y=-q*.18;e.root.scale.setScalar(1-q*.07);if(t>=1)e.dying=false;}continue;}e.hpBar.group.quaternion.copy(camera.quaternion);e.hitKick=THREE.MathUtils.lerp(e.hitKick,0,1-Math.exp(-17*delta));if(game.dead)continue;const dx=player.position.x-e.root.position.x,dz=player.position.z-e.root.position.z,dist=Math.hypot(dx,dz)||.001,nx=dx/dist,nz=dz/dist;e.root.rotation.y=Math.atan2(dx,dz);e.strafeTimer-=delta;if(e.strafeTimer<=0){e.strafe*=-1;e.strafeTimer=.7+Math.random()*1.1;}let mx=0,mz=0;if(dist>e.preferred+.65){mx+=nx;mz+=nz;}else if(dist<e.preferred-1.05){mx-=nx*.82;mz-=nz*.82;}else{mx+=-nz*e.strafe*.78;mz+=nx*e.strafe*.78;}for(const other of enemies){if(other===e||!other.alive)continue;const sx=e.root.position.x-other.root.position.x,sz=e.root.position.z-other.root.position.z,sd=Math.hypot(sx,sz);if(sd>0&&sd<1.35){mx+=(sx/sd)*(1.35-sd)*1.2;mz+=(sz/sd)*(1.35-sd)*1.2;}}const ml=Math.hypot(mx,mz);if(ml>0){mx/=ml;mz/=ml;moveEnemy(e,mx*e.speed*delta,mz*e.speed*delta);}e.attackCooldown-=delta;if(dist<8.5&&e.attackCooldown<=0&&hasLineOfSight(e)){const accuracy=THREE.MathUtils.clamp(.84-dist*.045,.46,.75);spawnEnemyPulse(e,Math.random()<accuracy);e.attackCooldown=1.25+Math.random()*1.25;}e.root.position.y=0;e.root.rotation.z=(Math.random()-.5)*.004*e.hitKick;}}

const weaponRig=new THREE.Group();const basePos=new THREE.Vector3(.43,-.35,-.7);weaponRig.position.copy(basePos);camera.add(weaponRig);
const metal=new THREE.MeshStandardMaterial({color:0x2d343b,metalness:.72,roughness:.3}),dark=new THREE.MeshStandardMaterial({color:0x14191e,metalness:.35,roughness:.5}),accent=new THREE.MeshStandardMaterial({color:0x6ba3b8,emissive:0x18394a,emissiveIntensity:.8,metalness:.25,roughness:.35}),grip=new THREE.MeshStandardMaterial({color:0x3f3430,roughness:.8});
function part(parent,g,m,p,r=[0,0,0]){const x=new THREE.Mesh(g,m);x.position.set(...p);x.rotation.set(...r);parent.add(x);return x;}
function flash(){const g=new THREE.Group();g.visible=false;const core=part(g,new THREE.SphereGeometry(.055,7,7),new THREE.MeshBasicMaterial({color:0xbfefff,transparent:true,opacity:.95}),[0,0,0]);const glow=new THREE.PointLight(0x8edfff,0,2.7);g.add(glow);return{group:g,core,light:glow};}
function buildCarbine(){const g=new THREE.Group();g.position.set(-.02,-.015,.02);weaponRig.add(g);part(g,new THREE.BoxGeometry(.24,.16,.62),metal,[0,.01,-.12]);part(g,new THREE.BoxGeometry(.19,.11,.36),dark,[0,.06,-.55]);part(g,new THREE.CylinderGeometry(.032,.032,.52,10),dark,[0,.04,-.94],[Math.PI/2,0,0]);part(g,new THREE.BoxGeometry(.16,.035,.46),accent,[0,.11,-.35]);part(g,new THREE.BoxGeometry(.13,.29,.17),dark,[0,-.2,-.12],[-.12,0,0]);part(g,new THREE.BoxGeometry(.09,.2,.11),grip,[0,-.13,.06],[-.22,0,0]);part(g,new THREE.BoxGeometry(.19,.11,.28),dark,[0,.015,.35]);const muzzle=new THREE.Object3D();muzzle.position.set(0,.04,-1.22);g.add(muzzle);const f=flash();f.group.position.copy(muzzle.position);g.add(f.group);return{group:g,muzzle,flash:f};}
function buildSidearm(){const g=new THREE.Group();weaponRig.add(g);part(g,new THREE.BoxGeometry(.18,.14,.62),metal,[0,.02,-.18]);part(g,new THREE.BoxGeometry(.14,.05,.5),accent,[0,.09,-.2]);part(g,new THREE.BoxGeometry(.16,.34,.16),grip,[0,-.2,.14],[-.2,0,0]);part(g,new THREE.CylinderGeometry(.052,.052,.28,10),dark,[0,.02,-.52],[Math.PI/2,0,0]);part(g,new THREE.TorusGeometry(.105,.025,7,14),dark,[0,-.01,.05],[Math.PI/2,0,0]);const muzzle=new THREE.Object3D();muzzle.position.set(0,.02,-.7);g.add(muzzle);const f=flash();f.group.position.copy(muzzle.position);g.add(f.group);return{group:g,muzzle,flash:f};}
const models={assaultRifle:buildCarbine(),revolver:buildSidearm()};models.revolver.group.visible=false;
const weapons={assaultRifle:{id:"assaultRifle",slot:1,name:"AR-01",automatic:true,ammo:30,maxAmmo:30,damage:20,headDamage:40,fireInterval:60000/700,reload:1450,last:-Infinity,reloading:false,reloadAt:0,reloadEnd:0,spread:.0018,current:.0018,maxSpread:.014,perShot:.0014,recovery:.021,recoil:.006,shake:.14,kick:0,flashUntil:0},revolver:{id:"revolver",slot:2,name:"REVOLVER",automatic:false,ammo:6,maxAmmo:6,damage:55,headDamage:120,fireInterval:285,reload:1200,last:-Infinity,reloading:false,reloadAt:0,reloadEnd:0,spread:.0003,current:.0003,maxSpread:.0025,perShot:.0003,recovery:.02,recoil:.026,shake:.5,kick:0,flashUntil:0}};
let currentId="assaultRifle",mouseHeld=false;const switching={active:false,target:null,start:0,duration:330,swapped:false};const currentWeapon=()=>weapons[currentId],currentModel=()=>models[currentId];
function updateWeaponHud(){const w=currentWeapon();weaponNameEl.textContent=w.reloading?"RELOADING":w.name;ammoCurrentEl.textContent=w.ammo;ammoMaxEl.textContent=`/ ${w.maxAmmo}`;document.querySelectorAll(".slot-chip").forEach(e=>e.classList.toggle("active",Number(e.dataset.slot)===w.slot));}
function cancelReload(w){w.reloading=false;w.reloadAt=0;w.reloadEnd=0;}
function beginSwitch(id){if(game.dead||switching.active||id===currentId)return;cancelReload(currentWeapon());mouseHeld=false;switching.active=true;switching.target=id;switching.start=performance.now();switching.swapped=false;}
function swapNow(){models[currentId].group.visible=false;currentId=switching.target;models[currentId].group.visible=true;switching.swapped=true;updateWeaponHud();}
function startReload(){if(game.dead||switching.active)return;const w=currentWeapon();if(w.reloading||w.ammo===w.maxAmmo)return;w.reloading=true;w.reloadAt=performance.now();w.reloadEnd=w.reloadAt+w.reload;mouseHeld=false;updateWeaponHud();}
const raycaster=new THREE.Raycaster();
function shotNdc(w){const air=w.id==="assaultRifle"&&!player.grounded?1.12:1,s=w.current*air;return new THREE.Vector2((Math.random()-.5)*s*2,(Math.random()-.5)*s*2);}
function shotFeedback(w){w.kick=1;recoilPitch+=w.recoil;recoilYaw+=(Math.random()-.5)*w.recoil*.7;shakePower=Math.min(1,shakePower+w.shake);w.flashUntil=performance.now()+(w.id==="revolver"?42:26);const f=currentModel().flash;f.group.visible=true;f.light.intensity=w.id==="revolver"?1.7:1.05;f.core.scale.setScalar(.8+Math.random()*.35);fireSound(w.id);}
function fire(){if(game.dead||document.pointerLockElement!==renderer.domElement||switching.active)return;const w=currentWeapon();if(w.reloading)return;const now=performance.now();if(now-w.last<w.fireInterval)return;w.last=now;if(w.ammo<=0)return;w.ammo--;w.current=Math.min(w.maxSpread,w.current+w.perShot);updateWeaponHud();raycaster.setFromCamera(shotNdc(w),camera);const hit=raycaster.intersectObjects(raycastWorld,false)[0];if(hit?.object.userData.enemy)damageEnemy(hit.object.userData.enemy,hit.object.userData.hitZone,w,hit.point);shotFeedback(w);}

const keys=new Set();
window.addEventListener("keydown",e=>{keys.add(e.code);if(e.code==="Space"&&!game.dead&&player.grounded&&document.pointerLockElement===renderer.domElement){player.velocityY=player.jumpSpeed;player.grounded=false;}if(e.code==="KeyR")startReload();if(e.code==="Digit1")beginSwitch("assaultRifle");if(e.code==="Digit2")beginSwitch("revolver");if(e.code==="KeyT")resetCombat();if(e.code==="KeyP")openSettings();if(e.code==="Enter"&&game.dead)resetCombat(true);});
window.addEventListener("keyup",e=>keys.delete(e.code));window.addEventListener("blur",()=>{keys.clear();mouseHeld=false;});window.addEventListener("mousedown",e=>{if(e.button!==0||game.dead)return;mouseHeld=true;if(!currentWeapon().automatic)fire();});window.addEventListener("mouseup",e=>{if(e.button===0)mouseHeld=false;});
startButton.onclick=()=>{audio();renderer.domElement.requestPointerLock();};renderer.domElement.onclick=()=>{audio();if(!game.dead&&document.pointerLockElement!==renderer.domElement&&!settingsPanel.classList.contains("show"))renderer.domElement.requestPointerLock();};
document.addEventListener("pointerlockchange",()=>{const locked=document.pointerLockElement===renderer.domElement;startScreen.classList.toggle("hidden",locked||game.dead);if(!locked){keys.clear();mouseHeld=false;}});
document.addEventListener("mousemove",e=>{if(game.dead||document.pointerLockElement!==renderer.domElement)return;const s=.0021*settings.sensitivity;yaw-=e.movementX*s;pitch-=e.movementY*s;pitch=THREE.MathUtils.clamp(pitch,-Math.PI/2+.01,Math.PI/2-.01);});
restartButton.onclick=()=>resetCombat(true);

function vOverlap(b){return player.position.y+player.height>b.minY&&player.position.y<b.maxY;}
function collides(x,z){const r=player.radius;return colliders.some(b=>vOverlap(b)&&x+r>b.minX&&x-r<b.maxX&&z+r>b.minZ&&z-r<b.maxZ);}
function move(dx,dz){const nx=player.position.x+dx;if(!collides(nx,player.position.z))player.position.x=nx;const nz=player.position.z+dz;if(!collides(player.position.x,nz))player.position.z=nz;}
const forward=new THREE.Vector3(),right=new THREE.Vector3(),wish=new THREE.Vector3();
function updateMove(d){let x=0,z=0;if(keys.has("KeyW"))z++;if(keys.has("KeyS"))z--;if(keys.has("KeyD"))x++;if(keys.has("KeyA"))x--;forward.set(-Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,-Math.sin(yaw));wish.set(0,0,0).addScaledVector(forward,z).addScaledVector(right,x);if(wish.lengthSq()){wish.normalize();move(wish.x*player.moveSpeed*d,wish.z*player.moveSpeed*d);}player.velocityY+=player.gravity*d;player.position.y+=player.velocityY*d;if(player.position.y<=0){player.position.y=0;player.velocityY=0;player.grounded=true;}else player.grounded=false;}
function updateSwitch(now){if(!switching.active)return 0;const t=THREE.MathUtils.clamp((now-switching.start)/switching.duration,0,1);if(t>=.5&&!switching.swapped)swapNow();const q=t<.5?t*2:(1-t)*2,drop=(1-Math.pow(1-q,3))*.37;if(t>=1){switching.active=false;switching.target=null;switching.swapped=false;return 0;}return drop;}
function updateReload(now){for(const w of Object.values(weapons)){if(w.reloading&&now>=w.reloadEnd){w.reloading=false;w.ammo=w.maxAmmo;w.reloadAt=w.reloadEnd=0;updateWeaponHud();}}}
function updateWeapon(d,now,drop){for(const [id,w] of Object.entries(weapons)){const f=models[id].flash;if(w.flashUntil<=now){f.group.visible=false;f.light.intensity=0;}w.kick=THREE.MathUtils.lerp(w.kick,0,1-Math.exp(-19*d));w.current=Math.max(w.spread,w.current-w.recovery*d);}const w=currentWeapon();let rd=0,tilt=0;if(w.reloading){const t=THREE.MathUtils.clamp((now-w.reloadAt)/w.reload,0,1),c=Math.sin(Math.PI*t);rd=c*.15;tilt=c*(w.id==="revolver"?.42:.28);}weaponRig.position.set(basePos.x,basePos.y-drop-rd-w.kick*.027,basePos.z+w.kick*(w.id==="revolver"?.105:.055));weaponRig.rotation.x=tilt+w.kick*(w.id==="revolver"?.14:.06);weaponRig.rotation.z=-tilt*.2;const spreadRatio=(w.current-w.spread)/(w.maxSpread-w.spread||1);reticle.style.transform=`translate(-50%,-50%) scale(${1+Math.max(0,spreadRatio)*.42})`;}
function updateCamera(d){const k=1-Math.exp(-13*d);recoilPitch=THREE.MathUtils.lerp(recoilPitch,0,k);recoilYaw=THREE.MathUtils.lerp(recoilYaw,0,k);shakePower=Math.max(0,shakePower-d*7.5);shakePitch=shakePower?(Math.random()-.5)*.0045*shakePower:0;shakeYaw=shakePower?(Math.random()-.5)*.0045*shakePower:0;}

function resetCombat(lockAfter=false){game.dead=false;deathScreen.classList.remove("show");damageVignette.style.opacity="0";player.position.set(0,0,6);player.velocityY=0;player.grounded=true;player.hp=player.maxHp;yaw=Math.PI;pitch=0;totalKills=0;headshotKills=0;for(const w of Object.values(weapons)){w.ammo=w.maxAmmo;w.reloading=false;w.reloadAt=w.reloadEnd=0;w.last=-Infinity;w.current=w.spread;}if(currentId!=="assaultRifle"){models[currentId].group.visible=false;currentId="assaultRifle";models[currentId].group.visible=true;}switching.active=false;mouseHeld=false;spawnEnemies();updatePlayerHud();updateWeaponHud();syncCamera();if(lockAfter)setTimeout(()=>renderer.domElement.requestPointerLock(),60);}

let fpsTime=0,fpsFrames=0;const clock=new THREE.Clock();
function loop(){requestAnimationFrame(loop);const d=Math.min(clock.getDelta(),.05),now=performance.now();if(!game.dead&&document.pointerLockElement===renderer.domElement){updateMove(d);if(mouseHeld&&!switching.active&&currentWeapon().automatic)fire();}updateReload(now);const drop=updateSwitch(now);updateWeapon(d,now,drop);updateCamera(d);updateEnemies(d,now);syncCamera();fpsTime+=d;fpsFrames++;if(fpsTime>=.5){fpsElement.textContent=`FPS: ${Math.round(fpsFrames/fpsTime)}`;fpsTime=0;fpsFrames=0;}stateElement.textContent=game.dead?"DOWN":player.grounded?"GROUND":"AIR";renderer.render(scene,camera);}

spawnEnemies();updateWeaponHud();updatePlayerHud();syncCamera();loop();
window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));});
