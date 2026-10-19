/* =====================================================================
   QUM JANGI — brauzer uchun 3D FPS (Three.js r128)
   Ko'k jamoa (siz + 3 bot) va Qizil jamoa (5 bot) o'rtasidagi jang.
   ===================================================================== */
(() => {
"use strict";
if (!window.THREE) {
  document.getElementById('loading').textContent = "Three.js yuklanmadi. Internetga ulanganingizni tekshiring.";
  return;
}
const T = THREE;
const $ = id => document.getElementById(id);

/* ------------------------------ SOZLAMALAR ------------------------------ */
const CFG = {
  killsToWin: 30,
  matchTime: 300,
  playerSpeed: 5.6,
  walkSpeed: 2.6,
  jumpSpeed: 6.8,
  gravity: 18,
  eye: 1.62,
  radius: 0.38,
  respawn: 3,
  botsPerTeam: { blue: 3, red: 5 },
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
let sens = parseFloat(store.get('qj-sens', '1')) || 1;
let volume = parseFloat(store.get('qj-vol', '0.6'));
if (isNaN(volume)) volume = 0.6;

const WEAPONS = [
  { name: 'AVTOMAT', dmg: 30, head: 2.5, rate: 0.1, auto: true, mag: 30, reserve: 120, reload: 2.3, spread: 0.004, moveSpread: 0.035, recoil: 0.011, zoom: 50, range: 120, snd: 'rifle' },
  { name: "TO'PPONCHA", dmg: 26, head: 2.5, rate: 0.17, auto: false, mag: 12, reserve: 48, reload: 1.5, spread: 0.008, moveSpread: 0.025, recoil: 0.02, zoom: 60, range: 80, snd: 'pistol' },
  { name: 'SNAYPER', dmg: 105, head: 2.5, rate: 1.25, auto: false, mag: 5, reserve: 20, reload: 3.0, spread: 0.07, moveSpread: 0.12, recoil: 0.05, zoom: 18, range: 300, snd: 'sniper', scope: true },
];

/* ------------------------------ RENDERER ------------------------------ */
const game = $('game');
const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.autoClear = false;
renderer.domElement.className = 'view';
game.prepend(renderer.domElement);

const scene = new T.Scene();
scene.fog = new T.Fog(0xe8d3ae, 35, 140);
const camera = new T.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 500);
camera.rotation.order = 'YXZ';
const viewScene = new T.Scene();           // qurol modeli alohida sahnada (devorga kirib ketmasligi uchun)
const viewCam = new T.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 10);

/* ------------------------------ TEKSTURALAR (canvas'da chiziladi) ------------------------------ */
function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function noise(g, s, n, colors, rmin, rmax, alpha = 1) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * Math.random();
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    const r = rmin + Math.random() * (rmax - rmin);
    g.fillRect(Math.random() * s, Math.random() * s, r, r);
  }
  g.globalAlpha = 1;
}
const TEX = {
  sand: canvasTex(512, (g, s) => {
    g.fillStyle = '#c9a46a'; g.fillRect(0, 0, s, s);
    noise(g, s, 9000, ['#b8925a', '#d8b57c', '#a98550', '#e0c18e'], 1, 3, .7);
    for (let i = 0; i < 40; i++) { g.globalAlpha = .08; g.fillStyle = '#8c6b3d'; g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 20 + Math.random() * 60, 6 + Math.random() * 14, Math.random() * 3, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  }, 18),
  plaster: canvasTex(512, (g, s) => {
    g.fillStyle = '#d6bf98'; g.fillRect(0, 0, s, s);
    noise(g, s, 6000, ['#c7ad83', '#e2cfaa', '#bba078'], 2, 6, .5);
    for (let i = 0; i < 25; i++) { g.globalAlpha = .12; g.fillStyle = '#9e8358'; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 10 + Math.random() * 50, 0, 7); g.fill(); }
    g.globalAlpha = .25; g.fillStyle = '#7d6440'; g.fillRect(0, s - 30, s, 30);
    g.globalAlpha = 1;
  }),
  brick: canvasTex(512, (g, s) => {
    g.fillStyle = '#8f6a45'; g.fillRect(0, 0, s, s);
    const bh = 32, bw = 64;
    for (let y = 0; y < s; y += bh) for (let x = -(y / bh % 2) * bw / 2; x < s; x += bw) {
      const v = 150 + Math.random() * 40 | 0;
      g.fillStyle = `rgb(${v + 30},${v - 10},${v - 60})`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
    noise(g, s, 4000, ['#6b4c2c', '#c49a6a'], 1, 3, .4);
  }),
  crate: canvasTex(256, (g, s) => {
    g.fillStyle = '#8a5f32'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#7c5329' : '#946738'; g.fillRect(0, i * s / 6, s, s / 6 - 2); }
    noise(g, s, 1500, ['#5e3f1e', '#a87843'], 1, 2, .5);
    g.strokeStyle = '#4e3418'; g.lineWidth = 18; g.strokeRect(9, 9, s - 18, s - 18);
    g.lineWidth = 14; g.beginPath(); g.moveTo(14, 14); g.lineTo(s - 14, s - 14); g.stroke();
  }),
  tile: canvasTex(256, (g, s) => {
    g.fillStyle = '#1f6f8b'; g.fillRect(0, 0, s, s);
    const star = (cx, cy, R, r, col) => { g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fillStyle = col; g.fill(); };
    for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]]) { star(x, y, 60, 38, '#2fb8c4'); star(x, y, 30, 18, '#f0d48a'); }
    g.strokeStyle = 'rgba(10,30,50,.5)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  }),
  container: (col) => canvasTex(256, (g, s) => {
    g.fillStyle = col; g.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 16) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 5, s); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 8, 0, 3, s); }
    noise(g, s, 900, ['#5b3a1f', '#2a1a0d'], 1, 4, .35);
  }),
};

const MAT = {
  sand: new T.MeshStandardMaterial({ map: TEX.sand, roughness: 1 }),
  plaster: new T.MeshStandardMaterial({ map: TEX.plaster, roughness: .95 }),
  brick: new T.MeshStandardMaterial({ map: TEX.brick, roughness: .9 }),
  crate: new T.MeshStandardMaterial({ map: TEX.crate, roughness: .85 }),
  tile: new T.MeshStandardMaterial({ map: TEX.tile, roughness: .35, metalness: .1 }),
  contBlue: new T.MeshStandardMaterial({ map: TEX.container('#2c5d8f'), roughness: .6, metalness: .4 }),
  contRed: new T.MeshStandardMaterial({ map: TEX.container('#8f2f2c'), roughness: .6, metalness: .4 }),
  contGreen: new T.MeshStandardMaterial({ map: TEX.container('#3f6b3a'), roughness: .6, metalness: .4 }),
  wood: new T.MeshStandardMaterial({ color: 0x6b4a2b, roughness: .9 }),
  cloth1: new T.MeshStandardMaterial({ color: 0xb8322e, roughness: 1, side: T.DoubleSide }),
  cloth2: new T.MeshStandardMaterial({ color: 0x2e6fb8, roughness: 1, side: T.DoubleSide }),
  cloth3: new T.MeshStandardMaterial({ color: 0xd9a028, roughness: 1, side: T.DoubleSide }),
};

/* ------------------------------ OSMON VA YORUG'LIK ------------------------------ */
{
  const skyGeo = new T.SphereGeometry(300, 32, 16);
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: new T.Vector3(.45, .55, .35).normalize() } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 sunDir;
      void main(){ float h = clamp(vP.y, -0.2, 1.0);
        vec3 top = vec3(0.28,0.52,0.86), hor = vec3(0.98,0.86,0.66), low = vec3(0.86,0.72,0.52);
        vec3 c = mix(hor, top, pow(max(h,0.0), 0.55)); if (h < 0.0) c = mix(hor, low, -h*5.0);
        float s = max(dot(vP, sunDir), 0.0); c += vec3(1.0,0.85,0.55) * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.35);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  scene.add(new T.Mesh(skyGeo, skyMat));
  scene.add(new T.HemisphereLight(0xcfe2ff, 0xb08a58, 0.75));
  const sun = new T.DirectionalLight(0xffe2b5, 2.1);
  sun.position.set(45, 55, 35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 10; sc.far = 160;
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  scene.add(sun);
  viewScene.add(new T.HemisphereLight(0xfff1dc, 0x6a5232, 1.1));
  const vs = new T.DirectionalLight(0xffffff, 1.2); vs.position.set(1, 2, 1); viewScene.add(vs);
}

/* ------------------------------ XARITA: "Buxoro bozori" ------------------------------ */
const colliders = [];   // {minX,maxX,minZ,maxZ,maxY}
const solids = [];      // o'q tegishi mumkin bo'lgan meshlar
const mapRects = [];    // minimap uchun
const HALF = 32;

function box(x, z, w, d, h, mat, opts = {}) {
  const y0 = opts.y || 0;
  const geo = new T.BoxGeometry(w, h, d);
  if (opts.uv) { // teksturani o'lchamga moslash
    const uv = geo.attributes.uv, pos = geo.attributes.position, nor = geo.attributes.normal;
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
      const px = pos.getX(i) + w / 2, py = pos.getY(i) + h / 2, pz = pos.getZ(i) + d / 2;
      if (ny > .5) uv.setXY(i, px / opts.uv, pz / opts.uv);
      else if (nx > .5) uv.setXY(i, pz / opts.uv, py / opts.uv);
      else uv.setXY(i, px / opts.uv, py / opts.uv);
    }
  }
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y0 + h / 2, z);
  m.castShadow = opts.cast !== false; m.receiveShadow = true;
  scene.add(m);
  if (opts.solid !== false) {
    solids.push(m);
    if (y0 < 1.5) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, maxY: y0 + h, minY: y0 });
      mapRects.push({ x, z, w, d, h: y0 + h });
    }
  }
  return m;
}

function buildMap() {
  // yer
  const ground = new T.Mesh(new T.PlaneGeometry(HALF * 2 + 40, HALF * 2 + 40), MAT.sand);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); solids.push(ground);

  // tashqi devorlar
  const W = 6;
  box(0, -HALF, HALF * 2 + 2, 2, W, MAT.brick, { uv: 4 });
  box(0, HALF, HALF * 2 + 2, 2, W, MAT.brick, { uv: 4 });
  box(-HALF, 0, 2, HALF * 2, W, MAT.brick, { uv: 4 });
  box(HALF, 0, 2, HALF * 2, W, MAT.brick, { uv: 4 });

  // markaziy bino (gumbazli)
  const B = 7, th = .8, H = 5, door = 3.2;
  const wallSeg = (x, z, w, d) => box(x, z, w, d, H, MAT.plaster, { uv: 4 });
  const sideLen = (B * 2 - door) / 2;
  for (const s of [-1, 1]) {
    wallSeg(-B + sideLen / 2, s * B, sideLen, th); wallSeg(B - sideLen / 2, s * B, sideLen, th);
    wallSeg(s * B, -B + sideLen / 2, th, sideLen); wallSeg(s * B, B - sideLen / 2, th, sideLen);
    // eshik tepasi
    box(0, s * B, door, th, 1.3, MAT.plaster, { y: H - 1.3, uv: 4 });
    box(s * B, 0, th, door, 1.3, MAT.plaster, { y: H - 1.3, uv: 4 });
  }
  box(0, 0, B * 2 + 1, B * 2 + 1, .5, MAT.plaster, { y: H, uv: 4 });              // tom
  box(0, 0, B * 2 + 1.6, B * 2 + 1.6, .6, MAT.tile, { y: H - .6, uv: 2, solid: false }); // koshinli kamar
  const drum = new T.Mesh(new T.CylinderGeometry(4.2, 4.6, 1.4, 32), MAT.plaster);
  drum.position.set(0, H + 1.2, 0); drum.castShadow = true; scene.add(drum);
  const domeMat = MAT.tile.clone(); domeMat.map = TEX.tile.clone(); domeMat.map.repeat.set(6, 3); domeMat.map.needsUpdate = true;
  const dome = new T.Mesh(new T.SphereGeometry(4.3, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.set(0, H + 1.9, 0); dome.scale.y = 1.25; dome.castShadow = true; scene.add(dome);
  // bino ichida
  box(-3.5, -3.5, 1.4, 1.4, 1.2, MAT.crate); box(3.6, 3.2, 1.4, 1.4, 1.2, MAT.crate); box(3.6, 3.2, 1.2, 1.2, 1.1, MAT.crate, { y: 1.2 });
  box(-3.8, 3.8, 2.6, 1, 1.1, MAT.wood);

  // minoralar
  for (const [x, z] of [[-HALF + 3, -HALF + 3], [HALF - 3, HALF - 3]]) {
    const t = new T.Mesh(new T.CylinderGeometry(1.1, 1.5, 16, 20), MAT.brick); t.position.set(x, 8, z); t.castShadow = true; scene.add(t); solids.push(t);
    colliders.push({ minX: x - 1.5, maxX: x + 1.5, minZ: z - 1.5, maxZ: z + 1.5, maxY: 16, minY: 0 }); mapRects.push({ x, z, w: 3, d: 3, h: 16 });
    const band = new T.Mesh(new T.CylinderGeometry(1.45, 1.45, 1.2, 20), MAT.tile); band.position.set(x, 13.5, z); scene.add(band);
    const cap = new T.Mesh(new T.ConeGeometry(1.3, 2, 20), MAT.tile); cap.position.set(x, 17, z); scene.add(cap);
  }

  // yon ko'chalar (devor qatorlari)
  for (const s of [-1, 1]) {
    box(s * 15, -12, 1, 10, 3.6, MAT.plaster, { uv: 4 });
    box(s * 15, 12, 1, 10, 3.6, MAT.plaster, { uv: 4 });
    box(s * 21, 0, 8, 1, 3.6, MAT.plaster, { uv: 4 });
    // kamar (arka) ko'cha kirishida
    box(s * 15, -5.5, 1.2, 1.2, 4.2, MAT.brick, { uv: 2 });
    box(s * 15, 5.5, 1.2, 1.2, 4.2, MAT.brick, { uv: 2 });
  }
  // konteynerlar
  box(-22, -20, 6, 2.5, 2.6, MAT.contBlue, { uv: 3 });
  box(22, 20, 6, 2.5, 2.6, MAT.contRed, { uv: 3 });
  box(24, -14, 2.5, 6, 2.6, MAT.contGreen, { uv: 3 });
  box(-24, 14, 2.5, 6, 2.6, MAT.contGreen, { uv: 3 });
  box(-22, -20, 6, 2.5, 2.6, MAT.contRed, { y: 2.6, uv: 3, solid: true });
  // yashiklar
  const crates = [[-8, -18], [-9.4, -18], [8, 18], [9.4, 18], [-4, 13], [4, -13], [-20, 6], [20, -6], [-27, -8], [27, 8], [-11, 3], [11, -3], [0, -22], [0, 22], [-18, -26], [18, 26]];
  for (const [x, z] of crates) { box(x, z, 1.4, 1.4, 1.3, MAT.crate); if (Math.random() < .4) box(x + .1, z, 1.2, 1.2, 1.15, MAT.crate, { y: 1.3 }); }
  // bozor rastalari (ustunlar + mato soyabon)
  const cloths = [MAT.cloth1, MAT.cloth2, MAT.cloth3];
  const stalls = [[-24, -2], [24, 2], [-6, 26], [6, -26], [-26, 24], [26, -24]];
  stalls.forEach(([x, z], i) => {
    for (const [dx, dz] of [[-1.4, -1.1], [1.4, -1.1], [-1.4, 1.1], [1.4, 1.1]]) box(x + dx, z + dz, .18, .18, 2.6, MAT.wood);
    const roof = new T.Mesh(new T.PlaneGeometry(3.6, 3), cloths[i % 3]);
    roof.rotation.x = -Math.PI / 2 + .18; roof.position.set(x, 2.65, z); roof.castShadow = true; scene.add(roof);
    box(x, z, 2.6, .9, .9, MAT.wood); // peshtaxta
  });
  // qum tepaliklar (dekor)
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2, r = 46 + Math.random() * 30;
    const dune = new T.Mesh(new T.SphereGeometry(8 + Math.random() * 10, 16, 8), MAT.sand);
    dune.position.set(Math.cos(a) * r, -4, Math.sin(a) * r); dune.scale.y = .45; scene.add(dune);
  }
}
buildMap();

/* ------------------------------ NAVIGATSIYA (A*) ------------------------------ */
const NAV = { size: 1, n: HALF * 2, grid: null };
function buildNav() {
  const n = NAV.n; NAV.grid = new Uint8Array(n * n);
  for (let gz = 0; gz < n; gz++) for (let gx = 0; gx < n; gx++) {
    const x = gx - HALF + .5, z = gz - HALF + .5;
    let blocked = Math.abs(x) > HALF - 1.6 || Math.abs(z) > HALF - 1.6;
    if (!blocked) for (const c of colliders) {
      if (c.maxY > .6 && c.minY < 1.5 && x > c.minX - .55 && x < c.maxX + .55 && z > c.minZ - .55 && z < c.maxZ + .55) { blocked = true; break; }
    }
    NAV.grid[gz * n + gx] = blocked ? 1 : 0;
  }
}
buildNav();
const toCell = v => Math.max(0, Math.min(NAV.n - 1, Math.floor(v + HALF)));
const walkable = (gx, gz) => gx >= 0 && gz >= 0 && gx < NAV.n && gz < NAV.n && !NAV.grid[gz * NAV.n + gx];
function findPath(sx, sz, tx, tz) {
  const n = NAV.n;
  let a = [toCell(sx), toCell(sz)], b = [toCell(tx), toCell(tz)];
  if (!walkable(b[0], b[1])) return null;
  const start = a[1] * n + a[0], goal = b[1] * n + b[0];
  const g = new Float32Array(n * n).fill(Infinity), came = new Int32Array(n * n).fill(-1), closed = new Uint8Array(n * n);
  const open = [start]; g[start] = 0;
  const h = i => { const x = i % n, z = (i / n) | 0; return Math.hypot(x - b[0], z - b[1]); };
  const f = new Float32Array(n * n).fill(Infinity); f[start] = h(start);
  let guard = 0;
  while (open.length && guard++ < 6000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur === goal) break;
    closed[cur] = 1;
    const cx = cur % n, cz = (cur / n) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz;
      if (!walkable(nx, nz)) continue;
      if (dx && dz && (!walkable(cx + dx, cz) || !walkable(cx, cz + dz))) continue;
      const ni = nz * n + nx; if (closed[ni]) continue;
      const ng = g[cur] + (dx && dz ? 1.414 : 1);
      if (ng < g[ni]) { g[ni] = ng; f[ni] = ng + h(ni); came[ni] = cur; if (!open.includes(ni)) open.push(ni); }
    }
  }
  if (came[goal] === -1 && goal !== start) return null;
  const path = []; let c = goal;
  while (c !== -1 && c !== start) { path.push(new T.Vector3(c % n - HALF + .5, 0, ((c / n) | 0) - HALF + .5)); c = came[c]; }
  path.reverse();
  // yo'lni soddalashtirish: har 2-nuqtani olamiz
  return path.filter((p, i) => i % 2 === 1 || i === path.length - 1);
}
function randomWalkable(zMin = -HALF + 3, zMax = HALF - 3) {
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() * 2 - 1) * (HALF - 3), z = zMin + Math.random() * (zMax - zMin);
    if (walkable(toCell(x), toCell(z))) return new T.Vector3(x, 0, z);
  }
  return new T.Vector3(0, 0, 0);
}

/* ------------------------------ FIZIKA (to'qnashuv) ------------------------------ */
function groundAt(x, z, y, r) {
  let gy = 0;
  for (const c of colliders) {
    if (x > c.minX - r * .5 && x < c.maxX + r * .5 && z > c.minZ - r * .5 && z < c.maxZ + r * .5 && y >= c.maxY - .45) gy = Math.max(gy, c.maxY);
  }
  return gy;
}
function collide(pos, r, height = 1.8) {
  for (const c of colliders) {
    if (pos.y >= c.maxY - .45 || pos.y + height < c.minY) continue; // ustida turibdi
    const minX = c.minX - r, maxX = c.maxX + r, minZ = c.minZ - r, maxZ = c.maxZ + r;
    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      const dl = pos.x - minX, dr = maxX - pos.x, dn = pos.z - minZ, df = maxZ - pos.z;
      const m = Math.min(dl, dr, dn, df);
      if (m === dl) pos.x = minX; else if (m === dr) pos.x = maxX; else if (m === dn) pos.z = minZ; else pos.z = maxZ;
    }
  }
  const lim = HALF - 1 - r;
  pos.x = Math.max(-lim, Math.min(lim, pos.x)); pos.z = Math.max(-lim, Math.min(lim, pos.z));
}
const ray = new T.Raycaster();
function lineOfSight(a, b) {
  const dir = b.clone().sub(a); const dist = dir.length(); dir.normalize();
  ray.set(a, dir); ray.far = dist;
  return ray.intersectObjects(solids, false).length === 0;
}

/* ------------------------------ OVOZ ------------------------------ */
let AC = null, master = null;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = volume; master.connect(AC.destination); } catch (e) { AC = null; }
}
function sndNoise(dur, vol, freq, q = .7, pan = 0, delay = 0) {
  if (!AC || vol <= 0.001) return;
  const t = AC.currentTime + delay, len = Math.floor(AC.sampleRate * dur);
  const buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  let node = g;
  if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
  s.connect(f); f.connect(g); node.connect(master); s.start(t);
}
function sndTone(freq, dur, vol, type = 'sine', slide = 1, delay = 0) {
  if (!AC) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide !== 1) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05);
}
function gunSound(kind, dist = 0, pan = 0) {
  const att = Math.max(0, 1 - dist / 90);
  if (kind === 'rifle') { sndNoise(.16, .5 * att, 2600 - dist * 15, .8, pan); sndTone(110, .12, .35 * att, 'sine', .4); }
  if (kind === 'pistol') { sndNoise(.12, .4 * att, 3200, .8, pan); sndTone(160, .08, .25 * att, 'sine', .5); }
  if (kind === 'sniper') { sndNoise(.6, .8 * att, 1800, .6, pan); sndTone(70, .5, .5 * att, 'sine', .4); sndNoise(.9, .15 * att, 500, .5, pan, .12); }
}
const SND = {
  hit: () => sndTone(1500, .05, .12, 'square', .8),
  head: () => { sndTone(2200, .06, .15, 'square'); sndTone(1100, .1, .1, 'triangle', 1, .03); },
  hurt: () => { sndNoise(.2, .3, 700); sndTone(180, .2, .15, 'sawtooth', .6); },
  reload: () => { sndTone(800, .04, .12, 'square', 1, 0); sndTone(500, .05, .12, 'square', 1, .35); sndTone(1200, .04, .15, 'square', 1, .9); },
  empty: () => sndTone(1800, .03, .1, 'square'),
  bolt: () => { sndTone(600, .05, .12, 'square', 1, .35); sndTone(900, .05, .12, 'square', 1, .6); },
  step: () => sndNoise(.06, .05, 600),
  kill: () => { sndTone(660, .1, .12, 'triangle'); sndTone(990, .14, .12, 'triangle', 1, .08); },
};

/* ------------------------------ ASKAR MODELI ------------------------------ */
const SKIN = new T.MeshStandardMaterial({ color: 0xc89a72, roughness: .8 });
const GUNMAT = new T.MeshStandardMaterial({ color: 0x222222, roughness: .5, metalness: .6 });
const teamMats = {
  blue: { body: new T.MeshStandardMaterial({ color: 0x3d5f8a, roughness: .9 }), vest: new T.MeshStandardMaterial({ color: 0x24364f, roughness: .8 }), helm: new T.MeshStandardMaterial({ color: 0x2b4466, roughness: .6 }) },
  red: { body: new T.MeshStandardMaterial({ color: 0x8a6a42, roughness: .9 }), vest: new T.MeshStandardMaterial({ color: 0x5e2622, roughness: .8 }), helm: new T.MeshStandardMaterial({ color: 0x3a3a3a, roughness: .6 }) },
};
const hitboxes = [];
function part(geo, mat, x, y, z, parent) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function makeSoldierMesh(team) {
  const M = teamMats[team];
  const root = new T.Group();
  const hips = new T.Group(); hips.position.y = .95; root.add(hips);
  const torso = part(new T.BoxGeometry(.52, .62, .3), M.body, 0, .33, 0, hips);
  part(new T.BoxGeometry(.56, .46, .34), M.vest, 0, .36, 0, hips);
  const head = part(new T.BoxGeometry(.28, .3, .28), SKIN, 0, .82, 0, hips);
  part(new T.BoxGeometry(.32, .14, .32), M.helm, 0, .98, 0, hips);
  part(new T.BoxGeometry(.24, .07, .02), new T.MeshStandardMaterial({ color: 0x111111 }), 0, .85, .145, hips); // ko'zoynak
  const legs = [];
  for (const s of [-1, 1]) { const leg = new T.Group(); leg.position.set(s * .14, 0, 0); hips.add(leg); part(new T.BoxGeometry(.2, .9, .22), M.body, 0, -.45, 0, leg); part(new T.BoxGeometry(.22, .14, .3), GUNMAT, 0, -.88, .04, leg); legs.push(leg); }
  const arms = new T.Group(); arms.position.set(0, .55, 0); hips.add(arms);
  part(new T.BoxGeometry(.16, .16, .55), M.body, .27, -.05, .2, arms); part(new T.BoxGeometry(.16, .16, .5), M.body, -.2, -.05, .28, arms);
  const gun = new T.Group(); gun.position.set(.05, -.02, .5); arms.add(gun);
  part(new T.BoxGeometry(.08, .12, .75), GUNMAT, 0, 0, 0, gun); part(new T.BoxGeometry(.06, .2, .08), GUNMAT, 0, -.14, .05, gun);
  const muzzle = new T.Object3D(); muzzle.position.set(0, .02, .42); gun.add(muzzle);
  // urilish qutilari (hitbox) — ko'rinmaydi
  const hbMat = new T.MeshBasicMaterial({ visible: false });
  const hbBody = new T.Mesh(new T.BoxGeometry(.6, 1.45, .45), hbMat); hbBody.position.y = .75; root.add(hbBody);
  const hbHead = new T.Mesh(new T.BoxGeometry(.34, .36, .34), hbMat); hbHead.position.y = 1.78; root.add(hbHead);
  hbBody.userData.part = 'body'; hbHead.userData.part = 'head';
  return { root, hips, legs, arms, head, muzzle, hbBody, hbHead, torso };
}

/* ------------------------------ O'YINCHILAR ------------------------------ */
const NAMES = { blue: ['Siz', 'Jasur', 'Bekzod', 'Sardor', 'Aziz'], red: ['Temur', 'Rustam', 'Doniyor', 'Otabek', 'Shoxrux', 'Islom'] };
const spawnZones = { blue: [18, 28], red: [-28, -18] };
let soldiers = [];
let player = null;
const score = { blue: 0, red: 0 };

class Soldier {
  constructor(team, name, isPlayer = false) {
    this.team = team; this.name = name; this.isPlayer = isPlayer;
    this.pos = new T.Vector3(); this.vel = new T.Vector3(); this.yaw = 0; this.pitch = 0;
    this.hp = 100; this.dead = false; this.respawnT = 0; this.kills = 0; this.deaths = 0;
    this.onGround = true; this.lastSeen = 0;
    if (!isPlayer) {
      this.mesh = makeSoldierMesh(team); scene.add(this.mesh.root);
      this.mesh.hbBody.userData.soldier = this; this.mesh.hbHead.userData.soldier = this;
      hitboxes.push(this.mesh.hbBody, this.mesh.hbHead);
      this.path = null; this.pathT = 0; this.target = null; this.reaction = 0; this.fireCd = 0; this.burst = 0;
      this.strafe = 0; this.strafeT = 0; this.thinkT = Math.random() * .3; this.walkPhase = Math.random() * 6;
      this.skill = .55 + Math.random() * .3; this.ammo = 30; this.reloadT = 0;
    }
    this.spawn();
  }
  eye() { return new T.Vector3(this.pos.x, this.pos.y + (this.isPlayer ? CFG.eye : 1.6), this.pos.z); }
  spawn() {
    const [z0, z1] = spawnZones[this.team];
    const p = randomWalkable(z0, z1);
    this.pos.copy(p); this.vel.set(0, 0, 0); this.hp = 100; this.dead = false;
    this.yaw = this.team === 'blue' ? 0 : Math.PI;
    if (this.mesh) { this.mesh.root.visible = true; this.mesh.root.rotation.set(0, 0, 0); this.path = null; this.target = null; this.ammo = 30; }
    if (this.isPlayer) resetWeapons();
  }
  damage(amount, attacker, weaponName, headshot) {
    if (this.dead) return;
    this.hp -= amount;
    if (this.isPlayer) onPlayerHurt(attacker);
    else if (attacker && !this.target) { this.target = attacker; this.reaction = .15; }
    if (this.hp <= 0) this.die(attacker, weaponName, headshot);
  }
  die(attacker, weaponName, headshot) {
    this.dead = true; this.hp = 0; this.deaths++; this.respawnT = CFG.respawn;
    if (attacker && attacker !== this) { attacker.kills++; score[attacker.team]++; }
    addKillfeed(attacker, this, weaponName, headshot);
    if (this.mesh) { this.deathT = 0; }
    if (this.isPlayer) onPlayerDeath(attacker);
    updateScoreUi();
    checkWin();
  }
}

/* ------------------------------ BOT SUN'IY INTELLEKTI ------------------------------ */
const tmpV = new T.Vector3();
function botUpdate(b, dt) {
  const m = b.mesh;
  if (b.dead) {
    b.deathT = (b.deathT || 0) + dt;
    m.root.rotation.x = Math.max(-Math.PI / 2, -b.deathT * 5);
    m.root.position.y = b.pos.y + Math.min(.15, b.deathT * .3);
    if (b.deathT > 2.2) m.root.visible = false;
    b.respawnT -= dt; if (b.respawnT <= 0) b.spawn();
    return;
  }
  // nishon tanlash
  b.thinkT -= dt;
  if (b.thinkT <= 0) {
    b.thinkT = .2 + Math.random() * .15;
    let best = null, bd = 60;
    const e = b.eye();
    for (const o of soldiers) {
      if (o.team === b.team || o.dead || (o.isPlayer && state !== 'play')) continue;
      const d = o.pos.distanceTo(b.pos);
      if (d > bd) continue;
      // ko'rish burchagi: orqadagilarni yaqin bo'lsa yoki allaqachon nishon bo'lsa ko'radi
      const ang = Math.atan2(o.pos.x - b.pos.x, o.pos.z - b.pos.z);
      let diff = Math.abs(((ang - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff > 1.6 && d > 8 && o !== b.target) continue;
      if (lineOfSight(e, o.eye())) { best = o; bd = d; }
    }
    if (best && best !== b.target) { b.target = best; b.reaction = (.35 + Math.random() * .4) / b.skill; }
    if (best) { b.lastKnown = best.pos.clone(); b.seeT = performance.now(); b.target = best; }
    else if (b.target && (b.target.dead || performance.now() - (b.seeT || 0) > 900)) { b.target = null; if (b.lastKnown) { b.path = findPath(b.pos.x, b.pos.z, b.lastKnown.x, b.lastKnown.z); b.lastKnown = null; } }
  }

  let moveX = 0, moveZ = 0, speed = 3.6;
  if (b.target && !b.target.dead) {
    const tp = b.target.pos;
    const want = Math.atan2(tp.x - b.pos.x, tp.z - b.pos.z);
    let d = ((want - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    b.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 6);
    // yonga qochish (strafe)
    b.strafeT -= dt; if (b.strafeT <= 0) { b.strafeT = .5 + Math.random() * 1.2; b.strafe = [-1, 0, 1][(Math.random() * 3) | 0]; }
    moveX = Math.cos(b.yaw) * b.strafe; moveZ = -Math.sin(b.yaw) * b.strafe; speed = 2.4;
    // otish
    b.reaction -= dt; b.fireCd -= dt;
    if (b.reloadT > 0) { b.reloadT -= dt; if (b.reloadT <= 0) b.ammo = 30; }
    else if (b.reaction <= 0 && b.fireCd <= 0 && Math.abs(d) < .2) {
      if (b.ammo <= 0) { b.reloadT = 2.4; }
      else {
        b.ammo--; b.fireCd = .11; b.burst++;
        if (b.burst > 3 + Math.random() * 4) { b.burst = 0; b.fireCd = .35 + Math.random() * .4; }
        botShoot(b);
      }
    }
  } else {
    // yo'l bo'ylab yurish
    if (!b.path || b.path.length === 0) {
      b.pathT -= dt;
      if (b.pathT <= 0) {
        b.pathT = .5;
        const enemyZone = b.team === 'blue' ? [-HALF + 3, 5] : [-5, HALF - 3];
        const goal = Math.random() < .65 ? randomWalkable(enemyZone[0], enemyZone[1]) : randomWalkable();
        b.path = findPath(b.pos.x, b.pos.z, goal.x, goal.z);
      }
    }
    if (b.path && b.path.length) {
      const wp = b.path[0];
      tmpV.set(wp.x - b.pos.x, 0, wp.z - b.pos.z);
      const dist = tmpV.length();
      if (dist < .6) b.path.shift();
      else {
        tmpV.normalize(); moveX = tmpV.x; moveZ = tmpV.z;
        const want = Math.atan2(tmpV.x, tmpV.z);
        let d = ((want - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        b.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 5);
      }
    }
  }
  const ox = b.pos.x, oz = b.pos.z;
  b.pos.x += moveX * speed * dt; b.pos.z += moveZ * speed * dt;
  collide(b.pos, .35);
  const moved = Math.hypot(b.pos.x - ox, b.pos.z - oz) / dt;
  if (b.path && moved < .3 && !b.target) { b.stuck = (b.stuck || 0) + dt; if (b.stuck > 1) { b.path = null; b.stuck = 0; } } else b.stuck = 0;
  b.pos.y = groundAt(b.pos.x, b.pos.z, b.pos.y + .3, .35);

  // animatsiya
  m.root.position.copy(b.pos); m.root.rotation.y = b.yaw;
  b.walkPhase += dt * moved * 2.2;
  const sw = Math.sin(b.walkPhase) * Math.min(1, moved / 3) * .7;
  m.legs[0].rotation.x = sw; m.legs[1].rotation.x = -sw;
  m.hips.position.y = .95 + Math.abs(Math.cos(b.walkPhase)) * .04 * Math.min(1, moved / 3);
  m.arms.rotation.x = b.target ? -Math.atan2((b.target.pos.y + 1) - (b.pos.y + 1.4), Math.max(1, b.target.pos.distanceTo(b.pos))) : .15;
}

function botShoot(b) {
  const t = b.target, dist = t.pos.distanceTo(b.pos);
  const from = new T.Vector3(); b.mesh.muzzle.getWorldPosition(from);
  const moving = t.isPlayer ? Math.hypot(player.vel.x, player.vel.z) : 2;
  let chance = b.skill * (1 - dist / 75) * (moving > 3 ? .55 : .85);
  if (t.isPlayer) chance *= .7; // o'yinchiga nisbatan biroz yumshoqroq
  const hit = Math.random() < chance;
  const aim = t.eye(); aim.y -= hit ? (Math.random() < .12 ? 0 : .45) : 0;
  if (!hit) { aim.x += (Math.random() - .5) * 2.2; aim.y += (Math.random() - .3) * 1.2; aim.z += (Math.random() - .5) * 2.2; }
  // devor tekshiruvi
  const dir = aim.clone().sub(from).normalize();
  ray.set(from, dir); ray.far = 150;
  const hits = ray.intersectObjects(solids, false);
  const wallD = hits.length ? hits[0].distance : 999;
  const targetD = from.distanceTo(aim);
  const end = wallD < targetD ? hits[0].point : from.clone().add(dir.clone().multiplyScalar(Math.min(targetD + 25, wallD)));
  addTracer(from, end, 0xffd28a);
  muzzleFlashWorld(from);
  const pd = player ? b.pos.distanceTo(player.pos) : 50;
  const pan = player ? Math.max(-1, Math.min(1, Math.sin(Math.atan2(b.pos.x - player.pos.x, b.pos.z - player.pos.z) - player.yaw) * -1)) : 0;
  gunSound('rifle', pd, pan);
  if (wallD < targetD) { addImpact(hits[0]); return; }
  if (hit) {
    const head = aim.y > t.eye().y - .2;
    t.damage(head ? 70 : 18 + Math.random() * 6, b, 'AVTOMAT', head);
    if (!t.isPlayer) addBlood(aim);
  }
}

/* ------------------------------ EFFEKTLAR ------------------------------ */
const fx = [];
const sparkTex = canvasTex(64, (g, s) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,220,150,.8)'); gr.addColorStop(1, 'rgba(255,150,50,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
const smokeTex = canvasTex(64, (g, s) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(200,190,170,.7)'); gr.addColorStop(1, 'rgba(200,190,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
const decalTex = canvasTex(64, (g, s) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(20,15,10,1)'); gr.addColorStop(.35, 'rgba(30,22,15,.9)'); gr.addColorStop(1, 'rgba(30,22,15,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); });
const decalMat = new T.MeshBasicMaterial({ map: decalTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
const decals = [];
function addTracer(a, b, color) {
  const geo = new T.BufferGeometry().setFromPoints([a, b]);
  const mat = new T.LineBasicMaterial({ color, transparent: true, opacity: .9 });
  const l = new T.Line(geo, mat); scene.add(l);
  fx.push({ obj: l, life: .06, max: .06, fade: mat });
}
function sprite(tex, pos, size, life, color = 0xffffff, vel = null, additive = true) {
  const mat = new T.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending });
  const s = new T.Sprite(mat); s.position.copy(pos); s.scale.setScalar(size); scene.add(s);
  fx.push({ obj: s, life, max: life, fade: mat, vel, grow: !additive });
}
const flashLight = new T.PointLight(0xffc070, 0, 8); scene.add(flashLight);
function muzzleFlashWorld(p) { sprite(sparkTex, p, .5, .05); flashLight.position.copy(p); flashLight.intensity = 3; }
function addImpact(h) {
  const p = h.point;
  for (let i = 0; i < 4; i++) sprite(sparkTex, p, .12, .15 + Math.random() * .1, 0xffffff, new T.Vector3((Math.random() - .5) * 4, Math.random() * 4, (Math.random() - .5) * 4));
  sprite(smokeTex, p, .4, .6, 0xffffff, new T.Vector3(0, .6, 0), false);
  if (h.face) {
    const d = new T.Mesh(new T.PlaneGeometry(.14, .14), decalMat);
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    d.position.copy(p).add(n.clone().multiplyScalar(.01)); d.lookAt(p.clone().add(n)); scene.add(d);
    decals.push(d); if (decals.length > 80) { const o = decals.shift(); scene.remove(o); o.geometry.dispose(); }
  }
}
function addBlood(p) { for (let i = 0; i < 6; i++) sprite(smokeTex, p, .25, .4, 0xaa1111, new T.Vector3((Math.random() - .5) * 2, Math.random() * 1.5, (Math.random() - .5) * 2), false); }
function updateFx(dt) {
  flashLight.intensity = Math.max(0, flashLight.intensity - dt * 60);
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.life -= dt;
    if (f.vel) { f.obj.position.addScaledVector(f.vel, dt); f.vel.y -= 6 * dt; }
    if (f.grow) f.obj.scale.multiplyScalar(1 + dt * 2);
    f.fade.opacity = Math.max(0, f.life / f.max);
    if (f.life <= 0) { scene.remove(f.obj); if (f.obj.isLine) f.obj.geometry.dispose(); f.fade.dispose(); fx.splice(i, 1); }
  }
}

/* ------------------------------ QUROL MODELLARI (birinchi shaxs) ------------------------------ */
const VM = { group: new T.Group(), models: [], flash: null };
viewScene.add(VM.group);
{
  const metal = new T.MeshStandardMaterial({ color: 0x2a2a2a, roughness: .45, metalness: .8 });
  const metal2 = new T.MeshStandardMaterial({ color: 0x444444, roughness: .4, metalness: .7 });
  const wood = new T.MeshStandardMaterial({ color: 0x7a4a24, roughness: .7 });
  const glove = new T.MeshStandardMaterial({ color: 0x3a3226, roughness: .9 });
  const sleeve = new T.MeshStandardMaterial({ color: 0x3d5f8a, roughness: .9 });
  const add = (g, geo, mat, x, y, z, rx = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  const hands = (g, frontZ) => {
    add(g, new T.BoxGeometry(.09, .09, .3), sleeve, .06, -.12, .2); add(g, new T.BoxGeometry(.08, .1, .1), glove, .03, -.07, .02);
    add(g, new T.BoxGeometry(.09, .09, .34), sleeve, -.08, -.12, frontZ + .2); add(g, new T.BoxGeometry(.08, .08, .1), glove, -.02, -.06, frontZ);
  };
  // avtomat
  const r = new T.Group();
  add(r, new T.BoxGeometry(.06, .09, .5), metal, 0, 0, -.1);
  add(r, new T.BoxGeometry(.065, .06, .26), wood, 0, -.01, -.38);
  add(r, new T.CylinderGeometry(.013, .013, .3, 10), metal2, 0, .015, -.5, Math.PI / 2);
  add(r, new T.BoxGeometry(.05, .16, .07), metal2, 0, -.12, -.12, .25);
  add(r, new T.BoxGeometry(.055, .1, .22), wood, 0, -.03, .22);
  add(r, new T.BoxGeometry(.04, .03, .05), metal, 0, .06, -.02);
  hands(r, -.3);
  r.userData.muzzle = new T.Vector3(0, .015, -.68);
  // to'pponcha
  const p = new T.Group();
  add(p, new T.BoxGeometry(.045, .05, .2), metal2, 0, 0, -.08);
  add(p, new T.BoxGeometry(.04, .12, .06), metal, 0, -.07, -.01, .2);
  add(p, new T.BoxGeometry(.09, .09, .3), sleeve, .03, -.13, .17); add(p, new T.BoxGeometry(.09, .09, .3), sleeve, -.05, -.13, .17);
  add(p, new T.BoxGeometry(.07, .08, .08), glove, 0, -.08, 0);
  p.userData.muzzle = new T.Vector3(0, .005, -.19);
  // snayper
  const s = new T.Group();
  add(s, new T.BoxGeometry(.06, .08, .7), new T.MeshStandardMaterial({ color: 0x3d4a2e, roughness: .7 }), 0, 0, -.12);
  add(s, new T.CylinderGeometry(.012, .012, .45, 10), metal, 0, .01, -.68, Math.PI / 2);
  add(s, new T.CylinderGeometry(.028, .028, .26, 14), metal, 0, .09, -.12, Math.PI / 2);
  add(s, new T.CylinderGeometry(.034, .034, .04, 14), metal2, 0, .09, -.26, Math.PI / 2);
  add(s, new T.BoxGeometry(.05, .12, .05), metal, 0, -.09, -.06);
  hands(s, -.32);
  s.userData.muzzle = new T.Vector3(0, .01, -.92);
  VM.models = [r, p, s];
  for (const m of VM.models) { m.visible = false; VM.group.add(m); }
  const flashMat = new T.SpriteMaterial({ map: sparkTex, color: 0xffd090, blending: T.AdditiveBlending, transparent: true, depthWrite: false });
  VM.flash = new T.Sprite(flashMat); VM.flash.scale.setScalar(.25); VM.flash.visible = false; VM.group.add(VM.flash);
}

/* ------------------------------ O'YINCHI ------------------------------ */
const input = { f: 0, b: 0, l: 0, r: 0, walk: false, fire: false, aim: false, jump: false };
const ws = { cur: 0, ammo: [], reserve: [], cd: 0, reloadT: 0, recoil: 0, kick: 0, bob: 0, switchT: 0, swayX: 0, swayY: 0, fired: false };
function resetWeapons() {
  ws.ammo = WEAPONS.map(w => w.mag); ws.reserve = WEAPONS.map(w => w.reserve);
  ws.reloadT = 0; ws.cd = 0; selectWeapon(0, true);
}
function selectWeapon(i, force) {
  if (!force && (i === ws.cur || player.dead)) return;
  ws.cur = i; ws.reloadT = 0; ws.switchT = .35; ws.cd = Math.max(ws.cd, .3); input.aim = false;
  VM.models.forEach((m, k) => m.visible = k === i);
  document.querySelectorAll('.slots span').forEach(s => s.classList.toggle('on', +s.dataset.w === i));
  $('weaponName').textContent = WEAPONS[i].name;
  updateAmmoUi();
}
function startReload() {
  const w = WEAPONS[ws.cur];
  if (ws.reloadT > 0 || ws.ammo[ws.cur] >= w.mag || ws.reserve[ws.cur] <= 0) return;
  ws.reloadT = w.reload; input.aim = false; SND.reload();
  $('reloadHint').hidden = false;
}
function playerShoot() {
  const w = WEAPONS[ws.cur];
  if (ws.ammo[ws.cur] <= 0) { SND.empty(); ws.cd = .25; startReload(); return; }
  ws.ammo[ws.cur]--; ws.cd = w.rate; ws.fired = true;
  const speed = Math.hypot(player.vel.x, player.vel.z);
  let spread = w.spread + Math.min(1, speed / CFG.playerSpeed) * w.moveSpread + ws.recoil * .5;
  if (!player.onGround) spread += .08;
  if (w.scope && input.aim) spread = .0006 + Math.min(1, speed / CFG.playerSpeed) * .03;
  else if (input.aim) spread *= .5;
  const dir = new T.Vector3(0, 0, -1).applyEuler(camera.rotation);
  dir.x += (Math.random() - .5) * spread * 2; dir.y += (Math.random() - .5) * spread * 2; dir.z += (Math.random() - .5) * spread * 2;
  dir.normalize();
  ray.set(camera.position, dir); ray.far = w.range;
  const targets = solids.concat(hitboxes.filter(h => !h.userData.soldier.dead && h.userData.soldier.team !== 'blue'));
  const hits = ray.intersectObjects(targets, false);
  const muzzle = VM.models[ws.cur].userData.muzzle;
  const from = camera.position.clone().add(new T.Vector3(.12, -.1, -.4).applyEuler(camera.rotation));
  const end = hits.length ? hits[0].point : camera.position.clone().add(dir.clone().multiplyScalar(w.range));
  addTracer(from, end, 0xfff0b0);
  if (hits.length) {
    const h = hits[0], sd = h.object.userData.soldier;
    if (sd) {
      const head = h.object.userData.part === 'head';
      const falloff = ws.cur === 2 ? 1 : Math.max(.6, 1 - h.distance / 150);
      sd.damage(w.dmg * (head ? w.head : 1) * falloff, player, w.name, head);
      addBlood(h.point); showHitmarker(head); head ? SND.head() : SND.hit();
    } else addImpact(h);
  }
  // tepki
  ws.recoil = Math.min(ws.recoil + w.recoil, .12);
  player.pitch += w.recoil * (input.aim ? .6 : 1) * (.7 + Math.random() * .3);
  player.yaw += (Math.random() - .5) * w.recoil * .6;
  ws.kick = ws.cur === 2 ? 1 : .5;
  VM.flash.visible = true; VM.flash.position.copy(muzzle); VM.flashT = .04;
  flashLight.position.copy(from); flashLight.intensity = 3.5;
  gunSound(w.snd);
  if (ws.cur === 2) { SND.bolt(); if (input.aim) { input.aim = false; } }
  updateAmmoUi();
  if (ws.ammo[ws.cur] === 0) setTimeout(startReload, 250);
}

function updatePlayer(dt) {
  const p = player;
  if (p.dead) {
    p.respawnT -= dt;
    $('respawnTime').textContent = Math.max(0, Math.ceil(p.respawnT));
    // o'lim kamerasi: sekin pastga
    camera.position.y = Math.max(p.pos.y + .4, camera.position.y - dt * 2);
    if (p.respawnT <= 0) { p.spawn(); $('deathScreen').hidden = true; }
    return;
  }
  const w = WEAPONS[ws.cur];
  const speed = (input.walk || (input.aim && !w.scope) ? CFG.walkSpeed : CFG.playerSpeed) * (input.aim && w.scope ? .5 : 1);
  const fx_ = input.r - input.l, fz = input.b - input.f;
  const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
  let mx = fx_ * cos + fz * sin, mz = -fx_ * sin + fz * cos;
  const len = Math.hypot(mx, mz); if (len > 0) { mx /= len; mz /= len; }
  const accel = p.onGround ? 14 : 3;
  p.vel.x += (mx * speed - p.vel.x) * Math.min(1, accel * dt);
  p.vel.z += (mz * speed - p.vel.z) * Math.min(1, accel * dt);
  if (input.jump && p.onGround) { p.vel.y = CFG.jumpSpeed; p.onGround = false; }
  p.vel.y -= CFG.gravity * dt;
  p.pos.x += p.vel.x * dt; p.pos.z += p.vel.z * dt;
  collide(p.pos, CFG.radius);
  p.pos.y += p.vel.y * dt;
  const gy = groundAt(p.pos.x, p.pos.z, p.pos.y + .01, CFG.radius);
  if (p.pos.y <= gy) { p.pos.y = gy; p.vel.y = 0; p.onGround = true; } else if (p.pos.y > gy + .05) p.onGround = false;

  // qadam ovozi
  const hs = Math.hypot(p.vel.x, p.vel.z);
  if (p.onGround && hs > 3) { p.stepT = (p.stepT || 0) - dt; if (p.stepT <= 0) { p.stepT = .36; SND.step(); } }

  // qurol holati
  ws.cd -= dt; ws.switchT = Math.max(0, ws.switchT - dt);
  ws.recoil = Math.max(0, ws.recoil - dt * .25);
  if (ws.reloadT > 0) {
    ws.reloadT -= dt;
    if (ws.reloadT <= 0) {
      const need = w.mag - ws.ammo[ws.cur], take = Math.min(need, ws.reserve[ws.cur]);
      ws.ammo[ws.cur] += take; ws.reserve[ws.cur] -= take; $('reloadHint').hidden = true; updateAmmoUi();
    }
  } else if (input.fire && ws.cd <= 0 && ws.switchT <= 0) {
    if (w.auto || !ws.fired) playerShoot();
  }
  if (!input.fire) ws.fired = false;

  // kamera
  p.pitch = Math.max(-1.5, Math.min(1.5, p.pitch));
  camera.position.set(p.pos.x, p.pos.y + CFG.eye, p.pos.z);
  camera.rotation.set(p.pitch, p.yaw, 0);
  const targetFov = input.aim && ws.reloadT <= 0 ? w.zoom : 75;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14); camera.updateProjectionMatrix();
  const scoped = w.scope && input.aim && camera.fov < 30;
  $('scope').hidden = !scoped; VM.group.visible = !scoped;
  $('crosshair').style.opacity = scoped || (input.aim && !w.scope) ? 0 : 1;

  // nishon kesishmasi kengligi
  const spreadPx = 8 + (hs / CFG.playerSpeed) * 22 + ws.recoil * 180 + (p.onGround ? 0 : 20);
  const ch = $('crosshair').children;
  ch[0].style.top = (-spreadPx - 9) + 'px'; ch[1].style.top = spreadPx + 'px'; ch[2].style.left = (-spreadPx - 9) + 'px'; ch[3].style.left = spreadPx + 'px';

  // qurol modeli: tebranish, tepki, qayta o'qlash
  ws.bob += dt * hs * 1.6;
  ws.kick = Math.max(0, ws.kick - dt * 6);
  ws.swayX *= Math.pow(.001, dt); ws.swayY *= Math.pow(.001, dt);
  const aimK = input.aim && !w.scope ? 1 : 0;
  const bobA = p.onGround ? Math.min(1, hs / CFG.playerSpeed) : .2;
  let x = .17 - aimK * .17 + Math.cos(ws.bob) * .012 * bobA + ws.swayX;
  let y = -.17 + aimK * .065 + Math.abs(Math.sin(ws.bob)) * .012 * bobA - ws.swayY - (p.onGround ? 0 : .02);
  let z = -.34 + ws.kick * .07 + aimK * .06;
  let rx = ws.kick * .12, rz = 0;
  if (ws.reloadT > 0) { const t = 1 - ws.reloadT / w.reload; const k = Math.sin(t * Math.PI); y -= k * .12; rx -= k * .5; rz = k * .4; }
  if (ws.switchT > 0) y -= ws.switchT * .6;
  VM.group.position.lerp(new T.Vector3(x, y, z), Math.min(1, dt * 20));
  VM.group.rotation.set(rx, 0, rz);
  if (VM.flashT > 0) { VM.flashT -= dt; if (VM.flashT <= 0) VM.flash.visible = false; }
}

/* ------------------------------ HUD ------------------------------ */
function updateAmmoUi() {
  if (!player) return;
  $('ammo').textContent = ws.ammo[ws.cur]; $('reserve').textContent = '/ ' + ws.reserve[ws.cur];
}
function updateHpUi() { $('hp').textContent = Math.max(0, Math.ceil(player.hp)); $('hpbar').style.width = Math.max(0, player.hp) + '%'; }
function updateScoreUi() { $('scoreBlue').textContent = score.blue; $('scoreRed').textContent = score.red; }
let hmT = 0;
function showHitmarker(head) { const h = $('hitmarker'); h.classList.toggle('head', head); h.style.opacity = 1; hmT = .15; }
function onPlayerHurt(attacker) {
  updateHpUi(); SND.hurt();
  const d = $('damage'); d.style.opacity = .8; setTimeout(() => d.style.opacity = 0, 140);
  if (attacker) {
    const ang = Math.atan2(attacker.pos.x - player.pos.x, attacker.pos.z - player.pos.z);
    const rel = -(ang - player.yaw) + Math.PI;
    const dd = $('dmgDir'); dd.style.transform = `rotate(${rel}rad)`; dd.style.transition = 'none'; dd.style.opacity = 1;
    requestAnimationFrame(() => { dd.style.transition = 'opacity .8s'; dd.style.opacity = 0; });
  }
}
function onPlayerDeath(attacker) {
  $('deathScreen').hidden = false; $('killedBy').textContent = attacker ? `${attacker.name} sizni o'ldirdi` : '';
  input.fire = false; input.aim = false; $('reloadHint').hidden = true; VM.group.visible = false;
}
function addKillfeed(killer, victim, weapon, head) {
  const kf = $('killfeed'), div = document.createElement('div');
  const cls = s => s.team === 'blue' ? 'b' : 'r';
  if (killer && killer !== victim) div.innerHTML = `<span class="${cls(killer)}">${killer.name}</span><span class="w">${weapon}${head ? ' · bosh' : ''}</span><span class="${cls(victim)}">${victim.name}</span>`;
  else div.innerHTML = `<span class="${cls(victim)}">${victim.name}</span><span class="w">halok bo'ldi</span>`;
  if (killer === player || victim === player) div.classList.add('me');
  if (killer === player) SND.kill();
  kf.prepend(div); while (kf.children.length > 5) kf.lastChild.remove();
  setTimeout(() => div.remove(), 6000);
}
function fillBoard(blueEl, redEl) {
  const row = s => `<tr class="${s.isPlayer ? 'me' : ''}"><td>${s.name}</td><td>${s.kills}</td><td>${s.deaths}</td></tr>`;
  const sorted = t => soldiers.filter(s => s.team === t).sort((a, b) => b.kills - a.kills);
  blueEl.className = 'blue'; redEl.className = 'red';
  blueEl.innerHTML = `<tr><th>KO'K · ${score.blue}</th><th>O'</th><th>H</th></tr>` + sorted('blue').map(row).join('');
  redEl.innerHTML = `<tr><th>QIZIL · ${score.red}</th><th>O'</th><th>H</th></tr>` + sorted('red').map(row).join('');
}
const mm = $('minimap').getContext('2d');
function drawMinimap() {
  const S = 180, sc = S / (HALF * 2) * 1.6, cx = S / 2, cy = S / 2;
  mm.clearRect(0, 0, S, S);
  mm.save(); mm.beginPath(); mm.arc(cx, cy, S / 2 - 1, 0, 7); mm.clip();
  mm.fillStyle = 'rgba(201,164,106,.35)'; mm.fillRect(0, 0, S, S);
  mm.translate(cx, cy); mm.rotate(player.yaw); mm.translate(-player.pos.x * sc, -player.pos.z * sc);
  mm.fillStyle = 'rgba(40,30,20,.85)';
  for (const r of mapRects) mm.fillRect((r.x - r.w / 2) * sc, (r.z - r.d / 2) * sc, r.w * sc, r.d * sc);
  const now = performance.now();
  for (const s of soldiers) {
    if (s.isPlayer || s.dead) continue;
    if (s.team === 'red' && !(s.spotted && now - s.spotted < 2000)) continue;
    mm.fillStyle = s.team === 'blue' ? '#4aa8ff' : '#ff5a4e';
    mm.beginPath(); mm.arc(s.pos.x * sc, s.pos.z * sc, 3.5, 0, 7); mm.fill();
  }
  mm.restore();
  mm.fillStyle = '#ffb42e'; mm.beginPath(); mm.moveTo(cx, cy - 7); mm.lineTo(cx + 5, cy + 5); mm.lineTo(cx - 5, cy + 5); mm.closePath(); mm.fill();
}

/* ------------------------------ O'YIN OQIMI ------------------------------ */
let state = 'menu', timeLeft = CFG.matchTime;
function newMatch() {
  for (const s of soldiers) if (s.mesh) scene.remove(s.mesh.root);
  soldiers = []; hitboxes.length = 0; score.blue = 0; score.red = 0; timeLeft = CFG.matchTime;
  player = new Soldier('blue', 'Siz', true);
  soldiers.push(player);
  for (let i = 0; i < CFG.botsPerTeam.blue; i++) soldiers.push(new Soldier('blue', NAMES.blue[i + 1]));
  for (let i = 0; i < CFG.botsPerTeam.red; i++) soldiers.push(new Soldier('red', NAMES.red[i]));
  updateScoreUi(); updateHpUi(); $('killfeed').innerHTML = ''; $('deathScreen').hidden = true;
}
function checkWin() {
  if (state !== 'play') return;
  if (score.blue >= CFG.killsToWin || score.red >= CFG.killsToWin) endMatch();
}
function endMatch() {
  state = 'end'; document.exitPointerLock && document.exitPointerLock();
  const win = score.blue > score.red, draw = score.blue === score.red;
  $('endTitle').textContent = draw ? 'DURRANG' : win ? "G'ALABA" : "MAG'LUBIYAT";
  $('endTitle').style.color = draw ? '' : win ? 'var(--blue)' : 'var(--red)';
  $('endScore').textContent = `Ko'k ${score.blue} : ${score.red} Qizil · Sizning natijangiz: ${player.kills} o'ldirish, ${player.deaths} halok`;
  fillBoard($('endBlue'), $('endRed'));
  show('end');
}
function show(which) {
  $('menu').hidden = which !== 'menu'; $('pauseMenu').hidden = which !== 'pause'; $('endMenu').hidden = which !== 'end';
  $('hud').hidden = which === 'menu';
}
function lockPointer() {
  const el = renderer.domElement;
  try { const r = el.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
$('playBtn').onclick = () => { initAudio(); newMatch(); state = 'play'; show('play'); lockPointer(); };
$('againBtn').onclick = () => { newMatch(); state = 'play'; show('play'); lockPointer(); };
$('resumeBtn').onclick = () => { state = 'play'; show('play'); lockPointer(); };
$('quitBtn').onclick = () => { state = 'menu'; show('menu'); };
renderer.domElement.addEventListener('click', () => { if (state === 'play' && document.pointerLockElement !== renderer.domElement) lockPointer(); });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement && state === 'play') { state = 'pause'; show('pause'); input.fire = false; input.aim = false; }
});

// sozlamalar
$('sens').value = sens; $('sensVal').textContent = sens.toFixed(1);
$('vol').value = volume; $('volVal').textContent = Math.round(volume * 100) + '%';
$('sens').oninput = e => { sens = +e.target.value; $('sensVal').textContent = sens.toFixed(1); store.set('qj-sens', sens); };
$('vol').oninput = e => { volume = +e.target.value; $('volVal').textContent = Math.round(volume * 100) + '%'; store.set('qj-vol', volume); if (master) master.gain.value = volume; };

// boshqaruv
document.addEventListener('mousemove', e => {
  if (state !== 'play' || document.pointerLockElement !== renderer.domElement || !player || player.dead) return;
  const k = .0022 * sens * (camera.fov / 75);
  player.yaw -= e.movementX * k; player.pitch -= e.movementY * k;
  ws.swayX = Math.max(-.03, Math.min(.03, ws.swayX - e.movementX * .00015));
  ws.swayY = Math.max(-.03, Math.min(.03, ws.swayY - e.movementY * .00015));
});
document.addEventListener('mousedown', e => {
  if (state !== 'play' || document.pointerLockElement !== renderer.domElement) return;
  if (e.button === 0) input.fire = true;
  if (e.button === 2 && ws.reloadT <= 0) input.aim = !input.aim;
});
document.addEventListener('mouseup', e => { if (e.button === 0) input.fire = false; });
document.addEventListener('contextmenu', e => e.preventDefault());
const keyMap = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r', ArrowUp: 'f', ArrowDown: 'b', ArrowLeft: 'l', ArrowRight: 'r' };
document.addEventListener('keydown', e => {
  if (keyMap[e.code]) input[keyMap[e.code]] = 1;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.walk = true;
  if (e.code === 'Space') { input.jump = true; e.preventDefault(); }
  if (state !== 'play' || !player) return;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'Digit1') selectWeapon(0); if (e.code === 'Digit2') selectWeapon(1); if (e.code === 'Digit3') selectWeapon(2);
  if (e.code === 'Tab') { e.preventDefault(); fillBoard($('sbBlue'), $('sbRed')); $('scoreboard').hidden = false; }
});
document.addEventListener('keyup', e => {
  if (keyMap[e.code]) input[keyMap[e.code]] = 0;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.walk = false;
  if (e.code === 'Space') input.jump = false;
  if (e.code === 'Tab') $('scoreboard').hidden = true;
});
document.addEventListener('wheel', e => { if (state === 'play' && player && !player.dead) selectWeapon((ws.cur + (e.deltaY > 0 ? 1 : 2)) % 3); });
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = viewCam.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); viewCam.updateProjectionMatrix();
});

/* ------------------------------ ASOSIY SIKL ------------------------------ */
// menyu fonida kamera aylanib turadi
let menuAngle = 0;
newMatch();
$('loading').hidden = true;
show('menu');
let last = performance.now(), mmT = 0, spotT = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    timeLeft -= dt;
    if (timeLeft <= 0) { timeLeft = 0; endMatch(); }
    const m = Math.floor(timeLeft / 60), s = Math.floor(timeLeft % 60);
    $('timer').textContent = `${m}:${String(s).padStart(2, '0')}`;
    updatePlayer(dt);
    for (const s of soldiers) if (!s.isPlayer) botUpdate(s, dt);
    // ittifoqchilar ko'rgan dushmanlar minimapda belgilanadi
    spotT -= dt;
    if (spotT <= 0) {
      spotT = .3;
      for (const s of soldiers) if (s.team === 'red' && !s.dead) {
        for (const a of soldiers) if (a.team === 'blue' && !a.dead && a.pos.distanceTo(s.pos) < 35 && lineOfSight(a.eye(), s.eye())) { s.spotted = now; break; }
      }
    }
    if ((mmT -= dt) <= 0) { mmT = 1 / 30; drawMinimap(); }
    if (hmT > 0) { hmT -= dt; if (hmT <= 0) $('hitmarker').style.opacity = 0; }
  } else if (state === 'menu') {
    menuAngle += dt * .08;
    camera.position.set(Math.sin(menuAngle) * 26, 9, Math.cos(menuAngle) * 26);
    camera.lookAt(0, 3, 0); camera.fov = 60; camera.updateProjectionMatrix();
    for (const s of soldiers) if (!s.isPlayer) botUpdate(s, dt);
    VM.group.visible = false;
  }
  updateFx(dt);
  renderer.clear();
  renderer.render(scene, camera);
  if (state === 'play' && player && !player.dead && VM.group.visible) { renderer.clearDepth(); renderer.render(viewScene, viewCam); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
