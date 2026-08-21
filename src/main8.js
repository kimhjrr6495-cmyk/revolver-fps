import "./main7.js?v=7.0.0";

const GAME_VERSION = "STAGE 8 · WAVE LOOP";

const hud = document.getElementById("hud");
const info = document.getElementById("info");
const enemyHud = document.getElementById("enemyHud");
const playerHud = document.getElementById("playerHud");
const hpNumber = document.getElementById("hpNumber");
const hpFill = document.getElementById("hpFill");
const deathScreen = document.getElementById("deathScreen");
const restartButton = document.getElementById("restartButton");

// ---------- Stage 8 labels ----------
document.title = "HTML FPS - Stage 8";
document.querySelector(".panel h1").textContent = "HTML FPS — Stage 8";
document.querySelector(".panel p").textContent = "Wave Loop · Health HUD Polish";
info.innerHTML = `<strong>${GAME_VERSION}</strong><br><span style="opacity:.66">WAVE CLEAR → INTERMISSION → NEXT WAVE</span>`;

// ---------- Health HUD polish ----------
const stage8Style = document.createElement("style");
stage8Style.textContent = `
  #playerHud{
    left:20px!important;bottom:20px!important;width:238px!important;padding:10px 12px 11px!important;
    border:1px solid rgba(255,255,255,.10)!important;border-radius:10px!important;
    background:linear-gradient(145deg,rgba(8,12,17,.56),rgba(8,12,17,.28))!important;
    box-shadow:0 8px 28px rgba(0,0,0,.18);backdrop-filter:blur(7px)!important;
  }
  #hpTop{align-items:center!important}
  #hpLabel{font-size:9px!important;letter-spacing:.18em!important;opacity:.52!important}
  #hpNumber{font-size:24px!important;letter-spacing:-.04em!important}
  #hpTrack{position:relative;height:8px!important;margin-top:7px!important;border-radius:3px!important;background:rgba(255,255,255,.08)!important;overflow:hidden!important}
  #hpGhost{position:absolute;inset:0 auto 0 0;width:100%;background:rgba(255,91,98,.45);transition:width .42s cubic-bezier(.2,.8,.2,1);z-index:1}
  #hpFill{position:relative;z-index:2;height:100%!important;border-radius:3px!important;transition:width .11s ease,background .14s ease!important}
  #hpSegments{position:absolute;inset:0;z-index:3;pointer-events:none;background:linear-gradient(90deg,transparent 24.5%,rgba(0,0,0,.30) 24.5% 25.5%,transparent 25.5% 49.5%,rgba(0,0,0,.30) 49.5% 50.5%,transparent 50.5% 74.5%,rgba(0,0,0,.30) 74.5% 75.5%,transparent 75.5%)}
  #playerHud.low{animation:hpLow 1.05s ease-in-out infinite}
  @keyframes hpLow{0%,100%{box-shadow:0 8px 28px rgba(0,0,0,.18)}50%{box-shadow:0 0 20px rgba(255,62,75,.22)}}

  #waveHud{position:absolute;left:50%;top:18px;transform:translateX(-50%);min-width:164px;padding:8px 13px 9px;border:1px solid rgba(255,255,255,.10);border-radius:10px;background:rgba(7,11,16,.42);backdrop-filter:blur(7px);text-align:center;font-variant-numeric:tabular-nums}
  #waveLabel{font-size:9px;font-weight:900;letter-spacing:.22em;opacity:.52}
  #waveValue{margin-top:2px;font-size:18px;font-weight:950;letter-spacing:.08em}
  #waveSub{margin-top:2px;font-size:9px;font-weight:850;letter-spacing:.12em;opacity:.46}
  #waveBanner{position:absolute;left:50%;top:28%;transform:translate(-50%,-50%) scale(.94);padding:10px 15px;border-radius:9px;background:rgba(5,8,12,.52);font-size:18px;font-weight:950;letter-spacing:.18em;opacity:0;transition:opacity .15s,transform .15s;pointer-events:none}
  #waveBanner.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
`;
document.head.appendChild(stage8Style);

if (playerHud && hpFill) {
  const track = document.getElementById("hpTrack");
  const ghost = document.createElement("div");
  ghost.id = "hpGhost";
  const segments = document.createElement("div");
  segments.id = "hpSegments";
  track.insertBefore(ghost, hpFill);
  track.appendChild(segments);

  let previousHp = Number(hpNumber?.textContent || 100);
  const syncHealthPolish = () => {
    const hp = Math.max(0, Math.min(100, Number(hpNumber?.textContent || 0)));
    const pct = `${hp}%`;
    if (hp < previousHp) {
      ghost.style.width = `${previousHp}%`;
      requestAnimationFrame(() => setTimeout(() => { ghost.style.width = pct; }, 90));
    } else {
      ghost.style.width = pct;
    }
    playerHud.classList.toggle("low", hp <= 30 && hp > 0);
    previousHp = hp;
  };
  new MutationObserver(syncHealthPolish).observe(hpNumber, { childList:true, characterData:true, subtree:true });
  syncHealthPolish();
}

// ---------- Wave HUD ----------
const waveHud = document.createElement("div");
waveHud.id = "waveHud";
waveHud.innerHTML = `<div id="waveLabel">CURRENT WAVE</div><div id="waveValue">01</div><div id="waveSub">TARGETS --</div>`;
hud.appendChild(waveHud);
const waveValue = document.getElementById("waveValue");
const waveSub = document.getElementById("waveSub");

const waveBanner = document.createElement("div");
waveBanner.id = "waveBanner";
hud.appendChild(waveBanner);

let wave = 1;
let intermission = false;
let intermissionTimer = null;
let countdownTimer = null;
let lastAlive = null;

function updateWaveHud(alive, total) {
  waveValue.textContent = String(wave).padStart(2,"0");
  waveSub.textContent = Number.isFinite(alive) && Number.isFinite(total) ? `TARGETS ${alive}/${total}` : "TARGETS --";
}

function showWaveBanner(text, duration=700) {
  waveBanner.textContent = text;
  waveBanner.classList.add("show");
  setTimeout(() => waveBanner.classList.remove("show"), duration);
}

function parseTargets() {
  const text = enemyHud?.textContent || "";
  const match = text.match(/TARGETS\s+(\d+)\s*\/\s*(\d+)/i);
  if (!match) return null;
  return { alive:Number(match[1]), total:Number(match[2]) };
}

function cancelIntermission() {
  intermission = false;
  clearTimeout(intermissionTimer);
  clearInterval(countdownTimer);
  intermissionTimer = null;
  countdownTimer = null;
}

function beginNextWave() {
  if (intermission || deathScreen?.classList.contains("show")) return;
  intermission = true;
  showWaveBanner("WAVE CLEAR", 850);

  let count = 3;
  waveSub.textContent = `NEXT WAVE ${count}`;
  countdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) waveSub.textContent = `NEXT WAVE ${count}`;
  }, 700);

  intermissionTimer = setTimeout(() => {
    clearInterval(countdownTimer);
    wave += 1;
    // Stage 7 exposes combat reset through T; Stage 8 uses it as the wave respawn hook.
    window.dispatchEvent(new KeyboardEvent("keydown", { code:"KeyT", key:"t", bubbles:true }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code:"KeyT", key:"t", bubbles:true }));
    showWaveBanner(`WAVE ${String(wave).padStart(2,"0")}`, 760);
    intermission = false;
    setTimeout(syncEnemyHud, 60);
  }, 2300);
}

function syncEnemyHud() {
  const state = parseTargets();
  if (!state) return;
  updateWaveHud(state.alive, state.total);
  if (lastAlive !== null && lastAlive > 0 && state.alive === 0) beginNextWave();
  lastAlive = state.alive;
}

if (enemyHud) {
  new MutationObserver(syncEnemyHud).observe(enemyHud, { childList:true, characterData:true, subtree:true });
  syncEnemyHud();
}

// Manual combat reset starts a fresh wave run.
window.addEventListener("keydown", e => {
  if (e.code === "KeyT" && e.isTrusted) {
    cancelIntermission();
    wave = 1;
    lastAlive = null;
    setTimeout(syncEnemyHud, 70);
  }
});

if (restartButton) {
  restartButton.addEventListener("click", () => {
    cancelIntermission();
    wave = 1;
    lastAlive = null;
    setTimeout(syncEnemyHud, 90);
  });
}

if (deathScreen) {
  new MutationObserver(() => {
    if (deathScreen.classList.contains("show")) cancelIntermission();
  }).observe(deathScreen, { attributes:true, attributeFilter:["class"] });
}
