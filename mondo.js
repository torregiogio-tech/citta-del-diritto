// Mondo 3D della "Città del Diritto": palazzi, prof, personaggio, camera, controlli touch ed effetti.
// Tutto è fatto di forme semplici (low-poly, stile cartone con contorni neri): nessun modello esterno, funziona offline.
// app.js decide COSA succede; questo file decide solo COME si vede.
import * as THREE from './three.module.min.js';

export let ok = false;                 // false se il telefono non ha WebGL: l'app funziona lo stesso, senza 3D
let R, scena, cam, sole, emi, cv, opz, meteo, marcaDest;
const clock = new THREE.Clock();
const NPC = new Map();                 // id luogo -> { P, x, z, etichetta, segno }
const OSTACOLI = [];                   // {x1,x2,z1,z2} oppure {x,z,r}
const LIM = { x1: -19.5, x2: 19.5, z1: -71, z2: 44 };
const G = { x: 2, z: 20, rot: Math.PI, dest: null, seg: null, path: null, corsa: false, fermo: 0, P: null };
let stacco = false, modo = 'esplora', fuoco = null, spazio = 0, spazioSu = 0, vicino = null, temaAtt = null;
let stanza = null;                     // null = in città · 'sala' = biblioteca · 'palestra'
const AZ = 170, LIM_P = { x1: -5.4, x2: 5.4, z1: AZ - 8.8, z2: AZ + 9.6 };   // la palestra sta lontano, a sud
const pan = { x: 0, z: 0 };            // spostamento della vista con due dita

// ---------- Materiali: toon a 3 toni = look da cartone ----------
const GRAD = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true;
const MAT = new Map();
const toon = c => new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD });
const mat = c => MAT.get(c) || (MAT.set(c, toon(c)), MAT.get(c));
const BORDO = new THREE.MeshBasicMaterial({ color: 0x17142a, side: THREE.BackSide });
const BIANCO = new THREE.MeshBasicMaterial({ color: 0xffffff });
const M = {  // materiali che cambiano con l'ambientazione
  erba: toon('#62c34e'), siepe: toon('#3c9a3a'), strada: toon('#e3d6bb'), piazza: toon('#d4c4a4'),
  chioma: toon('#3f9e3a'), finestra: toon('#8fc8f0'), lampada: new THREE.MeshBasicMaterial({ color: '#f4f4f4' }),
};
const GEO = new Map();
const geo = (k, f) => GEO.get(k) || (GEO.set(k, f()), GEO.get(k));
const gBox = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));

function mesh(g, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, typeof m === 'string' ? mat(m) : m);
  o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o;
}
function box(w, h, d, c, x, y, z, t = 0) {        // t = spessore del contorno nero
  const o = mesh(gBox(w, h, d), c, x, y, z);
  if (t) o.add(new THREE.Mesh(gBox(w + 2 * t, h + 2 * t, d + 2 * t), BORDO));
  return o;
}
function sfera(r, c, x, y, z, t = 0, seg = 16) {
  const o = mesh(geo(`s${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75))), c, x, y, z);
  if (t) { const b = new THREE.Mesh(o.geometry, BORDO); b.scale.setScalar(1 + t / r); o.add(b); }
  return o;
}
function cil(rt, rb, h, c, x, y, z, seg = 12, t = 0) {
  const o = mesh(geo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), c, x, y, z);
  if (t) { const b = new THREE.Mesh(o.geometry, BORDO); b.scale.set(1 + t / rb, 1 + t / h * 2, 1 + t / rb); o.add(b); }
  return o;
}
function contorno(o, k) { const b = new THREE.Mesh(o.geometry, BORDO); b.scale.setScalar(k); return b; }
function prisma(w, h, d, c, x, y, z, t = 0) {     // tetto a capanna / timpano
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const g = geo(`p${w},${h},${d}`, () => new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2));
  const o = mesh(g, c, x, y, z);
  if (t) { const b = new THREE.Mesh(g, BORDO); b.scale.set(1 + 2 * t / w, 1 + 2 * t / h, 1 + 2 * t / d); b.position.y = -t; o.add(b); }
  return o;
}

// ---------- Scritte (insegne, nomi) disegnate su canvas ----------
function tex(righe, o = {}) {
  const w = o.w || 512, h = o.h || 128, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
  if (o.cornice) { g.strokeStyle = o.cornice; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14); }
  righe = [].concat(righe);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  righe.forEach((r, i) => {
    let f = (o.font || 70) * (i ? 0.55 : 1);
    const font = () => `900 ${f}px ui-rounded, -apple-system, "Helvetica Neue", Arial, sans-serif`;
    g.font = font(); while (g.measureText(r).width > w - 40 && f > 12) { f -= 2; g.font = font(); }
    const y = righe.length === 1 ? h / 2 + 4 : h * (i ? 0.75 : 0.4);
    if (o.ombra) { g.lineWidth = f / 4; g.strokeStyle = o.ombra; g.lineJoin = 'round'; g.strokeText(r, w / 2, y); }
    g.fillStyle = o.fg || '#2a1a0a'; g.fillText(r, w / 2, y);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function insegna(righe, larg, alt, bg = '#fff3d6', fg = '#3a2410') {
  return mesh(new THREE.PlaneGeometry(larg, alt), new THREE.MeshBasicMaterial({ map: tex(righe, { bg, fg, cornice: '#3a2410', h: Math.round(512 * alt / larg) }) }));
}
function sprite(t, sx, sy) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(sx, sy, 1); s.renderOrder = 10; return s;
}

// ---------- Bandiere che sventolano ----------
const BANDIERE = [];
function bandiera(statico, tipo, x, y, z, sc = 1) {
  statico.add(cil(0.05 * sc, 0.05 * sc, 3 * sc, '#d0d0d8', x, y + 1.5 * sc, z, 6));
  statico.add(sfera(0.09 * sc, '#d4af37', x, y + 3.05 * sc, z, 0, 8));
  const c = document.createElement('canvas'); c.width = 96; c.height = 64; const k = c.getContext('2d');
  const RIGHE = { it: ['#1f9e4a', '#ffffff', '#d32f2f'], fr: ['#1d3f99', '#ffffff', '#d32f2f'], ie: ['#1f9e4a', '#ffffff', '#f08a24'] },
    FASCE = { de: ['#151515', '#d32f2f', '#ffcf33'], at: ['#d32f2f', '#ffffff', '#d32f2f'], nl: ['#d32f2f', '#ffffff', '#1d3f99'] };
  if (RIGHE[tipo]) RIGHE[tipo].forEach((col, i) => { k.fillStyle = col; k.fillRect(i * 32, 0, 32, 64); });
  else if (FASCE[tipo]) FASCE[tipo].forEach((col, i) => { k.fillStyle = col; k.fillRect(0, i * 22, 96, 22); });
  else { k.fillStyle = '#1d3f99'; k.fillRect(0, 0, 96, 64); k.fillStyle = '#ffd23f';
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; k.beginPath(); k.arc(48 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 3.4, 0, 7); k.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const pg = new THREE.PlaneGeometry(1.5 * sc, sc, 10, 1).translate(0.75 * sc, 0, 0);
  const tela = mesh(pg, new THREE.MeshToonMaterial({ map: t, gradientMap: GRAD, side: THREE.DoubleSide }), x + 0.05, y + 2.45 * sc, z);
  scena.add(tela);
  BANDIERE.push({ pg, base: pg.attributes.position.array.slice(), fase: Math.random() * 6, sc });
}
function sventola(t) {
  for (const b of BANDIERE) {
    const p = b.pg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = b.base[i * 3] / b.sc; p.setZ(i, Math.sin(x * 3 - t * 4 + b.fase) * 0.13 * x * b.sc); }
    p.needsUpdate = true; b.pg.computeVertexNormals();
  }
}

// ---------- Personaggi (stile chibi: testa grande) ----------
const PELLE = '#f6c7a1';
function capsula(r, len, c, x, y, z, t = 0) {
  const o = mesh(geo(`k${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 5, 14)), c, x, y, z);
  if (t) { const b = new THREE.Mesh(o.geometry, BORDO); b.scale.set(1 + t / r, 1 + t / (r + len / 2), 1 + t / r); o.add(b); }
  return o;
}
// Personaggi chibi tondi: testa grande, corpo a capsula, occhioni. Cappelli e accessori stanno nel gruppo H
// (coordinate "vecchie" della testa, ingrandite: così tutti i look restano allineati).
function persona(a) {
  const g = new THREE.Group(), p = {};
  const capelli = a.capelli || '#4a2d16';
  for (const s of [-1, 1]) {
    const anca = new THREE.Group(); anca.position.set(s * 0.14, 0.42, 0); g.add(anca);
    anca.add(capsula(0.12, 0.16, a.gambe || '#2b3a5a', 0, -0.18, 0, 0.022));
    const pie = sfera(0.14, a.scarpe || '#2a2420', 0, -0.36, 0.05, 0.022, 12); pie.scale.set(1, 0.62, 1.35); anca.add(pie);
    p[s < 0 ? 'gS' : 'gD'] = anca;
  }
  if (a.toga) g.add(cil(0.34, 0.5, 0.62, a.toga, 0, 0.36, 0, 18, 0.025));
  const busto = new THREE.Group(); busto.position.y = 0.42; g.add(busto); p.busto = busto; p.by = 0.42;
  busto.add(capsula(0.3, 0.3, a.corpo, 0, 0.38, 0, 0.03));
  for (const s of [-1, 1]) {
    const spalla = new THREE.Group(); spalla.position.set(s * 0.36, 0.62, 0); busto.add(spalla);
    spalla.add(capsula(a.toga ? 0.12 : 0.095, 0.22, a.maniche || a.corpo, 0, -0.17, 0, 0.022));
    spalla.add(sfera(0.11, PELLE, 0, -0.38, 0, 0.02, 12));
    p[s < 0 ? 'bS' : 'bD'] = spalla;
  }
  // vestito, sul davanti del corpo (z ≈ 0.3)
  if (a.camicia) busto.add(box(0.24, 0.36, 0.04, '#ffffff', 0, 0.5, 0.285));
  if (a.cravatta) busto.add(box(0.09, 0.32, 0.04, a.cravatta, 0, 0.47, 0.305));
  if (a.cappuccio) { const c = sfera(0.2, a.corpo, 0, 0.78, -0.2, 0.02, 12); c.scale.set(1.6, 0.7, 1); busto.add(c);
    for (const s of [-1, 1]) busto.add(box(0.03, 0.18, 0.02, '#ffffff', s * 0.08, 0.6, 0.29)); }
  if (a.bavaglino) for (const s of [-1, 1]) busto.add(box(0.06, 0.16, 0.03, '#ffffff', s * 0.045, 0.68, 0.29));
  if (a.cordoni) for (const s of [-1, 1]) busto.add(box(0.04, 0.5, 0.03, a.cordoni, s * 0.2, 0.45, 0.235));
  if (a.collare) { const c = mesh(geo('collare', () => new THREE.TorusGeometry(0.28, 0.08, 8, 20)), a.collare, 0, 0.76, 0); c.rotation.x = Math.PI / 2; busto.add(c); }
  if (a.fascia) ['#1f9e4a', '#ffffff', '#d32f2f'].forEach((col, i) => {
    const f = box(0.07, 0.75, 0.03, col, -0.03 + (i - 1) * 0.065, 0.45, 0.3); f.rotation.z = 0.78; busto.add(f); });
  if (a.coccarda) [['#1f9e4a', 0.09], ['#ffffff', 0.062], ['#d32f2f', 0.034]].forEach(([col, r], i) => {
    const c = cil(r, r, 0.02, col, 0.16, 0.6, 0.27 + i * 0.008, 14); c.rotation.x = Math.PI / 2; busto.add(c); });
  if (a.libro) p.bS.add(box(0.3, 0.38, 0.1, a.libro, 0, -0.42, 0.14, 0.02));
  if (a.mantello) ['#1f9e4a', '#ffffff', '#d32f2f'].forEach((col, i) => busto.add(box(0.22, 0.9, 0.04, col, (i - 1) * 0.22, 0.35, -0.31, 0.015)));
  if (a.zaino) { busto.add(box(0.46, 0.5, 0.22, '#f08a24', 0, 0.45, -0.38, 0.025)); busto.add(box(0.32, 0.18, 0.06, '#c96a14', 0, 0.32, -0.5));
    for (const s of [-1, 1]) busto.add(box(0.05, 0.44, 0.02, '#c96a14', s * 0.17, 0.5, 0.29)); }
  // testa
  const T = new THREE.Group(); T.position.y = 0.8; busto.add(T); p.testa = T;
  T.add(sfera(0.52, PELLE, 0, 0.45, 0, 0.03, 24));
  p.occhi = [-1, 1].map(s => {
    const o = sfera(0.085, '#1c1830', s * 0.19, 0.47, 0.45, 0, 12); o.scale.set(1, 1.35, 0.55); o.userData.sy = 1.35; T.add(o);
    T.add(mesh(geo('luce', () => new THREE.SphereGeometry(0.03, 6, 4)), BIANCO, s * 0.19 + 0.03, 0.53, 0.5));
    return o;
  });
  for (const s of [-1, 1]) { const gu = sfera(0.08, '#ff9e9e', s * 0.32, 0.33, 0.39, 0, 8); gu.scale.set(1, 0.6, 0.35); T.add(gu); }
  p.bocca = mesh(geo('bocca', () => new THREE.TorusGeometry(0.065, 0.02, 6, 12, Math.PI)), '#7a2a2a', 0, 0.3, 0.5); p.bocca.rotation.z = Math.PI; p.bocca.castShadow = false; T.add(p.bocca);
  const H = new THREE.Group(); H.position.y = -0.0145; H.scale.setScalar(1.106); T.add(H);   // capelli e accessori
  const st = a.stile || 'corti';
  if (st === 'calvo') {
    for (const s of [-1, 1]) H.add(sfera(0.15, capelli, s * 0.43, 0.44, -0.08, 0.02, 10));
    const d = sfera(0.3, capelli, 0, 0.36, -0.3, 0.02, 12); d.scale.set(1.2, 0.5, 0.6); H.add(d);
  } else {
    const cap = mesh(geo('capelli', () => new THREE.SphereGeometry(0.505, 22, 11, 0, Math.PI * 2, 0, Math.PI * 0.47)), capelli, 0, 0.42, -0.02);
    cap.rotation.x = -0.18; cap.add(contorno(cap, 1.06)); H.add(cap);
    for (const [x, y, z] of [[-0.2, 0.62, 0.33], [0, 0.66, 0.37], [0.2, 0.62, 0.33]]) H.add(sfera(0.13, capelli, x, y, z, 0, 10));
    if (st === 'lunghi') { const l = sfera(0.42, capelli, 0, 0.2, -0.25, 0.025, 14); l.scale.set(1.1, 1, 0.6); H.add(l); }
    if (st === 'chignon') H.add(sfera(0.18, capelli, 0, 0.86, -0.3, 0.02, 10));
  }
  if (a.barba) { const b = sfera(0.3, a.barba, 0, 0.2, 0.2, 0.02, 12); b.scale.set(1.25, 0.72, 0.9); H.add(b); }
  if (a.occhiali && !a.sole) {
    for (const s of [-1, 1]) { const o = mesh(geo('lente', () => new THREE.TorusGeometry(0.115, 0.026, 6, 16)), a.occhiali, s * 0.165, 0.45, 0.46); o.castShadow = false; H.add(o); }
    H.add(box(0.1, 0.025, 0.02, a.occhiali, 0, 0.47, 0.47));
  }
  if (a.cappello && !a.testa) {
    const c = mesh(geo('berretto', () => new THREE.SphereGeometry(0.52, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.4)), a.cappello, 0, 0.45, -0.02);
    c.add(contorno(c, 1.05));
    H.add(c); H.add(box(0.52, 0.05, 0.32, a.cappello, 0, 0.69, 0.5, 0.02)); H.add(sfera(0.06, '#ffffff', 0, 0.97, 0.12, 0, 8));
  }
  if (a.elmo && !a.testa) {   // corazziere: elmo lucido con pennacchio
    H.add(mesh(geo('elmo', () => new THREE.SphereGeometry(0.53, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.45)), '#d8d8e0', 0, 0.45, -0.02));
    H.add(cil(0.04, 0.05, 0.25, '#d4af37', 0, 1.05, 0, 8)); const pn = sfera(0.16, '#c0392b', 0, 1.15, -0.18, 0, 10); pn.scale.set(0.5, 1, 1.6); H.add(pn);
  }
  if (a.tocco && !a.testa) { H.add(cil(0.33, 0.36, 0.28, '#151515', 0, 0.88, 0, 16, 0.02)); H.add(cil(0.365, 0.365, 0.06, '#d4af37', 0, 0.78, 0, 16)); }
  if (a.aura) { const au = mesh(geo('aura', () => new THREE.TorusGeometry(0.75, 0.05, 6, 32)), new THREE.MeshBasicMaterial({ color: '#ffd23f' }), 0, 0.04, 0);
    au.rotation.x = -Math.PI / 2; au.castShadow = false; g.add(au); p.aura = au; }
  // look rari (vinti negli incontri casuali o comprati con le monete)
  if (a.sole) { for (const s of [-1, 1]) H.add(box(0.27, 0.15, 0.04, '#111118', s * 0.165, 0.45, 0.45)); H.add(box(0.1, 0.03, 0.03, '#111118', 0, 0.47, 0.46)); }
  if (a.cuffie) {
    H.add(mesh(geo('arco', () => new THREE.TorusGeometry(0.53, 0.05, 6, 20, Math.PI)), '#2a2a3a', 0, 0.45, 0));
    for (const s of [-1, 1]) { const c = cil(0.16, 0.16, 0.13, '#ef4f5f', s * 0.5, 0.43, 0, 14, 0.02); c.rotation.z = Math.PI / 2; H.add(c); }
  }
  if (a.alloro) {
    const r = mesh(geo('alloro', () => new THREE.TorusGeometry(0.47, 0.045, 6, 24)), '#3f9e3a', 0, 0.68, 0); r.rotation.x = Math.PI / 2; H.add(r);
    for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; H.add(sfera(0.075, '#6cc94f', Math.cos(an) * 0.48, 0.7, Math.sin(an) * 0.48, 0, 6)); }
  }
  if (a.laurea) {
    H.add(cil(0.34, 0.36, 0.22, '#151515', 0, 0.86, 0, 16, 0.02));
    const t = box(0.95, 0.06, 0.95, '#151515', 0, 1.0, 0, 0.02); t.rotation.y = Math.PI / 4; H.add(t);
    H.add(box(0.04, 0.34, 0.04, '#ffd23f', 0.4, 0.86, 0.2));
  }
  if (a.parrucca) for (const [x, y, z] of [[0, 0.9, 0.05], [-0.28, 0.84, 0.12], [0.28, 0.84, 0.12], [-0.45, 0.62, 0], [0.45, 0.62, 0], [-0.48, 0.42, -0.05], [0.48, 0.42, -0.05],
    [-0.47, 0.22, -0.1], [0.47, 0.22, -0.1], [0, 0.72, -0.38], [-0.3, 0.52, -0.35], [0.3, 0.52, -0.35], [0, 0.34, -0.43]]) H.add(sfera(0.17, '#f4f1ea', x, y, z, 0.02, 8));
  if (a.aureola) { const au = mesh(geo('aureola', () => new THREE.TorusGeometry(0.32, 0.045, 6, 24)), new THREE.MeshBasicMaterial({ color: '#ffe27a' }), 0, 1.14, 0);
    au.rotation.x = Math.PI / 2; au.castShadow = false; H.add(au); }
  if (a.scala) g.scale.setScalar(a.scala);
  return { g, p, t: Math.random() * 5, vel: 0, umore: null, tu: 0, blink: 1 + Math.random() * 3 };
}

function anima(P, dt) {
  const p = P.p; P.t += dt;
  const v = P.vel, f = P.t * 10, sw = Math.sin(f) * 0.75 * v;
  p.gS.rotation.x = sw; p.gD.rotation.x = -sw;
  let bS = -sw * 0.9, bD = sw * 0.9, zS = 0.12, zD = -0.12, y = 0, testa = 0, inclina = 0, scuoti = 0;
  p.bocca.scale.set(1, 1, 1);
  if (P.umore) {
    P.tu -= dt;
    switch (P.umore) {
      case 'felice': y = Math.abs(Math.sin(P.tu * 10)) * 0.45; zS = -2.5; zD = 2.5; bS = bD = 0; p.bocca.scale.set(1.5, 2.6, 1); break;
      case 'triste': testa = 0.42; bS = bD = 0.15; scuoti = Math.sin(P.tu * 40) * 0.035; p.bocca.scale.set(1, -1, 1); break;
      case 'lancia': bD = -2.4; break;
      case 'colpito': testa = -0.3; inclina = -0.28; scuoti = Math.sin(P.tu * 50) * 0.05; break;
      case 'annuisce': testa = Math.sin(P.tu * 14) * 0.25; p.bocca.scale.set(1.3, 1.8, 1); break;
      case 'punta': bD = -1.6; zD = 0.3; break;
    }
    if (P.tu <= 0) P.umore = null;
  }
  p.bS.rotation.set(bS, 0, zS); p.bD.rotation.set(bD, 0, zD);
  p.testa.rotation.x = testa; p.busto.rotation.x = inclina; p.busto.position.x = scuoti;
  p.busto.position.y = p.by + Math.abs(Math.cos(f)) * 0.06 * v + Math.sin(P.t * 2.2) * 0.012;
  P.g.position.y = y;
  P.blink -= dt; const chiuso = P.blink < 0.12; if (P.blink < 0) P.blink = 2 + Math.random() * 3;
  for (const o of p.occhi) o.scale.y = chiuso ? 0.15 : o.userData.sy;
  if (p.aura) { p.aura.rotation.z += dt * 1.5; p.aura.scale.setScalar(1 + Math.sin(P.t * 3) * 0.08); }
}
const umore = (P, u, durata) => { if (P) { P.umore = u; P.tu = durata; } };

// ---------- Vestiti del giocatore (le skin) ----------
const VESTITI = {
  felpa: { corpo: '#3f6fd8', gambe: '#2b3a5a', cappuccio: true },
  occhiali: { corpo: '#3fae6a', gambe: '#3a3a4a', occhiali: '#15121f' },
  cappello: { corpo: '#d64545', gambe: '#2b3a5a', cappello: '#d64545' },
  camicia: { corpo: '#f4f4f4', gambe: '#3a3a4a', cravatta: '#c33333' },
  giacca: { corpo: '#22305a', gambe: '#22305a', camicia: true, cravatta: '#c33333' },
  avvocato: { corpo: '#151515', gambe: '#151515', toga: '#151515', bavaglino: true, cordoni: '#d4af37' },
  sindaco: { corpo: '#22305a', gambe: '#22305a', camicia: true, cravatta: '#22305a', fascia: true },
  magistrato: { corpo: '#151515', gambe: '#151515', toga: '#151515', bavaglino: true, cordoni: '#d8d8d8' },
  giudice: { corpo: '#151515', gambe: '#151515', toga: '#151515', collare: '#d4af37', tocco: true },
  presidente: { corpo: '#1e1e1e', gambe: '#1e1e1e', camicia: true, cravatta: '#1d3f99', coccarda: true, aura: true },
};
const ACCESSORI = { sole: { sole: 1 }, cuffie: { cuffie: 1, testa: 1 }, alloro: { alloro: 1, testa: 1 }, laurea: { laurea: 1, testa: 1 },
  parrucca: { parrucca: 1, testa: 1 }, mantello: { mantello: 1 }, zaino: { zaino: 1 }, aureola: { aureola: 1 } };
let LOOK = {};
const creaGiocatore = (id, look = LOOK) => persona({ ...(VESTITI[id] || VESTITI.felpa), capelli: look.capelli || '#4a2d16', ...(ACCESSORI[look.acc] || {}),
  ...((look.liv || 1) >= 5 ? { aura: true } : {}) });   // evoluzione massima: aura dorata

// ---------- Palazzi ----------
const STILI = {
  universita: { w: 9, d: 6, h: 5.2, muro: '#c8553d', corn: '#f2e6cf', tetto: 'timpano', tettoCol: '#9c3b2a', colonne: 4 },
  seggio: { w: 9, d: 6, h: 4.6, muro: '#eef1f6', corn: '#3f6fd8', tetto: 'piatto', urna: true, pers: '#3f6fd8' },
  montecitorio: { w: 10, d: 6, h: 6, muro: '#d98e4a', corn: '#f2e6cf', tetto: 'torre', bandiere: ['it', 'ue'] },
  quirinale: { w: 10, d: 6, h: 6.4, muro: '#f0d9a0', corn: '#fff8e6', tetto: 'torre', bandiere: ['it'] },
  biblioteca: { w: 9, d: 6, h: 5.4, muro: '#e8e0cc', corn: '#7a5a3a', tetto: 'timpano', tettoCol: '#7a5a3a', colonne: 6 },
  europa: { w: 9, d: 6, h: 7, muro: '#4a7fc1', corn: '#dbe8f7', tetto: 'piatto', vetri: true, stelle: true, bandiere: ['ue'] },
  regione: { w: 9, d: 6, h: 5, muro: '#e3b26a', corn: '#a0522d', tetto: 'torre', orologio: true, bandiere: ['it'] },
  tribunale: { w: 10, d: 6, h: 5.4, muro: '#b9bcc4', corn: '#eceef2', tetto: 'timpano', tettoCol: '#9aa0aa', colonne: 6, bilancia: true },
  rettorato: { w: 14, d: 8, h: 7, muro: '#f4efe4', corn: '#d4af37', tetto: 'cupola', colonne: 8, bandiere: ['it', 'ue'] },
  libreria: { w: 9, d: 6, h: 5.6, muro: '#8a3b2e', corn: '#f2e6cf', tetto: 'timpano', tettoCol: '#5a2a1e', pila: true },
  casa: { w: 7, d: 5, h: 3.4, muro: '#f6e7c8', corn: '#ffffff', tetto: 'tetto', tettoCol: '#c0492b' },
  // monumenti delle cittadine a tema
  ambasciata: { w: 10, d: 6, h: 5, muro: '#f7f3ea', corn: '#1d3f99', tetto: 'piatto', colonne: 4, bandiere: ['it', 'fr', 'de', 'ue', 'ie', 'nl'] },
  madama: { w: 10, d: 6, h: 6, muro: '#e8c27a', corn: '#fff8e6', tetto: 'piatto', colonne: 6, bandiere: ['it', 'ue'] },
  chigi: { w: 9, d: 6, h: 6.2, muro: '#e9b45f', corn: '#fff3d6', tetto: 'piatto', bandiere: ['it', 'ue'] },
  consulta: { w: 10, d: 6, h: 5.6, muro: '#f2e3c4', corn: '#fffaf0', tetto: 'timpano', tettoCol: '#c9a46a', colonne: 6, bilancia: true },
  gazzetta: { w: 9, d: 6, h: 5, muro: '#dfe3ea', corn: '#22305a', tetto: 'piatto', giornale: true },
  costituente: { w: 10, d: 6, h: 5.8, muro: '#f4efe4', corn: '#b08a3a', tetto: 'timpano', tettoCol: '#b08a3a', colonne: 6, bandiere: ['it'] },
  ragioneria: { w: 9, d: 6, h: 5.4, muro: '#cfd8c4', corn: '#3a5a3a', tetto: 'timpano', tettoCol: '#3a5a3a', colonne: 4, moneta: true },
  municipio: { w: 9, d: 6, h: 5.2, muro: '#f0c8a0', corn: '#8a3b2e', tetto: 'torre', orologio: true, bandiere: ['it'] },
  sportelli: { w: 8, d: 5, h: 4, muro: '#e8eef6', corn: '#3d7bf2', tetto: 'piatto', vetri: true },
  csm: { w: 10, d: 6, h: 5.6, muro: '#d6d0c4', corn: '#7a1f2b', tetto: 'piatto', colonne: 4, bandiere: ['it'] },
  aula: { w: 10, d: 6, h: 5.4, muro: '#b5543a', corn: '#f2e6cf', tetto: 'timpano', tettoCol: '#8a3b2e', colonne: 4 },
};
const davanti = (L, s) => L.z + s.d / 2 + (s.colonne ? 2 : 0) + 2.2;   // dove sta il prof

function palazzo(st, L) {
  const s = { ...STILI[L.stile], ...(L.muro ? { muro: L.muro } : {}), ...(L.tettoCol ? { tettoCol: L.tettoCol } : {}) }, g = new THREE.Group(); g.position.set(L.x, 0, L.z); st.add(g);
  const { w, d, h } = s, F = d / 2, top = 0.3 + h;
  g.add(box(w + 0.8, 0.3, d + 0.8, '#cfc6b4', 0, 0.15, 0, 0.03));
  g.add(box(w, h, d, s.muro, 0, 0.3 + h / 2, 0, 0.07));
  g.add(box(w + 0.5, 0.35, d + 0.5, s.corn, 0, top + 0.17, 0, 0.05));
  // finestre
  const piani = Math.max(1, Math.floor((h - 0.6) / 2.2)), nx = Math.floor(w / 1.8);
  for (let pi = 0; pi < piani; pi++) for (let i = 0; i < nx; i++) {
    const x = -w / 2 + (i + 0.5) * (w / nx), y = 1.75 + pi * 2.2;
    if (pi === 0 && Math.abs(x) < 1.3) continue;
    if (s.vetri) { g.add(mesh(gBox(w / nx - 0.25, 1.7, 0.1), M.finestra, x, y, F + 0.05)); continue; }
    g.add(box(0.95, 1.2, 0.1, s.corn, x, y, F + 0.03));
    g.add(mesh(gBox(0.7, 0.95, 0.12), M.finestra, x, y, F + 0.06));
    for (const lato of [-1, 1]) g.add(box(0.22, 1.05, 0.08, s.pers || '#4a7a3a', x + lato * 0.5, y, F + 0.1));  // persiane
  }
  // portone
  g.add(box(1.8, 2.6, 0.12, s.corn, 0, 1.6, F + 0.03));
  g.add(box(1.36, 2.25, 0.16, '#6b3f1d', 0, 1.45, F + 0.06));
  g.add(sfera(0.06, '#d4af37', 0.35, 1.45, F + 0.16, 0, 8));
  // portico con colonne e timpano davanti
  let yIns = top - 0.55, zIns = F + 0.08;
  if (s.colonne) {
    const hc = Math.min(h, 4.2), z = F + 1.3, larg = w * (s.colonne > 4 ? 0.8 : 0.6);
    for (let i = 0; i < s.colonne; i++) {
      const x = -larg / 2 + i * larg / (s.colonne - 1);
      g.add(cil(0.24, 0.27, hc, '#fbf8f0', x, 0.3 + hc / 2, z, 10, 0.04));
      g.add(box(0.62, 0.18, 0.62, '#fbf8f0', x, 0.39, z));
    }
    g.add(box(larg + 1.1, 0.4, 2.3, '#fbf8f0', 0, 0.3 + hc + 0.2, F + 1.15, 0.04));
    g.add(prisma(larg + 1.1, 1.2, 0.5, s.tettoCol || s.corn, 0, 0.3 + hc + 0.4, F + 2.05, 0.04));
    g.add(box(larg + 1.4, 0.3, 2.8, '#cfc6b4', 0, 0.15, F + 1.4));
    yIns = 0.3 + hc + 0.2; zIns = F + 2.32;
  }
  if (!L.anonimo) {
    const ins = insegna(L.giorno ? [L.nome.toUpperCase(), 'PALESTRA ' + L.giorno] : [L.nome.toUpperCase()], 4.2, L.giorno ? 1.1 : 0.8);
    ins.position.set(0, yIns + (s.colonne ? 0 : 0.05), zIns + 0.01); ins.castShadow = false; g.add(ins);
  }
  if (s.giornale) {   // un rotolo di Gazzetta Ufficiale gigante
    const r = cil(0.9, 0.9, 3.2, '#fbf8ee', 3.2, 0.95, F + 1.6, 18, 0.04); r.rotation.z = Math.PI / 2; g.add(r);
    const t = insegna(['GAZZETTA UFFICIALE'], 2.6, 0.5, '#fbf8ee', '#151515'); t.position.set(3.2, 0.95, F + 2.52); g.add(t);
    OSTACOLI.push({ x: L.x + 3.2, z: L.z + F + 1.6, r: 1.8 });
  }
  if (s.moneta) {   // moneta gigante davanti alla Ragioneria
    const m = cil(1, 1, 0.25, '#e0b53a', -3.3, 1.3, F + 2.4, 24, 0.04); m.rotation.x = Math.PI / 2; g.add(m);
    const t = insegna(['€'], 1.2, 1.2, '#e0b53a', '#7a5a10'); t.position.set(-3.3, 1.3, F + 2.54); g.add(t);
    g.add(box(0.6, 0.3, 0.6, '#cfc6b4', -3.3, 0.15, F + 2.4)); OSTACOLI.push({ x: L.x - 3.3, z: L.z + F + 2.4, r: 1.1 });
  }
  // tetto
  if (s.tetto === 'timpano') g.add(prisma(w + 0.5, 1.6, d + 0.5, s.tettoCol, 0, top + 0.35, 0, 0.05));
  if (s.tetto === 'tetto') g.add(prisma(w + 1, 2.2, d + 1.2, s.tettoCol, 0, top + 0.3, 0, 0.06));
  if (s.tetto === 'piatto') { for (const lx of [-1, 1]) g.add(box(0.3, 0.6, d + 0.5, s.corn, lx * (w / 2 + 0.1), top + 0.6, 0)); g.add(box(w + 0.5, 0.6, 0.3, s.corn, 0, top + 0.6, F + 0.1)); }
  const tz = -(d / 2 - 1.4);
  if (s.tetto === 'torre') {
    g.add(box(2.6, 1.9, 2.6, s.muro, 0, top + 1.3, tz, 0.05));
    g.add(box(3, 0.3, 3, s.corn, 0, top + 2.35, tz, 0.04));
    const piramide = cil(0, 2.1, 1.2, s.corn === '#a0522d' ? '#a0522d' : '#b85a3a', 0, top + 3.1, tz, 4, 0.04); piramide.rotation.y = Math.PI / 4; g.add(piramide);
    if (s.orologio) { const o = cil(0.7, 0.7, 0.1, '#ffffff', 0, top + 1.35, tz + 1.32, 20, 0.04); o.rotation.x = Math.PI / 2; g.add(o);
      g.add(box(0.07, 0.5, 0.04, '#222', 0, top + 1.55, tz + 1.4)); const l = box(0.07, 0.36, 0.04, '#222', 0.12, top + 1.3, tz + 1.4); l.rotation.z = 1.2; g.add(l); }
    else g.add(box(1, 1, 0.1, '#3a3050', 0, top + 1.3, tz + 1.32));
  }
  if (s.tetto === 'cupola') {
    g.add(cil(3, 3.2, 1.6, s.muro, 0, top + 1.1, -0.5, 24, 0.05));
    g.add(mesh(geo('cupola', () => new THREE.SphereGeometry(3.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), '#e0b53a', 0, top + 1.9, -0.5));
    g.add(cil(0.45, 0.5, 1, '#f4efe4', 0, top + 5.4, -0.5, 10, 0.03)); g.add(sfera(0.35, '#e0b53a', 0, top + 6.1, -0.5, 0.03, 10));
  }
  if (s.urna) {  // urna elettorale gigante
    g.add(box(1.4, 1.2, 1, '#ffffff', 3, 0.9, F + 1.2, 0.04)); g.add(box(0.7, 0.06, 0.2, '#222', 3, 1.52, F + 1.2));
    const sch = box(0.5, 0.65, 0.03, '#fffbe0', 3, 1.85, F + 1.2); sch.rotation.z = 0.15; g.add(sch);
    const vota = insegna(['VOTA'], 1.2, 0.4, '#3f6fd8', '#ffffff'); vota.position.set(3, 0.9, F + 1.71); g.add(vota);
  }
  if (s.pila) {  // pila di libri giganti accanto al portone
    [['#c0392b', 1.7], ['#3d7bf2', 1.5], ['#ffd23f', 1.3]].forEach(([c, lw], i) => { const b = box(lw, 0.36, 1.05, c, -3, 0.48 + i * 0.36, F + 1.1, 0.03); b.rotation.y = i * 0.3 - 0.2; g.add(b); });
    OSTACOLI.push({ x: L.x - 3, z: L.z + F + 1.1, r: 1.1 });
  }
  if (s.stelle) for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(box(0.28, 0.28, 0.08, '#ffd23f', Math.cos(a) * 1.3, top - 1.5 + Math.sin(a) * 1.3, F + 0.12)); }
  if (s.bilancia) { const y0 = 0.3 + 4.2 + 1.1, z0 = F + 2.35;
    g.add(box(0.08, 0.9, 0.08, '#d4af37', 0, y0 + 0.6, z0)); g.add(box(1.5, 0.07, 0.07, '#d4af37', 0, y0 + 1.05, z0));
    for (const lx of [-1, 1]) { const piatto = cil(0.28, 0.18, 0.1, '#d4af37', lx * 0.7, y0 + 0.62, z0, 10); g.add(piatto); g.add(box(0.03, 0.4, 0.03, '#d4af37', lx * 0.7, y0 + 0.85, z0)); } }
  const nb = (s.bandiere || []).length;
  for (const [i, b] of (s.bandiere || []).entries()) bandiera(st, b, L.x + (s.tetto === 'torre' ? -0.4 + i * 0.8 : -w / 2 + 0.7 + i * (w - 1.4) / Math.max(1, nb - 1)), top + (s.tetto === 'torre' ? 2.5 : 0.35), L.z + (s.tetto === 'torre' ? tz : F - 0.3));
  // aiuole davanti
  for (const lx of [-1, 1]) { g.add(box(2, 0.4, 0.9, '#8a6a4a', lx * (w / 2 - 1.3), 0.5, F + 0.6, 0.03)); fiori.push([L.x + lx * (w / 2 - 1.3), L.z + F + 0.6, 2, 0.8, 0.72]); }
  OSTACOLI.push({ x1: L.x - w / 2 - 0.5, x2: L.x + w / 2 + 0.5, z1: L.z - d / 2 - 0.5, z2: L.z + F + (s.colonne ? 2.6 : 1.1) });
  if (s.urna) OSTACOLI.push({ x: L.x + 3, z: L.z + F + 1.2, r: 1 });
}

// ---------- Alberi, fiori, lampioni (instanced = poche chiamate grafiche) ----------
const alberi = [], fiori = [];
function piantaAlberi() {
  const n = alberi.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.24, 1.4, 7), mat('#7a5230'), n);
  const c1 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.1, 0), M.chioma, n);
  const c2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.8, 0), M.chioma, n);
  const b1 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.17, 0), BORDO, n);
  alberi.forEach(([x, z, s], i) => {
    q.setFromAxisAngle(v.set(0, 1, 0), i * 1.7);
    tronco.setMatrixAt(i, m4.compose(v.set(x, 0.7 * s, z), q, sc.set(s, s, s)));
    c1.setMatrixAt(i, m4.compose(v.set(x, 1.95 * s, z), q, sc.set(s, s, s)));
    b1.setMatrixAt(i, m4.compose(v.set(x, 1.95 * s, z), q, sc.set(s, s, s)));
    c2.setMatrixAt(i, m4.compose(v.set(x + 0.2 * s, 2.8 * s, z - 0.1 * s), q, sc.set(s, s, s)));
  });
  for (const o of [tronco, c1, c2]) { o.castShadow = o.receiveShadow = true; scena.add(o); }
  scena.add(b1);
  const col = ['#ff5a6e', '#ffd23f', '#ffffff', '#b06bff', '#ff8f3f', '#5aa8ff'], c = new THREE.Color();
  const tot = fiori.reduce((t, f) => t + Math.round(f[2] * f[3] * 14), 0);
  const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.11, 0), toon('#ffffff'), tot);
  let k = 0;
  for (const [x, z, w, d, y = 0.06] of fiori) for (let i = 0; i < Math.round(w * d * 14); i++, k++) {
    fm.setMatrixAt(k, m4.compose(v.set(x + (Math.random() - 0.5) * w, y + Math.random() * 0.08, z + (Math.random() - 0.5) * d), q, sc.set(1, 1, 1)));
    fm.setColorAt(k, c.set(col[k % col.length]));
  }
  if (tot) scena.add(fm);
  alberi.length = 0; fiori.length = 0;   // pronti per la zona successiva (un gruppo per zona: si disegna solo quello che si vede)
}
function lampione(st, x, z) {
  st.add(cil(0.08, 0.11, 3.2, '#2e2e3a', x, 1.6, z, 8));
  st.add(box(0.5, 0.12, 0.5, '#2e2e3a', x, 3.25, z));
  st.add(mesh(geo('bulbo', () => new THREE.SphereGeometry(0.24, 10, 8)), M.lampada, x, 3.5, z));
  OSTACOLI.push({ x, z, r: 0.35 });
}
function panchina(st, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; st.add(g);
  g.add(box(1.8, 0.12, 0.6, '#b07a45', 0, 0.5, 0, 0.03)); g.add(box(1.8, 0.5, 0.1, '#b07a45', 0, 0.85, -0.28, 0.03));
  for (const lx of [-1, 1]) g.add(box(0.1, 0.5, 0.5, '#3a3a44', lx * 0.75, 0.25, 0));
  OSTACOLI.push({ x, z, r: 1 });
}

// ---------- Fondere le parti ferme: da centinaia a poche decine di chiamate grafiche ----------
function unisci(radice) {
  radice.updateMatrixWorld(true);
  const gruppi = new Map();
  radice.traverse(o => { if (o.isMesh) { if (!gruppi.has(o.material)) gruppi.set(o.material, []); gruppi.get(o.material).push(o); } });
  const out = new THREE.Group();
  for (const [m, lista] of gruppi) {
    const parti = lista.map(o => (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld));
    const n = parti.reduce((t, g) => t + g.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let k = 0;
    for (const g of parti) {
      pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2);
      k += g.attributes.position.count; g.dispose();
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const me = new THREE.Mesh(bg, m); me.castShadow = m !== BORDO && !m.isMeshBasicMaterial; me.receiveShadow = m !== BORDO; out.add(me);
  }
  return out;
}

// ---------- La città ----------
// ---------- Monumenti speciali delle cittadine ----------
function faro(st, x, z) {   // faro sul mare territoriale
  st.add(box(12, 0.1, 9, '#4fb4ff', x, 0.03, z, 0));
  for (const [dx, dz, r] of [[-1.2, 0.6, 1.1], [1.1, -0.4, 0.9], [0.2, 1.4, 0.8]]) { const sc = sfera(r, '#8a8a96', x + dx, 0.3, z + dz, 0.03, 8); sc.scale.y = 0.6; st.add(sc); }
  for (let i = 0; i < 5; i++) st.add(cil(0.95 - i * 0.1, 1.05 - i * 0.1, 1.2, i % 2 ? '#ffffff' : '#d32f2f', x, 0.6 + i * 1.2, z, 16, 0.04));
  st.add(cil(0.75, 0.75, 0.9, '#2e2e3a', x, 6.45, z, 12, 0.04));
  st.add(mesh(geo('lanterna', () => new THREE.SphereGeometry(0.55, 12, 8)), M.lampada, x, 6.5, z));
  st.add(cil(0.1, 0.85, 0.7, '#d32f2f', x, 7.25, z, 12, 0.03));
  OSTACOLI.push({ x1: x - 6, x2: x + 6, z1: z - 4.5, z2: z + 4.5 });
}
function palco(st, x, z) {   // palco del comizio
  st.add(box(7, 1, 4, '#8a5a2b', x, 0.5, z, 0.05)); st.add(box(7.2, 0.15, 4.2, '#b0263a', x, 1.05, z));
  st.add(box(7, 3.2, 0.3, '#1d3f99', x, 2.7, z - 1.9, 0.04));
  ['#1f9e4a', '#ffffff', '#d32f2f'].forEach((c, i) => st.add(box(2.33, 0.5, 0.32, c, x - 2.33 + i * 2.33, 4.1, z - 1.9)));
  st.add(cil(0.04, 0.06, 1.3, '#2e2e3a', x, 1.75, z + 0.8, 8)); st.add(sfera(0.12, '#2e2e3a', x, 2.45, z + 0.8, 0, 8));
  for (let i = 0; i < 7; i++) st.add(sfera(0.18, ['#ffd23f', '#ef4f5f', '#3d7bf2'][i % 3], x - 3 + i, 3.1 + Math.sin(i) * 0.1, z - 1.6, 0, 8));
  OSTACOLI.push({ x1: x - 3.6, x2: x + 3.6, z1: z - 2.2, z2: z + 2.1 });
}
function carcere(st, x, z) {   // mura con torrette e un blocco con le sbarre
  const W = 13, Dd = 9;
  for (const lx of [-1, 1]) st.add(box(0.6, 3.6, Dd, '#8a8a96', x + lx * W / 2, 1.8, z, 0.04));
  st.add(box(W, 3.6, 0.6, '#8a8a96', x, 1.8, z - Dd / 2, 0.04));
  for (const lx of [-1, 1]) st.add(box(W / 2 - 1.5, 3.6, 0.6, '#8a8a96', x + lx * (W / 4 + 0.75), 1.8, z + Dd / 2, 0.04));
  st.add(box(3, 3, 0.4, '#5a5a66', x, 1.5, z + Dd / 2, 0.03));   // portone
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    st.add(box(1.6, 5.4, 1.6, '#a0a0aa', x + lx * W / 2, 2.7, z + lz * Dd / 2, 0.04)); st.add(prisma(2, 1, 2, '#5a5a66', x + lx * W / 2, 5.4, z + lz * Dd / 2, 0.03));
  }
  st.add(box(7, 4.5, 4, '#c4c0b8', x, 2.25, z - 1, 0.05));
  for (let i = 0; i < 4; i++) { const fx = x - 2.4 + i * 1.6; st.add(box(0.9, 1, 0.1, '#2e2e3a', fx, 3, z + 1.02));
    for (let b = 0; b < 4; b++) st.add(box(0.05, 1, 0.14, '#9a9aa6', fx - 0.33 + b * 0.22, 3, z + 1.06)); }
  OSTACOLI.push({ x1: x - W / 2 - 0.8, x2: x + W / 2 + 0.8, z1: z - Dd / 2 - 0.8, z2: z + Dd / 2 + 0.4 });
}
function torreVetro(st, x, z) {   // il Parlamento europeo di Strasburgo, in piccolo
  st.add(cil(4, 4.2, 0.3, '#cfc6b4', x, 0.15, z, 28, 0.03));
  st.add(mesh(new THREE.CylinderGeometry(3.4, 3.6, 8, 28, 1, true), M.finestra, x, 4.3, z));
  for (let y = 1.3; y < 8.3; y += 1.4) st.add(cil(3.62, 3.62, 0.15, '#dbe8f7', x, y, z, 28));
  st.add(cil(3.7, 3.7, 0.3, '#4a7fc1', x, 8.4, z, 28, 0.04));
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; st.add(box(0.35, 0.35, 0.1, '#ffd23f', x + Math.cos(a) * 1.4, 6 + Math.sin(a) * 1.4, z + 3.65)); }
  OSTACOLI.push({ x, z, r: 4.3 });
}
const SPECIALI = { faro, palco, carcere, torre: torreVetro };

// ---------- Il mondo: 10 cittadine in fila verso nord, unite da percorsi con un varco ----------
export const PASSO = 95;
const zc = k => -PASSO * k;
const VARCHI = [], PEDANE = [], LEVE = {}, GETTI = [];
let ultimaPedana = null;
export function costruisci(luoghi, citta, vestito) {
  if (!ok) return;
  const N = citta.length;
  Object.assign(LIM, { x1: -25.5, x2: 25.5, z1: zc(N - 1) - 26, z2: 26 });
  const lung = LIM.z2 - LIM.z1 + 140;
  const prato = new THREE.Mesh(new THREE.PlaneGeometry(260, lung), M.erba); prato.rotation.x = -Math.PI / 2; prato.position.z = (LIM.z1 + LIM.z2) / 2; prato.receiveShadow = true; scena.add(prato);
  const colori = ['#f6e7c8', '#cfe3f7', '#f7d6d0', '#dff0d0', '#f3e1a8', '#e6d8f2'];
  for (let k = 0; k < N; k++) {
    const C = citta[k], z0 = zc(k), st = new THREE.Group();
    st.add(mesh(gBox(8, 0.04, 54), M.strada, 0, 0.02, z0));                                           // viale
    st.add(mesh(geo('piazza', () => new THREE.CylinderGeometry(8, 8, 0.07, 44)), M.piazza, 0, 0.035, z0 + 4));
    if (k % 2 === 0) {   // fontana
      st.add(cil(2.9, 3.1, 0.6, '#cfc6b4', 0, 0.3, z0 + 4, 28, 0.04));
      st.add(mesh(geo('acqua', () => new THREE.CylinderGeometry(2.6, 2.6, 0.1, 28)), new THREE.MeshToonMaterial({ color: '#4fb4ff', gradientMap: GRAD }), 0, 0.58, z0 + 4));
      st.add(cil(0.35, 0.5, 1.6, '#cfc6b4', 0, 0.9, z0 + 4, 12, 0.03)); st.add(cil(1.1, 0.4, 0.35, '#cfc6b4', 0, 1.75, z0 + 4, 16, 0.03));
      const getto = mesh(new THREE.ConeGeometry(0.35, 1.4, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.75 }), 0, 2.55, z0 + 4);
      getto.castShadow = false; scena.add(getto); GETTI.push(getto);
    } else {   // obelisco con il colore della città
      st.add(box(2.6, 0.8, 2.6, '#cfc6b4', 0, 0.4, z0 + 4, 0.04)); st.add(box(1.2, 0.5, 1.2, C.colore, 0, 1.05, z0 + 4, 0.03));
      st.add(cil(0.25, 0.6, 5, '#efe6d2', 0, 3.8, z0 + 4, 4, 0.04)); st.add(cil(0, 0.27, 0.6, '#d4af37', 0, 6.6, z0 + 4, 4, 0.02));
    }
    OSTACOLI.push({ x: 0, z: z0 + 4, r: 3.3 });
    for (const [x, z, r] of [[-5, 10, 0.6], [5, 10, -0.6], [-5, -2, 2.5], [5, -2, -2.5]]) panchina(st, x, z0 + z, r);
    for (let z = z0 + 25; z > z0 - 27; z -= 9) for (const lx of [-1, 1]) if (Math.abs(z - z0 - 4) > 9) lampione(st, lx * 4.6, z);
    // cartello di benvenuto
    const cart = insegna([C.nome.toUpperCase()], 4.6, 0.95, C.colore, '#1d1b2e'); cart.position.set(-7.4, 2.5, z0 + 24.6); cart.castShadow = false; st.add(cart);
    for (const lx of [-1, 1]) st.add(cil(0.08, 0.08, 2.6, '#6b3f1d', -7.4 + lx * 2.1, 1.3, z0 + 24.5, 6));
    OSTACOLI.push({ x1: -9.7, x2: -5.1, z1: z0 + 24.2, z2: z0 + 24.8 });
    // case ai bordi
    for (const [i, [x, dz]] of [[-21.5, 23], [21.5, 23], [-21.5, 1], [21.5, 1], [-21.5, -21], [21.5, -21]].entries()) {
      const L = { id: `casa-${k}-${i}`, stile: 'casa', x, z: z0 + dz, anonimo: true, muro: colori[(k + i) % colori.length], tettoCol: ['#c0492b', '#5a6a8a', '#7a4a2a'][(k + i) % 3] };
      palazzo(st, L); PIANTA.push({ id: L.id, x, z: L.z, w: 7, d: 5, col: L.muro, casa: true });
    }
    // monumenti a tema (non si entra: ci si avvicina e il compagno spiega)
    for (const P of C.luoghi || []) {
      if (SPECIALI[P.speciale]) SPECIALI[P.speciale](st, P.x, P.z);
      else palazzo(st, P);
      const s = STILI[P.stile] || { w: 10, d: 7 }, nz = P.speciale ? P.z + (P.speciale === 'faro' ? 5.6 : P.speciale === 'torre' ? 5.2 : P.speciale === 'carcere' ? 5.6 : 3) : davanti(P, s) - 0.6;
      if (!P.speciale && P.x) st.add(mesh(gBox(Math.abs(P.x) - 4, 0.04, 3.4), M.strada, Math.sign(P.x) * (Math.abs(P.x) + 4) / 2, 0.02, nz));
      const segno = sprite(TEX_SEGNO.info, 0.9, 0.9); segno.position.set(P.x, 2.4, nz); scena.add(segno);
      const et = sprite(tex([P.nome], { fg: '#ffffff', ombra: '#17142a', font: 70 }), 3.4, 0.85); et.position.set(P.x, 1.7, nz); scena.add(et);
      NPC.set(P.id, { P: null, x: P.x, z: nz, segno, et, h: 2.4, info: true });
      PIANTA.push({ id: P.id, x: P.x, z: P.z, w: s.w || 12, d: s.d || 9, col: s.muro || '#a0a0aa', monumento: true });
    }
    // alberi ai margini e siepi della città
    for (let z = z0 + 26; z > z0 - 27; z -= 3.3) for (const lx of [-1, 1]) { alberi.push([lx * (28 + (Math.abs(z * 7) % 3)), z, 1.1 + (Math.abs(z * 13) % 5) / 10]); alberi.push([lx * (33 + (Math.abs(z * 5) % 2)), z + 1.5, 1.3]); }
    for (const lx of [-1, 1]) for (const dz of [16, -6, -15]) { alberi.push([lx * 7.5, z0 + dz, 0.9]); OSTACOLI.push({ x: lx * 7.5, z: z0 + dz, r: 0.7 }); }
    for (const lx of [-1, 1]) st.add(box(0.9, 1.1, 54, M.siepe, lx * 26.3, 0.55, z0, 0.04));
    if (k === 0) st.add(box(53.5, 1.1, 0.9, M.siepe, 0, 0.55, z0 + 27, 0.04));
    if (k === N - 1) st.add(box(53.5, 1.1, 0.9, M.siepe, 0, 0.55, z0 - 27, 0.04));
    else percorsoTra(st, k);
    scena.add(unisci(st));
    piantaAlberi();
  }
  // palazzi del gioco (palestre, casa, biblioteca, rettorato) e chi ci sta davanti
  const st = new THREE.Group();
  for (const L of luoghi) {
    const s = STILI[L.stile]; palazzo(st, L);
    const nz = davanti(L, s);
    if (L.x) st.add(mesh(gBox(Math.abs(L.x) - 4, 0.04, 3.4), M.strada, Math.sign(L.x) * (Math.abs(L.x) + 4) / 2, 0.02, nz - 0.6));
    PIANTA.push({ id: L.id, x: L.x, z: L.z, w: s.w, d: s.d, col: s.muro, px: L.x, pz: nz });
    if (L.giorno) {   // palestra: il prof ti aspetta dentro; fuori c'è solo lo zerbino d'ingresso
      st.add(box(2.2, 0.06, 1.3, '#b0263a', L.x, 0.05, nz - 0.4, 0.02)); st.add(box(1.8, 0.07, 0.9, '#d4af37', L.x, 0.06, nz - 0.4));
      const et = sprite(tex([L.prof], { fg: '#ffffff', ombra: '#17142a', font: 76 }), 3.4, 0.85); et.position.set(L.x, 2.2, nz); scena.add(et);
      const segno = sprite(TEX_SEGNO.sfida, 0.9, 0.9); segno.position.set(L.x, 3, nz); scena.add(segno);
      NPC.set(L.id, { P: null, x: L.x, z: nz, segno, et, h: 3 });
    } else if (L.persona) {
      const P = persona(L.persona); P.g.position.set(L.x, 0, nz); scena.add(P.g);
      const et = sprite(tex([L.prof], { fg: '#ffffff', ombra: '#17142a', font: 76 }), 3.4, 0.85); et.position.set(L.x, 2.95 * (L.persona.scala || 1), nz); scena.add(et);
      const segno = sprite(L.id === 'biblio' ? TEX_SEGNO.libri : TEX_SEGNO.sfida, 0.9, 0.9); segno.position.set(L.x, 3.75 * (L.persona.scala || 1), nz); scena.add(segno);
      NPC.set(L.id, { P, x: L.x, z: nz, rot: 0, segno, et, h: 3.75 * (L.persona.scala || 1) });
      OSTACOLI.push({ x: L.x, z: nz, r: 0.7 });
    } else {  // l'armadio davanti a casa
      const a = new THREE.Group(); a.position.set(L.x + 2.2, 0, nz - 1); scena.add(a);
      a.add(box(1.3, 2.1, 0.7, '#9a6234', 0, 1.05, 0, 0.04)); a.add(box(0.04, 1.8, 0.02, '#5a3418', 0, 1.1, 0.36));
      for (const lx of [-1, 1]) a.add(sfera(0.06, '#d4af37', lx * 0.12, 1.15, 0.38, 0, 8));
      a.add(box(1.45, 0.15, 0.8, '#7a4a24', 0, 2.15, 0, 0.03));
      const segno = sprite(TEX_SEGNO.armadio, 0.9, 0.9); segno.position.set(L.x + 2.2, 3, nz - 1); scena.add(segno);
      NPC.set(L.id, { P: null, x: L.x + 2.2, z: nz - 1, segno, h: 3 });
      OSTACOLI.push({ x: L.x + 2.2, z: nz - 1, r: 0.9 });
    }
  }
  scena.add(unisci(st));
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ color: '#241f33' })); fondo.rotation.x = -Math.PI / 2; fondo.position.set(0, -0.4, 150); scena.add(fondo);
  marcaDest = mesh(new THREE.RingGeometry(0.35, 0.55, 24), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true }), 0, 0.08, 0);
  marcaDest.rotation.x = -Math.PI / 2; marcaDest.visible = false; marcaDest.castShadow = false; scena.add(marcaDest);
  G.P = creaGiocatore(vestito); scena.add(G.P.g);
  inquadra(0, true);
}
// Percorso k: dalla città k alla città k+1. Siepi ai lati, bosco fuori, un varco di pietra a metà.
function percorsoTra(st, k) {
  const z0 = zc(k), a = z0 - 27, b = z0 - 68, gz = z0 - 56, len = a - b;
  st.add(mesh(gBox(8, 0.04, len), M.strada, 0, 0.02, (a + b) / 2));
  for (const lx of [-1, 1]) {
    st.add(box(0.9, 1.1, len, M.siepe, lx * 7, 0.55, (a + b) / 2, 0.04));
    st.add(box(19.5, 1.1, 0.9, M.siepe, lx * 16.8, 0.55, a, 0.04)); st.add(box(19.5, 1.1, 0.9, M.siepe, lx * 16.8, 0.55, b, 0.04));
    OSTACOLI.push({ x1: lx < 0 ? -27 : 6.6, x2: lx < 0 ? -6.6 : 27, z1: b - 0.5, z2: a + 0.5 });
    for (let z = a - 1; z > b; z -= 2.6) for (let x = 9; x < 34; x += 3.2) alberi.push([lx * (x + Math.abs(z * 3.7 % 1.4)), z + (x % 2), 0.9 + Math.abs((z * x) % 7) / 10]);
    fiori.push([lx * 5.8, (a + gz) / 2, 1.2, 14], [lx * 5.8, (gz + b) / 2, 1.2, 8]);
  }
  // il varco: muro, pilastri e un cancello che sprofonda quando si apre
  for (const lx of [-1, 1]) {
    st.add(box(4.6, 2.6, 1, '#8a8a96', lx * 4.3, 1.3, gz, 0.05));
    for (let i = 0; i < 3; i++) st.add(box(0.6, 0.5, 1.05, '#8a8a96', lx * (2.8 + i * 1.5), 2.85, gz));
    st.add(box(0.9, 3.6, 1.3, '#a0a0aa', lx * 2.2, 1.8, gz, 0.05)); st.add(sfera(0.5, '#d4af37', lx * 2.2, 3.9, gz, 0.04, 10));
    OSTACOLI.push({ x1: lx < 0 ? -6.6 : 1.7, x2: lx < 0 ? -1.7 : 6.6, z1: gz - 0.6, z2: gz + 0.6 });
  }
  const t = insegna([`VARCO ${k + 1}`], 2.8, 0.6, '#3a3050', '#ffd23f'); t.position.set(0, 3.6, gz + 0.68); t.castShadow = false; st.add(t);
  st.add(box(3.6, 0.5, 1.1, '#8a8a96', 0, 3.6, gz, 0.04));
  const sbarre = new THREE.Group(); sbarre.position.set(0, 0, gz); scena.add(sbarre);
  for (let i = 0; i < 6; i++) sbarre.add(cil(0.07, 0.07, 3, '#3a3a44', -1.45 + i * 0.58, 1.5, 0, 8, 0.02));
  sbarre.add(box(3.3, 0.18, 0.18, '#3a3a44', 0, 2.4, 0)); sbarre.add(box(3.3, 0.18, 0.18, '#3a3a44', 0, 0.8, 0));
  const segno = sprite(TEX_SEGNO.chiuso, 0.9, 0.9); segno.position.set(0, 3.2, gz + 2.4); scena.add(segno);
  NPC.set(`varco-${k}`, { P: null, x: 0, z: gz + 2.4, segno, h: 4.6 });
  VARCHI[k] = { z: gz, aperto: false, sbarre, y: 0 };
  PIANTA.push({ id: `varco-${k}`, x: 0, z: gz, w: 13, d: 1, col: '#8a8a96', varco: k });
}
export function varchi(aperti) {   // aperti[k] = true se il varco k è aperto
  if (!ok) return;
  let cambiato = false;
  VARCHI.forEach((v, k) => { const a = !!aperti[k]; if (a !== v.aperto) { v.aperto = a; cambiato = true; if (a) scoppio(0, 2, v.z, ['#ffd23f', '#ffffff', '#3ec46d'], 50, 4); }
    const n = NPC.get(`varco-${k}`); if (n) { n.segno.material.map = a ? TEX_SEGNO.fatto : TEX_SEGNO.chiuso; n.segno.material.needsUpdate = true; } });
  if (cambiato) for (const k in GRIGLIE) delete GRIGLIE[k];   // il percorso calcolato cambia
}
const zBlocco = () => { const v = VARCHI.find(x => x && !x.aperto); return v ? v.z : -Infinity; };   // oltre il primo varco chiuso non si va
export function zonaDi(z) { return Math.max(0, Math.min(VARCHI.length, Math.round(-z / PASSO))); }
export function vaiCitta(k) {   // viaggio rapido nella piazza di una città già visitata
  if (!ok) return;
  G.x = 2; G.z = zc(k) + 14; G.rot = Math.PI; G.dest = G.seg = null; dentro = null; stanza = null; pan.x = pan.z = 0; marcaDest.visible = false;
  G.P.g.position.set(G.x, 0, G.z); if (AMICO) { AMICO.x = G.x - 1; AMICO.z = G.z + 1.6; }
  scoppio(G.x, 1, G.z, ['#ffffff', '#bfe6ff'], 30, 2.5); stacco = true;
}

// ---------- Rompicapi lungo i percorsi ----------
const POSTI_PEDANE = [[-4, -35], [0, -38], [4, -35], [-4, -44], [0, -47], [4, -44]];
export function enigma(k, def) {
  if (!ok) return;
  const z0 = zc(k);
  if (def.tipo === 'leve') {
    LEVE[k] = def.n ? Array.from({ length: def.n }, (_, i) => {
      const x = i % 2 ? 4.6 : -4.6, z = z0 - 32 - i * 4;
      const g = new THREE.Group(); g.position.set(x, 0, z); scena.add(g);
      g.add(box(0.9, 0.6, 0.9, '#8a8a96', 0, 0.3, 0, 0.03)); g.add(box(0.5, 0.08, 0.7, '#3a3a44', 0, 0.62, 0));
      const stecca = new THREE.Group(); stecca.position.y = 0.62; g.add(stecca);
      stecca.add(cil(0.06, 0.06, 1, '#c9c9d6', 0, 0.5, 0, 8, 0.02)); stecca.add(sfera(0.16, '#ef4f5f', 0, 1.05, 0, 0.02, 10));
      stecca.rotation.x = 0.55;   // giù = falsa
      const segno = sprite(tex([String(i + 1)], { w: 128, h: 128, font: 100, fg: '#ffd23f', ombra: '#17142a' }), 0.9, 0.9); segno.position.set(x, 2.3, z); scena.add(segno);
      NPC.set(`leva-${k}-${i}`, { P: null, x, z, segno, h: 2.3 }); OSTACOLI.push({ x, z, r: 0.55 });
      return { stecca, pomo: stecca.children[1] };
    }) : [];
  } else if (def.tipo === 'pedane') {
    const ordine = def.etichette.map((_, i) => i).sort((a, b) => ((a * 7 + k * 3) % 11) - ((b * 7 + k * 3) % 11));   // sparse, sempre uguali
    def.etichette.forEach((t, i) => {
      const [dx, dz] = POSTI_PEDANE[ordine[i]], x = dx, z = z0 + dz, m = toon('#d9d2c3');
      const p = mesh(geo('pedana', () => new THREE.CylinderGeometry(1.05, 1.1, 0.14, 24)), m, x, 0.07, z); p.add(contorno(p, 1.05)); scena.add(p);
      const et = sprite(tex([t], { fg: '#ffffff', ombra: '#17142a', font: 72, w: 640 }), 4.2, 0.84); et.position.set(x, 1.3, z); scena.add(et);
      PEDANE.push({ k, i, x, z, m, et });
    });
  } else if (def.tipo === 'sportello') {
    const x = -4.4, z = z0 - 41, g = new THREE.Group(); g.position.set(x, 0, z); scena.add(g);
    g.add(box(2.6, 1.1, 1, '#8a5a2b', 0, 0.55, 0.6, 0.03)); g.add(box(2.8, 0.12, 1.2, '#c98f5a', 0, 1.16, 0.6));
    for (const lx of [-1, 1]) g.add(cil(0.07, 0.07, 2.6, '#3a3a44', lx * 1.3, 1.3, 1.05, 8));
    g.add(prisma(3.2, 0.7, 1.8, '#3d7bf2', 0, 2.6, 0.4, 0.03));
    const ins = insegna([def.insegna || 'SPORTELLO'], 2.4, 0.5, '#fff3d6', '#22305a'); ins.position.set(0, 2.3, 1.32); g.add(ins);
    const P = persona(def.persona || { corpo: '#3d7bf2', gambe: '#2a2a3a', camicia: true, cravatta: '#22305a', stile: 'corti', capelli: '#2a1a10', occhiali: '#2a2420' });
    P.g.position.set(x, 0, z - 0.3); scena.add(P.g);
    const segno = sprite(TEX_SEGNO.info, 0.9, 0.9); segno.position.set(x, 3.6, z + 1.6); scena.add(segno);
    NPC.set(`sportello-${k}`, { P, x, z: z + 1.6, rot: 0, segno, h: 3.6, fermo: true }); OSTACOLI.push({ x1: x - 1.5, x2: x + 1.5, z1: z - 0.8, z2: z + 1.2 });
  }
}
export function leva(k, i, su) { const l = LEVE[k] && LEVE[k][i]; if (l) { l.stecca.rotation.x = su ? -0.55 : 0.55; l.pomo.material = mat(su ? '#3ec46d' : '#ef4f5f'); } }
export function pedana(k, i, stato) {   // stato: 'off' | 'ok' | 'ko'; i = -1 per tutte
  for (const p of PEDANE) if (p.k === k && (i < 0 || p.i === i)) p.m.color.set(stato === 'ok' ? '#3ec46d' : stato === 'ko' ? '#ef4f5f' : '#d9d2c3');
}

function pestaPedane() {
  if (modo !== 'esplora' || stanza || !PEDANE.length) return;
  const sopra = PEDANE.find(p => Math.abs(p.z - G.z) < 1.2 && Math.hypot(p.x - G.x, p.z - G.z) < 0.95);
  if (sopra && sopra !== ultimaPedana) { ultimaPedana = sopra; opz.onPedana && opz.onPedana(sopra.k, sopra.i); }
  else if (!sopra && ultimaPedana && Math.hypot(ultimaPedana.x - G.x, ultimaPedana.z - G.z) > 1.4) ultimaPedana = null;
}
// ---------- Il compagno di studio: ti segue ovunque ----------
let AMICO = null;
export function compagno(aspetto, nome) {
  if (!ok) return;
  if (AMICO) scena.remove(AMICO.P.g, AMICO.et);
  const P = persona(aspetto); scena.add(P.g);
  const et = sprite(tex([nome], { fg: '#ffe27a', ombra: '#17142a', font: 76 }), 2.8, 0.7); scena.add(et);
  AMICO = { P, et, x: G.x - 1.2, z: G.z + 1.6, rot: G.rot };
}
function seguiAmico(dt) {
  if (!AMICO) return;
  const A = AMICO, f = { x: Math.sin(G.rot), z: Math.cos(G.rot) };
  let tx, tz;
  if (modo === 'duello' && NPC.get(fuoco)) {   // in lotta sta dietro di te, un po' di lato
    const n = NPC.get(fuoco), l = Math.hypot(G.x - n.x, G.z - n.z) || 1, ux = (G.x - n.x) / l, uz = (G.z - n.z) / l;
    tx = G.x + ux * 1.3 - uz * 1.1; tz = G.z + uz * 1.3 + ux * 1.1;
    A.x = tx; A.z = tz; A.rot = Math.atan2(n.x - A.x, n.z - A.z); A.P.vel = 0;
  } else {
    tx = G.x - f.x * 1.7 + f.z * 0.9; tz = G.z - f.z * 1.7 - f.x * 0.9;
    const d = Math.hypot(tx - A.x, tz - A.z);
    if (d > 14 || Math.abs(A.z - G.z) > 60) { A.x = libero(tx, tz) ? tx : G.x; A.z = libero(tx, tz) ? tz : G.z + 0.5; }
    else if (d > 0.35) {
      const v = Math.min(VEL * 4.2, d * 3.2) * dt, nx = A.x + (tx - A.x) / d * v, nz = A.z + (tz - A.z) / d * v;
      if (libero(nx, nz)) { A.x = nx; A.z = nz; } else if (libero(nx, A.z)) A.x = nx; else if (libero(A.x, nz)) A.z = nz;
      gira(A, Math.atan2(tx - A.x, tz - A.z), dt);
    } else gira(A, G.rot, dt);
    A.P.vel += ((d > 0.35 ? Math.min(1, d / 2) : 0) - A.P.vel) * Math.min(1, dt * 8);
  }
  A.P.g.position.set(A.x, 0, A.z); A.P.g.rotation.y = A.rot; anima(A.P, dt);
  A.et.position.set(A.x, 2.85, A.z); A.et.visible = modo === 'esplora';
  A.P.g.visible = modo !== 'biblioteca';
}
export function amicoReagisce(u) { if (AMICO) umore(AMICO.P, u, 1.2); }
const vivi = {};
const TEX_SEGNO = {};
const PIANTA = [];                      // per la minimappa: palazzi e porte

// ---------- Palestre: un'unica sala, ridipinta con i colori del palazzo di turno ----------
const PAL = { muro: toon('#ccc'), corn: toon('#fff'), pav: toon('#ddd') };
const POSTI = { 'pal-a1': [-2.6, AZ + 3], 'pal-a2': [2.6, AZ - 1.5], 'pal-capo': [0, AZ - 5.4], 'pal-uscita': [0, AZ + 9.2] };
let insegnaPal = null;
export function costruisciPalestra() {
  if (!ok) return;
  const st = new THREE.Group();
  st.add(box(12.8, 0.2, 20.8, PAL.pav, 0, -0.08, AZ));
  for (let x = -6; x <= 6; x += 2) st.add(box(0.06, 0.02, 20.4, PAL.corn, x, 0.03, AZ));
  for (let z = -10; z <= 10; z += 2) st.add(box(12.4, 0.02, 0.06, PAL.corn, 0, 0.03, AZ + z));
  st.add(box(2.7, 0.03, 15.6, '#d4af37', 0, 0.045, AZ + 1.6)); st.add(box(2.3, 0.04, 15.2, '#b0263a', 0, 0.055, AZ + 1.6));   // tappeto
  st.add(box(12.8, 6, 0.4, PAL.muro, 0, 3, AZ - 10.2, 0.05));
  for (const lx of [-1, 1]) { st.add(box(0.4, 6, 20.8, PAL.muro, lx * 6.4, 3, AZ, 0.05)); st.add(box(0.7, 0.45, 20.8, PAL.corn, lx * 6.4, 6.1, AZ, 0.04)); }
  st.add(box(13.4, 0.45, 0.7, PAL.corn, 0, 6.1, AZ - 10.2, 0.04));
  for (const lx of [-1, 1]) for (const z of [-7, -2, 3, 8]) {
    st.add(cil(0.3, 0.34, 5.6, '#fbf8f0', lx * 5.3, 2.8, AZ + z, 10, 0.04)); st.add(box(0.8, 0.25, 0.8, '#fbf8f0', lx * 5.3, 0.12, AZ + z, 0.02));
    OSTACOLI.push({ x: lx * 5.3, z: AZ + z, r: 0.45 });
  }
  // pedana e trono del capopalestra
  st.add(box(5, 0.35, 3, PAL.corn, 0, 0.17, AZ - 8.4, 0.04));
  st.add(box(1.5, 0.35, 1.2, '#b0263a', 0, 0.52, AZ - 8.7, 0.03)); st.add(box(1.5, 2.2, 0.3, '#b0263a', 0, 1.45, AZ - 9.3, 0.03));
  st.add(box(1.7, 0.2, 0.4, '#d4af37', 0, 2.6, AZ - 9.3, 0.02)); st.add(sfera(0.22, '#d4af37', 0, 2.85, AZ - 9.3, 0.02, 10));
  OSTACOLI.push({ x1: -2.5, x2: 2.5, z1: AZ - 9.9, z2: AZ - 6.9 });
  for (const lx of [-1, 1]) {   // stendardi e fiaccole
    st.add(box(1.3, 3, 0.08, PAL.corn, lx * 3.8, 3.7, AZ - 9.96, 0.02)); st.add(box(0.9, 2.4, 0.1, '#b0263a', lx * 3.8, 3.7, AZ - 9.92));
    for (const z of [-4.5, 5.5]) { st.add(cil(0.07, 0.1, 2.4, '#2e2e3a', lx * 4.6, 1.2, AZ + z, 8)); st.add(mesh(geo('bulbo', () => new THREE.SphereGeometry(0.24, 10, 8)), M.lampada, lx * 4.6, 2.55, AZ + z)); OSTACOLI.push({ x: lx * 4.6, z: AZ + z, r: 0.3 }); }
  }
  st.add(box(2.4, 0.04, 1.2, '#3a3050', 0, 0.07, AZ + 9.2, 0.02));   // zerbino d'uscita
  st.add(box(13.6, 0.2, 16, '#3a3050', 0, -0.1, AZ + 18.4));          // atrio scuro davanti: fuori dalla sala non si vede il prato
  for (const lx of [-1, 1]) st.add(box(0.6, 6, 16, PAL.muro, lx * 6.6, 3, AZ + 18.4, 0.05));
  scena.add(unisci(st));
  insegnaPal = mesh(new THREE.PlaneGeometry(5.6, 1.35), new THREE.MeshBasicMaterial()); insegnaPal.castShadow = false;
  insegnaPal.position.set(0, 4.75, AZ - 9.97); scena.add(insegnaPal);
  for (const [id, [x, z]] of Object.entries(POSTI)) if (id !== 'pal-uscita') OSTACOLI.push({ x, z, r: 0.7 });
}
export function palestra(L, gente) {
  if (!ok) return;
  const s = STILI[L.stile];
  PAL.muro.color.set(s.muro); PAL.corn.color.set(s.corn); PAL.pav.color.set(s.muro).lerp(new THREE.Color('#ffffff'), 0.6);
  if (insegnaPal.material.map) insegnaPal.material.map.dispose();
  insegnaPal.material.map = tex(['PALESTRA · ' + L.nome.toUpperCase(), `GIORNO ${L.giorno} · CAPOPALESTRA ${L.prof.toUpperCase()}`], { bg: '#fff3d6', fg: '#3a2410', cornice: '#3a2410', h: 124 });
  insegnaPal.material.needsUpdate = true;
  for (const id of Object.keys(POSTI)) { const n = NPC.get(id); if (n) { if (n.P) scena.remove(n.P.g); scena.remove(n.et, n.segno); NPC.delete(id); } }
  for (const p of gente) {
    const [x, z] = POSTI[p.id], sc = (p.persona && p.persona.scala) || 1;
    let P = null; if (p.persona) { P = persona(p.persona); P.g.position.set(x, 0, z); scena.add(P.g); }
    const et = sprite(tex([p.nome], { fg: '#ffffff', ombra: '#17142a', font: 76 }), 3.4, 0.85); et.position.set(x, P ? 2.95 * sc : 1.6, z); scena.add(et);
    const h = P ? 3.75 * sc : 2.4, segno = sprite(TEX_SEGNO[p.segno || 'sfida'], 0.9, 0.9); segno.position.set(x, h, z); scena.add(segno);
    NPC.set(p.id, { P, x, z, rot: 0, segno, et, h });
  }
  if (!dentro) dentro = { x: G.x, z: G.z };
  stanza = 'palestra'; G.x = 0; G.z = AZ + 5.8; G.rot = Math.PI; G.dest = G.seg = null; marcaDest.visible = false; G.P.vel = 0; pan.x = pan.z = 0;
  modo = 'esplora'; fuoco = null; stacco = true; vicino = undefined;
  G.P.g.position.set(G.x, 0, G.z); scoppio(G.x, 1, G.z, ['#ffffff', '#ffd23f'], 30, 2.5);
}
export function esciPalestra() {
  if (stanza !== 'palestra') return;
  stanza = null; if (dentro) { G.x = dentro.x; G.z = dentro.z; dentro = null; }
  G.rot = 0; G.dest = G.seg = null; marcaDest.visible = false; modo = 'esplora'; stacco = true; vicino = undefined;
  if (ok) G.P.g.position.set(G.x, 0, G.z);
}
export function segni(stato) {   // id -> 'sfida' | 'medaglia' | 'allarme' | 'fatto' | 'chiuso' | 'uscita'
  if (!ok) return;
  for (const [id, v] of Object.entries(stato)) { const n = NPC.get(id); if (n && TEX_SEGNO[v] && n.segno.material.map !== TEX_SEGNO[v]) { n.segno.material.map = TEX_SEGNO[v]; n.segno.material.needsUpdate = true; } }
}
export const pianta = () => PIANTA;
export function dove() { const e = NPC.get('evento'); return { x: G.x, z: G.z, rot: G.rot, stanza, zona: zonaDi(G.z), ev: e ? { x: e.x, z: e.z } : null, cx: camL.x, cz: camL.z }; }

const IZ = 130;                       // la sala è costruita lontano dalla città, a sud
const COL_LIV = ['#bdb5a6', '#e8504a', '#f09a30', '#3d7bf2', '#ffd23f'];   // mai, 1, 2, 3, 4 volte
let LIBRI = null, libroPos = [], focus = -1, dentro = null;
export function costruisciSala(argomenti, nomiScaffali) {
  if (!ok) return;
  const st = new THREE.Group(), zs = IZ - 4.6;
  st.add(box(16, 0.2, 13, '#a0673a', 0, -0.08, IZ + 1.3));
  for (let x = -7.5; x < 8; x += 1) st.add(box(0.04, 0.02, 13, '#8a5530', x, 0.03, IZ + 1.3));
  st.add(box(7.4, 0.02, 4.9, '#d4af37', 0, 0.035, IZ + 1.6)); st.add(box(7, 0.03, 4.5, '#7a1f2b', 0, 0.045, IZ + 1.6));
  st.add(box(16, 7, 0.4, '#efe0bc', 0, 3.5, IZ - 5.2, 0.05));
  for (const lx of [-1, 1]) st.add(box(0.4, 7, 13, '#efe0bc', lx * 8, 3.5, IZ + 1.3, 0.05));
  st.add(box(16, 1.1, 0.12, '#7a4a24', 0, 0.55, IZ - 4.98));
  for (const lx of [-1, 1]) { st.add(box(1.9, 2.9, 0.1, '#7a4a24', lx * 6, 3.7, IZ - 4.98)); st.add(mesh(gBox(1.6, 2.6, 0.12), M.finestra, lx * 6, 3.7, IZ - 4.94)); }
  const ins = insegna(['BIBLIOTECA', 'TUTTI GLI ARGOMENTI'], 4.6, 1.1); ins.position.set(0, 6.15, IZ - 4.97); st.add(ins);
  // 3 librerie da 6 ripiani: uno scaffale per capitolo
  const slot = [...new Set(argomenti.map(a => a.cap))];
  for (let b = 0; b < 3; b++) {
    const bx = (b - 1) * 2.45;
    for (const lx of [-1, 1]) st.add(box(0.12, 5.05, 0.56, '#6b3f1d', bx + lx * 1.17, 2.52, zs, 0.03));
    st.add(box(2.5, 0.16, 0.62, '#6b3f1d', bx, 5.1, zs, 0.03)); st.add(box(2.3, 5, 0.06, '#4a2a12', bx, 2.5, zs - 0.25));
    for (let k = 0; k < 7; k++) st.add(box(2.3, 0.08, 0.54, '#8a5a2b', bx, 0.12 + k * 0.8, zs, 0.02));
    for (let r = 0; r < 6; r++) {
      const si = b * 6 + r; if (si >= slot.length) continue;
      const t = insegna([nomiScaffali[slot[si]] || slot[si]], 0.62, 0.15, '#fff3d6', '#3a2410'); t.castShadow = false;
      t.position.set(bx - 0.78, 0.12 + (5 - r) * 0.8, zs + 0.28); st.add(t);
    }
  }
  // tavolo, lampada, mappamondo, lampade da terra
  st.add(box(2.8, 0.14, 1.4, '#8a5a2b', -1.2, 0.95, IZ + 1, 0.03));
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) st.add(box(0.12, 0.9, 0.12, '#6b3f1d', -1.2 + lx * 1.25, 0.45, IZ + 1 + lz * 0.55));
  st.add(cil(0.05, 0.05, 0.5, '#d4af37', -2.1, 1.27, IZ + 0.8, 8)); st.add(cil(0.12, 0.3, 0.22, '#2f8a5a', -2.1, 1.55, IZ + 0.8, 12, 0.02));
  const aperto = box(0.9, 0.05, 0.6, '#fffbe8', -0.9, 1.05, IZ + 1, 0.015); aperto.rotation.y = 0.2; st.add(aperto);
  st.add(cil(0.25, 0.35, 0.1, '#6b3f1d', -4.6, 0.05, IZ + 0.2, 12)); st.add(cil(0.04, 0.04, 1, '#6b3f1d', -4.6, 0.55, IZ + 0.2, 6));
  st.add(sfera(0.42, '#3d7bf2', -4.6, 1.4, IZ + 0.2, 0.03, 16)); st.add(sfera(0.2, '#3fae6a', -4.45, 1.55, IZ + 0.5, 0, 8));
  for (const lx of [-1, 1]) { st.add(cil(0.05, 0.08, 2.6, '#2e2e3a', lx * 6.6, 1.3, IZ + 3, 8)); st.add(mesh(geo('bulbo', () => new THREE.SphereGeometry(0.24, 10, 8)), M.lampada, lx * 6.6, 2.7, IZ + 3)); }
  scena.add(unisci(st));
  // i libri
  const n = argomenti.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  LIBRI = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), toon('#ffffff'), n); LIBRI.castShadow = LIBRI.receiveShadow = true;
  const perCap = {};
  argomenti.forEach((a, i) => {
    const si = slot.indexOf(a.cap), j = (perCap[a.cap] = (perCap[a.cap] || 0) + 1) - 1;
    const bx = (Math.floor(si / 6) - 1) * 2.45, r = si % 6, h = 0.46 + ((i * 37) % 7) / 55;
    const p = { x: bx - 1.0 + j * 0.2, y: 0.16 + (5 - r) * 0.8 + h / 2, z: zs + 0.04, h };
    libroPos.push(p); LIBRI.setMatrixAt(i, m4.compose(v.set(p.x, p.y, p.z), q, sc.set(0.17, h, 0.36)));
    LIBRI.setColorAt(i, new THREE.Color(COL_LIV[0]));
  });
  scena.add(LIBRI);
}
export function libri(conteggi) {
  if (!LIBRI) return;
  const c = new THREE.Color();
  conteggi.forEach((k, i) => LIBRI.setColorAt(i, c.set(COL_LIV[Math.min(4, k)])));
  LIBRI.instanceColor.needsUpdate = true;
}
export function focusLibro(i) {
  if (!LIBRI) return;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (const k of [focus, i]) {
    const p = libroPos[k]; if (!p) continue;
    const su = k === i;   // il libro scelto esce un po' dallo scaffale
    LIBRI.setMatrixAt(k, m4.compose(v.set(p.x, p.y + (su ? 0.05 : 0), p.z + (su ? 0.22 : 0)), q, sc.set(0.17, p.h, 0.36)));
  }
  LIBRI.instanceMatrix.needsUpdate = true; focus = i;
  if (i >= 0 && libroPos[i]) scoppio(libroPos[i].x, libroPos[i].y + 0.2, libroPos[i].z + 0.3, ['#ffd23f', '#ffffff'], 16, 1, 0.6, -2, 0.12);
}
export function biblioteca(on) {
  if (!ok) return;
  if (!on) return imposta('esplora');
  if (!dentro) dentro = { x: G.x, z: G.z };
  stanza = 'sala'; G.x = 4.4; G.z = IZ - 2.4; G.rot = Math.PI * 0.85; G.dest = G.seg = null; marcaDest.visible = false; G.P.vel = 0;
  modo = 'biblioteca'; fuoco = null; stacco = true; focusLibro(-1);
}

// ---------- Incontri casuali: un personaggio compare vicino a te ----------
export function evento(aspetto, nome) {
  if (!ok || NPC.has('evento') || modo !== 'esplora' || stanza) return false;
  for (let k = 0; k < 20; k++) {
    const an = G.rot + (Math.random() - 0.5) * 2.2, r = 6 + Math.random() * 5;
    const x = G.x + Math.sin(an) * r, z = G.z + Math.cos(an) * r;
    if (z < zBlocco() + 1.5) continue;   // mai oltre un varco chiuso
    if (!libero(x, z) || [...NPC.values()].some(n => Math.hypot(n.x - x, n.z - z) < 5)) continue;
    const P = persona(aspetto); P.g.position.set(x, 0, z); scena.add(P.g);
    const et = sprite(tex([nome], { fg: '#ffffff', ombra: '#17142a', font: 76 }), 3.4, 0.85); et.position.set(x, 2.95, z); scena.add(et);
    const segno = sprite(TEX_SEGNO.evento, 0.95, 0.95); segno.position.set(x, 3.75, z); scena.add(segno);
    NPC.set('evento', { P, x, z, rot: Math.atan2(G.x - x, G.z - z), segno, et, h: 3.75, evento: true });
    scoppio(x, 1.2, z, ['#ffd23f', '#ffffff', '#b06bff'], 50, 3.5);
    return true;
  }
  return false;
}
export function togliEvento() {
  const n = NPC.get('evento'); if (!n) return;
  scena.remove(n.P.g, n.et, n.segno); scoppio(n.x, 1.2, n.z, ['#ffffff', '#b06bff'], 30, 2.5);
  NPC.delete('evento');
  if (vicino === 'evento') { vicino = null; opz.onVicino && opz.onVicino(null); }
}
export function distanzaEvento() { const n = NPC.get('evento'); return n ? Math.hypot(n.x - G.x, n.z - G.z) : Infinity; }

// ---------- Avvio del motore ----------
export function init(canvas, o) {
  cv = canvas; opz = o;
  try {
    R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  ok = true;
  R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  scena = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(35, 1, 0.5, 220);
  emi = new THREE.HemisphereLight('#ffffff', '#5a7a3a', 1.1); scena.add(emi);
  sole = new THREE.DirectionalLight('#fff4e0', 2.4); sole.castShadow = true;
  sole.shadow.mapSize.set(2048, 2048);
  Object.assign(sole.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
  sole.shadow.bias = -0.0004; sole.shadow.normalBias = 0.03;
  scena.add(sole, sole.target);
  scena.fog = new THREE.Fog('#cfeeff', 60, 140);
  TEX_SEGNO.sfida = tex(['!'], { w: 128, h: 128, font: 110, fg: '#ffd23f', ombra: '#17142a' });
  TEX_SEGNO.medaglia = tex(['🏅'], { w: 128, h: 128, font: 96 });
  TEX_SEGNO.armadio = tex(['👕'], { w: 128, h: 128, font: 96 });
  TEX_SEGNO.evento = tex(['💰'], { w: 128, h: 128, font: 96 });
  TEX_SEGNO.libri = tex(['📚'], { w: 128, h: 128, font: 96 });
  TEX_SEGNO.info = tex(['💡'], { w: 128, h: 128, font: 96 });
  for (const [k, e] of [['allarme', '⚠️'], ['fatto', '✅'], ['chiuso', '🔒'], ['uscita', '🚪']]) TEX_SEGNO[k] = tex([e], { w: 128, h: 128, font: 96 });
  creaMeteo(); controlli();
  addEventListener('resize', ridimensiona); ridimensiona();
  requestAnimationFrame(ciclo);
  return true;
}
function ridimensiona() {
  const w = innerWidth, h = innerHeight;
  R.setSize(w, h, false); cam.aspect = w / h; vista();
}
function vista() {
  const w = innerWidth, h = innerHeight;
  const sh = (spazio - spazioSu) / 2;
  if (sh) cam.setViewOffset(w, h, 0, sh, w, h); else cam.clearViewOffset();
  cam.updateProjectionMatrix();
}

// ---------- Controlli: trascina = joystick, tocca = vai lì ----------
let joy = null, pinch = null, zoom = 1;
const DITA = new Map(), ZMIN = 0.55, ZMAX = 5, SIN_E = Math.sin(0.87);
const ze = () => stanza ? Math.min(zoom, 1.3) : zoom;              // in palestra non serve allontanarsi
const metaAlt = () => Math.max(6.5, 5.6 / (innerWidth / innerHeight)) * ze();   // metà dell'altezza inquadrata (in metri)
function impostaZoom(z) { zoom = Math.min(ZMAX, Math.max(ZMIN, z)); opz.onZoom && opz.onZoom(zoom); }
export function zoomA(z) { zoom = Math.min(ZMAX, Math.max(ZMIN, z || 1)); }
function limitaPan() {
  const B = stanza ? { x1: -4, x2: 4, z1: AZ - 8, z2: AZ + 8 } : { x1: -24, x2: 24, z1: LIM.z1 - 3, z2: LIM.z2 + 3 };
  pan.x = Math.min(B.x2 - G.x, Math.max(B.x1 - G.x, pan.x)); pan.z = Math.min(B.z2 - G.z, Math.max(B.z1 - G.z, pan.z));
}
function controlli() {
  const distDita = () => { const [a, b] = [...DITA.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  const centro = () => { const [a, b] = [...DITA.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  const J = opz.joy, pomo = J && J.firstElementChild;
  cv.addEventListener('pointerdown', e => {
    DITA.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { cv.setPointerCapture(e.pointerId); } catch (_) { }
    if (modo !== 'esplora') return;
    if (DITA.size === 2) { pinch = { d0: distDita(), z0: zoom, c0: centro(), p0: { ...pan } }; joy = null; if (J) J.hidden = true; return; }
    if (DITA.size === 1 && !pinch) joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0, mosso: false };
  });
  cv.addEventListener('pointermove', e => {
    if (DITA.has(e.pointerId)) DITA.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) {   // due dita: allarghi/stringi = zoom, trascini = sposti la vista
      if (DITA.size < 2) return;
      impostaZoom(pinch.z0 * pinch.d0 / distDita());
      const c = centro(), k = 2 * metaAlt() / innerHeight;
      pan.x = pinch.p0.x - (c.x - pinch.c0.x) * k; pan.z = pinch.p0.z - (c.y - pinch.c0.y) * k / SIN_E; limitaPan();
      return;
    }
    if (!joy || e.pointerId !== joy.id) return;
    joy.dx = e.clientX - joy.x0; joy.dy = e.clientY - joy.y0;
    if (!joy.mosso && Math.hypot(joy.dx, joy.dy) > 14) {
      joy.mosso = true; G.dest = G.seg = null; marcaDest.visible = false;
      if (J) { J.hidden = false; J.style.left = joy.x0 + 'px'; J.style.top = joy.y0 + 'px'; }
      opz.onMossa && opz.onMossa();
    }
    if (joy.mosso && pomo) { const l = Math.hypot(joy.dx, joy.dy), k = Math.min(1, 46 / l); pomo.style.transform = `translate(${joy.dx * k}px, ${joy.dy * k}px)`; }
  });
  const fine = e => {
    DITA.delete(e.pointerId);
    if (pinch) { if (!DITA.size) pinch = null; return; }   // finito lo zoom niente tocco né joystick
    if (!joy || e.pointerId !== joy.id) return;
    if (!joy.mosso && e.type === 'pointerup') tocco(e.clientX, e.clientY);
    joy = null; if (J) J.hidden = true;
  };
  cv.addEventListener('pointerup', fine); cv.addEventListener('pointercancel', fine);
  cv.addEventListener('wheel', e => { e.preventDefault(); if (modo === 'esplora') impostaZoom(zoom * Math.exp(e.deltaY * (e.ctrlKey ? 0.012 : 0.0012))); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());   // Safari: niente zoom della pagina
}
const ray = new THREE.Raycaster(), PIANO = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), V = new THREE.Vector3();
function tocco(cx, cy) {
  // prima: ho toccato un prof? (confronto con la sua posizione sullo schermo)
  let meglio = null, dmin = 70;
  for (const [id, n] of NPC) {
    for (const hy of [0.9, 1.9]) {
      V.set(n.x, hy, n.z).project(cam);
      const d = Math.hypot((V.x + 1) / 2 * innerWidth - cx, (1 - V.y) / 2 * innerHeight - cy);
      if (V.z < 1 && d < dmin) { dmin = d; meglio = id; }
    }
  }
  if (meglio) return vai(meglio);
  ray.setFromCamera({ x: cx / innerWidth * 2 - 1, y: -(cy / innerHeight) * 2 + 1 }, cam);
  if (ray.ray.intersectPlane(PIANO, V)) vaiA(V.x, V.z);
}
// Vai lì camminando: percorso su una griglia (aggira palazzi, fontana, lampioni). Lontano = corri.
export function vai(id) { const n = NPC.get(id); return !!n && vaiA(n.x, n.z + 1.9, id); }
export function vaiA(x, z, seg) {
  if (!ok || modo !== 'esplora') return false;
  const p = percorso(G.x, G.z, x, z); if (!p || !p.length) return false;
  const fine = p[p.length - 1];
  G.path = p; G.dest = G.path.shift(); G.seg = seg || null; G.fermo = 0; G.corsa = Math.hypot(fine.x - G.x, fine.z - G.z) > 12;
  marcaDest.position.set(fine.x, 0.08, fine.z); marcaDest.visible = !seg;
  opz.onMossa && opz.onMossa(); return true;
}
const GR = 0.8, GRIGLIE = {}, DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function griglia(L) {
  const k = L === LIM_P ? 'p' : 'c'; if (GRIGLIE[k]) return GRIGLIE[k];
  const nx = Math.floor((L.x2 - L.x1) / GR) + 1, nz = Math.floor((L.z2 - L.z1) / GR) + 1, lib = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) lib[j * nx + i] = libero(L.x1 + i * GR, L.z1 + j * GR) ? 1 : 0;
  return (GRIGLIE[k] = { L, nx, nz, lib });
}
const vede = (a, b) => { const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25); for (let i = 1; i <= n; i++) if (!libero(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n)) return false; return true; };
export function percorso(x0, z0, x1, z1) {   // ponytail: BFS su griglia 0.8 m, basta per una città piccola
  const { L, nx, nz, lib } = griglia(z0 > 150 ? LIM_P : LIM);
  const cella = (x, z) => [Math.round((x - L.x1) / GR), Math.round((z - L.z1) / GR)];
  const idx = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz) ? -1 : j * nx + i;
  const [si, sj] = cella(x0, z0), [ti, tj] = cella(x1, z1), s = idx(si, sj);
  if (s < 0) return null;
  const prev = new Int32Array(nx * nz).fill(-2), coda = [s]; prev[s] = -1;
  let best = s, bd = Infinity;
  for (let h = 0; h < coda.length; h++) {
    const c = coda[h], ci = c % nx, cj = (c - ci) / nx, d = (ci - ti) ** 2 + (cj - tj) ** 2;
    if (d < bd) { bd = d; best = c; if (!d) break; }
    for (const [di, dj] of DIRS) {
      const n = idx(ci + di, cj + dj); if (n < 0 || prev[n] !== -2 || !lib[n]) continue;
      if (di && dj && !(lib[idx(ci + di, cj)] && lib[idx(ci, cj + dj)])) continue;
      prev[n] = c; coda.push(n);
    }
  }
  const punti = []; for (let c = best; c >= 0; c = prev[c]) punti.unshift({ x: L.x1 + (c % nx) * GR, z: L.z1 + Math.floor(c / nx) * GR });
  punti.shift();
  if (!bd && libero(x1, z1)) punti.push({ x: x1, z: z1 });
  const out = []; let a = { x: x0, z: z0 };   // tira dritto quando si vede la meta
  for (let i = 0; i < punti.length;) { let j = punti.length - 1; while (j > i && !vede(a, punti[j])) j--; out.push(punti[j]); a = punti[j]; i = j + 1; }
  return out;
}
// ostacoli divisi in fasce da 10 m lungo z: la mappa è lunga, così ogni controllo ne guarda pochi
let INDICE = null, indicizzati = -1;
function fascia(z) {
  if (indicizzati !== OSTACOLI.length) {
    INDICE = new Map(); indicizzati = OSTACOLI.length;
    for (const o of OSTACOLI) {
      const z1 = o.r !== undefined ? o.z - o.r : o.z1, z2 = o.r !== undefined ? o.z + o.r : o.z2;
      for (let b = Math.floor((z1 - 1) / 10); b <= Math.floor((z2 + 1) / 10); b++) { if (!INDICE.has(b)) INDICE.set(b, []); INDICE.get(b).push(o); }
    }
  }
  return INDICE.get(Math.floor(z / 10)) || [];
}
function libero(x, z) {
  const B = z > 100 ? LIM_P : LIM;
  if (x < B.x1 || x > B.x2 || z < B.z1 || z > B.z2) return false;
  for (const v of VARCHI) if (v && !v.aperto && Math.abs(z - v.z) < 0.95 && Math.abs(x) < 2.2) return false;
  for (const o of fascia(z)) {
    if (o.r !== undefined) { if (Math.hypot(x - o.x, z - o.z) < o.r + 0.35) return false; }
    else if (x > o.x1 - 0.35 && x < o.x2 + 0.35 && z > o.z1 - 0.35 && z < o.z2 + 0.35) return false;
  }
  return true;
}
const VEL = 6.5;
function muovi(dt) {
  let dx = 0, dz = 0;
  if (modo === 'esplora' && joy && joy.mosso) {
    const l = Math.hypot(joy.dx, joy.dy), k = Math.min(1, l / 46) / l; dx = joy.dx * k; dz = joy.dy * k;
  } else if (modo === 'esplora' && G.dest) {
    const vx = G.dest.x - G.x, vz = G.dest.z - G.z, l = Math.hypot(vx, vz);
    if (G.seg) { const n = NPC.get(G.seg); if (Math.hypot(n.x - G.x, n.z - G.z) < 2.3) return arriva(); }
    if (l < 0.25 && G.path && G.path.length) G.dest = G.path.shift();
    else if (l < 0.2) { G.dest = null; marcaDest.visible = false; if (G.seg) arriva(); }
    else { const k = Math.min(1, l / (G.path && G.path.length ? 0.05 : 0.6)) / l; dx = vx * k; dz = vz * k; }
  }
  const m = Math.hypot(dx, dz);
  if (m > 0.02) {
    const corsa = G.dest && G.corsa ? 2.6 : 1, vel = VEL * Math.min(4, Math.max(corsa, Math.pow(Math.max(1, ze()), 0.85)));
    const px = G.x, pz = G.z, nx = G.x + dx * vel * dt, nz = G.z + dz * vel * dt;
    const kp = Math.exp(-dt * 2.5); pan.x *= kp; pan.z *= kp;   // camminando la vista torna su di te
    if (libero(nx, nz)) { G.x = nx; G.z = nz; } else if (libero(nx, G.z)) G.x = nx; else if (libero(G.x, nz)) G.z = nz;
    const fatto = Math.hypot(G.x - px, G.z - pz);
    if (modo === 'esplora' && fatto > 0 && opz.onCammino) opz.onCammino(fatto);
    if (G.dest && fatto < vel * dt * 0.1) { G.fermo += dt; if (G.fermo > 0.4) { G.dest = G.seg = null; marcaDest.visible = false; } } else G.fermo = 0;
    gira(G, Math.atan2(dx, dz), dt);
  }
  G.P.vel += ((m > 0.02 ? Math.min(1, m) : 0) - G.P.vel) * Math.min(1, dt * 10);
  G.P.g.position.x = G.x; G.P.g.position.z = G.z; G.P.g.rotation.y = G.rot;
}
function gira(o, verso, dt) {
  let d = verso - o.rot; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  o.rot += d * Math.min(1, dt * 12);
}
function arriva() {
  const id = G.seg; G.dest = G.seg = null; marcaDest.visible = false;
  const n = NPC.get(id); G.rot = Math.atan2(n.x - G.x, n.z - G.z);
  opz.onParla && opz.onParla(id);
}

// ---------- Camera ----------
const camP = new THREE.Vector3(), camL = new THREE.Vector3(), tP = new THREE.Vector3(), tL = new THREE.Vector3();
const DIR_ESPLORA = new THREE.Vector3(0, Math.sin(0.87), Math.cos(0.87));
const DIR_RITRATTO = new THREE.Vector3(0.3, 0.6, 1).normalize();
function inquadra(dt, subito) {
  const fov = modo === 'esplora' ? 35 : modo === 'biblioteca' ? 40 : 50;
  if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
  const a = innerWidth / innerHeight, tanv = Math.tan(cam.fov * Math.PI / 360);
  const vis = Math.max(0.25, (innerHeight - spazio - spazioSu) / innerHeight);  // parte di schermo non coperta dal pannello
  if (modo === 'esplora') {
    tL.set(G.x + pan.x, 1, G.z + pan.z); tP.copy(DIR_ESPLORA).multiplyScalar(metaAlt() / tanv).add(tL);
  } else if (modo === 'duello' && NPC.get(fuoco)) {
    const n = NPC.get(fuoco);
    tL.set((n.x + G.x) / 2, 1.25, (n.z + G.z) / 2);
    const d = Math.max(3.4 / (vis * 2 * tanv), 5 / (Math.min(a, 1.4) * 2 * tanv));
    const ul = Math.hypot(G.x - n.x, G.z - n.z) || 1, ux = (G.x - n.x) / ul, uz = (G.z - n.z) / ul;
    if (stanza === 'palestra') tP.set(ux * 0.9 + uz * 0.55, 0.85, uz * 0.9 - ux * 0.55).normalize().multiplyScalar(d).add(tL);   // alle tue spalle, come nei giochi di lotta
    else {   // in città: di lato rispetto alla linea tra i due, dal lato del viale
      let px = uz, pz = -ux; if (px * -n.x < 0) { px = -px; pz = -pz; }
      tP.set(px + ux * 0.45, 0.75, pz + uz * 0.45).normalize().multiplyScalar(d).add(tL);
    }
  } else if (modo === 'biblioteca') {
    const b = libroPos[focus];
    if (b) { tL.set(b.x, b.y, b.z); tP.set(b.x + 0.45, b.y + 0.3, b.z + Math.max(2.2, 0.9 / (Math.min(a, 1) * tanv))); }
    else { tL.set(0, 2.6, IZ - 4.6); tP.set(0.6, 2.95, IZ - 4.6 + Math.max(5.4 / (vis * 2 * tanv), 7.8 / (Math.min(a, 1.6) * 2 * tanv))); }
  } else {
    tL.set(G.x, 1.15, G.z);
    tP.copy(DIR_RITRATTO).multiplyScalar(Math.max(2.8 / (vis * 2 * tanv), 1.6 / (a * 2 * tanv))).add(tL);
  }
  const k = subito ? 1 : 1 - Math.exp(-dt * 5);
  camP.lerp(tP, k); camL.lerp(tL, k);
  cam.position.copy(camP); cam.lookAt(camL);
  const dd = camP.distanceTo(camL), zz = modo === 'esplora' ? Math.max(1, ze()) : 1;
  scena.fog.near = dd + 4 + 8 * zz; scena.fog.far = dd + 70 + 25 * zz;
  if (Math.abs(cam.far - (dd + 160)) > 20) { cam.far = dd + 160; cam.updateProjectionMatrix(); }
  const ss = Math.round(Math.min(70, 24 * zz)), sc = sole.shadow.camera;
  if (sc.right !== ss) { sc.left = sc.bottom = -ss; sc.right = sc.top = ss; sc.updateProjectionMatrix(); }
}

// ---------- Effetti: scoppi di particelle e oggetti lanciati ----------
const SCOPPI = [], LANCI = [];
let TEX_PUNTO;
function texPunto() {
  if (TEX_PUNTO) return TEX_PUNTO;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, '#fff'); gr.addColorStop(0.45, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (TEX_PUNTO = new THREE.CanvasTexture(c));
}
function scoppio(x, y, z, colori, n = 30, forza = 3, durata = 0.9, grav = -6, size = 0.28) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = [], c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pos.set([x, y, z], i * 3); c.set(colori[i % colori.length]); col.set([c.r, c.g, c.b], i * 3);
    const a = Math.random() * Math.PI * 2, e = Math.random() * 2 - 1, r = Math.sqrt(1 - e * e);
    vel.push(new THREE.Vector3(Math.cos(a) * r, Math.abs(e) * 0.8 + 0.4, Math.sin(a) * r).multiplyScalar(forza * (0.5 + Math.random() * 0.6)));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, map: texPunto(), transparent: true, depthWrite: false }));
  scena.add(pts); SCOPPI.push({ pts, vel, t: 0, durata, grav });
}
function lancia(oggetto, da, a, durata, poi) { scena.add(oggetto); LANCI.push({ o: oggetto, da: da.clone(), a: a.clone(), t: 0, durata, poi }); }
function effetti(dt) {
  for (let i = SCOPPI.length - 1; i >= 0; i--) {
    const s = SCOPPI[i]; s.t += dt;
    const p = s.pts.geometry.attributes.position;
    s.vel.forEach((v, j) => { v.y += s.grav * dt; p.setXYZ(j, p.getX(j) + v.x * dt, p.getY(j) + v.y * dt, p.getZ(j) + v.z * dt); });
    p.needsUpdate = true; s.pts.material.opacity = Math.max(0, 1 - s.t / s.durata);
    if (s.t >= s.durata) { scena.remove(s.pts); s.pts.geometry.dispose(); s.pts.material.dispose(); SCOPPI.splice(i, 1); }
  }
  for (let i = LANCI.length - 1; i >= 0; i--) {
    const l = LANCI[i]; l.t += dt; const k = Math.min(1, l.t / l.durata);
    l.o.position.lerpVectors(l.da, l.a, k); l.o.position.y += Math.sin(k * Math.PI) * 1.2;
    l.o.rotation.x += dt * 9; l.o.rotation.y += dt * 6;
    if (k >= 1) { scena.remove(l.o); LANCI.splice(i, 1); l.poi && l.poi(); }
  }
}
const CODICE = (() => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.16), new THREE.MeshBasicMaterial({ color: '#ffd23f' })));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.18), new THREE.MeshBasicMaterial({ color: '#c0392b' }))); return g; })();
let DUBBIO;

// ---------- Ambientazioni (skin della città) ----------
const TEMI = {
  giorno: { cielo: '#8fd3ff', sole: ['#fff4e0', 2.4], emi: ['#ffffff', '#5a7a3a', 1.15], erba: '#62c34e', siepe: '#3c9a3a', chioma: '#3f9e3a', strada: '#e3d6bb', piazza: '#d4c4a4', fin: 0, lamp: '#f4f4f4' },
  tramonto: { cielo: '#ff9a6b', sole: ['#ffad66', 2.3], emi: ['#ffd0b0', '#6a4a5a', 0.95], erba: '#7bb84a', siepe: '#4f8f34', chioma: '#5a8f30', strada: '#e6c6a6', piazza: '#d6b08e', fin: 0.35, lamp: '#ffe9a0' },
  notte: { cielo: '#131c44', sole: ['#a9bcff', 1.0], emi: ['#7c90e0', '#1a2040', 0.75], erba: '#2f6b3a', siepe: '#1f4a2a', chioma: '#24502c', strada: '#8a879c', piazza: '#77738a', fin: 1, lamp: '#ffe27a', part: 'lucciole' },
  neve: { cielo: '#cfe0ef', sole: ['#ffffff', 2.0], emi: ['#ffffff', '#9aaabb', 1.25], erba: '#f1f5fa', siepe: '#d6e2ec', chioma: '#e4edf5', strada: '#b9b4ad', piazza: '#a9a39c', fin: 0.25, lamp: '#fff6c8', part: 'neve' },
  primavera: { cielo: '#a8e4ff', sole: ['#fff8e8', 2.5], emi: ['#ffffff', '#6a9a4a', 1.15], erba: '#7ed957', siepe: '#4fb44a', chioma: '#ffb0cf', strada: '#efe3c8', piazza: '#e2cfae', fin: 0, lamp: '#f4f4f4', part: 'petali' },
  festa: { cielo: '#1d2a6b', sole: ['#ffd9a0', 1.3], emi: ['#b8beff', '#302040', 0.9], erba: '#3f8a3f', siepe: '#2c6a30', chioma: '#2f6f34', strada: '#9a95a8', piazza: '#8c86a0', fin: 1, lamp: '#ffe27a', part: 'fuochi' },
};
export function tema(id) {
  if (!ok) return;
  const t = TEMI[id] || TEMI.giorno; temaAtt = t;
  scena.background = new THREE.Color(t.cielo); scena.fog.color.set(t.cielo);
  sole.color.set(t.sole[0]); sole.intensity = t.sole[1];
  emi.color.set(t.emi[0]); emi.groundColor.set(t.emi[1]); emi.intensity = t.emi[2];
  for (const k of ['erba', 'siepe', 'chioma', 'strada', 'piazza']) M[k].color.set(t[k]);
  M.finestra.emissive.set('#ffc94a'); M.finestra.emissiveIntensity = t.fin;
  M.lampada.color.set(t.lamp);
  meteo.visible = !!t.part && t.part !== 'fuochi';
  if (meteo.visible) {
    const c = { neve: '#ffffff', petali: '#ffb6d5', lucciole: '#fff27a' }[t.part];
    meteo.material.color.set(c); meteo.material.size = t.part === 'lucciole' ? 0.22 : 0.3;
  }
}
function creaMeteo() {
  const n = 600, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 44, Math.random() * 16, (Math.random() - 0.5) * 44], i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  meteo = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.3, map: texPunto(), transparent: true, depthWrite: false }));
  meteo.frustumCulled = false; meteo.visible = false; scena.add(meteo);
}
let prossimoFuoco = 0;
function aggiornaMeteo(dt, t) {
  if (!temaAtt) return;
  if (temaAtt.part === 'fuochi' && t > prossimoFuoco) {
    prossimoFuoco = t + 0.6 + Math.random() * 1.2;
    scoppio(G.x + (Math.random() - 0.5) * 9, 4.5 + Math.random() * 3, G.z - 3 - Math.random() * 6, [['#1f9e4a', '#ffffff', '#d32f2f'], ['#ffd23f', '#ff7a3a'], ['#5aa8ff', '#ffffff']][Math.floor(Math.random() * 3)], 70, 4.5, 1.6, -1.5, 0.35);
  }
  if (!meteo.visible) return;
  const p = meteo.geometry.attributes.position, tipo = temaAtt.part;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (tipo === 'lucciole') { y = 0.6 + Math.abs(Math.sin(t * 0.7 + i)) * 2.2; x += Math.sin(t + i * 1.3) * dt * 0.6; z += Math.cos(t * 0.8 + i) * dt * 0.6; }
    else { y -= (tipo === 'neve' ? 1.3 : 1) * dt; x += Math.sin(t + i) * dt * (tipo === 'petali' ? 1.4 : 0.4); if (tipo === 'petali') z += dt * 0.5; if (y < 0) y = 16; }
    x = G.x + ((((x - G.x + 22) % 44) + 44) % 44) - 22; z = G.z + ((((z - G.z + 22) % 44) + 44) % 44) - 22;
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
}

// ---------- Ciclo principale ----------
function ciclo() {
  requestAnimationFrame(ciclo);
  if (document.hidden || !G.P) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  muovi(dt); anima(G.P, dt); seguiAmico(dt); pestaPedane();
  let vic = null, dv = 2.9;
  const ks = modo === 'esplora' ? Math.max(1, ze() * 0.75) : 1;   // da lontano nomi e segni più grandi
  for (const [id, n] of NPC) {
    if (n.et) n.et.scale.set(3.4 * ks, 0.85 * ks, 1); n.segno.scale.set(0.9 * ks, 0.9 * ks, 1);
  }
  for (const p of PEDANE) if (Math.abs(p.z - G.z) < 90) p.et.scale.set(4.2 * ks, 0.84 * ks, 1);
  for (const [id, n] of NPC) {
    const d = Math.hypot(n.x - G.x, n.z - G.z);
    if (n.P) {
      if (modo === 'esplora') gira(n, d < 7 ? Math.atan2(G.x - n.x, G.z - n.z) : 0, dt);
      n.P.g.rotation.y = n.rot;
      anima(n.P, dt);
    }
    n.segno.position.y = n.h + Math.abs(Math.sin(t * 3 + n.x)) * 0.25;
    n.segno.visible = modo === 'esplora'; if (n.et) n.et.visible = modo === 'esplora';
    if (d < dv) { dv = d; vic = id; }
  }
  if (modo === 'esplora' && vic !== vicino) { vicino = vic; opz.onVicino && opz.onVicino(vic); }
  const ev = NPC.get('evento'); if (ev && Math.random() < dt * 1.5) scoppio(ev.x, 2.2, ev.z, ['#ffd23f', '#ffffff'], 8, 1.2, 0.7, -1, 0.15);
  for (const g of GETTI) if (Math.abs(g.position.z - G.z) < 80) g.scale.y = 1 + Math.sin(t * 6) * 0.12;
  for (const v of VARCHI) if (v) { const y = v.aperto ? -3.2 : 0; if (Math.abs(v.sbarre.position.y - y) > 0.01) v.sbarre.position.y += (y - v.sbarre.position.y) * Math.min(1, dt * 2.5); }
  if (marcaDest.visible) marcaDest.scale.setScalar(1 + Math.sin(t * 8) * 0.12);
  effetti(dt); sventola(t); if (!stanza) aggiornaMeteo(dt, t);
  meteo.visible = !stanza && !!temaAtt && !!temaAtt.part && temaAtt.part !== 'fuochi';
  sole.position.set(camL.x + 10, 22, camL.z + 8); sole.target.position.set(camL.x, 0, camL.z - 4);
  inquadra(dt, stacco); stacco = false;
  R.render(scena, cam);
}

// ---------- API usata da app.js ----------
export function vestito(id, look) {
  if (look) LOOK = look;
  if (!ok || !G.P) return;
  const vecchio = G.P; G.P = creaGiocatore(id); G.P.g.position.copy(vecchio.g.position); scena.remove(vecchio.g); scena.add(G.P.g);
  G.P.g.scale.setScalar(1 + 0.05 * ((LOOK.liv || 1) - 1));   // evolvendo cresci un po'
  umore(G.P, 'felice', 1.2); scoppio(G.x, 1.2, G.z, ['#ffd23f', '#ffffff', '#5aa8ff'], 40, 3);
}
export function posizione() { const p = dentro || G; return [Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10]; }
export function mettiA(x, z) { G.x = x; G.z = z; if (ok && G.P) { G.P.g.position.set(x, 0, z); inquadra(0, true); } }
export function teletrasporta(id) {
  const n = NPC.get(id); if (!n) return;
  G.x = n.x; G.z = n.z + 2.2; G.rot = Math.PI; G.dest = G.seg = null; dentro = null; stanza = null; pan.x = pan.z = 0;
  if (ok) { marcaDest.visible = false; G.P.g.position.set(G.x, 0, G.z); scoppio(G.x, 1, G.z, ['#ffffff', '#bfe6ff'], 30, 2.5); inquadra(0, true); }
}
export function imposta(m, id) {           // 'esplora' | 'duello' | 'ritratto'
  modo = m; fuoco = id || null;
  if (!ok) return;
  if (joy) { joy = null; if (opz.joy) opz.joy.hidden = true; }
  pinch = null; DITA.clear();
  G.dest = G.seg = null; marcaDest.visible = false; G.P.vel = 0;
  if (m === 'esplora' && stanza === 'sala') { G.x = dentro.x; G.z = dentro.z; G.rot = 0; dentro = null; stanza = null; stacco = true; }
  const n = NPC.get(fuoco);
  if (m === 'duello' && n) {
    if (n.evento) {   // l'incontro: ti avvicini e vi girate uno verso l'altro
      const l = Math.hypot(G.x - n.x, G.z - n.z) || 1, vx = n.x + (G.x - n.x) / l * 2.6, vz = n.z + (G.z - n.z) / l * 2.6;
      if (libero(vx, vz)) { G.x = vx; G.z = vz; }
      G.rot = Math.atan2(n.x - G.x, n.z - G.z); n.rot = Math.atan2(G.x - n.x, G.z - n.z);
    }
    else { G.x = n.x; G.z = n.z + 2.6; G.rot = Math.PI; n.rot = 0; }
    G.P.g.position.set(G.x, 0, G.z); G.P.g.rotation.y = G.rot;
  }
  if (m === 'ritratto') G.rot = stanza === 'sala' ? -0.5 : 0.3;
  if (m === 'esplora') vicino = undefined;
  else stacco = true;   // al prossimo fotogramma: stacco netto sulla nuova inquadratura
}
export function spazioPannello(giu, su = 0) { spazio = giu; spazioSu = su; if (ok) vista(); }
export function guarda(id) { const n = NPC.get(id); if (n && n.P) { n.rot = Math.atan2(G.x - n.x, G.z - n.z); umore(n.P, 'annuisce', 0.8); } }
export function reazione(giusta) {
  if (!ok) return;
  const n = modo === 'duello' ? NPC.get(fuoco) : null;
  const mano = new THREE.Vector3(G.x, 1.4, G.z);
  if (giusta) {
    umore(G.P, 'lancia', 0.3);
    if (n) {
      lancia(CODICE.clone(), mano, new THREE.Vector3(n.x, 1.5, n.z), 0.45, () => {
        scoppio(n.x, 1.6, n.z, ['#ffd23f', '#ffffff', '#ff9a3a'], 36, 3.5); umore(n.P, 'colpito', 0.6); umore(G.P, 'felice', 1.1); });
    } else { umore(G.P, 'felice', 1.2); scoppio(G.x, 2.4, G.z, ['#ffd23f', '#ffffff', '#3ec46d'], 30, 3); }
  } else if (n) {
    umore(n.P, 'punta', 0.5);
    DUBBIO = DUBBIO || tex(['?'], { w: 128, h: 128, font: 120, fg: '#ef4f5f', ombra: '#17142a' });
    lancia(sprite(DUBBIO, 0.9, 0.9), new THREE.Vector3(n.x, 1.6, n.z), mano, 0.5, () => {
      scoppio(G.x, 1.6, G.z, ['#ef4f5f', '#555566'], 26, 2.5); umore(G.P, 'triste', 1.3); });
  } else { umore(G.P, 'triste', 1.3); scoppio(G.x, 2.4, G.z, ['#8a8aa3', '#555566'], 18, 1.5); }
}
export function vittoria() {
  if (!ok) return;
  umore(G.P, 'felice', 2.6);
  const n = NPC.get(fuoco); if (n) umore(n.P, 'annuisce', 2);
  for (let i = 0; i < 3; i++) setTimeout(() => scoppio(G.x + (i - 1) * 0.8, 2.2, G.z, ['#ffd23f', '#ef4f5f', '#3ec46d', '#5aa8ff', '#ffffff'], 60, 4.5, 1.4, -5, 0.3), i * 250);
}
export function sconfitta() { if (!ok) return; umore(G.P, 'triste', 2.2); const n = NPC.get(fuoco); if (n) umore(n.P, 'punta', 1); }

// Anteprima dei vestiti per l'armadio: un secondo piccolo renderer, immagini messe in cache
let RP, scP, camPrev; const PREV = new Map();
function preparaAnteprima() {
  if (RP) return;
  RP = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); RP.setPixelRatio(2); RP.setSize(150, 180);
  scP = new THREE.Scene(); scP.add(new THREE.HemisphereLight('#ffffff', '#8899aa', 1.3));
  const l = new THREE.DirectionalLight('#ffffff', 2); l.position.set(3, 5, 6); scP.add(l);
  camPrev = new THREE.PerspectiveCamera(28, 150 / 180, 0.1, 50); camPrev.position.set(1.6, 1.9, 5.6); camPrev.lookAt(0, 1.08, 0);
}
export function anteprimaPersona(aspetto, chiave) {   // foto di un personaggio qualsiasi (es. il compagno da scegliere)
  if (!ok) return null;
  if (PREV.has(chiave)) return PREV.get(chiave);
  preparaAnteprima();
  const P = persona(aspetto); P.g.rotation.y = 0.3; anima(P, 0); scP.add(P.g);
  RP.render(scP, camPrev); const url = RP.domElement.toDataURL(); scP.remove(P.g);
  PREV.set(chiave, url); return url;
}
export function anteprima(id, look = {}) {
  if (!ok) return null;
  const chiave = `${id}|${look.acc || ''}|${look.capelli || ''}|${(look.liv || 1) >= 5}`;
  if (PREV.has(chiave)) return PREV.get(chiave);
  preparaAnteprima();
  const P = creaGiocatore(id, look); P.g.rotation.y = 0.3; anima(P, 0); scP.add(P.g);
  RP.render(scP, camPrev); const url = RP.domElement.toDataURL(); scP.remove(P.g);
  PREV.set(chiave, url); return url;
}
