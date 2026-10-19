(() => {
"use strict";
const app = document.getElementById('app');
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const COL = { night:'#050a1f', lapis:'#1b3f9e', turq:'#2fd3c7', gold:'#e8b64c', ivory:'#f3ead7', rose:'#ff6b6b', blue:'#7aa2ff', pink:'#ff6b9a' };
let W = 0, H = 0, DPR = 1, S = 1;
const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
let best = parseInt(store.get('samarqand-best') || '0', 10) || 0;

/* ---------------- sprites (glow baked once into offscreen canvases) ---------------- */
function sprite(size, draw) {
  const c = document.createElement('canvas');
  const px = Math.ceil(size * DPR);
  c.width = c.height = px;
  const g = c.getContext('2d');
  g.scale(DPR, DPR);
  g.translate(size / 2, size / 2);
  draw(g, size);
  c.size = size;
  return c;
}
function starPath(g, n, R, r, rot = 0) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i * Math.PI / n;
    const rad = i % 2 ? r : R;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath();
}
let SPR = {};
function buildSprites() {
  const k = S;
  SPR.ship = sprite(80 * k, (g, s) => {
    const u = s / 80;
    g.shadowColor = COL.turq; g.shadowBlur = 14 * u;
    // falcon wings
    g.beginPath();
    g.moveTo(0, -30*u); g.lineTo(8*u, -8*u); g.lineTo(32*u, 10*u); g.lineTo(28*u, 16*u); g.lineTo(9*u, 10*u);
    g.lineTo(6*u, 22*u); g.lineTo(0, 17*u); g.lineTo(-6*u, 22*u); g.lineTo(-9*u, 10*u); g.lineTo(-28*u, 16*u); g.lineTo(-32*u, 10*u); g.lineTo(-8*u, -8*u);
    g.closePath();
    const gr = g.createLinearGradient(0, -30*u, 0, 22*u);
    gr.addColorStop(0, '#f8dc8a'); gr.addColorStop(1, '#b07a1e');
    g.fillStyle = gr; g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(5,10,31,.6)'; g.lineWidth = 1.2*u;
    g.beginPath(); g.moveTo(0,-24*u); g.lineTo(0,14*u); g.moveTo(8*u,-6*u); g.lineTo(24*u,10*u); g.moveTo(-8*u,-6*u); g.lineTo(-24*u,10*u); g.stroke();
    // cockpit gem
    g.fillStyle = COL.turq; g.shadowColor = COL.turq; g.shadowBlur = 10*u;
    starPath(g, 4, 5*u, 2.4*u, -Math.PI/2); g.fill();
  });
  SPR.star = sprite(60 * k, (g, s) => {
    const u = s / 60;
    g.shadowColor = COL.turq; g.shadowBlur = 12*u;
    starPath(g, 8, 20*u, 12*u); g.fillStyle = '#123a8f'; g.fill();
    g.lineWidth = 2*u; g.strokeStyle = COL.turq; g.stroke();
    g.shadowBlur = 0;
    starPath(g, 8, 11*u, 7*u, Math.PI/8); g.fillStyle = COL.gold; g.fill();
    g.beginPath(); g.arc(0,0,3.5*u,0,7); g.fillStyle = COL.ivory; g.fill();
  });
  SPR.kite = sprite(56 * k, (g, s) => {
    const u = s / 56;
    g.shadowColor = COL.rose; g.shadowBlur = 12*u;
    g.beginPath(); g.moveTo(0, 20*u); g.lineTo(13*u, -6*u); g.lineTo(0, -18*u); g.lineTo(-13*u, -6*u); g.closePath();
    g.fillStyle = '#5a1630'; g.fill(); g.lineWidth = 2*u; g.strokeStyle = COL.rose; g.stroke();
    g.shadowBlur = 0;
    g.beginPath(); g.moveTo(0, 10*u); g.lineTo(6*u, -5*u); g.lineTo(0, -10*u); g.lineTo(-6*u, -5*u); g.closePath();
    g.fillStyle = COL.gold; g.fill();
  });
  SPR.hex = sprite(76 * k, (g, s) => {
    const u = s / 76;
    g.shadowColor = COL.gold; g.shadowBlur = 14*u;
    starPath(g, 6, 26*u, 22*u, Math.PI/6); g.fillStyle = '#0d2a6b'; g.fill(); g.lineWidth = 2.5*u; g.strokeStyle = COL.gold; g.stroke();
    g.shadowBlur = 0;
    starPath(g, 6, 17*u, 8*u); g.fillStyle = COL.turq; g.fill();
    g.beginPath(); g.arc(0,0,5*u,0,7); g.fillStyle = COL.night; g.fill();
  });
  SPR.boss = sprite(220 * k, (g, s) => {
    const u = s / 220;
    g.shadowColor = COL.gold; g.shadowBlur = 24*u;
    starPath(g, 12, 92*u, 70*u); g.fillStyle = '#0b2260'; g.fill(); g.lineWidth = 3*u; g.strokeStyle = COL.gold; g.stroke();
    g.shadowBlur = 0;
    for (let i = 0; i < 12; i++) {
      g.save(); g.rotate(i * Math.PI / 6);
      g.beginPath(); g.moveTo(0, -66*u); g.lineTo(10*u, -40*u); g.lineTo(0, -28*u); g.lineTo(-10*u, -40*u); g.closePath();
      g.fillStyle = i % 2 ? COL.turq : '#2b62d9'; g.fill(); g.restore();
    }
    starPath(g, 8, 30*u, 18*u, Math.PI/8); g.fillStyle = COL.gold; g.fill();
    g.beginPath(); g.arc(0,0,11*u,0,7); g.fillStyle = COL.rose; g.shadowColor = COL.rose; g.shadowBlur = 16*u; g.fill();
  });
  SPR.pb = sprite(18 * k, (g, s) => { // player bullet
    const u = s / 18;
    g.shadowColor = COL.gold; g.shadowBlur = 8*u;
    g.fillStyle = '#fff2c4'; g.beginPath(); g.ellipse(0, 0, 2.6*u, 7*u, 0, 0, 7); g.fill();
  });
  SPR.eb = sprite(18 * k, (g, s) => { // enemy bullet
    const u = s / 18;
    g.shadowColor = COL.rose; g.shadowBlur = 9*u;
    g.fillStyle = '#ffd0d0'; g.beginPath(); g.arc(0, 0, 3.6*u, 0, 7); g.fill();
  });
  SPR.gem = {};
  for (const [key, c] of [['spread', COL.turq], ['rapid', COL.gold], ['shield', COL.blue], ['life', COL.pink]]) {
    SPR.gem[key] = sprite(34 * k, (g, s) => {
      const u = s / 34;
      g.shadowColor = c; g.shadowBlur = 12*u;
      starPath(g, 4, 11*u, 5*u, -Math.PI/2); g.fillStyle = c; g.fill();
      g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.75)';
      starPath(g, 4, 4*u, 2*u, -Math.PI/2); g.fill();
    });
  }
  SPR.spark = sprite(16, (g) => {
    const gr = g.createRadialGradient(0,0,0,0,0,8);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-8,-8,16,16);
  });
}

/* ---------------- background: aurora, stars, Registan skyline ---------------- */
let stars = [], skyline = null;
function buildBackground() {
  stars = [];
  const n = Math.round((W * H) / 2600);
  for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * .9 + .1, t: Math.random() * 6 });
  // skyline offscreen
  const sh = Math.round(Math.min(H * .26, 220));
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * DPR); c.height = Math.ceil(sh * DPR);
  const g = c.getContext('2d'); g.scale(DPR, DPR);
  const base = sh;
  const silhouette = '#081335';
  g.fillStyle = silhouette;
  const unit = Math.max(W / 9, 90);
  const cx = W / 2;
  function minaret(x, h, w) {
    g.fillStyle = silhouette; g.fillRect(x - w/2, base - h, w, h);
    g.fillRect(x - w*.75, base - h - 6, w*1.5, 6);
    g.beginPath(); g.moveTo(x - w*.6, base - h - 6); g.quadraticCurveTo(x, base - h - w*1.6, x + w*.6, base - h - 6); g.fill();
    g.fillStyle = 'rgba(47,211,199,.18)';
    for (let y = base - h + 10; y < base - 10; y += 14) g.fillRect(x - w/2 + 2, y, w - 4, 3);
  }
  function madrasa(x, w, h) {
    g.fillStyle = silhouette; g.fillRect(x - w/2, base - h, w, h);
    // pishtoq arch
    const aw = w * .34, ah = h * .62;
    g.fillStyle = '#0d1d4d';
    g.beginPath(); g.moveTo(x - aw/2, base); g.lineTo(x - aw/2, base - ah*.6);
    g.quadraticCurveTo(x - aw/2, base - ah, x, base - ah*1.08); g.quadraticCurveTo(x + aw/2, base - ah, x + aw/2, base - ah*.6); g.lineTo(x + aw/2, base); g.fill();
    // tile band
    g.fillStyle = 'rgba(232,182,76,.35)'; g.fillRect(x - w/2, base - h, w, 3);
    g.fillStyle = 'rgba(47,211,199,.22)';
    for (let i = 0; i < 8; i++) { const px = x - w/2 + 6 + i * (w - 12) / 8; g.fillRect(px, base - h + 10, (w - 12) / 8 - 6, 4); }
    // windows
    g.fillStyle = 'rgba(232,182,76,.55)';
    for (const sx of [-1, 1]) for (let r = 0; r < 2; r++) {
      const wx = x + sx * w * .33, wy = base - h * .7 + r * h * .3;
      g.beginPath(); g.moveTo(wx - 5, wy + 12); g.lineTo(wx - 5, wy); g.quadraticCurveTo(wx, wy - 8, wx + 5, wy); g.lineTo(wx + 5, wy + 12); g.fill();
    }
  }
  function dome(x, r, ribbed) {
    const y = base - r * 1.7;
    g.fillStyle = silhouette; g.fillRect(x - r*.75, y, r*1.5, base - y);
    const gr = g.createLinearGradient(x - r, 0, x + r, 0);
    gr.addColorStop(0, '#0f6f7a'); gr.addColorStop(.45, '#2fd3c7'); gr.addColorStop(1, '#0a4e60');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - r, y); g.bezierCurveTo(x - r*1.05, y - r*1.1, x - r*.2, y - r*1.3, x, y - r*1.55);
    g.bezierCurveTo(x + r*.2, y - r*1.3, x + r*1.05, y - r*1.1, x + r, y); g.closePath(); g.fill();
    if (ribbed) { g.strokeStyle = 'rgba(5,10,31,.35)'; g.lineWidth = 1.2;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(x + i * r / 3.6, y); g.quadraticCurveTo(x + i * r / 5, y - r * .9, x, y - r * 1.5); g.stroke(); } }
    g.fillStyle = 'rgba(232,182,76,.7)'; g.fillRect(x - r, y - 2, r * 2, 3);
  }
  // three madrasas of Registan
  const mw = unit * 1.9, mh = sh * .55;
  for (const off of [-1, 0, 1]) {
    const x = cx + off * unit * 2.6;
    madrasa(x, mw, mh);
    dome(x + (off === 0 ? 0 : -off * mw * .32), unit * .32, true);
    if (off === 0) { dome(x - mw * .36, unit * .24, true); dome(x + mw * .36, unit * .24, true); }
    minaret(x - mw/2 - 6, mh * 1.35, Math.max(unit * .1, 9));
    minaret(x + mw/2 + 6, mh * 1.35, Math.max(unit * .1, 9));
  }
  // distant houses
  g.fillStyle = '#060e2a';
  for (let x = 0; x < W; x += 26 + Math.random() * 30) { const h = 8 + Math.random() * 22; g.fillRect(x, base - h, 24 + Math.random() * 20, h); }
  skyline = { c, h: sh };
}
let auroraT = 0;
function drawBackground(dt) {
  auroraT += dt;
  const g = ctx;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#03061a'); sky.addColorStop(.6, '#081544'); sky.addColorStop(1, '#122a72');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  // aurora ribbons
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 3; b++) {
    const hue = b === 1 ? 'rgba(232,182,76,' : 'rgba(47,211,199,';
    g.beginPath();
    const yb = H * (.18 + b * .1);
    g.moveTo(0, yb);
    for (let x = 0; x <= W; x += 24) g.lineTo(x, yb + Math.sin(x * .006 + auroraT * (.25 + b * .1) + b) * 26 * S + Math.sin(x * .017 - auroraT * .4) * 10 * S);
    g.lineTo(W, yb - 90 * S); g.lineTo(0, yb - 90 * S); g.closePath();
    const ag = g.createLinearGradient(0, yb - 90 * S, 0, yb + 30 * S);
    ag.addColorStop(0, hue + '0)'); ag.addColorStop(.8, hue + (b === 1 ? '.05)' : '.08)')); ag.addColorStop(1, hue + '0)');
    g.fillStyle = ag; g.fill();
  }
  // moon (crescent)
  const mx = W * .82, my = H * .14, mr = 26 * S;
  const mg = g.createRadialGradient(mx, my, 0, mx, my, mr * 4);
  mg.addColorStop(0, 'rgba(243,234,215,.25)'); mg.addColorStop(1, 'rgba(243,234,215,0)');
  g.fillStyle = mg; g.fillRect(mx - mr*4, my - mr*4, mr*8, mr*8);
  g.restore();
  g.fillStyle = '#f3ead7'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
  g.fillStyle = '#060c26'; g.beginPath(); g.arc(mx + mr * .42, my - mr * .18, mr * .9, 0, 7); g.fill();
  // stars
  for (const s of stars) {
    s.y += s.z * s.z * 40 * dt * S; if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
    s.t += dt;
    const a = .35 + .65 * Math.abs(Math.sin(s.t * (1 + s.z)));
    g.globalAlpha = a * s.z;
    g.fillStyle = s.z > .8 ? '#fff6dc' : '#cfe7ff';
    const r = s.z * 1.6;
    g.fillRect(s.x, s.y, r, r);
  }
  g.globalAlpha = 1;
  if (skyline) g.drawImage(skyline.c, 0, H - skyline.h, W, skyline.h);
}

/* ---------------- audio (WebAudio synth) ---------------- */
let AC = null, master = null, muted = false, musicTimer = 0, musicStep = 0;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination);
  } catch (e) { AC = null; }
}
function tone(freq, dur, type = 'square', vol = .08, slide = 0) {
  if (!AC || muted) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol = .25, freq = 900) {
  if (!AC || muted) return;
  const t = AC.currentTime, len = Math.floor(AC.sampleRate * dur);
  const buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  src.buffer = buf; f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}
const SFX = {
  shoot: () => tone(880 + Math.random() * 80, .06, 'square', .025, .6),
  hit: () => tone(320, .05, 'triangle', .05, .7),
  boom: (big) => { noise(big ? .9 : .35, big ? .45 : .22, big ? 1400 : 900); tone(big ? 90 : 140, big ? .6 : .25, 'sine', .15, .4); },
  gem: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .12, 'triangle', .07), i * 55)); },
  hurt: () => { tone(220, .35, 'sawtooth', .09, .4); noise(.3, .2, 600); },
  bomb: () => { noise(1.2, .5, 2400); tone(60, 1, 'sine', .25, .5); },
};
// gentle pentatonic arpeggio in a maqom-like mode
const SCALE = [146.8, 164.8, 174.6, 220, 233.1, 293.7, 329.6, 349.2, 440];
function musicTick(dt) {
  if (!AC || muted || state !== 'play') return;
  musicTimer -= dt;
  if (musicTimer <= 0) {
    musicTimer = .32;
    const pat = [0, 3, 5, 3, 6, 5, 3, 1, 0, 4, 5, 7, 6, 5, 4, 3];
    const n = SCALE[pat[musicStep % pat.length]];
    tone(n, .5, 'triangle', .035);
    if (musicStep % 4 === 0) tone(SCALE[0] / 2, 1.2, 'sine', .05);
    musicStep++;
  }
}

/* ---------------- game state ---------------- */
let state = 'menu'; // menu | play | pause | over
let player, bullets, ebullets, enemies, parts, gems, floaters;
let score, wave, combo, comboTimer, lives, bombCharge, shake, spawnQueue, waveDelay, boss, slowmo;
const keys = {};
const pointer = { active: false, x: 0, y: 0 };

function reset() {
  player = { x: W / 2, y: H * .8, tx: W / 2, ty: H * .8, cd: 0, inv: 2, spread: 0, rapid: 0, shield: 0 };
  bullets = []; ebullets = []; enemies = []; parts = []; gems = []; floaters = [];
  score = 0; wave = 0; combo = 1; comboTimer = 0; lives = 3; bombCharge = 0; shake = 0; spawnQueue = []; waveDelay = 1.2; boss = null; slowmo = 0;
  updateHud();
}

function banner(text, ms = 1600) {
  const b = $('banner'); b.textContent = text; b.classList.add('show');
  clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('show'), ms);
}

function startWave() {
  wave++;
  if (wave % 5 === 0) {
    const hp = 140 + wave * 40;
    boss = { x: W / 2, y: -160 * S, ty: H * .24, hp, max: hp, t: 0, rot: 0, phase: 0, cd: 1.5, r: 88 * S };
    $('bossUi').hidden = false;
    $('bossName').textContent = wave === 5 ? "ULUG' ROZETKA" : `ULUG' ROZETKA · ${wave / 5}-KO'RINISH`;
    banner(`${wave}-to'lqin · Ulug' Rozetka`);
  } else {
    banner(`${wave}-to'lqin`, 1200);
    const count = 6 + wave * 2;
    const formations = ['line', 'vee', 'sine', 'swarm'];
    let t = .3;
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const type = wave >= 3 && r < .18 ? 'hex' : wave >= 2 && r < .45 ? 'kite' : 'star';
      const f = formations[(wave + Math.floor(i / 6)) % formations.length];
      spawnQueue.push({ t, type, f, i: i % 6 });
      t += f === 'swarm' ? .18 : .32;
    }
  }
  updateHud();
}

function spawnEnemy(q) {
  const lane = (q.i + .5) / 6;
  const base = { t: 0, type: q.type, f: q.f, hit: 0, cd: 1 + Math.random() * 2.5 };
  const sp = 1 + wave * .06;
  if (q.type === 'star') Object.assign(base, { x: W * (.12 + lane * .76), y: -30 * S, hp: 2 + Math.floor(wave / 4), r: 18 * S, vy: 70 * S * sp, amp: (q.f === 'sine' ? 90 : 40) * S, ph: q.i, score: 100 });
  if (q.type === 'kite') Object.assign(base, { x: Math.random() * W, y: -30 * S, hp: 1 + Math.floor(wave / 5), r: 15 * S, vy: 120 * S * sp, vx: 0, score: 150 });
  if (q.type === 'hex') Object.assign(base, { x: W * (.2 + Math.random() * .6), y: -40 * S, hp: 7 + wave, r: 24 * S, vy: 45 * S * sp, score: 300, stopY: H * (.15 + Math.random() * .2) });
  base.x0 = base.x;
  enemies.push(base);
}

function burst(x, y, color, n = 18, speed = 220, life = .7, size = 1) {
  if (reduceMotion) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random()) * S;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (.6 + Math.random() * .6), max: life, c: color, s: (6 + Math.random() * 10) * size * S });
  }
}
function ring(x, y, color, r) { parts.push({ ring: true, x, y, r: 4, max: .5, life: .5, R: r, c: color }); }

function addScore(v, x, y) {
  const pts = Math.round(v * combo);
  score += pts;
  floaters.push({ x, y, t: 0, txt: '+' + pts });
  combo = Math.min(combo + .1, 8); comboTimer = 2.2;
  bombCharge = Math.min(1, bombCharge + .025);
}

function hurtPlayer() {
  if (player.inv > 0) return;
  if (player.shield > 0) { player.shield = 0; player.inv = 1; ring(player.x, player.y, COL.blue, 80 * S); tone(600, .2, 'sine', .08, .5); return; }
  lives--; combo = 1; player.inv = 2.2; shake = 18; SFX.hurt();
  burst(player.x, player.y, COL.rose, 40, 300, 1);
  updateHud();
  if (lives <= 0) gameOver();
}

function useBomb() {
  if (state !== 'play' || bombCharge < 1) return;
  bombCharge = 0; SFX.bomb(); shake = 24; slowmo = .4;
  ring(player.x, player.y, COL.gold, Math.hypot(W, H));
  for (const e of enemies) { burst(e.x, e.y, COL.gold, 16); addScore(e.score * .5, e.x, e.y); }
  enemies = []; ebullets = [];
  if (boss) { boss.hp -= boss.max * .2; }
  updateHud();
}

function dropGem(x, y, force) {
  const r = Math.random();
  if (!force && r > .14) return;
  const types = ['spread', 'rapid', 'shield', lives < 3 ? 'life' : 'spread'];
  gems.push({ x, y, vy: 80 * S, t: 0, type: types[Math.floor(Math.random() * types.length)] });
}

/* ---------------- update ---------------- */
function update(dt) {
  if (slowmo > 0) { slowmo -= dt; dt *= .35; }
  const p = player;
  // movement
  const kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  const ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  if (kx || ky) { p.tx += kx * 520 * S * dt; p.ty += ky * 520 * S * dt; }
  else if (pointer.active) { p.tx = pointer.x; p.ty = pointer.y - 40 * S * (pointer.touch ? 1 : 0); }
  const top = H * .35, pad = 24 * S;
  p.tx = Math.max(pad, Math.min(W - pad, p.tx)); p.ty = Math.max(top, Math.min(H - pad * 1.5, p.ty));
  const k = 1 - Math.pow(.0005, dt);
  p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
  p.inv = Math.max(0, p.inv - dt); p.spread = Math.max(0, p.spread - dt); p.rapid = Math.max(0, p.rapid - dt); p.shield = Math.max(0, p.shield - dt);

  // firing
  p.cd -= dt;
  if (p.cd <= 0) {
    p.cd = p.rapid > 0 ? .07 : .13;
    const v = -820 * S;
    bullets.push({ x: p.x, y: p.y - 26 * S, vx: 0, vy: v });
    if (p.spread > 0) { for (const a of [-.18, .18, -.36, .36]) bullets.push({ x: p.x, y: p.y - 20 * S, vx: Math.sin(a) * -v, vy: Math.cos(a) * v }); }
    else { bullets.push({ x: p.x - 12 * S, y: p.y - 10 * S, vx: 0, vy: v }); bullets.push({ x: p.x + 12 * S, y: p.y - 10 * S, vx: 0, vy: v }); }
    SFX.shoot();
  }
  // engine trail
  if (Math.random() < .9) parts.push({ x: p.x + (Math.random() - .5) * 8 * S, y: p.y + 18 * S, vx: 0, vy: 160 * S, life: .3, max: .3, c: COL.turq, s: 8 * S });

  for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  bullets = bullets.filter(b => b.y > -20 && b.x > -20 && b.x < W + 20);
  for (const b of ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  ebullets = ebullets.filter(b => b.y < H + 20 && b.y > -40 && b.x > -20 && b.x < W + 20);

  // waves
  if (!boss && spawnQueue.length === 0 && enemies.length === 0) {
    waveDelay -= dt;
    if (waveDelay <= 0) { startWave(); waveDelay = 1.6; }
  }
  for (const q of spawnQueue) q.t -= dt;
  while (spawnQueue.length && spawnQueue[0].t <= 0) spawnEnemy(spawnQueue.shift());

  // enemies
  for (const e of enemies) {
    e.t += dt; e.hit = Math.max(0, e.hit - dt);
    if (e.type === 'star') { e.y += e.vy * dt; e.x = e.x0 + Math.sin(e.t * 2 + e.ph) * e.amp; }
    if (e.type === 'kite') {
      if (e.t < .9) e.y += e.vy * .6 * dt;
      else { const dx = p.x - e.x; e.vx += Math.sign(dx) * 260 * S * dt; e.vx *= .985; e.x += e.vx * dt; e.y += e.vy * 1.6 * dt; }
    }
    if (e.type === 'hex') {
      if (e.y < e.stopY) e.y += e.vy * dt; else { e.x += Math.sin(e.t) * 40 * S * dt; e.y += 6 * S * dt; }
    }
    e.cd -= dt;
    if (e.cd <= 0 && e.y > 0) {
      if (e.type === 'hex') {
        e.cd = 2.2 - Math.min(wave * .05, .8);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + e.t; ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150 * S, vy: Math.sin(a) * 150 * S }); }
      } else if (e.type === 'star' && Math.random() < .5 + wave * .03) {
        e.cd = 2.5 + Math.random() * 2;
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 210 * S, vy: Math.sin(a) * 210 * S });
      } else e.cd = 1.5;
    }
    if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 14 * S) { e.hp = 0; e.dead = true; burst(e.x, e.y, COL.rose, 24); hurtPlayer(); }
  }
  // enemies that slip past hit the city
  for (const e of enemies) if (e.y > H + 30 && !e.dead) { e.dead = true; e.escaped = true; }
  if (enemies.some(e => e.escaped)) { combo = 1; }

  // boss
  if (boss) {
    const B = boss;
    B.t += dt; B.rot += dt * (.4 + B.phase * .3); B.y += (B.ty - B.y) * Math.min(1, dt * 1.2);
    B.x = W / 2 + Math.sin(B.t * .6) * W * .28;
    B.phase = B.hp < B.max * .35 ? 2 : B.hp < B.max * .7 ? 1 : 0;
    B.cd -= dt;
    if (B.cd <= 0 && B.y > 0) {
      if (B.phase === 0) { B.cd = 1.1; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + B.rot; ebullets.push({ x: B.x, y: B.y, vx: Math.cos(a) * 170 * S, vy: Math.sin(a) * 170 * S }); } }
      else if (B.phase === 1) { B.cd = .12; const a = B.t * 3.2; for (const o of [0, Math.PI]) ebullets.push({ x: B.x, y: B.y, vx: Math.cos(a + o) * 200 * S, vy: Math.sin(a + o) * 200 * S }); }
      else { B.cd = .7; const a0 = Math.atan2(p.y - B.y, p.x - B.x); for (let i = -3; i <= 3; i++) { const a = a0 + i * .13; ebullets.push({ x: B.x, y: B.y, vx: Math.cos(a) * 260 * S, vy: Math.sin(a) * 260 * S }); }
        if (Math.random() < .25 && enemies.length < 6) spawnEnemy({ type: 'kite', f: 'line', i: Math.floor(Math.random() * 6) }); }
    }
    $('bossBar').style.width = Math.max(0, B.hp / B.max * 100) + '%';
  }

  // collisions: player bullets
  for (const b of bullets) {
    for (const e of enemies) {
      if (!e.dead && Math.abs(b.x - e.x) < e.r && Math.abs(b.y - e.y) < e.r) {
        b.dead = true; e.hp--; e.hit = .08; SFX.hit();
        parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: .15, max: .15, c: COL.ivory, s: 18 * S });
        if (e.hp <= 0) { e.dead = true; burst(e.x, e.y, e.type === 'kite' ? COL.rose : e.type === 'hex' ? COL.gold : COL.turq, e.type === 'hex' ? 36 : 22); ring(e.x, e.y, COL.gold, e.r * 3);
          addScore(e.score, e.x, e.y); SFX.boom(false); shake = Math.max(shake, e.type === 'hex' ? 8 : 3); dropGem(e.x, e.y, e.type === 'hex'); }
        break;
      }
    }
    if (boss && !b.dead && Math.hypot(b.x - boss.x, b.y - boss.y) < boss.r) {
      b.dead = true; boss.hp--; boss.hit = .06; if (Math.random() < .3) SFX.hit();
      parts.push({ x: b.x, y: b.y, vx: (Math.random() - .5) * 100, vy: -60, life: .2, max: .2, c: COL.gold, s: 14 * S });
      score += 10;
    }
  }
  bullets = bullets.filter(b => !b.dead);
  enemies = enemies.filter(e => !e.dead);

  if (boss && boss.hp <= 0) {
    const B = boss; boss = null; $('bossUi').hidden = true;
    for (let i = 0; i < 6; i++) setTimeout(() => { burst(B.x + (Math.random() - .5) * 120 * S, B.y + (Math.random() - .5) * 120 * S, i % 2 ? COL.gold : COL.turq, 40, 380, 1.2, 1.3); SFX.boom(true); }, i * 140);
    ring(B.x, B.y, COL.gold, 400 * S); shake = 30; slowmo = .8; ebullets = [];
    addScore(5000, B.x, B.y); dropGem(B.x - 30 * S, B.y, true); dropGem(B.x + 30 * S, B.y, true);
    banner("Rozetka yengildi!", 1800);
  }

  // enemy bullets vs player
  for (const b of ebullets) if (Math.hypot(b.x - p.x, b.y - p.y) < 10 * S) { b.dead = true; hurtPlayer(); }
  ebullets = ebullets.filter(b => !b.dead);
  if (boss && Math.hypot(boss.x - p.x, boss.y - p.y) < boss.r * .8) hurtPlayer();

  // gems
  for (const g of gems) {
    g.t += dt; g.y += g.vy * dt; g.x += Math.sin(g.t * 3) * 30 * S * dt;
    if (Math.hypot(g.x - p.x, g.y - p.y) < 30 * S) {
      g.dead = true; SFX.gem(); ring(g.x, g.y, COL.ivory, 50 * S);
      if (g.type === 'spread') { p.spread = 10; floaters.push({ x: g.x, y: g.y, t: 0, txt: "TARQOQ O'Q" }); }
      if (g.type === 'rapid') { p.rapid = 10; floaters.push({ x: g.x, y: g.y, t: 0, txt: 'TEZKOR' }); }
      if (g.type === 'shield') { p.shield = 12; floaters.push({ x: g.x, y: g.y, t: 0, txt: 'QALQON' }); }
      if (g.type === 'life') { lives = Math.min(5, lives + 1); floaters.push({ x: g.x, y: g.y, t: 0, txt: 'GUMBAZ +1' }); updateHud(); }
    }
  }
  gems = gems.filter(g => !g.dead && g.y < H + 30);

  // combo decay
  comboTimer -= dt; if (comboTimer <= 0 && combo > 1) combo = Math.max(1, combo - dt * 2);

  // particles
  for (const q of parts) { q.life -= dt; if (!q.ring) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .96; q.vy *= .96; } }
  parts = parts.filter(q => q.life > 0);
  for (const f of floaters) f.t += dt;
  floaters = floaters.filter(f => f.t < 1);
  shake = Math.max(0, shake - dt * 40);
  updateHudLive();
}

/* ---------------- render ---------------- */
function draw(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBackground(dt);
  const sx = !reduceMotion && shake ? (Math.random() - .5) * shake * S : 0;
  const sy = !reduceMotion && shake ? (Math.random() - .5) * shake * S : 0;
  ctx.translate(sx, sy);
  if (state === 'menu') { drawMenuScene(); return; }

  const blit = (spr, x, y, rot = 0, scale = 1, alpha = 1) => {
    const s = spr.size * scale;
    ctx.globalAlpha = alpha;
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(spr, -s / 2, -s / 2, s, s); ctx.restore(); }
    else ctx.drawImage(spr, x - s / 2, y - s / 2, s, s);
    ctx.globalAlpha = 1;
  };

  for (const g of gems) blit(SPR.gem[g.type], g.x, g.y, g.t * 2, 1 + Math.sin(g.t * 6) * .08);
  for (const e of enemies) {
    const spr = SPR[e.type];
    const rot = e.type === 'star' ? e.t * 1.6 : e.type === 'hex' ? e.t * .7 : Math.atan2(e.vx || 0, 200) * -1;
    blit(spr, e.x, e.y, rot, e.hit ? 1.15 : 1);
    if (e.hit) { ctx.globalCompositeOperation = 'lighter'; blit(spr, e.x, e.y, rot, 1.15, .6); ctx.globalCompositeOperation = 'source-over'; }
  }
  if (boss) {
    blit(SPR.boss, boss.x, boss.y, boss.rot);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(232,182,76,${.25 + Math.sin(boss.t * 4) * .15})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r * 1.18, 0, 7); ctx.stroke();
    if (boss.hit > 0) { boss.hit -= dt; blit(SPR.boss, boss.x, boss.y, boss.rot, 1, .4); }
    ctx.restore();
  }

  // bullets (additive glow)
  ctx.globalCompositeOperation = 'lighter';
  for (const b of bullets) blit(SPR.pb, b.x, b.y, Math.atan2(b.vx, -b.vy));
  for (const b of ebullets) blit(SPR.eb, b.x, b.y);
  // particles
  for (const q of parts) {
    const a = Math.max(0, q.life / q.max);
    if (q.ring) {
      const r = q.R * (1 - a) + 4;
      ctx.strokeStyle = q.c; ctx.globalAlpha = a * .8; ctx.lineWidth = 3 * a + .5;
      ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = a;
      const s = q.s * (.4 + a * .6);
      ctx.drawImage(tinted(q.c), q.x - s / 2, q.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // player
  const p = player;
  if (lives > 0 && !(p.inv > 0 && Math.floor(p.inv * 12) % 2)) {
    const tilt = Math.max(-.35, Math.min(.35, (p.tx - p.x) * .01));
    blit(SPR.ship, p.x, p.y, tilt);
  }
  if (p.shield > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(122,162,255,${.5 + Math.sin(performance.now() / 120) * .2})`; ctx.lineWidth = 2.5;
    starPath(ctx, 8, 36 * S, 32 * S, performance.now() / 900); ctx.translate(0, 0);
    ctx.save(); ctx.translate(p.x, p.y); starPath(ctx, 8, 36 * S, 32 * S, performance.now() / 900); ctx.stroke(); ctx.restore();
    ctx.restore();
  }
  // floaters
  ctx.textAlign = 'center';
  for (const f of floaters) {
    ctx.globalAlpha = 1 - f.t;
    ctx.font = `800 ${Math.round(13 * S + 4)}px Manrope, system-ui, sans-serif`;
    ctx.fillStyle = f.txt.startsWith('+') ? COL.ivory : COL.gold;
    ctx.fillText(f.txt, f.x, f.y - f.t * 40 * S);
  }
  ctx.globalAlpha = 1;
}

const tintCache = {};
function tinted(color) {
  if (tintCache[color]) return tintCache[color];
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return (tintCache[color] = c);
}

let menuT = 0;
function drawMenuScene() {
  menuT += 1 / 60;
  // drifting girih stars behind the start panel
  for (let i = 0; i < 7; i++) {
    const x = W * ((i * .17 + menuT * .02) % 1.1 - .05);
    const y = H * (.15 + (i % 3) * .2) + Math.sin(menuT + i) * 20 * S;
    const spr = i % 3 === 0 ? SPR.hex : SPR.star;
    const s = spr.size;
    ctx.save(); ctx.translate(x, y); ctx.rotate(menuT * (i % 2 ? .6 : -.5)); ctx.globalAlpha = .55; ctx.drawImage(spr, -s / 2, -s / 2, s, s); ctx.restore();
  }
  ctx.globalAlpha = 1;
  const s = SPR.ship.size;
  ctx.drawImage(SPR.ship, W / 2 - s / 2, H * .8 + Math.sin(menuT * 2) * 6 * S - s / 2, s, s);
}

/* ---------------- HUD ---------------- */
let lastHud = {};
function updateHud() {
  const L = $('lives'); L.innerHTML = '';
  for (let i = 0; i < Math.max(3, lives); i++) { const sp = document.createElement('span'); if (i >= lives) sp.className = 'off'; L.appendChild(sp); }
  $('wave').textContent = Math.max(1, wave);
  updateHudLive(true);
}
function updateHudLive(force) {
  const sc = score.toLocaleString('en-US').replace(/,/g, ' ');
  if (force || lastHud.sc !== sc) { $('score').textContent = sc; lastHud.sc = sc; }
  const cb = 'x' + combo.toFixed(1);
  if (force || lastHud.cb !== cb) { $('combo').textContent = cb; lastHud.cb = cb; }
  const bm = Math.round(bombCharge * 100);
  if (force || lastHud.bm !== bm) { $('bombMeter').style.width = bm + '%'; $('bombBtn').disabled = bm < 100; lastHud.bm = bm; }
}

/* ---------------- flow ---------------- */
function setState(s) {
  state = s;
  $('startPanel').hidden = s !== 'menu';
  $('pausePanel').hidden = s !== 'pause';
  $('overPanel').hidden = s !== 'over';
  const inGame = s === 'play' || s === 'pause';
  $('hud').hidden = !inGame; $('bombUi').hidden = !inGame;
  if (!inGame) $('bossUi').hidden = true;
}
function startGame() { initAudio(); reset(); setState('play'); musicStep = 0; }
function gameOver() {
  setTimeout(() => {
    setState('over');
    const isBest = score > best;
    if (isBest) { best = score; store.set('samarqand-best', String(best)); }
    $('finalScore').textContent = score.toLocaleString('en-US').replace(/,/g, ' ');
    $('finalRecord').textContent = isBest ? 'Yangi rekord!' : `Rekord: ${best.toLocaleString('en-US').replace(/,/g, ' ')}`;
    $('overEyebrow').textContent = `${wave}-to'lqinda gumbazlar qulab tushdi`;
  }, 900);
}
function togglePause() {
  if (state === 'play') setState('pause');
  else if (state === 'pause') { setState('play'); last = performance.now(); }
}
function toggleMute() { muted = !muted; $('muteBtn').textContent = muted ? '×' : '♪'; $('muteBtn').setAttribute('aria-label', muted ? "Ovozni yoqish" : "Ovozni o'chirish"); }

$('startBtn').onclick = startGame;
$('againBtn').onclick = startGame;
$('resumeBtn').onclick = togglePause;
$('pauseBtn').onclick = togglePause;
$('muteBtn').onclick = toggleMute;
$('bombBtn').onclick = useBomb;
$('bestStart').textContent = best ? `Sizning rekordingiz: ${best.toLocaleString('en-US').replace(/,/g, ' ')}` : "Rekord shu qurilmada saqlanadi.";

addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[k] = true;
  if (k === ' ' ) { e.preventDefault(); if (state === 'play') useBomb(); else if (state === 'menu' || state === 'over') startGame(); }
  if (k === 'p' || k === 'Escape') togglePause();
  if (k === 'm') toggleMute();
  if (k.startsWith('Arrow')) e.preventDefault();
  if (k === 'Enter' && (state === 'menu' || state === 'over')) startGame();
});
addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = false; });
function ptr(e) {
  const r = cv.getBoundingClientRect();
  pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = true; pointer.touch = e.pointerType === 'touch';
}
cv.addEventListener('pointermove', ptr);
cv.addEventListener('pointerdown', e => { ptr(e); initAudio(); });
cv.addEventListener('pointerleave', () => { if (!pointer.touch) pointer.active = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') setState('pause'); });

/* ---------------- sizing & loop ---------------- */
function resize() {
  const r = app.getBoundingClientRect();
  W = Math.max(320, r.width); H = Math.max(360, r.height);
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  S = Math.max(.6, Math.min(1.3, Math.min(W, H) / 720));
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  buildSprites(); buildBackground();
  if (player) { player.tx = Math.min(player.tx, W); player.x = Math.min(player.x, W); }
}
addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });
resize();
reset();
setState('menu');

let last = performance.now();
function frame(now) {
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'play') { update(dt); musicTick(dt); }
  draw(state === 'play' || state === 'menu' ? dt : 0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
