// Diritto Pubblico 8-bit — tutto il gioco. Le domande arrivano da domande.js (window.DOMANDE), generato da _sorgenti/build.py.
'use strict';
const D = window.DOMANDE;
const CAPS = [...new Map(D.map(q => [q.id.slice(0, 3), { id: q.id.slice(0, 3), titolo: q.capitolo, giorno: q.giorno }])).values()];

// ---------- Skin (sbloccate con i punti) ----------
const SKIN_BOY = [
  { id: 'felpa', nome: 'Felpa blu', xp: 0 },
  { id: 'occhiali', nome: 'Occhiali da secchione', xp: 60 },
  { id: 'cappello', nome: 'Cappellino', xp: 150 },
  { id: 'camicia', nome: 'Camicia e cravatta', xp: 280 },
  { id: 'giacca', nome: 'Giacca e cravatta', xp: 450 },
  { id: 'avvocato', nome: 'Toga da avvocato', xp: 650 },
  { id: 'sindaco', nome: 'Fascia da sindaco', xp: 880 },
  { id: 'magistrato', nome: 'Toga da magistrato', xp: 1150 },
  { id: 'giudice', nome: 'Giudice costituzionale', xp: 1500 },
  { id: 'presidente', nome: 'Presidente della Repubblica', xp: 2000 },
];
const SKIN_ROOM = [
  { id: 'aula', nome: 'Aula universitaria', xp: 0 },
  { id: 'biblio', nome: 'Biblioteca', xp: 200 },
  { id: 'camera', nome: 'Montecitorio (Camera)', xp: 550 },
  { id: 'senato', nome: 'Palazzo Madama (Senato)', xp: 1000 },
  { id: 'consulta', nome: 'Corte costituzionale', xp: 1350 },
  { id: 'quirinale', nome: 'Quirinale', xp: 1800 },
];
const SBLOCCHI = [...SKIN_BOY.map(s => ({ ...s, tipo: 'boy' })), ...SKIN_ROOM.map(s => ({ ...s, tipo: 'room' }))]
  .filter(s => s.xp > 0).sort((a, b) => a.xp - b.xp);
const PUNTI = { orale: 10, flashcard: 5, crocette: 10 };

// ---------- Salvataggio ----------
const KEY = 'dp8bit-v1';
const S = { xp: 0, srs: {}, boy: 'felpa', room: 'aula', sound: true, filtro: 'tutto' };
function load() { try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* storage non disponibile: si gioca senza salvare */ } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }

// ---------- Scelta delle domande (ripetizione spaziata semplice: box 0-4) ----------
function pool(tipo) {
  let qs = D.filter(q => q.tipo === tipo);
  const f = S.filtro;
  if (f === 'ripasso') qs = qs.filter(q => S.srs[q.id] && S.srs[q.id].b === 0);
  else if (/^g\d$/.test(f)) qs = qs.filter(q => q.giorno === +f[1]);
  else if (/^c\d\d$/.test(f)) qs = qs.filter(q => q.id.startsWith(f));
  return qs;
}
function peso(q) { const r = S.srs[q.id]; return r ? [8, 4, 2, 1, 1][r.b] : 5; } // sbagliate (box 0) tornano più spesso
function pesca(qs, evita) {
  const cand = qs.length > 1 ? qs.filter(q => q.id !== evita) : qs;
  let t = Math.random() * cand.reduce((s, q) => s + peso(q), 0);
  for (const q of cand) { t -= peso(q); if (t <= 0) return q; }
  return cand[cand.length - 1];
}
function rispondi(q, ok) {
  const r = S.srs[q.id] || { b: 0, n: 0 };
  r.n++; r.b = ok ? Math.min(4, r.b + 1) : 0;
  S.srs[q.id] = r;
  if (ok) aggiungiXP(PUNTI[q.tipo]);
  save();
}
const daRipassare = () => D.filter(q => S.srs[q.id] && S.srs[q.id].b === 0).length;

function aggiungiXP(n) {
  const prima = S.xp; S.xp += n;
  SBLOCCHI.filter(s => s.xp > prima && s.xp <= S.xp).forEach(s => { suona('unlock'); mostraSblocco(s); });
  aggiornaTop();
}
const sbloccato = s => S.xp >= s.xp;

// ---------- Suoni 8-bit ----------
let AC;
const SND = { ok: [[660, .08], [880, .14]], ko: [[220, .14], [165, .22]], unlock: [[523, .1], [659, .1], [784, .1], [1047, .3]], tap: [[520, .03]] };
function suona(nome) {
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    let t = AC.currentTime;
    for (const [f, d] of SND[nome]) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); t += d * .9;
    }
  } catch (e) { }
}

// ---------- Grafica pixel art (canvas 128x96) ----------
const cv = document.getElementById('scena'), ctx = cv.getContext('2d');
let umore = 'idle', umoreFino = 0, domanda = false, frame = 0;
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const PELLE = '#f5c9a0';

function bandieraIT(g, x, y) { R(g, x - 1, y, 1, 18, '#777'); R(g, x, y, 3, 7, '#1f9e4a'); R(g, x + 3, y, 3, 7, '#fff'); R(g, x + 6, y, 3, 7, '#d32f2f'); }
function bandieraUE(g, x, y) { R(g, x - 1, y, 1, 18, '#777'); R(g, x, y, 9, 7, '#1d3f99'); [[2, 1], [6, 1], [1, 3], [7, 3], [2, 5], [6, 5], [4, 0], [4, 6]].forEach(([a, b]) => R(g, x + a, y + b, 1, 1, '#ffd23f')); }
function lampadario(g, x, y) { R(g, x + 4, 0, 1, y, '#a88'); R(g, x, y, 9, 2, '#d4af37'); [0, 4, 8].forEach(d => R(g, x + d, y - 2, 1, 2, '#fff6b0')); }
function gradinate(g, sedile, scuro) {  // emiciclo stilizzato
  for (let r = 0; r < 4; r++) for (let i = 0; i < 16 - r * 2; i++) {
    const x = 8 + r * 6 + i * 7, y = 22 + r * 8 - Math.round(Math.sin((i / (15 - r * 2)) * Math.PI) * 4);
    R(g, x, y, 5, 4, sedile); R(g, x, y + 4, 5, 1, scuro);
  }
}
const STANZE = {
  aula: { muro: '#e8d8b0', pav: '#a0673a', pav2: '#8a5530', cattedra: '#8a5a2b', disegna(g) {
    R(g, 36, 8, 56, 28, '#5a3a1a'); R(g, 38, 10, 52, 24, '#2f6b4f');
    [[41, 13, 22], [41, 17, 30], [41, 21, 18], [41, 25, 26]].forEach(([x, y, w]) => R(g, x, y, w, 1, '#d8eee0'));
    R(g, 70, 12, 14, 9, '#d8eee0'); R(g, 71, 13, 12, 7, '#2f6b4f'); R(g, 73, 15, 8, 1, '#d8eee0'); R(g, 73, 17, 5, 1, '#d8eee0'); // "Art. 1"
    R(g, 104, 10, 18, 24, '#6b4a2a'); R(g, 106, 12, 14, 20, '#8fd3ff'); R(g, 112, 12, 2, 20, '#6b4a2a'); R(g, 106, 21, 14, 2, '#6b4a2a'); R(g, 107, 14, 4, 2, '#fff');
    R(g, 14, 8, 9, 9, '#333'); R(g, 15, 9, 7, 7, '#fff'); R(g, 18, 10, 1, 3, '#333'); R(g, 18, 12, 3, 1, '#333');
  } },
  biblio: { muro: '#2e4a3a', pav: '#7a2e2e', pav2: '#6a2626', cattedra: '#5a3a1a', disegna(g) {
    const col = ['#c0392b', '#2980b9', '#f1c40f', '#27ae60', '#8e44ad', '#e67e22', '#ecf0f1'];
    for (let s = 0; s < 3; s++) { const y = 6 + s * 16; R(g, 34, y + 12, 94, 2, '#4a2e16');
      for (let i = 0, x = 36; x < 124; i++) { const w = 2 + (i * 7 % 3), h = 8 + (i * 5 % 4); R(g, x, y + 12 - h, w, h, col[(i * 3 + s) % col.length]); x += w + 1; } }
    R(g, 2, 30, 3, 26, '#333'); R(g, 0, 26, 8, 5, '#ffd23f');
  } },
  camera: { muro: '#7a1f2b', pav: '#5a3a22', pav2: '#4a2e1a', cattedra: '#3a2414', disegna(g) {
    R(g, 0, 0, 128, 14, '#5e1520'); R(g, 0, 14, 128, 2, '#d4af37'); gradinate(g, '#b0263a', '#4a0d16');
    bandieraIT(g, 112, 18); bandieraUE(g, 100, 18); R(g, 60, 3, 8, 8, '#d4af37'); R(g, 62, 5, 4, 4, '#7a1f2b');
  } },
  senato: { muro: '#2b3a6b', pav: '#4a2e1a', pav2: '#3a2414', cattedra: '#3a2414', disegna(g) {
    R(g, 0, 0, 128, 12, '#1d2a52'); R(g, 0, 12, 128, 2, '#d4af37'); gradinate(g, '#a3172b', '#4a0d16');
    lampadario(g, 59, 6); bandieraIT(g, 112, 18); bandieraUE(g, 100, 18);
  } },
  consulta: { muro: '#3a2a20', pav: '#5a3a22', pav2: '#4a2e1a', cattedra: '#2a1a10', disegna(g) {
    R(g, 34, 2, 90, 26, '#8b1a1a'); for (let x = 36; x < 124; x += 6) R(g, x, 2, 2, 26, '#6e1212');
    R(g, 30, 28, 98, 14, '#5a3a22'); R(g, 30, 28, 98, 2, '#d4af37');
    for (let i = 0; i < 15; i++) R(g, 34 + i * 6, 22, 4, 6, '#111');
    R(g, 74, 5, 10, 10, '#d4af37'); R(g, 76, 7, 6, 6, '#8b1a1a'); R(g, 78, 9, 2, 2, '#d4af37');
  } },
  quirinale: { muro: '#f1e3c0', pav: '#c9b48a', pav2: '#b8a276', cattedra: '#7a4a1a', disegna(g) {
    for (let x = 4; x < 124; x += 30) { R(g, x, 6, 22, 30, '#c9a227'); R(g, x + 2, 8, 18, 26, '#7a9a6a'); R(g, x + 6, 14, 10, 12, '#c98a5a'); }
    R(g, 0, 40, 128, 2, '#c9a227'); lampadario(g, 59, 4); bandieraIT(g, 112, 26); bandieraUE(g, 100, 26);
  }, tappeto: true },
};

function disegnaStanza(g, room) {
  const st = STANZE[room];
  R(g, 0, 0, 128, 62, st.muro); st.disegna(g);
  R(g, 0, 60, 128, 2, 'rgba(0,0,0,.25)');
  R(g, 0, 62, 128, 34, st.pav); for (let y = 66; y < 96; y += 6) R(g, 0, y, 128, 1, st.pav2);
  if (st.tappeto) R(g, 52, 62, 56, 34, '#a3172b');
}
function disegnaProf(g, x, y, annuisce, chiede) {
  const ny = annuisce ? 1 : 0;
  R(g, x + 1, y + 10, 13, 12, '#6b4f3a'); R(g, x + 6, y + 10, 3, 6, '#fff'); R(g, x + 7, y + 11, 1, 5, '#a33');
  R(g, x + 3, y + 1 + ny, 9, 9, PELLE); R(g, x + 3, y + 1 + ny, 2, 5, '#bbb'); R(g, x + 10, y + 1 + ny, 2, 5, '#bbb'); R(g, x + 4, y + ny, 7, 1, '#ccc');
  R(g, x + 4, y + 4 + ny, 3, 2, '#222'); R(g, x + 8, y + 4 + ny, 3, 2, '#222'); R(g, x + 5, y + 4 + ny, 1, 1, '#9cf'); R(g, x + 9, y + 4 + ny, 1, 1, '#9cf');
  R(g, x + 5, y + 7 + ny, 5, 1, '#888');
  if (chiede) { R(g, x + 15, y - 9, 11, 10, '#fff'); R(g, x + 15, y + 1, 3, 2, '#fff');
    R(g, x + 18, y - 7, 4, 1, '#222'); R(g, x + 21, y - 6, 1, 2, '#222'); R(g, x + 20, y - 4, 1, 1, '#222'); R(g, x + 19, y - 3, 1, 1, '#222'); R(g, x + 19, y - 1, 1, 1, '#222'); }
}
function rettangolo(g, x, y, w, h, c) { R(g, x, y, w, 1, c); R(g, x, y + h - 1, w, 1, c); R(g, x, y, 1, h, c); R(g, x + w - 1, y, 1, h, c); }
const VESTITI = {
  felpa: { corpo: '#3f6fd8', det(g, x, y) { R(g, x + 7, y + 11, 1, 3, '#fff'); R(g, x + 10, y + 11, 1, 3, '#fff'); R(g, x + 5, y + 16, 8, 2, '#2f55a8'); } },
  occhiali: { corpo: '#3fae6a', det(g, x, y) { R(g, x + 8, y + 10, 2, 9, '#2f8a52'); }, testa(g, x, y) { for (const lx of [x + 5, x + 9]) { rettangolo(g, lx, y + 3, 4, 4, '#111'); R(g, lx + 1, y + 4, 2, 2, '#cfefff'); R(g, lx + 2, y + 5, 1, 1, '#222'); } } },
  cappello: { corpo: '#d64545', det(g, x, y) { R(g, x + 5, y + 13, 8, 3, '#fff'); }, testa(g, x, y) { R(g, x + 3, y - 3, 12, 4, '#d64545'); R(g, x + 2, y + 1, 14, 1, '#a33'); R(g, x + 8, y - 2, 2, 2, '#fff'); } },
  camicia: { corpo: '#f4f4f4', det(g, x, y) { R(g, x + 8, y + 11, 2, 7, '#c33'); R(g, x + 6, y + 10, 2, 2, '#ddd'); R(g, x + 10, y + 10, 2, 2, '#ddd'); } },
  giacca: { corpo: '#22305a', det(g, x, y) { R(g, x + 7, y + 10, 4, 5, '#fff'); R(g, x + 8, y + 11, 2, 5, '#c33'); } },
  avvocato: { corpo: '#151515', det(g, x, y) { R(g, x + 7, y + 10, 4, 3, '#fff'); R(g, x + 4, y + 12, 1, 6, '#d4af37'); R(g, x + 13, y + 12, 1, 6, '#d4af37'); } },
  sindaco: { corpo: '#22305a', det(g, x, y) { R(g, x + 7, y + 10, 4, 4, '#fff');
    for (let i = 0; i < 10; i++) { R(g, x + 3 + i, y + 10 + i, 1, 1, '#1f9e4a'); R(g, x + 4 + i, y + 10 + i, 1, 1, '#fff'); R(g, x + 5 + i, y + 10 + i, 1, 1, '#d32f2f'); } } },
  magistrato: { corpo: '#151515', det(g, x, y) { R(g, x + 7, y + 10, 4, 4, '#fff'); R(g, x + 4, y + 11, 1, 7, '#ccc'); R(g, x + 13, y + 11, 1, 7, '#ccc'); R(g, x + 3, y + 10, 12, 1, '#ccc'); } },
  giudice: { corpo: '#151515', det(g, x, y) { R(g, x + 7, y + 10, 4, 4, '#fff'); R(g, x + 3, y + 10, 12, 2, '#d4af37'); }, testa(g, x, y) { R(g, x + 3, y - 4, 12, 4, '#111'); R(g, x + 3, y - 1, 12, 1, '#d4af37'); } },
  presidente: { corpo: '#1e1e1e', det(g, x, y) { R(g, x + 7, y + 10, 4, 5, '#fff'); R(g, x + 8, y + 11, 2, 5, '#1d3f99');
    R(g, x + 3, y + 12, 3, 3, '#1f9e4a'); R(g, x + 4, y + 13, 1, 1, '#fff'); R(g, x + 4, y + 13, 1, 1, '#d32f2f'); } },
};
function disegnaRagazzo(g, x, y, vestito, mood, blink) {
  const v = VESTITI[vestito] || VESTITI.felpa, dy = mood === 'sad' ? 1 : 0;
  R(g, x + 2, y + 10, 14, 10, v.corpo); v.det(g, x, y);
  if (mood === 'happy') { R(g, x - 1, y + 2, 3, 10, v.corpo); R(g, x + 16, y + 2, 3, 10, v.corpo); R(g, x - 1, y, 3, 2, PELLE); R(g, x + 16, y, 3, 2, PELLE); }
  else { R(g, x, y + 13, 3, 6, v.corpo); R(g, x + 15, y + 13, 3, 6, v.corpo); }
  const hy = y + dy;
  R(g, x + 8, hy + 9, 2, 1, PELLE); R(g, x + 4, hy, 10, 10, PELLE);
  R(g, x + 3, hy - 1, 12, 3, '#4a2d16'); R(g, x + 3, hy + 2, 2, 3, '#4a2d16'); R(g, x + 13, hy + 2, 2, 3, '#4a2d16');
  if (blink) { R(g, x + 6, hy + 5, 2, 1, '#222'); R(g, x + 10, hy + 5, 2, 1, '#222'); }
  else { R(g, x + 6, hy + 4, 2, 2, '#222'); R(g, x + 10, hy + 4, 2, 2, '#222'); }
  if (mood === 'happy') { R(g, x + 7, hy + 7, 4, 2, '#a33'); R(g, x + 8, hy + 7, 2, 1, '#fff'); }
  else if (mood === 'sad') { R(g, x + 7, hy + 8, 1, 1, '#a33'); R(g, x + 8, hy + 7, 2, 1, '#a33'); R(g, x + 10, hy + 8, 1, 1, '#a33'); R(g, x + 15, hy + 1, 1, 2, '#7cc6ff'); R(g, x + 16, hy + 3, 1, 1, '#7cc6ff'); }
  else R(g, x + 8, hy + 7, 2, 1, '#a33');
  if (v.testa) v.testa(g, x, hy);
}
function disegnaScena(g, room, vestito, mood, opz = {}) {
  const st = STANZE[room] || STANZE.aula;
  disegnaStanza(g, room);
  disegnaProf(g, 16, 26, opz.annuisce, opz.chiede);
  R(g, 5, 46, 38, 2, '#c8a070'); R(g, 6, 48, 36, 12, st.cattedra); R(g, 9, 51, 30, 6, 'rgba(0,0,0,.2)'); R(g, 25, 43, 8, 3, '#fff');
  disegnaRagazzo(g, 70, 54, vestito, mood, opz.blink);
  R(g, 58, 72, 48, 3, '#c8a070'); R(g, 60, 75, 44, 13, '#8a5a2b'); R(g, 62, 88, 3, 8, '#5a3a1a'); R(g, 99, 88, 3, 8, '#5a3a1a');
  R(g, 78, 69, 12, 3, '#c33'); R(g, 79, 69, 10, 1, '#fff');
  if (mood !== 'happy') { R(g, 70, 71, 4, 2, PELLE); R(g, 86, 71, 4, 2, PELLE); }
}
function animaScena() {
  frame++;
  const mood = Date.now() < umoreFino ? umore : 'idle';
  disegnaScena(ctx, S.room, S.boy, mood, { blink: frame % 16 === 0, annuisce: mood !== 'idle' && frame % 2 === 0, chiede: domanda && mood === 'idle' });
}
setInterval(() => { if (!document.hidden) animaScena(); }, 250);
function reazione(ok) { umore = ok ? 'happy' : 'sad'; umoreFino = Date.now() + 1300; suona(ok ? 'ok' : 'ko'); animaScena(); }

// ---------- Interfaccia ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const mescola = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let sess = null;

function aggiornaTop() {
  $('#xp').textContent = S.xp;
  const prox = SBLOCCHI.find(s => !sbloccato(s));
  $('#liv').textContent = prox ? `prossimo: ${prox.nome} a ${prox.xp}` : 'tutto sbloccato!';
  $('#snd').textContent = S.sound ? '🔊' : '🔇';
}
function mostra(html, compatta) { $('#schermo').innerHTML = html; $('#app').classList.toggle('compatta', !!compatta); window.scrollTo(0, 0); }

function home() {
  sess = null; domanda = false;
  const opz = [['tutto', 'Tutti gli argomenti'], ['ripasso', `Da ripassare (${daRipassare()})`],
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(g => ['g' + g, `Giorno ${g}`]), ...CAPS.map(c => [c.id, c.titolo])];
  mostra(`
    <select id="filtro" aria-label="Argomento">${opz.map(([v, t]) => `<option value="${v}" ${S.filtro === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    <button data-mod="orale">🎓 Domande d'esame</button>
    <button data-mod="flashcard">🃏 Flashcard</button>
    <button data-mod="crocette">✅ Crocette</button>
    <button class="giallo" data-mod="sim">📝 Simulazione esame</button>
    <div class="riga"><button class="grigio" id="b-armadio">👕 Armadio</button><button class="grigio" id="b-prog">📊 Progressi</button></div>`);
  $('#filtro').onchange = e => { S.filtro = e.target.value; save(); };
  document.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => { suona('tap'); b.dataset.mod === 'sim' ? avviaSim() : avvia(b.dataset.mod); });
  $('#b-armadio').onclick = armadio; $('#b-prog').onclick = progressi;
}

function avvia(tipo) {
  if (!pool(tipo).length) { mostra(`<div class="card">Nessuna domanda di questo tipo per l'argomento scelto${S.filtro === 'ripasso' ? ': non hai errori da ripassare! 🎉' : '.'}</div><button id="b-home">◀ Indietro</button>`); $('#b-home').onclick = home; return; }
  sess = { tipo, n: 0, giuste: 0 }; prossima();
}
function prossima() {
  const s = sess;
  if (s.sim) { if (s.i >= s.lista.length) return fineSim(); s.q = s.lista[s.i]; }
  else s.q = pesca(pool(s.tipo), s.q && s.q.id);
  s.fase = 0; if (s.q.tipo === 'crocette') s.ordine = mescola([0, 1, 2, 3]);
  domanda = true; disegnaDomanda();
}
function intestazione() {
  const s = sess;
  const cont = s.sim ? `Domanda ${s.i + 1} di ${s.lista.length}` : `${s.n} risposte · ${s.giuste} giuste`;
  return `<div class="riga"><button class="grigio" id="b-fine" style="flex:0 0 96px;min-height:40px">◀ Fine</button><div class="info" style="align-self:center">${cont}</div></div>`;
}
function disegnaDomanda() {
  const s = sess, q = s.q;
  const cap = `<div class="cap">${esc(q.capitolo)}</div>`;
  let h = intestazione();
  if (q.tipo === 'flashcard') {
    h += `<div class="card flip" id="carta">${cap}<div class="dom">${esc(q.domanda)}</div>${s.fase ? `<div class="risp">${md(q.risposta)}</div>` : '<div class="hint">tocca la carta per girarla</div>'}</div>`;
  } else {
    h += `<div class="card">${cap}<div class="dom">${esc(q.domanda)}</div>${q.tipo === 'orale' && s.fase ? `<div class="risp">${md(q.risposta)}</div>` : ''}${q.tipo === 'crocette' && s.fase ? `<div class="risp">${md(q.risposta)}</div>` : ''}</div>`;
  }
  if (q.tipo === 'crocette') {
    h += s.ordine.map(i => {
      const cls = !s.fase ? '' : i === q.corretta ? 'giusta' : i === s.scelta ? 'sbagliata' : 'grigio';
      return `<button class="opz ${cls}" data-i="${i}" ${s.fase ? 'disabled' : ''}>${esc(q.opzioni[i])}</button>`;
    }).join('');
    if (s.fase) h += `<button class="giallo" id="b-avanti">Avanti ▶</button>`;
  } else if (!s.fase) {
    if (q.tipo === 'orale') h += `<button class="giallo" id="b-mostra">Mostra risposta</button>`;
  } else {
    h += `<div class="riga"><button class="rosso" id="b-no">✘ Da ripassare</button><button class="verde" id="b-si">✔ La sapevo</button></div>`;
  }
  mostra(h, true);
  $('#b-fine').onclick = () => s.sim ? fineSim() : riepilogo();
  if ($('#carta') && !s.fase) $('#carta').onclick = () => { s.fase = 1; suona('tap'); disegnaDomanda(); };
  if ($('#b-mostra')) $('#b-mostra').onclick = () => { s.fase = 1; suona('tap'); disegnaDomanda(); };
  if ($('#b-si')) $('#b-si').onclick = () => esito(true);
  if ($('#b-no')) $('#b-no').onclick = () => esito(false);
  document.querySelectorAll('.opz').forEach(b => b.onclick = () => { s.scelta = +b.dataset.i; s.fase = 1; esito(s.scelta === q.corretta, true); });
  if ($('#b-avanti')) $('#b-avanti').onclick = avanti;
}
function esito(ok, resta) {
  const s = sess; s.n++; if (ok) s.giuste++;
  if (s.sim) { s.risultati.push({ q: s.q, ok }); }
  rispondi(s.q, ok); domanda = false; reazione(ok);
  if (resta) disegnaDomanda(); else avanti();
}
function avanti() { if (sess.sim) sess.i++; prossima(); }
function riepilogo() {
  const s = sess; sess = null; domanda = false;
  mostra(`<h2>Fine sessione</h2><div class="card">Hai risposto a <b>${s.n}</b> domande, <b>${s.giuste}</b> giuste.<br>Da ripassare in totale: <b>${daRipassare()}</b>.</div><button id="b-home">◀ Menu</button>`);
  $('#b-home').onclick = home;
}

// ---------- Simulazione d'esame: 5 crocette + 5 domande d'esame da 10 capitoli diversi ----------
function creaSim() {
  const caps = mescola(CAPS.map(c => c.id)).slice(0, 10);
  const lista = caps.map((c, i) => {
    const tipo = i < 5 ? 'crocette' : 'orale';
    return mescola(D.filter(q => q.tipo === tipo && q.id.startsWith(c)))[0];
  });
  return mescola(lista);
}
function avviaSim() { sess = { sim: true, lista: creaSim(), i: 0, n: 0, giuste: 0, risultati: [] }; prossima(); }
function votoDa(giuste, tot) { const v = Math.round(giuste / tot * 30); return giuste === tot ? '30 e lode' : String(v); }
function fineSim() {
  const s = sess; sess = null; domanda = false;
  const tot = s.lista.length, v = votoDa(s.giuste, tot), num = parseInt(v);
  if (num >= 18) aggiungiXP(num);
  const errori = s.risultati.filter(r => !r.ok);
  mostra(`<h2>Esito dell'esame</h2>
    <div class="voto">${v}/30</div>
    <div class="info">${s.giuste} su ${tot} giuste · ${num >= 18 ? `Superato! +${num} ⭐` : 'Non superato: ritenta, ce la fai!'}</div>
    ${errori.length ? '<h2>Da rivedere</h2>' + errori.map(r => `<div class="card"><div class="cap">${esc(r.q.capitolo)}</div><div class="dom">${esc(r.q.domanda)}</div><div class="risp">${r.q.tipo === 'crocette' ? '✔ ' + esc(r.q.opzioni[r.q.corretta]) + '<br>' : ''}${md(r.q.risposta)}</div></div>`).join('') : ''}
    <button id="b-home">◀ Menu</button>`);
  if (num >= 18) { umore = 'happy'; umoreFino = Date.now() + 2500; }
  $('#b-home').onclick = home;
}

// ---------- Armadio ----------
function anteprima(tipo, id) {
  const c = document.createElement('canvas');
  if (tipo === 'boy') { c.width = 24; c.height = 26; const g = c.getContext('2d'); R(g, 0, 0, 24, 26, '#e8d8b0'); disegnaRagazzo(g, 3, 5, id, 'idle'); }
  else { c.width = 128; c.height = 96; disegnaScena(c.getContext('2d'), id, 'felpa', 'idle'); }
  return c;
}
function armadio() {
  const blocco = (lista, tipo) => lista.map(s => {
    const usa = S[tipo] === s.id, ok = sbloccato(s);
    return `<div class="skin ${ok ? '' : 'bloccata'}" data-t="${tipo}" data-id="${s.id}"><div class="prev"></div>${esc(s.nome)}
      <button class="${usa ? 'verde' : ok ? '' : 'grigio'}" ${ok && !usa ? '' : 'disabled'}>${usa ? 'In uso' : ok ? 'Indossa' : `🔒 ${s.xp} ⭐`}</button></div>`;
  }).join('');
  mostra(`<h2>Il tuo personaggio</h2><div class="griglia">${blocco(SKIN_BOY, 'boy')}</div>
    <h2>La tua aula</h2><div class="griglia">${blocco(SKIN_ROOM, 'room')}</div>
    <button id="b-home">◀ Menu</button>`);
  document.querySelectorAll('.skin').forEach(el => {
    el.querySelector('.prev').appendChild(anteprima(el.dataset.t, el.dataset.id));
    el.querySelector('button').onclick = () => { S[el.dataset.t] = el.dataset.id; save(); suona('ok'); animaScena(); armadio(); };
  });
  $('#b-home').onclick = home;
}

// ---------- Progressi + esporta/importa ----------
function padronanza(qs) { return qs.length ? qs.reduce((t, q) => t + (S.srs[q.id] ? S.srs[q.id].b : 0), 0) / (qs.length * 4) : 0; }
function progressi() {
  const viste = Object.keys(S.srs).length;
  mostra(`<h2>I tuoi progressi</h2>
    <div class="card">Domande viste: <b>${viste}</b> su ${D.length}<br>Da ripassare: <b>${daRipassare()}</b><br>Padronanza totale: <b>${Math.round(padronanza(D) * 100)}%</b></div>
    ${CAPS.map(c => { const p = Math.round(padronanza(D.filter(q => q.id.startsWith(c.id))) * 100);
      return `<div class="cap-riga">${esc(c.titolo)} · ${p}%</div><div class="barra"><div style="width:${p}%"></div></div>`; }).join('')}
    <h2>Salva i progressi</h2>
    <div class="info">Utile se cambi telefono o reinstalli l'app.</div>
    <div class="riga"><button id="b-esp">⬆ Esporta</button><button id="b-imp">⬇ Importa</button></div>
    <input type="file" id="file" accept=".json,application/json" hidden>
    <button class="rosso" id="b-reset">Azzera tutto</button>
    <button id="b-home">◀ Menu</button>`);
  $('#b-esp').onclick = esporta;
  $('#b-imp').onclick = () => $('#file').click();
  $('#file').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(importa); };
  let conferma = false;
  $('#b-reset').onclick = e => {
    if (!conferma) { conferma = true; e.target.textContent = 'Tocca di nuovo per confermare'; return; }
    Object.assign(S, { xp: 0, srs: {}, boy: 'felpa', room: 'aula' }); save(); aggiornaTop(); progressi();
  };
  $('#b-home').onclick = home;
}
async function esporta() {
  const testo = JSON.stringify(S), nome = 'progressi-diritto-pubblico.json';
  const file = new File([testo], nome, { type: 'application/json' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], title: nome }); } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = nome; a.click();
}
function importa(testo) {
  try {
    const dati = JSON.parse(testo);
    if (typeof dati.xp !== 'number' || typeof dati.srs !== 'object') throw new Error('formato');
    Object.assign(S, dati); save(); aggiornaTop(); finestra('Progressi importati ✔', `Punti: ${S.xp}`);
  } catch (e) { finestra('File non valido', 'Scegli il file esportato dall\'app.'); }
}

// ---------- Finestre (sblocchi, messaggi) ----------
const coda = [];
function finestra(titolo, testo, azione, nodo) { coda.push({ titolo, testo, azione, nodo }); if (coda.length === 1) apriFinestra(); }
function apriFinestra() {
  const m = coda[0]; if (!m) return;
  const box = $('#modal'); box.hidden = false;
  box.innerHTML = `<div class="box"><h3>${esc(m.titolo)}</h3><div>${m.testo}</div>${m.azione ? `<button class="verde" id="m-si">${esc(m.azione.testo)}</button>` : ''}<button class="grigio" id="m-ok">OK</button></div>`;
  if (m.nodo) box.querySelector('.box div').prepend(m.nodo);
  const chiudi = () => { box.hidden = true; coda.shift(); apriFinestra(); };
  $('#m-ok').onclick = chiudi;
  if (m.azione) $('#m-si').onclick = () => { m.azione.fai(); chiudi(); };
}
function mostraSblocco(s) {
  const c = anteprima(s.tipo, s.id); c.style.cssText = 'width:' + (s.tipo === 'boy' ? '96px' : '100%') + ';image-rendering:pixelated;margin:8px auto;display:block';
  finestra('🎉 SBLOCCATO!', esc(s.nome), { testo: s.tipo === 'boy' ? 'Indossa subito' : 'Entra in aula', fai: () => { S[s.tipo] = s.id; save(); animaScena(); } }, c);
}

// ---------- Avvio ----------
load();
$('#snd').onclick = () => { S.sound = !S.sound; save(); aggiornaTop(); suona('tap'); };
aggiornaTop(); animaScena();
({ armadio, progressi, sim: avviaSim, orale: () => avvia('orale'), flashcard: () => avvia('flashcard'), crocette: () => avvia('crocette') }[location.hash.slice(1)] || home)();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // se c'era già una versione installata e ne arriva una nuova, ricarica subito per usarla
  if (navigator.serviceWorker.controller) navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  navigator.serviceWorker.register('sw.js').catch(() => { });
}

// ---------- Autotest: apri index.html?test ----------
if (location.search.includes('test')) {
  const err = [], ok = (c, m) => { if (!c) err.push(m); };
  const salvato = JSON.stringify(S);
  ok(D.length >= 250, 'domande >= 250');
  ok(D.every(q => q.tipo !== 'crocette' || (q.opzioni.length === 4 && q.corretta >= 0 && q.corretta < 4)), 'crocette valide');
  ok(CAPS.length === 17, '17 capitoli');
  S.filtro = 'g4'; ok(pool('orale').every(q => q.giorno === 4) && pool('orale').length > 0, 'filtro giorno');
  S.filtro = 'c11'; ok(pool('crocette').every(q => q.id.startsWith('c11')), 'filtro capitolo');
  S.filtro = 'tutto'; S.xp = 0; S.srs = {};
  const q = D.find(x => x.tipo === 'crocette');
  rispondi(q, false); ok(S.srs[q.id].b === 0 && daRipassare() === 1, 'sbagliata va in ripasso');
  rispondi(q, true); ok(S.srs[q.id].b === 1 && S.xp === 10, 'giusta: box 1 e +10 punti');
  S.filtro = 'ripasso'; ok(pool('crocette').length === 0, 'ripasso si svuota'); S.filtro = 'tutto';
  S.xp = 55; aggiungiXP(10); ok(coda.some(m => m.titolo.includes('SBLOCCATO')), 'sblocco a 60 punti');
  coda.length = 0; $('#modal').hidden = true;
  save(); const prima = JSON.stringify(S); S.xp = -1; load(); ok(JSON.stringify(S) === prima, 'salva e ricarica');
  const sim = creaSim(); ok(sim.length === 10 && new Set(sim.map(x => x.id.slice(0, 3))).size === 10, 'simulazione: 10 capitoli diversi');
  ok(sim.filter(x => x.tipo === 'crocette').length === 5, 'simulazione: 5 crocette');
  ok(votoDa(10, 10) === '30 e lode' && votoDa(6, 10) === '18', 'voto in trentesimi');
  try { home(); avvia('orale'); $('#b-mostra').click(); $('#b-si').click(); avvia('flashcard'); $('#carta').click(); $('#b-no').click();
    avvia('crocette'); document.querySelector('.opz').click(); $('#b-avanti').click(); avviaSim(); armadio(); progressi(); home(); } catch (e) { err.push('UI: ' + e.message); }
  Object.assign(S, JSON.parse(salvato)); save();
  document.title = err.length ? 'TEST FALLITO' : 'TEST OK';
  document.body.insertAdjacentHTML('beforeend', `<pre id="test">${document.title}\n${err.join('\n')}</pre>`);
}
