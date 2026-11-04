// Città del Diritto: logica del gioco e interfaccia. Il mondo 3D sta in mondo.js;
// le domande arrivano da domande.js (window.DOMANDE), generato da _sorgenti/build.py.
import * as M from './mondo.js';
import { CITTA, ENIGMI, posto, PASSO } from './storia.js';

const D = window.DOMANDE;
const CAPS = [...new Map(D.map(q => [q.id.slice(0, 3), { id: q.id.slice(0, 3), titolo: q.capitolo, giorno: q.giorno }])).values()];
// Evoluzione del personaggio: con le ⭐ cresci e in lotta hai più vita, aiuti 50/50 e seconde vite
const EVO = [
  { liv: 1, nome: 'Matricola', xp: 0, hp: 3, aiuti: 0, vite: 0 },
  { liv: 2, nome: 'Studente', xp: 120, hp: 3, aiuti: 1, vite: 0 },
  { liv: 3, nome: 'Laureando', xp: 350, hp: 4, aiuti: 1, vite: 1 },
  { liv: 4, nome: 'Dottore', xp: 750, hp: 4, aiuti: 2, vite: 1 },
  { liv: 5, nome: 'Giurista', xp: 1300, hp: 5, aiuti: 2, vite: 2, critico: true },
];
const evo = () => EVO[S.evo || 0];
const HP_ALL = 3, HP_CAPO = 8;   // allenatore: 3 domande da vincere · capopalestra: 8 domande difficili, senza errori
const TUTOR = ['Marco', 'Luca', 'Davide', 'Paolo', 'Simone', 'Andrea', 'Matteo', 'Fabio'];
const DOTT = ['Giulia', 'Sara', 'Chiara', 'Elena', 'Marta', 'Irene', 'Laura', 'Anna'];
const CAPELLI = ['#2a1a10', '#8a4a1a', '#d9a441', '#1a1a1a', '#6a4020', '#c0392b'];

// ---------- I palazzi del gioco: una palestra per cittadina (le posizioni vengono da storia.js) ----------
const LUOGHI = [
  { id: 'g1', giorno: 1, nome: 'Palazzo della Sovranità', stile: 'universita', ...posto(1, 'C'), prof: 'Prof. Sovrani',
    frase: 'Popolo, territorio, sovranità… Prima di tutto: sai dirmi cos\'è lo Stato e come è cambiato nella storia?',
    persona: { corpo: '#7a5232', gambe: '#4a3a2a', camicia: true, cravatta: '#b03030', stile: 'calvo', capelli: '#c9c9c9', barba: '#c9c9c9', occhiali: '#2a2420' } },
  { id: 'g2', giorno: 2, nome: 'Seggio elettorale', stile: 'seggio', ...posto(2, 'D'), prof: 'Prof.ssa Urna',
    frase: 'Parlamentare o presidenziale? Maggioritario o proporzionale? Vediamo se sai distinguerli.',
    persona: { corpo: '#7a4cc4', gambe: '#3a2a5a', stile: 'chignon', capelli: '#8a2a1a' } },
  { id: 'g3', giorno: 3, nome: 'Montecitorio', stile: 'montecitorio', ...posto(3, 'C'), prof: 'On. Camerini',
    frase: 'Fiducia, decreti-legge, procedimento legislativo: il Governo e il Parlamento non hanno segreti per te?',
    persona: { corpo: '#22305a', gambe: '#22305a', camicia: true, cravatta: '#1f9e4a', stile: 'corti', capelli: '#1a1a1a' } },
  { id: 'g4', giorno: 4, nome: 'Quirinale', stile: 'quirinale', ...posto(4, 'D'), prof: 'Prof. Colle',
    frase: 'Il Capo dello Stato e la Corte costituzionale: i garanti. Pronto a parlarne?',
    persona: { corpo: '#3a3a44', gambe: '#3a3a44', camicia: true, cravatta: '#1d3f99', stile: 'corti', capelli: '#f0f0f0' } },
  { id: 'g5', giorno: 5, nome: 'Archivio delle leggi', stile: 'biblioteca', ...posto(5, 'C'), prof: 'Prof.ssa Fonti',
    frase: 'Costituzione rigida, gerarchia delle fonti, riserva di legge: qui si studia sul serio.',
    persona: { corpo: '#2f8a5a', gambe: '#2a3a3a', stile: 'lunghi', capelli: '#5a3018', occhiali: '#c33333', libro: '#c0392b' } },
  { id: 'g6', giorno: 6, nome: 'Palazzo Europa', stile: 'europa', ...posto(6, 'D'), prof: 'Dott.ssa Europa',
    frase: 'Regolamenti, direttive, primato del diritto UE… e poi il bilancio. Cominciamo?',
    persona: { corpo: '#1d3f99', gambe: '#1d2a5a', camicia: true, cravatta: '#ffd23f', stile: 'lunghi', capelli: '#e8c15a' } },
  { id: 'g7', giorno: 7, nome: 'Regione', stile: 'regione', ...posto(7, 'C'), prof: 'Dott. Comuni',
    frase: 'Titolo V, autonomie locali e Pubblica Amministrazione. Sei pronto?',
    persona: { corpo: '#e07b39', gambe: '#3a3a4a', stile: 'corti', capelli: '#6a4020', barba: '#6a4020' } },
  { id: 'g8', giorno: 8, nome: 'Tribunale', stile: 'tribunale', ...posto(8, 'D'), prof: 'Avv. Libertà',
    frase: 'Diritti, libertà e giurisdizione: l\'ultimo passo prima dell\'esame.',
    persona: { corpo: '#151515', gambe: '#151515', toga: '#151515', bavaglino: true, cordoni: '#d4af37', stile: 'corti', capelli: '#8a8a8a' } },
  { id: 'esame', nome: 'Rettorato', stile: 'rettorato', x: 0, z: -PASSO * 9 - 12, prof: 'Il Professore',
    frase: 'Si accomodi. Dieci domande su tutto il programma: 5 a crocette e 5 orali. Vediamo che voto prende.',
    persona: { corpo: '#151515', gambe: '#151515', toga: '#151515', collare: '#d4af37', tocco: true, stile: 'calvo', capelli: '#ffffff', barba: '#ffffff', occhiali: '#d4af37', scala: 1.18 } },
  { id: 'casa', nome: 'Casa', stile: 'casa', ...posto(0, 'A'), prof: 'Armadio' },
  { id: 'biblio', nome: 'Biblioteca', stile: 'libreria', ...posto(0, 'B'), prof: 'La Bibliotecaria',
    persona: { corpo: '#8e5a9e', gambe: '#3a2a3a', stile: 'chignon', capelli: '#b8b8b8', occhiali: '#8a5a2b', libro: '#2f8a5a' } },
];
const LUOGO = Object.fromEntries(LUOGHI.map(l => [l.id, l]));
const zonaL = L => L.giorno || (L.id === 'esame' ? 9 : 0);   // in quale cittadina sta un palazzo

// ---------- Skin: vestiti e ambientazioni, sbloccati con i punti ----------
const SKIN_BOY = [
  { id: 'felpa', nome: 'Felpa col cappuccio', xp: 0 },
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
const TEMI = [
  { id: 'giorno', nome: 'Giornata di sole', xp: 0, emoji: '☀️', bg: 'linear-gradient(#8fd3ff, #62c34e)' },
  { id: 'tramonto', nome: 'Tramonto', xp: 200, emoji: '🌇', bg: 'linear-gradient(#ff9a6b, #7bb84a)' },
  { id: 'notte', nome: 'Notte con le lucciole', xp: 550, emoji: '🌙', bg: 'linear-gradient(#131c44, #2f6b3a)' },
  { id: 'neve', nome: 'Neve', xp: 1000, emoji: '❄️', bg: 'linear-gradient(#cfe0ef, #ffffff)' },
  { id: 'primavera', nome: 'Ciliegi in fiore', xp: 1350, emoji: '🌸', bg: 'linear-gradient(#a8e4ff, #ffb0cf)' },
  { id: 'festa', nome: 'Festa della Repubblica', xp: 1800, emoji: '🎆', bg: 'linear-gradient(90deg, #1f9e4a 33%, #fff 33% 66%, #d32f2f 66%)' },
];
const SBLOCCHI = [...SKIN_BOY.map(s => ({ ...s, tipo: 'boy' })), ...TEMI.map(s => ({ ...s, tipo: 'tema' }))]
  .filter(s => s.xp > 0).sort((a, b) => a.xp - b.xp);
const PUNTI = { orale: 10, flashcard: 5, crocette: 10 };
const LOOKS = [   // look rari: si vincono negli incontri casuali o si comprano con le monete
  { id: 'sole', tipo: 'acc', nome: 'Occhiali da sole', prezzo: 60 },
  { id: 'zaino', tipo: 'acc', nome: 'Zaino pieno di codici', prezzo: 70 },
  { id: 'cuffie', tipo: 'acc', nome: 'Cuffie da studio', prezzo: 90 },
  { id: 'alloro', tipo: 'acc', nome: 'Corona d\'alloro', prezzo: 140 },
  { id: 'laurea', tipo: 'acc', nome: 'Tocco di laurea', prezzo: 150 },
  { id: 'parrucca', tipo: 'acc', nome: 'Parrucca da giudice inglese', prezzo: 170 },
  { id: 'mantello', tipo: 'acc', nome: 'Mantello tricolore', prezzo: 200 },
  { id: 'aureola', tipo: 'acc', nome: 'Aureola del 30 e lode', prezzo: 260 },
  { id: 'biondo', tipo: 'cap', nome: 'Capelli biondi', colore: '#e8c15a', prezzo: 50 },
  { id: 'rossi', tipo: 'cap', nome: 'Capelli rossi', colore: '#c0392b', prezzo: 50 },
  { id: 'blu', tipo: 'cap', nome: 'Capelli blu', colore: '#3d7bf2', prezzo: 80 },
  { id: 'viola', tipo: 'cap', nome: 'Capelli viola', colore: '#8e44ad', prezzo: 80 },
  { id: 'rosa', tipo: 'cap', nome: 'Capelli rosa', colore: '#ff7eb6', prezzo: 80 },
  { id: 'argento', tipo: 'cap', nome: 'Capelli d\'argento', colore: '#d8d8e0', prezzo: 110 },
];
const lookAttuale = () => ({ acc: S.acc || null, capelli: (LOOKS.find(l => l.id === S.cap) || {}).colore || null, liv: evo().liv });
const INCONTRI = [
  { nome: 'Turista smarrito', peso: 1, frase: 'Scusi, lei studia legge? Ho una domanda che mi tormenta da giorni…',
    persona: { corpo: '#ff8f3f', gambe: '#e8d8b0', stile: 'corti', capelli: '#d9a441', sole: 1, zaino: 1 } },
  { nome: 'Giornalista', peso: 1, frase: 'Intervista lampo per il telegiornale! Rispondi bene e finisci in prima pagina.',
    persona: { corpo: '#c9a46a', gambe: '#3a3a4a', stile: 'lunghi', capelli: '#2a1a10', occhiali: '#2a2420' } },
  { nome: 'Studente rivale', peso: 1, frase: 'Scommettiamo che questa non la sai? Chi sbaglia paga!',
    persona: { corpo: '#d64545', gambe: '#2b3a5a', stile: 'corti', capelli: '#3d7bf2', cuffie: 1, testa: 1 } },
  { nome: 'Vigile urbano', peso: 1, frase: 'Alt! Controllo a sorpresa: rispondi giusto o è multa.',
    persona: { corpo: '#22305a', gambe: '#22305a', camicia: true, cravatta: '#22305a', stile: 'corti', capelli: '#3a2a1a', cappello: '#f4f4f4' } },
  { nome: 'Nonna saggia', peso: 1, frase: 'Ai miei tempi la Costituzione si sapeva a memoria. E tu, nipote?',
    persona: { corpo: '#8e44ad', gambe: '#5a4a5a', stile: 'chignon', capelli: '#eeeeee', occhiali: '#8a5a2b' } },
  { nome: 'Mago del Codice', peso: 0.4, raro: true, frase: 'Un viandante! Risolvi il mio enigma e avrai un dono raro… sbaglia e pagherai.',
    persona: { corpo: '#4b2a8a', gambe: '#2a1a4a', toga: '#4b2a8a', stile: 'calvo', capelli: '#ffffff', barba: '#ffffff', aureola: 1 } },
  // capipalestra erranti: più forti, premi migliori, rubano di più
  { nome: 'Prof. Cavillo', peso: 0.35, rivale: true, frase: 'Capopalestra errante. Ho bocciato mille matricole: tu sarai la prossima!',
    persona: { corpo: '#5a2a7a', gambe: '#2a1a3a', toga: '#5a2a7a', bavaglino: true, cordoni: '#d4af37', stile: 'corti', capelli: '#2a2a2a', barba: '#2a2a2a', aura: 1 } },
  { nome: 'Avv. Comma', peso: 0.35, rivale: true, frase: 'Ogni comma ha il suo tranello. Vediamo se li conosci tutti.',
    persona: { corpo: '#7a1f2b', gambe: '#2a2a2a', camicia: true, cravatta: '#d4af37', stile: 'corti', capelli: '#d8d8e0', occhiali: '#d4af37', aura: 1 } },
  { nome: 'Dott.ssa Postilla', peso: 0.35, rivale: true, frase: 'Leggo sempre le note a piè di pagina. E tu?',
    persona: { corpo: '#1f6f6a', gambe: '#2a3a3a', stile: 'chignon', capelli: '#111111', occhiali: '#c33333', libro: '#ffd23f', aura: 1 } },
];
const ARG = window.ARGOMENTI || [];
const NOMI_SCAFFALI = { r09: 'Ripasso' };
CAPS.forEach(c => { NOMI_SCAFFALI[c.id] = 'Cap. ' + parseInt(c.id.slice(1)); });
const ATTESA = [0, 1, 2, 4];   // giorni da aspettare prima del ripasso consigliato (dopo 1, 2, 3 letture)
const SPEED_N = 10, SPEED_T = 10;   // speed round: 10 domande, 10 secondi l'una

// ---------- Salvataggio ----------
const KEY = 'dp8bit-v1';   // stessa chiave della versione 8-bit: i progressi restano
const S = { xp: 0, srs: {}, boy: 'felpa', tema: 'giorno', sound: true, filtro: 'tutto', medaglie: {}, voto: 0, pos: null, aiuto: true,
  monete: 30, reddito: 0, looks: {}, acc: null, cap: null, studio: {}, speed: {}, zoom: 1.8, evo: 0, pal: {},
  nome: '', compagno: '', amico: 0, enigmi: {}, visti: { 0: true }, imparati: {}, mondo: 0 };   // mondo: versione della mappa (2 = cittadine)
const DEF = JSON.parse(JSON.stringify(S));
// Un salvataggio (anche importato da file) può contenere solo i campi noti, con il tipo giusto e senza testo libero: niente HTML iniettato
const SENZA_TESTO = v => v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'object' && Object.values(v).every(SENZA_TESTO));
const ID_OK = { boy: SKIN_BOY.map(x => x.id), tema: TEMI.map(x => x.id), acc: LOOKS.filter(l => l.tipo === 'acc').map(l => l.id), cap: LOOKS.filter(l => l.tipo === 'cap').map(l => l.id) };
function pulito(dati) {
  const out = {};
  for (const k of Object.keys(DEF)) {
    const v = dati && dati[k]; if (v === undefined || (v === null && DEF[k] !== null)) continue;
    if (k in ID_OK) { if (v === null || ID_OK[k].includes(v)) out[k] = v; }
    else if (k === 'nome' || k === 'compagno') { if (typeof v === 'string') out[k] = v.slice(0, 20); }   // testo libero: sempre esc() quando si mostra
    else if (k === 'filtro') { if (typeof v === 'string' && /^(tutto|ripasso|g\d|c\d\d)$/.test(v)) out[k] = v; }
    else if (typeof v === typeof DEF[k] || (k === 'pos' && Array.isArray(v))) { if (SENZA_TESTO(v)) out[k] = v; }
  }
  return out;
}
function load() { try { Object.assign(S, pulito(JSON.parse(localStorage.getItem(KEY)))); } catch (e) { /* senza storage si gioca senza salvare */ } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
const salvaPos = () => { if (M.ok) { S.pos = M.posizione(); save(); } };

// ---------- Scelta delle domande (ripetizione spaziata semplice: box 0-4) ----------
function pool(tipo) {
  let qs = D.filter(q => q.tipo === tipo);
  const f = S.filtro;
  if (f === 'ripasso') qs = qs.filter(q => S.srs[q.id] && S.srs[q.id].b === 0);
  else if (/^g\d$/.test(f)) qs = qs.filter(q => q.giorno === +f[1]);
  else if (/^c\d\d$/.test(f)) qs = qs.filter(q => q.id.startsWith(f));
  return qs;
}
function peso(q) { const r = S.srs[q.id]; return r ? [8, 4, 2, 1, 1][r.b] : 5; }  // le sbagliate (box 0) tornano più spesso
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
  while (S.evo < EVO.length - 1 && S.xp >= EVO[S.evo + 1].xp) { S.evo++; evoluzione(); }   // non si torna indietro
  aggiornaHUD();
}
function evoluzione() {
  const e = evo(); save(); M.vestito(S.boy, lookAttuale()); M.vittoria(); suona('unlock');
  const url = M.anteprima(S.boy, lookAttuale());
  finestra('✨ Evoluzione!', `${url ? `<img src="${url}" alt="">` : ''}Sei diventato <b>${e.nome}</b> (Lv.${e.liv})!<br>
    ❤️ ${e.hp} punti vita · ✂️ ${e.aiuti} aiuti 50/50 · 💖 ${e.vite} seconde vite${e.critico ? '<br>💥 Colpo critico: il primo colpo vale doppio' : ''}`);
}
const sbloccato = s => S.xp >= s.xp;

// ---------- Suoni 8-bit ----------
let AC;
const SND = { ok: [[660, .08], [880, .14]], ko: [[220, .14], [165, .22]], unlock: [[523, .1], [659, .1], [784, .1], [1047, .3]], tap: [[520, .03]],
  vittoria: [[523, .1], [659, .1], [784, .1], [1047, .12], [784, .08], [1047, .35]], evento: [[988, .06], [1319, .06], [988, .06], [1568, .18]],
  moneta: [[988, .05], [1319, .16]] };
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

// ---------- Utilità interfaccia ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const mescola = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const foglio = $('#foglio');
let sess = null, vicinoId = null;

function aggiornaHUD() {
  $('#xp').textContent = S.xp;
  $('#med').textContent = LUOGHI.filter(l => l.giorno && S.medaglie[l.id]).length;
  $('#monete').textContent = S.monete;
  const prox = SBLOCCHI.find(s => !sbloccato(s)), e = evo();
  $('#liv').textContent = `Lv.${e.liv} ${e.nome} · ` + (prox ? `Prossimo: ${prox.nome} a ${prox.xp} ⭐` : 'Tutto sbloccato!');
}
function apri(html, alto) {
  foglio.innerHTML = html; foglio.hidden = false; foglio.classList.toggle('alto', alto === true); foglio.classList.toggle('medio', alto === 'medio'); foglio.scrollTop = 0;
  $('#azione').hidden = true; $('#aiuto').hidden = true; spazio();
}
function chiudi() {
  foglio.hidden = true; sess = null; $('#duello').hidden = true;
  M.imposta('esplora'); spazio(); salvaPos();
  if (!M.ok) return menu();   // senza 3D si naviga solo dal menu
  mostraAzione(vicinoId);
}
function spazio() {
  const du = $('#duello');
  M.spazioPannello(foglio.hidden ? 0 : foglio.getBoundingClientRect().height, du.hidden ? 0 : du.getBoundingClientRect().bottom);
}
if (window.ResizeObserver) new ResizeObserver(spazio).observe(foglio);
function mostraAzione(id) {
  vicinoId = id;
  const b = $('#azione');
  if (!id || !foglio.hidden) { b.hidden = true; return; }
  const L = LUOGO[id], P = palAtt && gentePalestra(LUOGO[palAtt]).find(p => p.id === id), mon = monumento(id);
  if (/^varco-\d$/.test(id) && varcoAperto(+id.slice(6))) { b.hidden = true; return; }
  b.textContent = mon ? `💡 ${mon.nome}: ${S.compagno || 'il compagno'} ti spiega` : /^varco-/.test(id) ? `🔒 Varco ${+id.slice(6) + 1}: cosa serve?`
    : /^leva-/.test(id) ? `🎚 Leggi la leva ${+id.split('-')[2] + 1}` : /^sportello-/.test(id) ? `🗂 ${ENIGMI[+id.slice(10)].titolo}`
    : id === 'evento' ? (incontro && incontro.tipo.lezione ? `💡 ${incontro.tipo.nome} vuole dirti una cosa` : `⚔️ ${incontro ? incontro.tipo.nome : '…'} ti sfida!`) : id === 'casa' ? '👕 Apri l\'armadio' : id === 'biblio' ? '📚 Entra in biblioteca'
    : id === 'esame' ? '📝 Parla con Il Professore' : id === 'pal-uscita' ? '🚪 Esci dalla palestra' : id === 'pal-capo' ? `👑 Sfida ${P.nome}`
    : P ? `⚔️ Lotta con ${P.nome}` : `🥊 Palestra di ${L.prof}`;
  b.hidden = false;
}
function teletrasporta(id) { palAtt = null; M.teletrasporta(id); segni(); }

// ---------- Parlare con un prof ----------
function parla(id) {
  if (id === 'casa') return armadio();
  if (id === 'biblio') return entraBiblioteca();
  if (id === 'evento') return parlaIncontro();
  if (id === 'pal-uscita') return esciPalestra();
  if (id === 'pal-capo') return parlaCapo();
  if (/^pal-a\d$/.test(id)) return parlaAllenatore(+id.slice(-1) - 1);
  if (monumento(id)) return lezione(id);
  if (/^varco-/.test(id)) return parlaVarco(+id.slice(6));
  if (/^leva-/.test(id)) { const [, k, i] = id.split('-'); return parlaLeva(+k, +i); }
  if (/^sportello-/.test(id)) return sportello(+id.slice(10));
  const L = LUOGO[id]; suona('tap'); M.guarda(id); salvaPos();
  const testa = `<div class="chi">${esc(L.prof)} <small>· ${esc(L.nome)}${L.giorno ? ' · ' + esc(CITTA[L.giorno].nome) : ''}</small></div><div class="fumetto">${esc(L.frase)}</div>`;
  if (id === 'esame') {
    apri(`${testa}<div class="info">Miglior voto: <b>${S.voto ? (S.voto > 30 ? '30 e lode' : S.voto + '/30') : '—'}</b> · Medaglie: ${$('#med').textContent}/8</div>
      <button class="giallo" id="b-via">📝 Inizia l'esame</button><button class="grigio" id="b-no">Più tardi</button>`);
    $('#b-via').onclick = avviaSim;
  } else {
    const caps = CAPS.filter(c => c.giorno === L.giorno), p = statoPal(id), G2 = gentePalestra(L);
    apri(`${testa}<div class="info">📚 ${caps.map(c => esc(c.titolo)).join('<br>📚 ')}</div>
      <div class="card">🥊 <b>Palestra di ${esc(CITTA[L.giorno].nome)}</b><br>${[0, 1].map(k => `${p.rip[k] ? '⚠️' : p.v[k] ? '✅' : '⬜'} ${esc(G2[k].nome)}`).join('<br>')}
        <br>${S.medaglie[id] ? '🏅' : '👑'} ${esc(L.prof)} <small>(capopalestra: sfida perfetta)</small></div>
      ${p.rip.some(Boolean) ? '<div class="card posta">⚠️ Un allenatore di questa palestra ha la tua domanda rubata: battilo di nuovo senza errori per riprenderla.</div>' : ''}
      <button class="giallo" id="b-via">🚪 Entra in palestra</button><button class="grigio" id="b-no">Più tardi</button>`);
    $('#b-via').onclick = () => entraPalestra(id);
  }
  $('#b-no').onclick = chiudi;
}

// ---------- Palestre: 2 allenatori (3 domande fisse ciascuno) e il capopalestra (5 domande, senza errori) ----------
let palAtt = null;   // palestra in cui ti trovi
const statoPal = id => S.pal[id] || (S.pal[id] = { v: [false, false], rip: [0, 0] });   // v = battuto · rip = ⭐ rubate che tiene in ostaggio
function gentePalestra(L) {
  const i = L.giorno;
  return [
    { id: 'pal-a1', nome: `Tutor ${TUTOR[i - 1]}`, persona: { corpo: L.persona.corpo, gambe: '#2b3a5a', stile: 'corti', capelli: CAPELLI[i % 6] } },
    { id: 'pal-a2', nome: `Dott.ssa ${DOTT[i - 1]}`, persona: { corpo: L.persona.corpo, gambe: '#3a3a4a', stile: 'lunghi', capelli: CAPELLI[(i + 3) % 6], occhiali: '#2a2420', libro: '#c0392b' } },
    { id: 'pal-capo', nome: L.prof, persona: { ...L.persona, scala: 1.15 } },
    { id: 'pal-uscita', nome: 'Uscita', segno: 'uscita' },
  ];
}
function segni() {
  const st = {};
  for (const L of LUOGHI) if (L.giorno) { const p = S.pal[L.id]; st[L.id] = p && p.rip.some(Boolean) ? 'allarme' : S.medaglie[L.id] ? 'medaglia' : 'sfida'; }
  if (palAtt) {
    const p = statoPal(palAtt); [0, 1].forEach(k => { st['pal-a' + (k + 1)] = p.rip[k] ? 'allarme' : p.v[k] ? 'fatto' : 'sfida'; });
    st['pal-capo'] = S.medaglie[palAtt] ? 'medaglia' : p.v[0] && p.v[1] ? 'sfida' : 'chiuso';
  }
  M.segni(st);
}
function mescolaSeme(a, seme) { a = [...a]; let s = seme; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function setAllenatore(giorno, k) {   // sempre le stesse 3 domande: così la rivincita è sulla stessa "squadra"
  const base = mescolaSeme(D.filter(q => q.giorno === giorno && !q.difficile && (q.tipo === 'crocette' || q.tipo === 'flashcard')), giorno * 7919 + 1);
  return base.slice(k * 3, k * 3 + 3).map((q, i) => q.tipo === 'crocette' ? q : mcDaFlashcard(q, i % 2 ? 'term' : 'def'));
}
let toastT;
function toast(html, ms = 4500) { const t = $('#toast'); t.innerHTML = html; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms); }
function entraPalestra(id) {
  suona('tap'); sess = null; salvaPos(); palAtt = id;
  M.palestra(LUOGO[id], gentePalestra(LUOGO[id])); segni();
  foglio.hidden = true; $('#duello').hidden = true; spazio(); mostraAzione(null);
  if (!M.ok) return pannelloPalestra();
  toast(`🥊 <b>Palestra di ${esc(LUOGO[id].prof)}</b><br>Batti i 2 allenatori, poi il capopalestra: 5 domande senza errori per la medaglia.`);
}
function pannelloPalestra() {   // senza 3D: la palestra è un elenco
  const G2 = gentePalestra(LUOGO[palAtt]);
  apri(`<h2>🥊 Palestra</h2>${G2.map(p => `<button data-p="${p.id}" class="${p.id === 'pal-uscita' ? 'grigio' : ''}">${esc(p.nome)}</button>`).join('')}`);
  document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => parla(b.dataset.p));
}
function esciPalestra() { palAtt = null; M.esciPalestra(); segni(); $('#toast').hidden = true; chiudi(); }
function parlaAllenatore(k) {
  const L = LUOGO[palAtt], p = statoPal(palAtt), A = gentePalestra(L)[k], riv = p.rip[k] > 0;
  suona('tap'); M.guarda(A.id);
  apri(`<div class="chi">${esc(A.nome)} <small>· allenatore · ${esc(CITTA[L.giorno].nome)}</small></div>
    <div class="fumetto">${riv ? 'Ehi! Ce l\'ho io la domanda che hai perso. Rispondi giusto a tutte e 3 le mie domande e te la ridò… ma quale fosse non te lo dico 😏'
      : p.v[k] ? 'Ancora tu? Va bene, ripassiamo!' : k ? 'Il capopalestra è il prossimo… se riesci a battermi.' : 'Per arrivare al capopalestra devi passare da me!'}</div>
    <div class="info">${riv ? `🙈 <b>Rivincita alla cieca</b>: 3 domande, nessun aiuto e nessun indizio fino alla fine. Tutte giuste = <b>+${p.rip[k]} ⭐</b> restituite.`
      : `${HP_ALL} domande a crocette da vincere. Tu hai ❤️ ${evo().hp} punti vita${evo().aiuti ? ` e ✂️ ${evo().aiuti} aiuti 50/50` : ''}.`}</div>
    <button class="giallo" id="b-via">⚔️ Lotta!</button><button class="grigio" id="b-no">Più tardi</button>`);
  $('#b-via').onclick = () => lottaAllenatore(k); $('#b-no').onclick = chiudi;
}
function lottaAllenatore(k) {
  const id = palAtt, L = LUOGO[id], p = statoPal(id), A = gentePalestra(L)[k], riv = p.rip[k] > 0;
  avviaLotta({ npc: A.id, nome: A.nome, ruolo: riv ? 'Rivincita' : 'Allenatore', hp: HP_ALL, lista: setAllenatore(L.giorno, k), cieco: riv,
    fine: (vinta, s) => {
      let msg = '';
      if (vinta) {
        const prima = !p.v[k]; p.v[k] = true;
        if (riv) { const x = p.rip[k]; p.rip[k] = 0; save(); aggiungiXP(x); msg = `🔓 Domanda ripresa! Ti restituisce <b>+${x} ⭐</b>.`; }
        else { save(); aggiungiXP(prima ? 15 : 5); msg = prima ? '<b>+15 ⭐</b> · un passo più vicino al capopalestra!' : 'Ripasso fatto: <b>+5 ⭐</b>'; }
      }
      segni();
      apri(`<div class="big">${vinta ? '🎉' : '😵'}</div><h2 style="text-align:center">${vinta ? `${esc(A.nome)} è KO!` : 'Sei KO…'}</h2>
        <div class="info" style="text-align:center">${vinta ? msg : riv ? `Hai fatto ${s.giuste}/${s.risultati.length}: almeno una era sbagliata… ma non ti dico quale. Ripassa il capitolo e ritenta!` : 'Le domande sbagliate torneranno più spesso. Riprova!'}</div>
        ${riv ? '' : listaErrori(s.risultati.filter(r => !r.ok))}
        <button class="giallo" id="b-ok">Continua</button>${vinta ? '' : '<button class="rosso" id="b-ri">⚔️ Riprova</button>'}`);
      $('#b-ok').onclick = chiudi; if ($('#b-ri')) $('#b-ri').onclick = () => lottaAllenatore(k);
    } });
}
function parlaCapo() {
  const L = LUOGO[palAtt], p = statoPal(palAtt), G2 = gentePalestra(L), e = evo();
  suona('tap'); M.guarda('pal-capo');
  if (!(p.v[0] && p.v[1])) {
    apri(`<div class="chi">${esc(L.prof)} <small>· capopalestra</small></div><div class="fumetto">Prima batti i miei due allenatori, poi ne riparliamo.</div>
      <div class="info">${[0, 1].map(k => `${p.rip[k] ? '⚠️ ha una tua domanda rubata' : p.v[k] ? '✅ battuto' : '⬜ da battere'}: ${esc(G2[k].nome)}`).join('<br>')}</div>
      <button class="giallo" id="b-no">Ok</button>`);
    $('#b-no').onclick = chiudi; return;
  }
  apri(`<div class="chi">${esc(L.prof)} <small>· capopalestra · ${esc(CITTA[L.giorno].nome)}</small></div><div class="fumetto">${esc(L.frase)}</div>
    <div class="info">👑 <b>Sfida perfetta</b>: ${HP_CAPO} domande difficili, cioè crocette da esperto, concetti da riconoscere tra simili e domande d'esame in cui devi dire <b>tutti</b> i punti chiave. Un errore e sei KO${e.vite ? ` — ma hai 💖 ${e.vite} seconde vite` : ''}.
      ${S.medaglie[palAtt] ? '<br>🏅 Medaglia già vinta: rigioca per ripassare.' : ''}</div>
    <button class="giallo" id="b-via">⚔️ Sfida il capopalestra</button><button class="grigio" id="b-no">Più tardi</button>`);
  $('#b-via').onclick = lottaCapo; $('#b-no').onclick = chiudi;
}
function lottaCapo() {
  const L = LUOGO[palAtt];
  avviaLotta({ npc: 'pal-capo', nome: L.prof, ruolo: 'Capopalestra', hp: HP_CAPO, perfetto: true, giorni: [L.giorno], capo: true,
    fine: (vinta, s) => {
      const errori = listaErrori(s.risultati.filter(r => !r.ok));
      if (vinta) {
        const prima = !S.medaglie[L.id]; S.medaglie[L.id] = true; save(); segni(); aggiungiXP(prima ? 50 : 15);
        apri(`<div class="big">🏅</div><h2 style="text-align:center">${esc(L.prof)} è KO!</h2>
          <div class="info" style="text-align:center">${prima ? `Medaglia di ${esc(CITTA[L.giorno].nome)} conquistata! +50 ⭐` : 'Sfida vinta di nuovo: +15 ⭐'}</div>
          <button class="viola" id="b-speed">⚡ Speed round finale: 10 domande, punti extra!</button>
          ${errori}<button class="giallo" id="b-ok">Continua</button><button class="grigio" id="b-ri">⚔️ Rigioca</button>`);
      } else {
        apri(`<div class="big">😵</div><h2 style="text-align:center">${esc(L.prof)} ha vinto…</h2>
          <div class="info" style="text-align:center">Il capopalestra vuole una sfida perfetta. Rileggi qui sotto e riprova: le sbagliate torneranno più spesso.</div>
          ${errori}<button class="giallo" id="b-ri">⚔️ Riprova</button><button class="viola" id="b-speed">⚡ Speed round per rifarti</button><button class="grigio" id="b-ok">Continua</button>`);
      }
      $('#b-ok').onclick = chiudi; $('#b-ri').onclick = lottaCapo;
      $('#b-speed').onclick = () => avviaSpeed(CITTA[L.giorno].nome, q => q.giorno === L.giorno, L.id, chiudi);
    } });
}

// ---------- Lotta stile Pokémon: ogni domanda è un attacco ----------
function avviaLotta(o) {
  const e = evo(), aiuto = !o.cieco, mioMax = o.perfetto ? 1 : e.hp;
  sess = { lotta: o, hp: o.hp, mio: mioMax, mioMax, vite: aiuto ? e.vite : 0, aiuti: aiuto ? e.aiuti : 0, critico: aiuto && !!e.critico,
    k: 0, n: 0, giuste: 0, risultati: [], usate: new Set(), lista: o.lista && mescola(o.lista) };
  M.imposta('duello', o.npc); suona('evento'); prossima();
}
function domandaCapo(s) {   // più difficile: crocette da esperto, domande d'esame con TUTTI i punti chiave, concetti da riconoscere tra simili
  const g = s.lotta.giorni[0], pool = D.filter(q => q.giorno === g && !s.usate.has(q.id));
  const turno = ['x', 'o', 't', 'o', 'x', 't', 'o', 'x'][s.n % 8];
  const esperte = pool.filter(q => q.difficile), orali = pool.filter(q => q.tipo === 'orale' && q.punti_chiave), fc = pool.filter(q => q.tipo === 'flashcard');
  const deboli = pool.filter(q => q.tipo === 'crocette' && !q.difficile).sort((a, b) => ((S.srs[a.id] || {}).b || 0) - ((S.srs[b.id] || {}).b || 0));
  if (turno === 'x' && esperte.length) return pesca(esperte);
  if (turno === 'o' && orali.length) return pesca(orali);
  if ((turno === 't' || !deboli.length) && fc.length) return mcDaFlashcard(pesca(fc), 'term');
  if (deboli.length) return deboli[0];   // la crocetta che sai peggio
  return orali.length ? pesca(orali) : domandaLotta(s);
}
function domandaLotta(s) {
  const o = s.lotta, pool = D.filter(q => o.giorni.includes(q.giorno) && !s.usate.has(q.id)), r = Math.random();
  if (o.orali && r < 0.35) { const x = pool.filter(q => q.tipo === 'orale'); if (x.length) return pesca(x); }
  if (r < 0.7) { const x = pool.filter(q => q.tipo === 'crocette'); if (x.length) return pesca(x); }
  const f = pool.filter(q => q.tipo === 'flashcard');
  if (f.length) return mcDaFlashcard(pesca(f), Math.random() < 0.5 ? 'def' : 'term');
  return pesca(D.filter(q => o.giorni.includes(q.giorno) && q.tipo === 'crocette'));
}
function fineLotta(ritirata) {
  const s = sess; sess = null; $('#duello').hidden = true;
  const vinta = !ritirata && (s.lotta.cieco ? s.risultati.length >= s.lista.length && s.risultati.every(r => r.ok) : s.hp <= 0);
  if (vinta) { M.vittoria(); suona('vittoria'); } else { M.sconfitta(); suona('ko'); }
  s.lotta.fine(vinta, s);
}
function barraDuello() {
  const s = sess, d = $('#duello');
  if (!s || !(s.lotta || s.sim)) { d.hidden = true; return; }
  const prima = d.hidden; d.hidden = false;
  if (prima) requestAnimationFrame(spazio);
  if (s.lotta) {
    const o = s.lotta, e = evo(), pct = (a, b) => Math.max(0, Math.round(a / b * 100)), col = p => p > 50 ? '' : p > 20 ? 'med' : 'low';
    const riga = (nome, sotto, p, num) => `<div class="pk"><span class="nome"><b>${esc(nome)}</b><small>${sotto}</small></span>${p === null ? '<span class="fill"></span>'
      : `<div class="hp"><i class="${col(p)}" style="width:${p}%"></i></div>`}<span class="num">${num}</span></div>`;
    d.innerHTML = o.cieco ? riga(o.nome, '🙈 rivincita alla cieca', null, `domanda ${Math.min(s.k, s.lista.length)}/${s.lista.length}`)
      : riga(o.nome, esc(o.ruolo), pct(s.hp, o.hp), `${s.hp}/${o.hp}`) + riga(S.nome || 'Tu', `Lv.${e.liv} ${esc(e.nome)}`, pct(s.mio, s.mioMax), `${s.mio}/${s.mioMax}${s.vite ? ` 💖${s.vite}` : ''}`)
        + (s.msg ? `<div class="msg">${s.msg}</div>` : '');
  } else {
    d.innerHTML = `<div class="drow"><b>Il Professore</b><span class="fill"></span><span class="tacche esame">${s.lista.map((q, i) =>
        `<i class="${i < s.risultati.length ? (s.risultati[i].ok ? 'on' : 'ko') : ''}"></i>`).join('')}</span></div>
      <div class="drow"><b>Esame finale</b><span class="fill"></span><span>${s.giuste} giuste</span></div>`;
  }
}
function listaErrori(errori) {
  return errori.length ? '<h3>Da rivedere</h3>' + errori.map(r => `<div class="card"><div class="cap">${esc(r.q.capitolo)}</div><div class="dom">${esc(r.q.domanda)}</div>
    <div class="risp">${r.q.tipo === 'crocette' ? '✔ ' + esc(r.q.opzioni[r.q.corretta]) + '<br>' : ''}${md(r.q.risposta)}</div></div>`).join('') : '';
}

// ---------- Domande: duello, esame e studio rapido usano lo stesso schermo ----------
function avvia(tipo) {
  if (!pool(tipo).length) {
    apri(`<div class="card">Nessuna domanda di questo tipo per l'argomento scelto${S.filtro === 'ripasso' ? ': non hai errori da ripassare! 🎉' : '.'}</div><button id="b-ok">◀ Indietro</button>`);
    $('#b-ok').onclick = menu; return;
  }
  M.imposta('ritratto'); sess = { tipo, n: 0, giuste: 0 }; prossima();
}
function prossima() {
  const s = sess;
  if (s.sim) { if (s.i >= s.lista.length) return fineSim(); s.q = s.lista[s.i]; }
  else if (s.lotta) {
    if (s.lotta.cieco ? s.k >= s.lista.length : s.hp <= 0 || s.mio <= 0) return fineLotta();
    s.q = s.lista ? s.lista[s.k++ % s.lista.length] : s.lotta.capo ? domandaCapo(s) : domandaLotta(s); s.usate.add(s.q.base || s.q.id);
  }
  else s.q = pesca(pool(s.tipo), s.q && s.q.id);
  s.fase = 0; s.tolte = null; s.hint = ''; s.spunte = new Set(); if (s.q.tipo === 'crocette') s.ordine = mescola([0, 1, 2, 3]);
  barraDuello(); disegnaDomanda(); if (s.lotta) s.msg = '';
}
function disegnaDomanda() {
  const s = sess, q = s.q, o = s.lotta, cieco = o && o.cieco;
  const cont = s.sim ? `Domanda ${s.i + 1} di ${s.lista.length}` : o ? (cieco ? '🙈 nessun indizio' : `⚔️ ${esc(o.nome)} attacca!`) : `${s.n} risposte · ${s.giuste} giuste`;
  let h = `<div class="barra-top"><button class="grigio" id="b-fine">${o ? (o.evento ? '🏃 Scappa' : '🏳 Ritirati') : '◀ Fine'}</button><div class="info">${cont}</div></div>`;
  const cap = `<div class="cap">${esc(q.capitolo)}</div>`, risp = s.fase && !cieco ? `<div class="risp">${md(q.risposta)}</div>` : '';
  const pul = t => esc(String(t).replace(/\*\*/g, ''));
  if (q.tipo === 'flashcard') {
    h += `<div class="card flip" id="carta">${cap}<div class="dom">${esc(q.domanda)}</div>${s.fase ? risp : '<div class="hint">👆 tocca la carta per girarla</div>'}</div>`;
  } else h += `<div class="card">${cap}<div class="dom">${esc(q.domanda)}</div>${risp}</div>`;
  if (q.tipo === 'crocette') {
    h += s.ordine.map(i => {
      const via = s.tolte && s.tolte.includes(i);
      const cls = !s.fase ? (via ? 'spenta' : '') : cieco ? (i === s.scelta ? 'scelta' : 'spenta') : i === q.corretta ? 'giusta' : i === s.scelta ? 'sbagliata' : 'spenta';
      return `<button class="opz ${cls}" data-i="${i}" ${s.fase || via ? 'disabled' : ''}>${pul(q.opzioni[i])}</button>`;
    }).join('');
    if (!s.fase && s.hint) h += `<div class="info">💬 ${s.hint}</div>`;
    if (!s.fase && o && s.aiuti > 0 && (s.tolte || []).length < 2) h += `<button class="viola" id="b-5050">✂️ Aiuto 50/50 <small>(ne hai ${s.aiuti})</small></button>`;
    if (!s.fase && o && !cieco && S.compagno && !s.chiesto && (s.tolte || []).length < 2) h += `<button class="grigio" id="b-chiedi">💬 Chiedi a ${amico()} <small>(una volta per lotta)</small></button>`;
    if (s.fase) h += `<button class="giallo" id="b-avanti">Avanti ▶</button>`;
  } else if (!s.fase) {
    if (q.tipo === 'orale') h += `<div class="info">Rispondi ad alta voce o nella tua testa, poi controlla.</div><button class="giallo" id="b-mostra">Mostra risposta</button>`;
  } else {
    if (o && o.capo && q.tipo === 'orale' && q.punti_chiave) {   // il capopalestra vuole TUTTI i punti chiave
      h += `<div class="info">👑 Il capopalestra vuole sentire <b>tutti</b> i punti chiave. Tocca quelli che hai detto:</div>`
        + q.punti_chiave.map((p, i) => `<button class="punto ${s.spunte.has(i) ? 'on' : ''}" data-p="${i}">${s.spunte.has(i) ? '✅' : '⬜'} ${md(p)}</button>`).join('')
        + `<div class="riga"><button class="rosso" id="b-no">✘ Non la sapevo</button><button class="verde" id="b-punti">✔ Conferma ${s.spunte.size}/${q.punti_chiave.length}</button></div>`;
    } else h += `<div class="riga"><button class="rosso" id="b-no">✘ Non la sapevo</button><button class="verde" id="b-si">✔ La sapevo</button></div>`;
  }
  apri(h);
  $('#b-fine').onclick = () => s.sim ? fineSim() : o ? fineLotta(true) : riepilogo();
  const gira = () => { s.fase = 1; suona('tap'); disegnaDomanda(); };
  if ($('#carta') && !s.fase) $('#carta').onclick = gira;
  if ($('#b-mostra')) $('#b-mostra').onclick = gira;
  if ($('#b-si')) $('#b-si').onclick = () => esito(true);
  if ($('#b-no')) $('#b-no').onclick = () => esito(false);
  if ($('#b-punti')) $('#b-punti').onclick = () => esito(s.spunte.size === q.punti_chiave.length);
  document.querySelectorAll('.punto').forEach(b => b.onclick = () => { const i = +b.dataset.p, st = foglio.scrollTop;
    s.spunte.has(i) ? s.spunte.delete(i) : s.spunte.add(i); suona('tap'); disegnaDomanda(); foglio.scrollTop = st; });
  if ($('#b-chiedi')) $('#b-chiedi').onclick = () => {   // il compagno ti toglie una risposta sbagliata
    s.chiesto = true; const via = [0, 1, 2, 3].filter(i => i !== q.corretta && !(s.tolte || []).includes(i));
    s.tolte = [...(s.tolte || []), via[Math.floor(Math.random() * via.length)]]; s.hint = `${amico()}: «Questa no, ne sono sicuro!»`; M.amicoReagisce('punta'); suona('tap'); disegnaDomanda(); };
  if ($('#b-5050')) $('#b-5050').onclick = () => { s.aiuti--; const t = s.tolte || []; s.tolte = [...t, ...mescola([0, 1, 2, 3].filter(i => i !== q.corretta && !t.includes(i))).slice(0, 2 - t.length)]; suona('tap'); disegnaDomanda(); };
  document.querySelectorAll('.opz').forEach(b => b.onclick = () => { s.scelta = +b.dataset.i; s.fase = 1; esito(s.scelta === q.corretta, true); });
  if ($('#b-avanti')) $('#b-avanti').onclick = avanti;
}
function esito(ok, resta) {
  const s = sess, o = s.lotta; s.n++; if (ok) s.giuste++;
  if (s.sim || o) s.risultati.push({ q: s.q, ok });
  if (o && !o.cieco) {
    if (ok) { const doppio = s.critico && !s.critUsato; if (doppio) { s.critUsato = true; s.msg = '💥 Colpo critico: danno doppio!'; } s.hp = Math.max(0, s.hp - (doppio ? 2 : 1)); }
    else { s.mio--; if (s.mio <= 0 && s.vite > 0) { s.vite--; s.mio = 1; s.msg = '💖 Seconda vita! Sei ancora in piedi.'; } }
  }
  if (!s.q.gen) rispondi(s.q, ok);
  if (o && !o.cieco) M.amicoReagisce(ok ? 'felice' : 'triste');
  if (o && o.cieco) suona('tap'); else { M.reazione(ok); suona(ok ? 'ok' : 'ko'); }
  barraDuello();
  if (resta) { disegnaDomanda(); foglio.scrollTop = foglio.scrollHeight; } else avanti();
}
function avanti() { if (sess.sim) sess.i++; prossima(); }
function riepilogo() {
  const s = sess; sess = null;
  apri(`<h2>Fine sessione</h2><div class="card">Hai risposto a <b>${s.n}</b> domande, <b>${s.giuste}</b> giuste.<br>Da ripassare in totale: <b>${daRipassare()}</b>.</div>
    <button class="giallo" id="b-ok">Torna in città</button><button class="grigio" id="b-menu2">☰ Menu</button>`);
  $('#b-ok').onclick = chiudi; $('#b-menu2').onclick = menu;
}

// ---------- Esame finale: 5 crocette + 5 domande d'esame da 10 capitoli diversi ----------
function creaSim() {
  const caps = mescola(CAPS.map(c => c.id)).slice(0, 10);
  return mescola(caps.map((c, i) => mescola(D.filter(q => q.tipo === (i < 5 ? 'crocette' : 'orale') && q.id.startsWith(c)))[0]));
}
function avviaSim() {
  teletrasporta('esame'); M.imposta('duello', 'esame');
  sess = { sim: true, lista: creaSim(), i: 0, n: 0, giuste: 0, risultati: [] }; prossima();
}
function votoDa(giuste, tot) { return giuste === tot ? '30 e lode' : String(Math.round(giuste / tot * 30)); }
function fineSim() {
  const s = sess; sess = null; $('#duello').hidden = true;
  const tot = s.lista.length, v = votoDa(s.giuste, tot), num = v === '30 e lode' ? 31 : parseInt(v);
  if (num > S.voto) { S.voto = num; save(); }
  if (num >= 18) { aggiungiXP(Math.min(30, num)); M.vittoria(); suona('vittoria'); } else { M.sconfitta(); suona('ko'); }
  apri(`<h2 style="text-align:center">Esito dell'esame</h2><div class="voto">${v}${num > 30 ? '' : '/30'}</div>
    <div class="info" style="text-align:center">${s.giuste} su ${tot} giuste · ${num >= 18 ? `Superato! +${Math.min(30, num)} ⭐` : 'Non superato: ripassa e ritenta, ce la fai!'}</div>
    ${listaErrori(s.risultati.filter(r => !r.ok))}
    <button class="giallo" id="b-ok">Torna in città</button><button class="grigio" id="b-ri">📝 Rifai l'esame</button>`);
  $('#b-ok').onclick = chiudi; $('#b-ri').onclick = avviaSim;
}

// ---------- Menu ----------
function menu() {
  suona('tap'); sess = null; $('#duello').hidden = true; M.imposta('esplora');
  const opz = [['tutto', 'Tutti gli argomenti'], ['ripasso', `Da ripassare (${daRipassare()})`],
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(g => ['g' + g, `🥊 ${CITTA[g].nome}`]), ...CAPS.map(c => [c.id, c.titolo])];
  const icona = L => L.id === 'biblio' ? '📚' : L.id === 'casa' ? '🏠' : L.id === 'esame' ? '📝' : S.medaglie[L.id] ? '🏅' : '⚔️';
  apri(`<div class="testa"><h2>Menu</h2>${M.ok ? '<button class="grigio x" id="b-x">✖</button>' : ''}</div>
    <h3>⚡ Studio rapido</h3>
    <select id="filtro" aria-label="Argomento">${opz.map(([v, t]) => `<option value="${v}" ${S.filtro === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
    <div class="griglia2"><button data-mod="orale">🎓 Domande</button><button data-mod="flashcard">🃏 Flashcard</button>
      <button class="viola" data-mod="crocette">✅ Crocette</button><button class="giallo" data-mod="sim">📝 Esame</button></div>
    <button class="viola" id="b-speed">⚡ Speed round: 10 domande a tempo</button>
    <button class="verde" id="b-biblio">📚 Biblioteca: tutti gli argomenti (${ARG.filter(a => nStudio(a) > 0).length}/${ARG.length})</button>
    ${M.ok ? `<h3>🗺 Vai da… <small>(solo dove sei già stato)</small></h3>` : '<h3>Sfide</h3>'}
    ${LUOGHI.filter(L => !M.ok || S.visti[zonaL(L)]).map(L => `<button class="vai ${L.id === 'esame' ? 'giallo' : L.id === 'casa' || L.id === 'biblio' ? 'grigio' : S.medaglie[L.id] ? 'verde' : ''}" data-vai="${L.id}">${icona(L)} ${L.giorno ? `${esc(CITTA[L.giorno].nome)} · ${esc(L.prof)}` : esc(L.prof)}
      <small>${esc(L.nome)}${L.giorno ? ' · ' + CAPS.filter(c => c.giorno === L.giorno).map(c => esc(c.titolo.replace(/^Cap\. \d+ – /, ''))).join(', ') : ''}</small></button>`).join('')}
    <div class="riga"><button class="grigio" id="b-arm">👕 Armadio</button><button class="grigio" id="b-prog">📊 Progressi</button></div>
    <button class="grigio" id="b-snd">${S.sound ? '🔊 Suono: sì' : '🔇 Suono: no'}</button>`, true);
  if ($('#b-x')) $('#b-x').onclick = chiudi;
  $('#filtro').onchange = e => { S.filtro = e.target.value; save(); };
  document.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => { suona('tap'); b.dataset.mod === 'sim' ? avviaSim() : avvia(b.dataset.mod); });
  document.querySelectorAll('[data-vai]').forEach(b => b.onclick = () => { const id = b.dataset.vai; foglio.hidden = true; teletrasporta(id); parla(id); });
  $('#b-arm').onclick = armadio; $('#b-prog').onclick = progressi;
  $('#b-biblio').onclick = () => { foglio.hidden = true; teletrasporta('biblio'); entraBiblioteca(); };
  $('#b-speed').onclick = () => { const f = S.filtro, g = /^g\d$/.test(f) ? +f[1] : 0;
    avviaSpeed(f === 'tutto' || f === 'ripasso' ? 'Tutto il programma' : g ? CITTA[g].nome : CAPS.find(c => c.id === f).titolo,
      q => f === 'tutto' || f === 'ripasso' || (g ? q.giorno === g : q.id.startsWith(f)), f, chiudi); };
  $('#b-snd').onclick = () => { S.sound = !S.sound; save(); suona('tap'); $('#b-snd').textContent = S.sound ? '🔊 Suono: sì' : '🔇 Suono: no'; };
}

// ---------- Armadio ----------
function anteprima(s) {
  if (s.tipo === 'tema') return `<div class="prev" style="background:${s.bg}">${s.emoji}</div>`;
  const url = M.anteprima(s.id, lookAttuale());
  return `<div class="prev">${url ? `<img src="${url}" alt="">` : '🧍'}</div>`;
}
function armadio() {
  sess = null; M.imposta('esplora');
  const blocco = (lista, tipo) => lista.map(s => {
    const usa = S[tipo] === s.id, ok = sbloccato(s);
    return `<div class="skin ${ok ? '' : 'bloccata'}">${anteprima({ ...s, tipo })}${esc(s.nome)}
      <button class="${usa ? 'verde' : ok ? '' : 'grigio'}" data-t="${tipo}" data-id="${s.id}" ${ok && !usa ? '' : 'disabled'}>${usa ? '✔ In uso' : ok ? (tipo === 'boy' ? 'Indossa' : 'Usa') : `🔒 ${s.xp} ⭐`}</button></div>`;
  }).join('');
  const looks = tipo => LOOKS.filter(l => l.tipo === tipo).map(l => {
    const mio = !!S.looks[l.id], campo = tipo === 'acc' ? 'acc' : 'cap', usa = S[campo] === l.id;
    const url = M.anteprima(S.boy, tipo === 'acc' ? { acc: l.id, capelli: lookAttuale().capelli } : { acc: S.acc, capelli: l.colore });
    return `<div class="skin ${mio ? '' : 'raro'}"><div class="prev">${url ? `<img src="${url}" alt="">` : tipo === 'acc' ? '🎩' : '💇'}</div>${esc(l.nome)}
      ${mio ? `<button class="${usa ? 'verde' : ''}" data-look="${l.id}">${usa ? '✔ In uso (togli)' : 'Indossa'}</button>`
        : `<button class="${S.monete >= l.prezzo ? 'giallo' : 'grigio'}" data-compra="${l.id}" ${S.monete >= l.prezzo ? '' : 'disabled'}>🪙 ${l.prezzo}</button>`}</div>`;
  }).join('');
  const st = foglio.hidden ? 0 : foglio.scrollTop;
  apri(`<div class="testa"><h2>👕 Armadio</h2><button class="grigio x" id="b-x">✖</button></div>
    <div class="info">Hai <b>${S.xp} ⭐</b> e <b>${S.monete} 🪙</b>. Le ⭐ sbloccano vestiti e ambientazioni; i look rari si vincono negli <b>incontri casuali</b> in città o si comprano con le monete.</div>
    <h3>Il tuo personaggio</h3><div class="griglia">${blocco(SKIN_BOY, 'boy')}</div>
    <h3>💎 Look rari</h3><div class="griglia">${looks('acc')}</div>
    <h3>💇 Capelli</h3><div class="griglia">${looks('cap')}</div>
    <h3>La città</h3><div class="griglia">${blocco(TEMI, 'tema')}</div>`, true);
  foglio.scrollTop = st;
  $('#b-x').onclick = chiudi;
  document.querySelectorAll('.skin button[data-id]').forEach(b => b.onclick = () => indossa(b.dataset.t, b.dataset.id, true));
  document.querySelectorAll('[data-look]').forEach(b => b.onclick = () => metti(b.dataset.look, true));
  document.querySelectorAll('[data-compra]').forEach(b => b.onclick = () => { if (compra(b.dataset.compra)) { metti(b.dataset.compra, false); armadio(); } });
}
function metti(id, alterna) {   // indossa un look raro (o lo toglie se è già addosso)
  const l = LOOKS.find(x => x.id === id), campo = l.tipo === 'acc' ? 'acc' : 'cap';
  S[campo] = alterna && S[campo] === id ? null : id; save(); suona('ok');
  M.vestito(S.boy, lookAttuale());
  if (foglio.querySelector('.skin')) armadio();
}
function compra(id) {
  const l = LOOKS.find(x => x.id === id);
  if (!l || S.looks[id] || S.monete < l.prezzo) return false;
  S.monete -= l.prezzo; S.looks[id] = true; save(); aggiornaHUD(); suona('unlock');
  return true;
}
function indossa(campo, id, ridisegna) {
  S[campo] = id; save(); suona('ok');
  campo === 'boy' ? M.vestito(id, lookAttuale()) : M.tema(id);
  if (ridisegna) armadio();
}

// ---------- Progressi + esporta/importa ----------
function padronanza(qs) { return qs.length ? qs.reduce((t, q) => t + (S.srs[q.id] ? S.srs[q.id].b : 0), 0) / (qs.length * 4) : 0; }
function progressi() {
  sess = null; M.imposta('esplora');
  apri(`<div class="testa"><h2>📊 Progressi</h2><button class="grigio x" id="b-x">✖</button></div>
    <h3>Medaglie</h3>
    <div class="medaglie">${LUOGHI.filter(l => l.giorno).map(l => { const p = statoPal(l.id);
      return `<div class="${S.medaglie[l.id] ? '' : 'no'}"><span>🏅</span>G${l.giorno} · ${esc(l.nome)}<br>${p.v.map((b, k) => p.rip[k] ? '⚠️' : b ? '✅' : '⬜').join('')}</div>`; }).join('')}</div>
    <h3>✨ Evoluzione</h3>
    ${EVO.map(e => `<div class="card evo ${e.liv <= evo().liv ? '' : 'no'}"><b>Lv.${e.liv} ${e.nome}</b> <small>${e.xp} ⭐</small><br>❤️ ${e.hp} · ✂️ ${e.aiuti} aiuti 50/50 · 💖 ${e.vite} seconde vite${e.critico ? ' · 💥 colpo critico' : ''}</div>`).join('')}
    <div class="card" style="margin-top:12px">🗺 Città scoperte: <b>${Object.keys(S.visti).length}/${CITTA.length}</b> · 🧩 Rompicapi: <b>${Object.keys(S.enigmi).length}/${ENIGMI.length - 1}</b> · 💡 Lezioni: <b>${Object.keys(S.imparati).length}/${Object.keys(MONUMENTI).length}</b><br>📚 Argomenti studiati: <b>${ARG.filter(a => nStudio(a) > 0).length}/${ARG.length}</b> · ripassi <b>${ARG.reduce((t, a) => t + nStudio(a), 0)}/${ARG.length * 4}</b><br>
      🪙 Monete: <b>${S.monete}</b> · 💎 Look rari: <b>${Object.keys(S.looks).length}/${LOOKS.length}</b><br>Esame finale, miglior voto: <b>${S.voto ? (S.voto > 30 ? '30 e lode' : S.voto + '/30') : '—'}</b><br>
      Domande viste: <b>${Object.keys(S.srs).length}</b> su ${D.length}<br>Da ripassare: <b>${daRipassare()}</b><br>Padronanza totale: <b>${Math.round(padronanza(D) * 100)}%</b></div>
    <h3>Capitoli</h3>
    ${CAPS.map(c => { const p = Math.round(padronanza(D.filter(q => q.id.startsWith(c.id))) * 100);
      return `<div class="cap-riga">${esc(c.titolo)} · ${p}%</div><div class="barra"><div style="width:${p}%"></div></div>`; }).join('')}
    <h3>Salva i progressi</h3>
    <div class="info">Utile se cambi telefono o reinstalli l'app.</div>
    <div class="riga"><button id="b-esp">⬆ Esporta</button><button id="b-imp">⬇ Importa</button></div>
    <input type="file" id="file" accept=".json,application/json" hidden>
    <button class="rosso" id="b-reset">Azzera tutto</button>`, true);
  $('#b-x').onclick = chiudi;
  $('#b-esp').onclick = esporta;
  $('#b-imp').onclick = () => $('#file').click();
  $('#file').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(importa); };
  let conferma = false;
  $('#b-reset').onclick = e => {
    if (!conferma) { conferma = true; e.target.textContent = 'Tocca di nuovo per confermare'; return; }
    Object.assign(S, { xp: 0, srs: {}, boy: 'felpa', tema: 'giorno', medaglie: {}, voto: 0, monete: 30, looks: {}, acc: null, cap: null, studio: {}, speed: {}, evo: 0, pal: {} }); save();
    M.libri(ARG.map(nStudio)); M.vestito('felpa', lookAttuale()); M.tema('giorno'); segni(); aggiornaHUD(); progressi();
  };
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
    Object.assign(S, pulito(dati)); save(); aggiornaHUD(); M.vestito(S.boy, lookAttuale()); M.tema(S.tema); segni(); M.libri(ARG.map(nStudio));
    finestra('Progressi importati ✔', `Punti: ${S.xp}`);
  } catch (e) { finestra('File non valido', 'Scegli il file esportato dall\'app.'); }
}

// ---------- Biblioteca: ogni argomento della sbobina è un libro, da ripassare fino a 4 volte ----------
const nStudio = a => (S.studio[a.id] && S.studio[a.id].n) || 0;
const scaduto = a => { const r = S.studio[a.id]; return !!r && r.n < 4 && Date.now() - r.t > ATTESA[r.n] * 864e5; };
const quando = t => { const g = Math.floor((Date.now() - t) / 864e5); return g <= 0 ? 'oggi' : g === 1 ? 'ieri' : `${g} giorni fa`; };
function entraBiblioteca() { suona('tap'); sess = null; salvaPos(); M.biblioteca(true); M.libri(ARG.map(nStudio)); scaffali(); }
function scaffali() {
  sess = null; M.focusLibro(-1);
  const fatti = ARG.filter(a => nStudio(a) > 0).length, ripassi = ARG.reduce((t, a) => t + nStudio(a), 0), sc = ARG.filter(scaduto).length;
  const st = foglio.querySelector('.scaffale') ? foglio.scrollTop : 0;
  apri(`<div class="testa"><h2>📚 Biblioteca</h2><button class="grigio x" id="b-x">✖</button></div>
    <div class="info">Ogni libro è un argomento della sbobina. Leggilo e segnalo come studiato: puoi ripassarlo fino a <b>4 volte</b> e il libro cambia colore (anche quello in 3D sugli scaffali).</div>
    <div class="legenda"><span class="l0">mai</span><span class="l1">1 volta</span><span class="l2">2</span><span class="l3">3</span><span class="l4">4 ✨</span></div>
    <div class="card">Studiati: <b>${fatti}/${ARG.length}</b> · Ripassi: <b>${ripassi}/${ARG.length * 4}</b>${sc ? `<br>⏰ Da ripassare oggi: <b>${sc}</b>` : ''}</div>
    ${[...new Set(ARG.map(a => a.cap))].map(cid => {
      const c = CAPS.find(x => x.id === cid), lib = ARG.map((a, i) => [a, i]).filter(([a]) => a.cap === cid);
      return `<div class="scaffale"><div class="tit"><span>${esc(c ? c.titolo : 'Ripasso finale')}${c ? ` <small>· ${esc(CITTA[c.giorno].nome)}</small>` : ''}</span><b>${lib.filter(([a]) => nStudio(a)).length}/${lib.length}</b></div>
        <div class="libri">${lib.map(([a, i]) => { const n = nStudio(a);
          return `<button class="libro l${n}" data-a="${i}"><span>${esc(a.titolo)}</span><i>${'●'.repeat(n)}${'○'.repeat(4 - n)}${scaduto(a) ? ' ⏰' : ''}</i></button>`; }).join('')}</div></div>`;
    }).join('')}
    <button class="giallo" id="b-esci">🚪 Esci dalla biblioteca</button>`);
  foglio.scrollTop = st;
  document.querySelectorAll('.libro[data-a]').forEach(b => b.onclick = () => { suona('tap'); lettura(+b.dataset.a); });
  $('#b-x').onclick = $('#b-esci').onclick = chiudi;
}
function lettura(i, inFondo) {
  const a = ARG[i], n = nStudio(a), c = CAPS.find(x => x.id === a.cap), r = S.studio[a.id];
  M.biblioteca(true); M.focusLibro(i);
  apri(`<div class="barra-top"><button class="grigio" id="b-scaffali">◀ Scaffali</button><div class="info">${esc(c ? c.titolo : 'Ripasso finale')}</div></div>
    <h2>${esc(a.titolo)}</h2>
    <div class="info"><span class="pallini l${n}">${'●'.repeat(n)}${'○'.repeat(4 - n)}</span> Studiato <b>${n}/4</b> volte${r ? ' · l\'ultima ' + quando(r.t) : ''}${scaduto(a) ? ' · ⏰ è ora di ripassarlo' : ''}</div>
    <div class="testo">${a.html}</div>
    ${n < 4 ? `<button class="verde" id="b-studiato">✔ L'ho studiato (${n + 1}ª volta · +6 ⭐)</button>` : '<div class="card" style="text-align:center">✨ Libro completato: 4 ripassi su 4!</div>'}
    ${c ? `<button class="viola" id="b-speed">⚡ Speed round su questo capitolo</button>` : ''}
    <div class="riga"><button class="grigio" id="b-prec" ${i ? '' : 'disabled'}>◀ Libro prima</button><button class="grigio" id="b-succ" ${i < ARG.length - 1 ? '' : 'disabled'}>Libro dopo ▶</button></div>`, 'medio');
  if (inFondo) foglio.scrollTop = foglio.scrollHeight;
  $('#b-scaffali').onclick = scaffali;
  if ($('#b-studiato')) $('#b-studiato').onclick = () => studiato(i);
  if ($('#b-speed')) $('#b-speed').onclick = () => avviaSpeed(c.titolo, q => q.id.startsWith(a.cap), a.cap, () => lettura(i, true));
  $('#b-prec').onclick = () => lettura(i - 1); $('#b-succ').onclick = () => lettura(i + 1);
}
function studiato(i) {
  const a = ARG[i], r = S.studio[a.id] || { n: 0, t: 0 };
  if (r.n >= 4) return;
  r.n++; r.t = Date.now(); S.studio[a.id] = r; save();
  suona('ok'); aggiungiXP(6); M.libri(ARG.map(nStudio));
  lettura(i, true);
}

// ---------- Monete: si perdono sbagliando negli incontri, tornano col tempo ----------
function cambiaMonete(n) { S.monete = Math.max(0, S.monete + n); save(); aggiornaHUD(); if (n > 0) suona('moneta'); }
function reddito(benvenuto) {   // +1 moneta ogni 2 minuti, anche ad app chiusa (massimo 60 alla volta)
  const ora = Date.now(); if (!S.reddito) { S.reddito = ora; save(); return 0; }
  const n = Math.floor((ora - S.reddito) / 120000); if (n <= 0) return 0;
  const g = Math.min(60, n); S.reddito += n * 120000; cambiaMonete(g);
  if (benvenuto && g >= 5) finestra('🪙 Bentornato!', `Mentre eri via hai guadagnato <b>${g} monete</b>.`);
  return g;
}

// ---------- Incontri casuali: allenatori e capipalestra erranti ti sfidano a una lotta ----------
let incontro = null, passi = 0, soglia = 35;
const pulisci = t => String(t).replace(/\*\*/g, '');
function mcDaFlashcard(f, modo) {   // trasforma una flashcard in crocetta: le opzioni sbagliate vengono dallo stesso capitolo (più difficile!)
  let altri = D.filter(q => q.tipo === 'flashcard' && q.id !== f.id && q.id.slice(0, 3) === f.id.slice(0, 3));
  if (altri.length < 3) altri = D.filter(q => q.tipo === 'flashcard' && q.id !== f.id && q.giorno === f.giorno);
  const scelte = mescola([f, ...mescola(altri).slice(0, 3)]);
  const nascondi = new RegExp(f.domanda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return { id: `${f.id}-${modo}`, base: f.id, gen: true, tipo: 'crocette', capitolo: f.capitolo, giorno: f.giorno,
    domanda: modo === 'def' ? `Qual è la definizione giusta di «${f.domanda}»?` : `Di quale concetto si parla? «${pulisci(f.risposta).replace(nascondi, '…')}»`,
    opzioni: scelte.map(o => pulisci(modo === 'def' ? o.risposta : o.domanda)), corretta: scelte.indexOf(f), risposta: `**${f.domanda}**: ${f.risposta}` };
}
// i giorni "già fatti": quelli con un allenatore battuto o la medaglia (all'inizio: il giorno 1)
function giorniFatti() {
  const g = LUOGHI.filter(l => l.giorno && (S.medaglie[l.id] || (S.pal[l.id] && S.pal[l.id].v.some(Boolean)))).map(l => l.giorno);
  return g.length ? g : [1];
}
function scegliIncontro() {
  let t = Math.random() * INCONTRI.reduce((a, b) => a + b.peso, 0);
  return INCONTRI.find(i => (t -= i.peso) <= 0) || INCONTRI[0];
}
function cammino(m) {
  passi += m; forseConsiglio(m);
  if (incontro) {
    if (M.distanzaEvento() > 45 || Date.now() - incontro.nato > 150000) { M.togliEvento(); incontro = null; }   // se ne va
    return;
  }
  if (passi < soglia || !foglio.hidden || palAtt) return;
  passi = 0; soglia = 70 + Math.random() * 80;
  const tipo = Math.random() < 0.5 ? abitante() : scegliIncontro();   // metà delle volte un abitante che ti insegna qualcosa
  if (M.evento(tipo.persona, tipo.nome, tipo.lezione ? 'info' : 'evento')) { incontro = { tipo, nato: Date.now() }; suona('evento'); }
}
// ---------- Abitanti che insegnano: ti raccontano un concetto e poi vedono se te lo ricordi ----------
const NOMI_ABITANTI = ['Signora Bianchi', 'Il fornaio Gino', 'La studentessa Lia', 'Il postino Carlo', 'Nonno Pino', 'La vigilessa Rita', 'Il libraio Ugo', 'La maestra Vera', 'Il barista Tonio', 'La giornalaia Ada'];
function abitante() {
  const r = a => a[Math.floor(Math.random() * a.length)];
  return { nome: r(NOMI_ABITANTI), lezione: true, persona: { corpo: r(['#e86a5a', '#5aa8ff', '#f2c14e', '#3fae6a', '#b06bff', '#ff8f3f']), gambe: r(['#2b3a5a', '#3a3a4a', '#5a4a3a']),
    stile: r(['corti', 'lunghi', 'chignon', 'calvo']), capelli: r(['#2a1a10', '#8a4a1a', '#d9a441', '#eeeeee', '#1a1a1a']), ...(Math.random() < 0.3 ? { occhiali: '#2a2420' } : {}) } };
}
const giornoQui = () => { const z = M.ok ? M.dove().zona : 0; return z >= 1 && z <= 8 ? z : 1 + Math.floor(Math.random() * 8); };
function parlaLezione() {
  const I = incontro; suona('tap'); M.imposta('duello', 'evento');
  if (!I.f) { const fc = D.filter(q => q.tipo === 'flashcard' && q.giorno === giornoQui()); I.f = fc[Math.floor(Math.random() * fc.length)]; }
  const z = M.ok ? M.dove().zona : 0;
  apri(`<div class="chi">💡 ${esc(I.tipo.nome)} <small>· abitante di ${esc(CITTA[z].nome)}</small></div>
    <div class="fumetto">Lo sai che…? <b>${esc(I.f.domanda)}</b>: ${md(I.f.risposta)}</div>
    ${S.compagno ? fumettoAmico('Segnatelo! Tra un attimo vediamo se te lo ricordi.') : ''}
    <button class="giallo" id="b-via">🧠 Mettimi alla prova</button><button class="grigio" id="b-no">Grazie, ciao!</button>`);
  $('#b-via').onclick = quizLezione; $('#b-no').onclick = lasciaIncontro;
}
function quizLezione() {
  const I = incontro, q = mcDaFlashcard(I.f, 'term'), ord = mescola([0, 1, 2, 3]);
  apri(`<div class="chi">🧠 ${esc(I.tipo.nome)} ti chiede</div><div class="card"><div class="cap">${esc(q.capitolo)}</div><div class="dom">${esc(q.domanda)}</div></div>
    ${ord.map(i => `<button class="opz" data-i="${i}">${esc(pulisci(q.opzioni[i]))}</button>`).join('')}`);
  document.querySelectorAll('.opz').forEach(b => b.onclick = () => {
    const ok = +b.dataset.i === q.corretta;
    document.querySelectorAll('.opz').forEach(x => { x.disabled = true; x.classList.add(+x.dataset.i === q.corretta ? 'giusta' : x === b ? 'sbagliata' : 'spenta'); });
    rispondi(I.f, ok); if (ok) cambiaMonete(5);   // rispondi dà già i punti della flashcard
    M.reazione(ok); suona(ok ? 'ok' : 'ko'); M.amicoReagisce(ok ? 'felice' : 'triste');
    foglio.insertAdjacentHTML('beforeend', `${fumettoAmico(ok ? 'Visto? Te lo sei ricordato! <b>+5 ⭐ +5 🪙</b>' : `Quasi! Era <b>${esc(I.f.domanda)}</b>. Tornerà nel ripasso.`)}<button class="giallo" id="b-ok">Torna a esplorare</button>`);
    foglio.scrollTop = foglio.scrollHeight; $('#b-ok').onclick = lasciaIncontro;
  });
}
// ---------- Consigli del compagno mentre cammini: gli "errori da non fare" della sbobina ----------
const CONSIGLI = {};
ARG.filter(a => /-pk$/.test(a.id)).forEach(a => {
  const coda = a.html.split('Errori da non fare')[1], g = (CAPS.find(c => c.id === a.cap) || {}).giorno;
  if (coda && g) (CONSIGLI[g] = CONSIGLI[g] || []).push(...[...coda.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => x[1]));
});
let metriConsiglio = 0;
function forseConsiglio(m) {
  metriConsiglio += m;
  if (metriConsiglio < 160 || !foglio.hidden || !$('#toast').hidden || !S.compagno || incontro) return;
  metriConsiglio = 0; const l = CONSIGLI[giornoQui()] || []; if (!l.length) return;
  dice('💡 Occhio all\'esame: ' + l[Math.floor(Math.random() * l.length)], 9000);
}
function premioLook(raro) {
  const liberi = LOOKS.filter(l => !S.looks[l.id]);
  if (!liberi.length || (!raro && Math.random() < 0.5)) return null;
  return liberi[Math.floor(Math.random() * liberi.length)];
}
// Se perdi, l'avversario porta una tua domanda già conquistata a un allenatore di una palestra che hai già fatto
function bersagliFurto() {
  const c = [];
  for (const L of LUOGHI) if (L.giorno && S.pal[L.id]) S.pal[L.id].v.forEach((b, k) => { if (b && !S.pal[L.id].rip[k]) c.push([L, k]); });
  return c;
}
function ruba(xp) {
  const c = bersagliFurto(); if (!c.length) return null;
  const [L, k] = c[Math.floor(Math.random() * c.length)], p = S.pal[L.id], tolti = Math.min(S.xp, xp);
  p.v[k] = false; p.rip[k] = Math.max(1, tolti); S.xp -= tolti; save(); aggiornaHUD(); segni();
  return { L, nome: gentePalestra(L)[k].nome, xp: Math.max(1, tolti) };
}
function parlaIncontro() {
  const I = incontro; if (!I) return chiudi();
  if (I.tipo.lezione) return parlaLezione();
  suona('tap'); M.imposta('duello', 'evento');   // faccia a faccia
  const riv = !!I.tipo.rivale;
  if (!I.premio) { I.posta = 10 + 5 * Math.floor(Math.random() * 3); I.furto = riv ? 25 : 15;
    I.premio = (riv ? 35 : I.tipo.raro ? 30 : 15) + 5 * Math.floor(Math.random() * 4); I.look = premioLook(riv || I.tipo.raro); }
  const url = I.look && M.anteprima(S.boy, I.look.tipo === 'acc' ? { acc: I.look.id, capelli: lookAttuale().capelli } : { acc: S.acc, capelli: I.look.colore });
  const furto = bersagliFurto().length;
  apri(`<div class="chi">⚔️ ${esc(I.tipo.nome)} <small>· ${riv ? 'capopalestra errante' : 'allenatore'}</small></div><div class="fumetto">${esc(I.tipo.frase)}</div>
    <div class="card posta"><b>Lotta</b>: ${riv ? 4 : HP_ALL} domande a crocette sui capitoli che hai già fatto. Tu hai ❤️ ${evo().hp}.<br>
      ✔ Se vinci: <b>+${I.premio} 🪙</b>${I.look ? ` e il look raro <b>${esc(I.look.nome)}</b>` : ''}<br>
      ✘ Se perdi: ${furto ? `ti ruba <b>una domanda già conquistata</b> in palestra (−${I.furto} ⭐ finché non la riprendi)` : `<b>−${I.posta} 🪙</b> <small>(ne hai ${S.monete})</small>`}</div>
    ${url ? `<div class="premio"><img src="${url}" alt=""><span>🎁 In palio</span></div>` : ''}
    <button class="giallo" id="b-via">⚔️ Lotta!</button><button class="grigio" id="b-no">Scappa</button>`);
  $('#b-via').onclick = () => avviaLotta({ npc: 'evento', evento: true, nome: I.tipo.nome, ruolo: riv ? 'Capopalestra errante' : 'Allenatore', hp: riv ? 4 : HP_ALL,
    giorni: giorniFatti(), fine: fineIncontro });
  $('#b-no').onclick = lasciaIncontro;
}
function lasciaIncontro() { M.togliEvento(); incontro = null; chiudi(); }
function fineIncontro(vinta, s) {
  const I = incontro;
  let corpo;
  if (vinta) {
    cambiaMonete(I.premio);
    if (I.look) { S.looks[I.look.id] = true; save(); }
    const url = I.look && M.anteprima(S.boy, I.look.tipo === 'acc' ? { acc: I.look.id, capelli: lookAttuale().capelli } : { acc: S.acc, capelli: I.look.colore });
    corpo = `<div class="big">🎉</div><h2 style="text-align:center">${esc(I.tipo.nome)} è KO!</h2><div class="info" style="text-align:center"><b>+${I.premio} 🪙</b>${I.look ? ` e hai vinto <b>${esc(I.look.nome)}</b>!` : ''}</div>
      ${url ? `<div class="premio"><img src="${url}" alt=""></div><button class="verde" id="b-metti">💎 Indossalo subito</button>` : ''}`;
  } else {
    const r = ruba(I.furto);
    if (r) corpo = `<div class="big">🕵️</div><h2 style="text-align:center">Ti ha rubato una domanda!</h2>
      <div class="info" style="text-align:center">L'ha portata a <b>${esc(r.nome)}</b>, nella palestra di <b>${esc(CITTA[r.L.giorno].nome)}</b> (${esc(r.L.nome)}): −${r.xp} ⭐.<br>
        Torna lì e battilo <b>senza errori</b> per riprenderla. Quale domanda fosse… dovrai scoprirlo rispondendo giusto a tutte.</div>`;
    else { const perse = Math.min(S.monete, I.posta); cambiaMonete(-I.posta);
      corpo = `<div class="big">💸</div><h2 style="text-align:center">Hai perso: −${perse} 🪙</h2>
        <div class="info" style="text-align:center">Niente panico: le monete tornano col tempo (1 ogni 2 minuti) e con i prossimi incontri.</div>`; }
    corpo += listaErrori(s.risultati.filter(x => !x.ok));
  }
  apri(`${corpo}<button class="giallo" id="b-ok">Torna in città</button>`);
  if ($('#b-metti')) $('#b-metti').onclick = () => { metti(I.look.id, false); lasciaIncontro(); };
  $('#b-ok').onclick = lasciaIncontro;
}

// ---------- Speed round: 10 crocette a tempo sull'argomento, punti extra ----------
function domandeSpeed(filtro) {
  const cro = D.filter(q => q.tipo === 'crocette' && filtro(q));
  const fc = mescola(D.filter(q => q.tipo === 'flashcard' && filtro(q)));
  let lista = mescola([...cro, ...fc.map((f, i) => mcDaFlashcard(f, i % 2 ? 'term' : 'def'))]).slice(0, SPEED_N);
  for (let i = 0; lista.length < SPEED_N && fc.length && i < 50; i++) lista.push(mcDaFlashcard(fc[i % fc.length], i % 2 ? 'def' : 'term'));
  return lista;
}
function avviaSpeed(titolo, filtro, chiave, ritorno) {
  M.imposta('ritratto'); $('#duello').hidden = true;
  sess = { speed: true, titolo, chiave, ritorno, lista: domandeSpeed(filtro), i: 0, giuste: 0, serie: 0, punti: 0, risultati: [] };
  suona('evento'); prossimaSpeed();
}
function prossimaSpeed() {
  const s = sess; if (!s || !s.speed) return;
  if (s.i >= s.lista.length) return fineSpeed();
  const q = s.q = s.lista[s.i]; s.ordine = mescola([0, 1, 2, 3]); s.t0 = performance.now(); s.fatto = false;
  apri(`<div class="barra-top"><button class="grigio" id="b-fine">◀ Esci</button><div class="info">⚡ <b>${s.i + 1}/${s.lista.length}</b> · ${s.punti} ⭐${s.serie >= 3 ? ` · 🔥 x${s.serie}` : ''}</div></div>
    <div class="timer"><div id="tbar"></div></div>
    <div class="card"><div class="cap">⚡ ${esc(s.titolo)}</div><div class="dom">${esc(q.domanda)}</div></div>
    ${s.ordine.map(i => `<button class="opz" data-i="${i}">${esc(pulisci(q.opzioni[i]))}</button>`).join('')}`);
  const barra = $('#tbar');
  requestAnimationFrame(() => requestAnimationFrame(() => { barra.style.transition = `width ${SPEED_T}s linear`; barra.style.width = '0%'; }));
  clearTimeout(s.timer); s.timer = setTimeout(() => rispostaSpeed(-1), SPEED_T * 1000);
  document.querySelectorAll('.opz').forEach(b => b.onclick = () => rispostaSpeed(+b.dataset.i));
  $('#b-fine').onclick = () => { clearTimeout(s.timer); fineSpeed(); };
}
function rispostaSpeed(scelta) {
  const s = sess; if (!s || !s.speed || s.fatto) return;
  s.fatto = true; clearTimeout(s.timer);
  const q = s.q, ok = scelta === q.corretta, resto = Math.max(0, SPEED_T - (performance.now() - s.t0) / 1000);
  if (ok) { s.giuste++; s.serie++; s.punti += 3 + Math.ceil(resto / 2) + (s.serie >= 3 ? 2 : 0); } else s.serie = 0;
  s.risultati.push({ q, ok });
  document.querySelectorAll('.opz').forEach(b => { const i = +b.dataset.i; b.disabled = true; b.classList.add(i === q.corretta ? 'giusta' : i === scelta ? 'sbagliata' : 'spenta'); });
  const bar = $('#tbar'); if (bar) { bar.style.transition = 'none'; bar.style.width = getComputedStyle(bar).width; }
  if (scelta < 0) $('.card .dom').insertAdjacentHTML('afterend', '<div class="hint">⏱ Tempo scaduto!</div>');
  M.reazione(ok); suona(ok ? 'ok' : 'ko');
  s.i++; s.prossimo = setTimeout(prossimaSpeed, ok ? 550 : 1300);
}
function fineSpeed() {
  const s = sess; if (!s) return; sess = null; clearTimeout(s.timer); clearTimeout(s.prossimo);
  const fatte = s.risultati.length, perfetto = fatte === SPEED_N && s.giuste === SPEED_N, tot = s.punti + (perfetto ? 20 : 0);
  const record = (S.speed[s.chiave] || 0) < s.giuste && fatte === SPEED_N; if (record) S.speed[s.chiave] = s.giuste;
  if (tot) aggiungiXP(tot); save();
  s.giuste >= 7 ? (M.vittoria(), suona('vittoria')) : M.sconfitta();
  apri(`<div class="big">${perfetto ? '🔥' : s.giuste >= 7 ? '⚡' : '💪'}</div><h2 style="text-align:center">Speed round: ${s.giuste}/${fatte}</h2>
    <div class="info" style="text-align:center"><b>+${tot} ⭐</b>${perfetto ? ' (bonus perfetto +20!)' : ''}${record ? ' · 🏆 nuovo record!' : ''}<br>Più rispondi veloce, più punti prendi: servono per le skin più belle.</div>
    ${listaErrori(s.risultati.filter(r => !r.ok))}
    <button class="viola" id="b-ri">⚡ Rigioca</button><button class="giallo" id="b-ok">Continua</button>`);
  $('#b-ri').onclick = () => avviaSpeed(s.titolo, q => s.lista.some(x => x.capitolo === q.capitolo), s.chiave, s.ritorno);
  $('#b-ok').onclick = s.ritorno || chiudi;
}

// ---------- Finestre (sblocchi, messaggi) ----------
const coda = [];
function finestra(titolo, html, azione) { coda.push({ titolo, html, azione }); if (coda.length === 1) apriFinestra(); }
function apriFinestra() {
  const m = coda[0], box = $('#modal'); if (!m) return;
  box.hidden = false;
  box.innerHTML = `<div class="box"><h3>${esc(m.titolo)}</h3><div>${m.html}</div>${m.azione ? `<button class="giallo" id="m-si">${esc(m.azione.testo)}</button>` : ''}<button class="grigio" id="m-ok">OK</button></div>`;
  const chiudiF = () => { box.hidden = true; coda.shift(); apriFinestra(); };
  $('#m-ok').onclick = chiudiF;
  if (m.azione) $('#m-si').onclick = () => { m.azione.fai(); chiudiF(); };
}
function mostraSblocco(s) {
  const url = s.tipo === 'boy' && M.anteprima(s.id, lookAttuale());
  const img = s.tipo === 'boy' ? (url ? `<img src="${url}" alt="">` : '') : `<div class="swatch" style="background:${s.bg}">${s.emoji}</div>`;
  finestra('🎉 SBLOCCATO!', `${img}<b>${esc(s.nome)}</b>`, { testo: s.tipo === 'boy' ? 'Indossa subito' : 'Attiva in città',
    fai: () => indossa(s.tipo, s.id, !foglio.hidden && !!foglio.querySelector('.skin')) });
}

// ---------- Il viaggio: compagno di studio, cittadine, monumenti, varchi e rompicapi ----------
const AMICI = [
  { corpo: '#ff8f3f', gambe: '#2b3a5a', stile: 'lunghi', capelli: '#8a4a1a', occhiali: '#2a2420', zaino: 1 },
  { corpo: '#3fae6a', gambe: '#3a3a4a', stile: 'corti', capelli: '#1a1a1a', cuffie: 1, testa: 1 },
  { corpo: '#b06bff', gambe: '#2a2a3a', stile: 'chignon', capelli: '#d9a441', libro: '#2f8a5a' },
];
const amico = () => esc(S.compagno || 'Il compagno');
const fumettoAmico = html => `<div class="chi">💬 ${amico()} <small>· compagno di studio</small></div><div class="fumetto">${html}</div>`;
function dice(html, ms) { toast(`<b>${amico()}:</b> ${html}`, ms); M.amicoReagisce('annuisce'); }
const MONUMENTI = Object.fromEntries(CITTA.flatMap(c => c.luoghi || []).map(m => [m.id, m]));
const monumento = id => MONUMENTI[id];
function lezione(id) {   // il compagno ti spiega il monumento: la prima volta +5 ⭐
  const m = monumento(id), prima = !S.imparati[id]; suona('tap');
  if (prima) { S.imparati[id] = true; save(); aggiungiXP(5); }
  apri(`<div class="chi">💡 ${esc(m.nome)}</div>${fumettoAmico(md(m.info))}
    <div class="info">${prima ? '+5 ⭐ per la lezione' : 'Già sentita: ripassala quando vuoi.'} · Lezioni: <b>${Object.keys(S.imparati).length}/${Object.keys(MONUMENTI).length}</b></div>
    <button class="giallo" id="b-ok">Grazie!</button>`);
  $('#b-ok').onclick = chiudi;
}
// varco k: tra la città k e la k+1
const statoLeve = {}, pedSeq = {}, errori = {};
function varcoAperto(k) {
  const E = ENIGMI[k];
  if (E.tipo === 'medaglie') return LUOGHI.filter(l => l.giorno).every(l => S.medaglie[l.id]);
  return !!S.enigmi[k] && (k === 0 || !!S.medaglie['g' + k]);
}
let apertiPrima = null;
function aggiornaVarchi() {
  const aperti = ENIGMI.map((_, k) => varcoAperto(k));
  M.varchi(aperti);
  if (apertiPrima) aperti.forEach((a, k) => { if (a && !apertiPrima[k]) { suona('vittoria'); dice(`Il <b>varco ${k + 1}</b> è aperto! Avanti verso <b>${esc(CITTA[k + 1].nome)}</b>.`, 6000); } });
  apertiPrima = aperti;
}
function requisiti(k) {
  const E = ENIGMI[k], r = [];
  if (E.tipo === 'medaglie') return LUOGHI.filter(l => l.giorno).map(l => [!!S.medaglie[l.id], `Medaglia di ${CITTA[l.giorno].nome}`]);
  if (k > 0) r.push([!!S.medaglie['g' + k], `Medaglia della palestra di ${CITTA[k].nome} (${LUOGO['g' + k].prof})`]);
  r.push([!!S.enigmi[k], `Rompicapo: ${E.titolo}`]);
  return r;
}
function parlaVarco(k) {
  const E = ENIGMI[k]; suona('tap');
  apri(`<div class="chi">🔒 Varco ${k + 1} <small>· verso ${esc(CITTA[k + 1].nome)}</small></div>
    ${fumettoAmico(md(E.intro))}
    <div class="card">${requisiti(k).map(([f, t]) => `${f ? '✅' : '⬜'} ${esc(t)}`).join('<br>')}</div>
    ${E.tipo === 'leve' && !S.enigmi[k] ? '<button class="giallo" id="b-prova">🔓 Prova ad aprire con le leve</button>' : ''}
    <button class="grigio" id="b-no">Ok</button>`);
  $('#b-no').onclick = chiudi;
  if ($('#b-prova')) $('#b-prova').onclick = () => provaLeve(k);
}
function parlaLeva(k, i) {
  const E = ENIGMI[k], su = !!(statoLeve[k] || [])[i]; suona('tap');
  apri(`<div class="chi">🎚 Leva ${i + 1} <small>· ${esc(E.titolo)}</small></div>
    <div class="fumetto">«${esc(E.leve[i].t)}»</div>
    <div class="info">Ora è <b>${su ? 'alzata (vera)' : 'abbassata (falsa)'}</b>. Alza solo le affermazioni vere, poi prova il varco.</div>
    <div class="riga"><button class="rosso" id="b-giu">⬇ Falsa</button><button class="verde" id="b-su">⬆ Vera</button></div>`);
  const metti = v => { (statoLeve[k] = statoLeve[k] || [])[i] = v; M.leva(k, i, v); suona('tap'); chiudi(); };
  $('#b-su').onclick = () => metti(true); $('#b-giu').onclick = () => metti(false);
}
function provaLeve(k) {
  const E = ENIGMI[k], st = statoLeve[k] || [], sbagliate = E.leve.map((l, i) => !!st[i] !== l.v ? i : -1).filter(i => i >= 0);
  if (!sbagliate.length) return risolto(k);
  errori[k] = (errori[k] || 0) + 1; suona('ko');
  const l = E.leve[sbagliate[0]];
  apri(`<div class="chi">🔒 Il varco non si apre</div>${fumettoAmico(`${sbagliate.length === 1 ? 'Una leva è' : `<b>${sbagliate.length}</b> leve sono`} nella posizione sbagliata.${errori[k] >= 2
      ? `<br>Ti aiuto: guarda la <b>leva ${sbagliate[0] + 1}</b>. ${l.perche ? md(l.perche) : ''}` : ' Rileggile con calma.'}`)}
    <button class="giallo" id="b-ok">Ok</button>`);
  $('#b-ok').onclick = chiudi;
}
function pedanaPestata(k, i) {   // le pedane vanno pestate nell'ordine giusto
  if (S.enigmi[k] || ENIGMI[k].tipo !== 'pedane' || !foglio.hidden) return;
  const E = ENIGMI[k], n = pedSeq[k] || 0;
  if (i === n) {
    M.pedana(k, i, 'ok'); suona('ok'); pedSeq[k] = n + 1;
    if (n + 1 === E.etichette.length) return risolto(k);
    if (n === 0) dice(`Giusto, si parte da <b>${esc(E.etichette[0])}</b>. Ora la prossima…`);
  } else {
    pedSeq[k] = 0; errori[k] = (errori[k] || 0) + 1; suona('ko'); M.pedana(k, -1, 'ko'); setTimeout(() => !S.enigmi[k] && M.pedana(k, -1, 'off'), 700);
    dice(errori[k] >= 2 ? md(E.aiuto) : `Ops, <b>${esc(E.etichette[i])}</b> non andava lì. Si ricomincia da capo!`, errori[k] >= 2 ? 9000 : 4500);
  }
}
function sportello(k) {
  const E = ENIGMI[k]; suona('tap');
  if (S.enigmi[k]) { apri(`${fumettoAmico('Questo sportello l\'abbiamo già sistemato! ' + md(E.aiuto))}<button class="giallo" id="b-ok">Ok</button>`); $('#b-ok').onclick = chiudi; return; }
  apri(`<div class="chi">🗂 ${esc(E.titolo)}</div><div class="fumetto">${md(E.intro)}</div>
    ${E.voci.map((v, i) => `<label class="voce"><b>${esc(v)}</b><select data-v="${i}"><option value="">— scegli —</option>${E.scelte.map((c, j) => `<option value="${j}">${esc(c)}</option>`).join('')}</select></label>`).join('')}
    <button class="giallo" id="b-consegna">📨 Consegna</button><button class="grigio" id="b-no">Più tardi</button>`, 'medio');
  $('#b-no').onclick = chiudi;
  $('#b-consegna').onclick = () => {
    const r = [...foglio.querySelectorAll('select[data-v]')].map(x => x.value === '' ? -1 : +x.value);
    const sbagliate = r.filter((x, i) => x !== E.giuste[i]).length;
    if (!sbagliate) return risolto(k);
    errori[k] = (errori[k] || 0) + 1; suona('ko');
    foglio.querySelector('.esito-sportello')?.remove();
    $('#b-consegna').insertAdjacentHTML('beforebegin', `<div class="card posta esito-sportello">${fumettoAmico(`${sbagliate === 1 ? 'Una risposta è sbagliata' : `<b>${sbagliate}</b> risposte sono sbagliate`}.${errori[k] >= 2 ? '<br>' + md(E.aiuto) : ' Riprova!'}`)}</div>`);
  };
}
function risolto(k) {
  S.enigmi[k] = true; save(); aggiungiXP(20); suona('vittoria'); M.vittoria(); mostraRisolto(k);
  const manca = k > 0 && !S.medaglie['g' + k];
  apri(`<div class="big">🧩</div><h2 style="text-align:center">${esc(ENIGMI[k].titolo)}: risolto!</h2>
    ${fumettoAmico(`${manca ? `Bravissimo! Per aprire il varco serve ancora la <b>medaglia di ${esc(CITTA[k].nome)}</b>: batti il capopalestra ${esc(LUOGO['g' + k].prof)}.` : 'Grande! Il varco si apre.'}<br>${md(ENIGMI[k].aiuto || '')}`)}
    <div class="info" style="text-align:center">+20 ⭐</div><button class="giallo" id="b-ok">Avanti!</button>`);
  $('#b-ok').onclick = () => { chiudi(); aggiornaVarchi(); };
}
function mostraRisolto(k) {   // dopo un caricamento: pedane verdi e leve al posto giusto
  const E = ENIGMI[k];
  if (E.tipo === 'pedane') M.pedana(k, -1, 'ok');
  if (E.tipo === 'leve') E.leve.forEach((l, i) => { M.leva(k, i, l.v); (statoLeve[k] = statoLeve[k] || [])[i] = l.v; });
}
// la prima volta in una cittadina il compagno te la presenta
function controllaZona() {
  if (!M.ok || !S.nome) return;
  const z = M.dove().zona;
  if (!S.visti[z] && !M.dove().stanza) { S.visti[z] = true; save(); aggiungiXP(10); dice(md(CITTA[z].amico), 9000); suona('evento'); }
}
function obiettivo() {   // cosa fare adesso, detto dal compagno
  const k = ENIGMI.findIndex((_, i) => !varcoAperto(i));
  if (k < 0) return S.voto ? 'Hai fatto tutto! Ripassa in biblioteca o rifai l\'esame per prendere 30 e lode.' : 'Tutti i varchi sono aperti: andiamo al <b>Rettorato</b> nella Città Universitaria per l\'esame finale!';
  const E = ENIGMI[k];
  if (E.tipo === 'medaglie') { const l = LUOGHI.find(x => x.giorno && !S.medaglie[x.id]); return `Per l'ultimo varco servono tutte le medaglie: ci manca quella di <b>${esc(CITTA[l.giorno].nome)}</b>.`; }
  if (k > 0 && !S.medaglie['g' + k]) return `Dobbiamo battere la palestra di <b>${esc(CITTA[k].nome)}</b>: prima i due allenatori, poi il capopalestra <b>${esc(LUOGO['g' + k].prof)}</b>.`;
  return `Sul percorso a nord di <b>${esc(CITTA[k].nome)}</b> c'è il rompicapo «${esc(E.titolo)}». ${md(E.intro)}`;
}
function parlaAmico() {
  if (!S.nome) return presentazione();
  suona('tap'); M.amicoReagisce('annuisce');
  const z = M.ok ? M.dove().zona : 0, ms = (CITTA[z].luoghi || []).filter(m => !S.imparati[m.id]);
  apri(`${fumettoAmico(`${obiettivo()}${ms.length ? `<br><br>💡 Qui a ${esc(CITTA[z].nome)} non hai ancora visto: <b>${ms.map(m => esc(m.nome)).join(', ')}</b>. Avvicinati e ti spiego!` : ''}`)}
    <button class="giallo" id="b-ok">Ok, andiamo!</button>`);
  $('#b-ok').onclick = chiudi;
}
function presentazione() {   // inizio del gioco: il tuo nome, il compagno e il suo aspetto
  apri(`<h2>🎓 Benvenuto nella Città del Diritto!</h2>
    <div class="info">Studierai Diritto Pubblico attraversando 10 cittadine. Non sarai da solo: c'è il tuo compagno di studio.</div>
    <label class="voce"><b>Come ti chiami?</b><input id="in-nome" maxlength="20" autocomplete="off" placeholder="Il tuo nome" value="${esc(S.nome)}"></label>
    <label class="voce"><b>Come si chiama il tuo compagno di studio?</b><input id="in-amico" maxlength="20" autocomplete="off" placeholder="Il suo nome" value="${esc(S.compagno)}"></label>
    <h3>Che aspetto ha?</h3><div class="griglia3">${AMICI.map((a, i) => { const u = M.anteprimaPersona && M.anteprimaPersona(a, 'amico' + i);
      return `<button class="scelta-amico ${(S.amico || 0) === i ? 'on' : ''}" data-a="${i}">${u ? `<img src="${u}" alt="">` : ['🧑‍🎓', '🎧', '📗'][i]}</button>`; }).join('')}</div>
    <button class="giallo" id="b-via">Iniziamo! ▶</button>`, true);
  document.querySelectorAll('.scelta-amico').forEach(b => b.onclick = () => { S.amico = +b.dataset.a; document.querySelectorAll('.scelta-amico').forEach(x => x.classList.toggle('on', x === b)); suona('tap'); });
  $('#b-via').onclick = () => {
    S.nome = ($('#in-nome').value.trim() || 'Studente').slice(0, 20); S.compagno = ($('#in-amico').value.trim() || 'Ale').slice(0, 20); save();
    M.compagno(AMICI[S.amico || 0], S.compagno); chiudi(); suona('vittoria');
    setTimeout(() => dice(`Ciao <b>${esc(S.nome)}</b>! Io sono <b>${amico()}</b>: studiamo insieme. ${md(CITTA[0].amico)} Se ti perdi tocca 💬 e ti dico cosa fare.`, 10000), 400);
  };
}

// ---------- Minimappa: piccola = i dintorni; toccala e diventa la mappa del viaggio (viaggio rapido nelle città già visitate) ----------
const mm = $('#mappa');
function iconaLuogo(id) {
  if (id === 'casa') return '👕'; if (id === 'biblio') return '📚'; if (id === 'esame') return '📝'; if (monumento(id)) return S.imparati[id] ? '' : '💡';
  const p = S.pal[id]; return p && p.rip.some(Boolean) ? '⚠️' : S.medaglie[id] ? '🏅' : '⚔️';
}
let nodiMappa = [];
function disegnaMappa() {
  const d = M.ok && M.dove(), vis = !!d && !d.stanza && foglio.hidden && $('#modal').hidden && !!S.nome;
  mm.hidden = !vis; if (!vis) { mm.classList.remove('grande'); return; }
  const r = devicePixelRatio || 1, W = Math.round(mm.clientWidth * r), H = Math.round(mm.clientHeight * r);
  if (!W || !H) return;
  if (mm.width !== W || mm.height !== H) { mm.width = W; mm.height = H; }
  const g = mm.getContext('2d'); g.textAlign = 'center'; g.textBaseline = 'middle';
  if (mm.classList.contains('grande')) return disegnaViaggio(g, W, H, r, d);
  // i dintorni: 54 m di larghezza, centrati su di te
  const sx = W / 54, hz = H / sx, z1 = d.z - hz * 0.55, X = x => (x + 27) * sx, Z = z => (z - z1) * sx;
  g.fillStyle = '#62c34e'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e3d6bb'; g.fillRect(X(-4), 0, 8 * sx, H);
  for (let k = 0; k < CITTA.length; k++) { const zc = -PASSO * k; g.beginPath(); g.arc(X(0), Z(zc + 4), 8 * sx, 0, 7); g.fill();
    if (k < CITTA.length - 1) { g.fillStyle = '#3c9a3a'; g.fillRect(0, Z(zc - 68), X(-6.6), 41 * sx); g.fillRect(X(6.6), Z(zc - 68), W, 41 * sx); g.fillStyle = '#e3d6bb'; } }
  for (const p of M.pianta()) {
    if (Math.abs(p.z - d.z) > hz) continue;
    if (p.varco !== undefined) { g.fillStyle = varcoAperto(p.varco) ? '#3ec46d' : '#ef4f5f'; g.fillRect(X(-6.6), Z(p.z) - 1.5 * r, 13.2 * sx, 3 * r); continue; }
    g.fillStyle = p.col; g.strokeStyle = '#1d1b2e'; g.lineWidth = Math.max(1, r);
    g.fillRect(X(p.x - p.w / 2), Z(p.z - p.d / 2), p.w * sx, p.d * sx); g.strokeRect(X(p.x - p.w / 2), Z(p.z - p.d / 2), p.w * sx, p.d * sx);
    if (!p.casa) { g.font = `${Math.round(11 * r)}px sans-serif`; g.fillText(iconaLuogo(p.id), X(p.x), Z(p.z)); }
  }
  const zb = ENIGMI.findIndex((_, k) => !varcoAperto(k));   // oltre il primo varco chiuso: nebbia
  if (zb >= 0) { const zz = Z(-PASSO * zb - 56); if (zz > 0) { g.fillStyle = 'rgba(29,27,46,.55)'; g.fillRect(0, 0, W, zz); } }
  if (d.ev) { g.fillStyle = '#b06bff'; g.beginPath(); g.arc(X(d.ev.x), Z(d.ev.z), (4 + Math.sin(Date.now() / 150) * 1.5) * r, 0, 7); g.fill(); }
  freccia(g, X(d.x), Z(d.z), d.rot, 6 * r, r);
}
function freccia(g, x, y, rot, s, r) {
  g.save(); g.translate(x, y); g.rotate(-rot);
  g.beginPath(); g.moveTo(0, s); g.lineTo(-s * 0.75, -s * 0.65); g.lineTo(s * 0.75, -s * 0.65); g.closePath();
  g.fillStyle = '#ef4f5f'; g.strokeStyle = '#fff'; g.lineWidth = 2 * r; g.fill(); g.stroke(); g.restore();
}
function disegnaViaggio(g, W, H, r, d) {   // la mappa del viaggio: le cittadine in fila, dal borgo (in basso) all'università (in alto)
  g.fillStyle = '#2f6b3a'; g.fillRect(0, 0, W, H);
  const n = CITTA.length, pad = 26 * r, y = k => H - pad - k * (H - 2 * pad) / (n - 1), cx = W * 0.22;
  g.strokeStyle = '#e3d6bb'; g.lineWidth = 6 * r; g.beginPath(); g.moveTo(cx, y(0)); g.lineTo(cx, y(n - 1)); g.stroke();
  nodiMappa = [];
  for (let k = 0; k < n; k++) {
    const visto = !!S.visti[k], C = CITTA[k], qui = d.zona === k;
    if (k < n - 1) { const ym = (y(k) + y(k + 1)) / 2; g.font = `${Math.round(13 * r)}px sans-serif`; g.fillText(varcoAperto(k) ? '🔓' : '🔒', cx, ym); }
    g.fillStyle = visto ? C.colore : '#5a6a5a'; g.strokeStyle = qui ? '#ffd23f' : '#1d1b2e'; g.lineWidth = (qui ? 5 : 3) * r;
    g.beginPath(); g.arc(cx, y(k), 13 * r, 0, 7); g.fill(); g.stroke();
    g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.font = `900 ${Math.round(13 * r)}px sans-serif`;
    const pal = C.palestra, icona = pal ? (S.medaglie[pal] ? ' 🏅' : '') : '';
    g.fillText(visto ? C.nome + icona : '???', cx + 22 * r, y(k) - 6 * r);
    g.font = `700 ${Math.round(10 * r)}px sans-serif`; g.fillStyle = 'rgba(255,255,255,.8)';
    g.fillText(qui ? 'sei qui' : visto ? 'tocca: viaggio rapido' : 'non ancora scoperta', cx + 22 * r, y(k) + 9 * r);
    g.textAlign = 'center';
    nodiMappa.push({ k, y: y(k) / H });
  }
}
mm.addEventListener('click', e => {
  if (!mm.classList.contains('grande')) { suona('tap'); mm.classList.add('grande'); return disegnaMappa(); }
  const b = mm.getBoundingClientRect(), fy = (e.clientY - b.top) / b.height;
  const nodo = nodiMappa.reduce((m, n) => Math.abs(n.y - fy) < Math.abs(m.y - fy) ? n : m, nodiMappa[0]);
  mm.classList.remove('grande'); suona('tap');
  if (nodo && Math.abs(nodo.y - fy) < 0.06 && S.visti[nodo.k] && M.dove().zona !== nodo.k) { palAtt = null; M.vaiCitta(nodo.k); segni(); }
});
document.addEventListener('pointerdown', e => { if (mm.classList.contains('grande') && e.target !== mm) mm.classList.remove('grande'); }, true);
setInterval(() => { disegnaMappa(); controllaZona(); }, 150);

// ---------- Avvio ----------
load();
if (!SKIN_BOY.some(s => s.id === S.boy)) S.boy = 'felpa';
if (!TEMI.some(t => t.id === S.tema)) S.tema = 'giorno';
while (S.evo < EVO.length - 1 && S.xp >= EVO[S.evo + 1].xp) S.evo++;   // salvataggi vecchi: evoluzione in silenzio
if (S.mondo !== 2) { S.pos = null; S.mondo = 2; S.visti = { 0: true }; S.zoom = Math.max(S.zoom, 1.8); save(); }   // la mappa è diventata grande: si riparte dal borgo (medaglie e punti restano)
const ha3D = M.init($('#mondo'), {
  joy: $('#joy'), onParla: parla, onVicino: mostraAzione, onCammino: cammino, onPedana: pedanaPestata, zoom: S.zoom,
  onZoom: z => { S.zoom = Math.round(z * 100) / 100; clearTimeout(window.__z); window.__z = setTimeout(save, 400); },
  onMossa: () => { $('#aiuto').hidden = true; if (S.aiuto) { S.aiuto = false; save(); } },
});
if (ha3D) {
  M.vestito(S.boy, lookAttuale()); M.zoomA(S.zoom); M.costruisci(LUOGHI, CITTA, S.boy); M.costruisciSala(ARG, NOMI_SCAFFALI); M.costruisciPalestra(); M.libri(ARG.map(nStudio));
  ENIGMI.forEach((E, k) => E.tipo !== 'medaglie' && M.enigma(k, E.tipo === 'leve' ? { tipo: 'leve', n: E.leve.length } : E.tipo === 'pedane' ? { tipo: 'pedane', etichette: E.etichette } : { tipo: 'sportello', insegna: E.insegna }));
  ENIGMI.forEach((_, k) => S.enigmi[k] && mostraRisolto(k)); aggiornaVarchi();
  if (S.nome) M.compagno(AMICI[S.amico || 0], S.compagno);
  M.tema(S.tema); segni();
  if (S.pos) M.mettiA(S.pos[0], S.pos[1]);
  addEventListener('pagehide', salvaPos); document.addEventListener('visibilitychange', () => document.hidden && salvaPos());
} else document.body.classList.add('no3d');
reddito(true); setInterval(reddito, 20000);
aggiornaHUD();
$('#b-menu').onclick = menu; $('#b-amico').onclick = parlaAmico;
$('#azione').onclick = () => vicinoId && parla(vicinoId);
if (S.aiuto && ha3D) $('#aiuto').hidden = false;
// indirizzi diretti (comodi per i test): #tema-notte, #menu, #mappa, #sim, #palestra-g1, #lotta-g1, #capo-g1, #parla-g3, #incontro, #zoom-4
const H = location.hash.slice(1);
if (H && !S.nome && ha3D) { S.nome = 'Giotto'; S.compagno = 'Ale'; M.compagno(AMICI[0], S.compagno); }   // indirizzi di prova: un compagno finto (non salvato finché non giochi)
const rotte = { menu, armadio, progressi, sim: avviaSim, biblioteca: () => { teletrasporta('biblio'); entraBiblioteca(); }, libro: () => { teletrasporta('biblio'); entraBiblioteca(); lettura(1); },
  speed: () => avviaSpeed('Roma dei Palazzi', q => q.giorno === 3, 'g3', chiudi),
  mappa: () => setTimeout(() => { mm.classList.add('grande'); disegnaMappa(); }, 200),
  lezione: () => { M.vaiCitta(0); setTimeout(() => { const t = abitante(); if (M.evento(t.persona, t.nome, 'info')) { incontro = { tipo: t, nato: Date.now() }; parlaIncontro(); } }, 300); },
  incontro: () => { teletrasporta('casa'); M.mettiA(0, 14); const t = INCONTRI[5]; if (M.evento(t.persona, t.nome)) { incontro = { tipo: t, nato: Date.now() }; parlaIncontro(); } }, orale: () => avvia('orale'), flashcard: () => avvia('flashcard'), crocette: () => avvia('crocette') };
if (rotte[H]) rotte[H]();
else if (/^zoom-/.test(H)) M.zoomA(+H.slice(5));
else if (/^citta-\d/.test(H)) { M.vaiCitta(+H[6]); if (H.includes('z')) M.zoomA(+H.split('z')[1]); }   // es. #citta-8 o #citta-3z3
else if (/^strada-\d/.test(H)) M.mettiA(0, -PASSO * +H[7] - 28);   // davanti al rompicapo del percorso
else if (/^tema-/.test(H)) { M.tema(H.slice(5)); teletrasporta('g3'); }   // anteprima di un'ambientazione (non salvata)
else if (/^(palestra|lotta|capo|parla)-/.test(H)) { const [r, id] = H.split('-'); teletrasporta(id);
  if (r === 'parla') parla(id); else { entraPalestra(id); if (r === 'lotta') lottaAllenatore(0); if (r === 'capo') lottaCapo(); } }
else if (!ha3D) menu();
else if (!S.nome && !location.search.includes('test')) presentazione();   // primo avvio: nome e compagno
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  if (navigator.serviceWorker.controller) navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
  navigator.serviceWorker.register('sw.js').catch(() => { });
}

// ---------- Autotest: apri index.html?test ----------
if (location.search.includes('test')) {
  const err = [], ok = (c, m) => { if (!c) err.push(m); };
  const salvato = JSON.stringify(S);
  try {
    ok(D.length >= 250, 'domande >= 250');
    ok(D.every(q => q.tipo !== 'crocette' || (q.opzioni.length === 4 && q.corretta >= 0 && q.corretta < 4)), 'crocette valide');
    ok(CAPS.length === 17, '17 capitoli');
    ok(LUOGHI.filter(l => l.giorno).every(l => D.some(q => q.giorno === l.giorno)), 'ogni prof ha le sue domande');
    S.filtro = 'g4'; ok(pool('orale').every(q => q.giorno === 4) && pool('orale').length > 0, 'filtro giorno');
    S.filtro = 'c11'; ok(pool('crocette').every(q => q.id.startsWith('c11')), 'filtro capitolo');
    Object.assign(S, { filtro: 'tutto', xp: 0, srs: {}, medaglie: {}, voto: 0 });
    const q = D.find(x => x.tipo === 'crocette');
    rispondi(q, false); ok(S.srs[q.id].b === 0 && daRipassare() === 1, 'sbagliata va in ripasso');
    rispondi(q, true); ok(S.srs[q.id].b === 1 && S.xp === 10, 'giusta: box 1 e +10 punti');
    S.filtro = 'ripasso'; ok(pool('crocette').length === 0, 'ripasso si svuota'); S.filtro = 'tutto';
    S.xp = 55; aggiungiXP(10); ok(coda.some(m => m.titolo.includes('SBLOCCATO')), 'sblocco a 60 punti');
    coda.length = 0; $('#modal').hidden = true;
    save(); const prima = JSON.stringify(S); S.xp = -1; load(); ok(JSON.stringify(S) === prima, 'salva e ricarica');
    ok(JSON.stringify(pulito({ monete: '<img src=x>', pal: { g1: { v: ['<b>'], rip: [1] } }, boy: '<x>', filtro: '"><x>', xp: 5, pos: [1, 2] })) === '{"xp":5,"pos":[1,2]}', 'salvataggi importati ripuliti');
    const sim = creaSim(); ok(sim.length === 10 && new Set(sim.map(x => x.id.slice(0, 3))).size === 10, 'esame: 10 capitoli diversi');
    ok(sim.filter(x => x.tipo === 'crocette').length === 5, 'esame: 5 crocette');
    ok(votoDa(10, 10) === '30 e lode' && votoDa(6, 10) === '18', 'voto in trentesimi');
    // lotte giocate toccando i bottoni come farebbe una persona
    const risp = giusta => { const d = sess.q;
      if (d.tipo === 'crocette') { const i = giusta ? d.corretta : [0, 1, 2, 3].find(x => x !== d.corretta && !(sess.tolte || []).includes(x));
        document.querySelector(`.opz[data-i="${i}"]`).click(); $('#b-avanti').click(); }
      else { (d.tipo === 'orale' ? $('#b-mostra') : $('#carta')).click();
        if ($('#b-punti') && giusta) { d.punti_chiave.forEach((_, i) => document.querySelector(`.punto[data-p="${i}"]`).click()); $('#b-punti').click(); }
        else $(giusta ? '#b-si' : '#b-no').click(); } };
    const pulisciCoda = () => { coda.length = 0; $('#modal').hidden = true; };
    Object.assign(S, { xp: 0, evo: 0, pal: {}, medaglie: {} });
    ok(setAllenatore(3, 0).length === 3 && setAllenatore(3, 1).length === 3 && setAllenatore(3, 0).every(q => q.tipo === 'crocette' && q.giorno === 3)
      && setAllenatore(3, 0).map(q => q.id).join() === setAllenatore(3, 0).map(q => q.id).join()
      && !setAllenatore(3, 0).some(q => setAllenatore(3, 1).some(x => x.id === q.id)), 'allenatori: 3 crocette fisse e diverse a testa');
    entraPalestra('g1'); ok(palAtt === 'g1', 'entri in palestra');
    parla('pal-capo'); ok(foglio.innerHTML.includes('allenatori') && !$('#b-via'), 'capopalestra chiuso finché non batti gli allenatori');
    let giri = 0; lottaAllenatore(0); while (sess && giri++ < 20) risp(true);
    ok(S.pal.g1.v[0] && giri === HP_ALL && foglio.innerHTML.includes('KO'), 'allenatore battuto con 3 giuste');
    lottaAllenatore(1); giri = 0; while (sess && giri++ < 20) risp(false);
    ok(!S.pal.g1.v[1] && giri === EVO[0].hp && foglio.innerHTML.includes('Riprova'), 'allenatore: KO dopo 3 errori (Matricola)');
    lottaAllenatore(1); giri = 0; while (sess && giri++ < 20) risp(true); ok(S.pal.g1.v[1], 'secondo allenatore battuto');
    lottaCapo(); giri = 0; let giorniOk = true; while (sess && giri++ < 20) { giorniOk = giorniOk && sess.q.giorno === 1; risp(true); }
    ok(giorniOk, 'capopalestra: solo domande del suo giorno');
    ok(S.medaglie.g1 === true && giri === HP_CAPO && foglio.innerHTML.includes('Medaglia'), 'capopalestra: tutte giuste → medaglia');
    lottaCapo(); risp(true); risp(false); ok(!sess && foglio.innerHTML.includes('ha vinto'), 'capopalestra: un errore e sei KO');
    lottaCapo(); risp(true); ok(sess.q.tipo === 'orale' && sess.q.punti_chiave, 'capopalestra: domanda d\'esame al 2° turno');
    $('#b-mostra').click(); document.querySelector('.punto').click(); ok(foglio.querySelector('.punto.on'), 'punti chiave da spuntare');
    $('#b-punti').click(); ok(!sess && foglio.innerHTML.includes('ha vinto'), 'capopalestra: se non dici tutti i punti chiave sei KO');
    lottaCapo(); risp(true); risp(true); risp(true); ok(sess && sess.risultati.some(r => r.q.difficile), 'capopalestra: usa le crocette da esperto');
    fineLotta(true);
    ok(!setAllenatore(1, 0).some(q => q.difficile) && D.filter(q => q.difficile).length >= 80, 'domande da esperto: solo per il capopalestra');
    // evoluzione: più vita, 50/50, seconda vita
    pulisciCoda(); S.xp = 0; S.evo = 0; aggiungiXP(EVO[2].xp);
    ok(S.evo === 2 && coda.some(m => m.titolo.includes('Evoluzione')) && evo().vite === 1, 'evoluzione a Laureando');
    pulisciCoda(); lottaCapo(); risp(false); ok(sess && sess.mio === 1 && sess.vite === 0, 'seconda vita: resti in piedi');
    giri = 0; while (sess && giri++ < 20) risp(true); ok(giri === HP_CAPO, 'seconda vita: poi vinci');
    S.xp = 0; ok(S.evo === 2, 'non si torna indietro di livello');
    lottaAllenatore(0); while (sess.q.tipo !== 'crocette') risp(true);
    $('#b-5050').click(); const spente = [...document.querySelectorAll('.opz:disabled')].map(b => +b.dataset.i);
    ok(spente.length === 2 && !spente.includes(sess.q.corretta) && sess.aiuti === 0 && !$('#b-5050'), 'aiuto 50/50');
    fineLotta(true); ok(foglio.innerHTML.includes('Riprova'), 'ritirata = sconfitta'); pulisciCoda();
    S.evo = 0; S.pal.g1.v = [true, true];
    // incontro perso: ti rubano una domanda; rivincita alla cieca per riprenderla
    Object.assign(S, { xp: 100, monete: 20, looks: {} }); esciPalestra();
    const gioca = (tipo, giusta) => { incontro = { tipo, nato: Date.now() }; parlaIncontro(); const I = incontro; $('#b-via').click(); let g = 0; while (sess && g++ < 20) risp(giusta); return I; };
    let I = gioca(INCONTRI[0], false);
    const k = S.pal.g1.rip.findIndex(Boolean);
    ok(k >= 0 && S.pal.g1.rip[k] === 15 && S.xp === 85 && !S.pal.g1.v[k] && foglio.innerHTML.includes('rubato'), 'incontro perso: ti rubano una domanda (−15 ⭐)');
    $('#b-ok').click(); ok(!incontro, 'incontro finito');
    entraPalestra('g1'); lottaAllenatore(k); ok(sess.lotta.cieco && sess.aiuti === 0 && sess.vite === 0, 'rivincita alla cieca, senza aiuti');
    const s0 = sess; document.querySelector(`.opz[data-i="${(sess.q.corretta + 1) % 4}"]`).click();
    ok(!foglio.querySelector('.opz.giusta') && !foglio.querySelector('.opz.sbagliata') && !foglio.querySelector('.risp') && foglio.querySelector('.opz.scelta'), 'alla cieca: nessun indizio');
    $('#b-avanti').click(); giri = 0; while (sess && giri++ < 40) risp(true);
    ok(s0.risultati.length === 3 && S.pal.g1.rip[k] === 15 && foglio.innerHTML.includes('non ti dico'), 'rivincita persa: non ti dice quale');
    lottaAllenatore(k); giri = 0; while (sess && giri++ < 20) risp(true);
    ok(S.pal.g1.rip[k] === 0 && S.pal.g1.v[k] && S.xp >= 100, 'rivincita vinta: domanda e ⭐ restituite');
    esciPalestra(); pulisciCoda();
    S.monete = 20; I = gioca(INCONTRI[5], true); ok(S.monete === 20 + I.premio && (!I.look || S.looks[I.look.id]), 'incontro vinto: monete e look');
    $('#b-ok').click();
    S.pal = {}; S.monete = 3; gioca(INCONTRI[0], false); ok(S.monete === 0, 'senza allenatori battuti perdi monete (mai sotto zero)');
    lasciaIncontro();
    ok(INCONTRI.filter(i => i.rivale).length === 3 && (() => { I = gioca(INCONTRI.find(i => i.rivale), true); return I.look !== undefined && sess === null; })(), 'capopalestra errante');
    lasciaIncontro(); pulisciCoda();
    avviaSim(); giri = 0; while (sess && giri++ < 20) risp(true);
    ok(giri === 10 && foglio.innerHTML.includes('30 e lode') && S.voto === 31, 'esame perfetto = 30 e lode');
    pulisciCoda();
    S.visti = { 0: true }; menu(); ok(!document.querySelector('[data-vai="g3"]') || !M.ok, 'vai da…: solo le città già visitate');
    S.visti = Object.fromEntries(CITTA.map((_, k) => [k, true])); menu(); document.querySelector('[data-vai="g3"]').click(); ok(foglio.innerHTML.includes('Camerini') && foglio.innerHTML.includes('Entra in palestra'), 'vai da… apre la palestra');
    avvia('orale'); $('#b-mostra').click(); $('#b-si').click(); avvia('flashcard'); $('#carta').click(); $('#b-no').click();
    avvia('crocette'); document.querySelector('.opz').click(); $('#b-avanti').click(); $('#b-fine').click();
    armadio(); progressi(); parla('esame'); parla('casa'); chiudi();
    if (M.ok) {
      M.varchi([]); const p = M.percorso(2, 20, 13, 20.1), f = p && p[p.length - 1];
      ok(p && p.length >= 1 && Math.hypot(f.x - 13, f.z - 20.1) < 1.2, 'percorso dalla partenza alla biblioteca');
      const q = M.percorso(2, 20, 0, -PASSO + 14), g = q && q[q.length - 1];
      ok(g && g.z > -57, 'varco chiuso: non si passa');
      M.varchi([true]); const r = M.percorso(2, 20, 0, -PASSO + 14), h = r && r[r.length - 1];
      ok(h && Math.hypot(h.x, h.z - (-PASSO + 14)) < 1.2, 'varco aperto: si arriva a Città di Confine');
    }
    // varchi e rompicapi
    Object.assign(S, { enigmi: {}, medaglie: {} }); apertiPrima = null; aggiornaVarchi();
    ok(!varcoAperto(0), 'varco 1 chiuso all\'inizio');
    ENIGMI[0].leve.forEach((l, i) => { parlaLeva(0, i); $(l.v ? '#b-su' : '#b-giu').click(); });
    parlaVarco(0); $('#b-prova').click(); ok(S.enigmi[0] && varcoAperto(0), 'leve giuste: varco 1 aperto'); $('#b-ok').click();
    statoLeve[3] = []; parlaVarco(3); $('#b-prova').click(); ok(!S.enigmi[3] && foglio.innerHTML.includes('sbagliat'), 'leve sbagliate: il varco resta chiuso'); chiudi();
    pedanaPestata(1, 1); ok(!pedSeq[1], 'pedana sbagliata: si ricomincia');
    ENIGMI[1].etichette.forEach((_, i) => pedanaPestata(1, i)); ok(S.enigmi[1] && !varcoAperto(1), 'pedane in ordine: risolto, ma serve la medaglia'); chiudi();
    S.medaglie.g1 = true; aggiornaVarchi(); ok(varcoAperto(1), 'con la medaglia il varco 2 si apre');
    sportello(6); ENIGMI[6].giuste.forEach((g, i) => { foglio.querySelector(`select[data-v="${i}"]`).value = String(g); }); $('#b-consegna').click();
    ok(S.enigmi[6], 'sportello dell\'art. 117 risolto'); chiudi();
    sportello(5); $('#b-consegna').click(); ok(!S.enigmi[5] && foglio.innerHTML.includes('sbagliate'), 'sportello lasciato vuoto: risposte sbagliate'); chiudi();
    ok(!varcoAperto(8), 'varco del Rettorato chiuso senza 8 medaglie');
    LUOGHI.filter(l => l.giorno).forEach(l => { S.medaglie[l.id] = true; }); ok(varcoAperto(8), '8 medaglie: varco del Rettorato aperto');
    ok(ENIGMI.length === CITTA.length - 1 && ENIGMI.every(E => E.tipo === 'medaglie' || E.intro), 'un rompicapo per ogni percorso');
    // lezioni dei monumenti
    S.xp = 0; S.imparati = {}; lezione('m-carcere');
    ok(S.imparati['m-carcere'] && S.xp === 5 && foglio.innerHTML.includes('rieducazione'), 'lezione del carcere: +5 ⭐');
    lezione('m-carcere'); ok(S.xp === 5, 'la lezione si paga una volta sola'); chiudi();
    ok(CITTA.every((c, k) => k === 0 || (c.luoghi || []).length), 'ogni cittadina ha i suoi monumenti');
    // presentazione e compagno di studio
    S.nome = ''; presentazione(); $('#in-nome').value = 'Giulia'; $('#in-amico').value = '<b>Marco</b>';
    document.querySelector('.scelta-amico[data-a="2"]').click(); $('#b-via').click();
    ok(S.nome === 'Giulia' && S.compagno === '<b>Marco</b>' && S.amico === 2 && amico() === '&lt;b&gt;Marco&lt;/b&gt;', 'presentazione: nome, compagno (testo ripulito) e aspetto');
    ok(pulito({ nome: 'x'.repeat(50) }).nome.length === 20, 'nome lungo tagliato');
    parlaAmico(); ok(foglio.innerHTML.includes('compagno di studio'), 'il compagno ti dice cosa fare'); chiudi();
    S.monete = 0; incontro = { tipo: abitante(), nato: Date.now() }; parlaIncontro(); ok(foglio.innerHTML.includes('Lo sai che'), 'abitante: ti racconta un concetto');
    const fl = incontro.f; $('#b-via').click(); document.querySelector(`.opz[data-i="${mcDaFlashcard(fl, 'term').corretta}"]`) && 0;
    const giusto = [...document.querySelectorAll('.opz')].find(b => b.textContent === esc(pulisci(fl.domanda)) || b.textContent === pulisci(fl.domanda)); giusto.click();
    ok(S.monete === 5 && S.srs[fl.id] && foglio.innerHTML.includes('ricordato'), 'abitante: se te lo ricordi +5 🪙'); lasciaIncontro();
    ok([1, 2, 3, 4, 5, 6, 7, 8].every(g => (CONSIGLI[g] || []).length), 'consigli del compagno per ogni cittadina');
    entraPalestra('g1'); lottaAllenatore(0); $('#b-chiedi').click();
    ok(sess.tolte.length === 1 && sess.chiesto && !$('#b-chiedi') && foglio.querySelectorAll('.opz:disabled').length === 1, 'chiedi al compagno: una risposta sbagliata in meno');
    fineLotta(true); esciPalestra();
    // biblioteca
    ok(ARG.length > 90 && ARG.every(a => a.html && a.titolo), 'biblioteca: più di 90 libri con testo');
    Object.assign(S, { xp: 0, studio: {} }); entraBiblioteca(); ok(foglio.querySelectorAll('.libro[data-a]').length === ARG.length, 'biblioteca: un libro per argomento');
    foglio.querySelector('.libro[data-a="3"]').click(); for (let k = 0; k < 6; k++) $('#b-studiato') && $('#b-studiato').click();
    ok(nStudio(ARG[3]) === 4 && S.xp === 24 && foglio.innerHTML.includes('completato'), 'biblioteca: max 4 ripassi, +6 punti ciascuno');
    $('#b-scaffali').click(); ok(foglio.querySelector('.libro[data-a="3"]').classList.contains('l4'), 'biblioteca: il libro cambia colore');
    chiudi();
    // crocette difficili generate dalle flashcard
    const fcs = D.filter(x => x.tipo === 'flashcard');
    ok(fcs.every(f => { const m = mcDaFlashcard(f, 'def'), t = mcDaFlashcard(f, 'term');
      return [m, t].every(x => x.opzioni.length === 4 && new Set(x.opzioni).size === 4 && x.corretta >= 0); }) &&
      fcs.every(f => { const m = mcDaFlashcard(f, 'def'); return m.opzioni[m.corretta] === pulisci(f.risposta); }), 'domande difficili valide');
    S.monete = 0; S.reddito = Date.now() - 10 * 120000 - 5; ok(reddito() === 10 && S.monete === 10, 'monete col tempo: 1 ogni 2 minuti');
    // negozio
    S.monete = 100; S.looks = {}; ok(compra('sole') && S.looks.sole && S.monete === 40 && !compra('aureola'), 'negozio: compra con le monete');
    metti('sole'); ok(S.acc === 'sole', 'look indossato'); S.acc = null;
    // speed round giocato a tocchi
    S.xp = 0; avviaSpeed('Giorno 3', x => x.giorno === 3, 'g3', chiudi);
    ok(sess.lista.length === SPEED_N && sess.lista.every(x => x.giorno === 3), 'speed: 10 domande del giorno');
    for (let k = 0; k < SPEED_N; k++) { document.querySelector(`.opz[data-i="${sess.q.corretta}"]`).click(); clearTimeout(sess.prossimo); prossimaSpeed(); }
    ok(!sess && foglio.innerHTML.includes('10/10') && S.xp >= 10 * 3 + 20 && S.speed.g3 === 10, 'speed perfetto: punti extra e record');
    avviaSpeed('Giorno 1', x => x.giorno === 1, 'g1', chiudi); rispostaSpeed(-1); ok(sess.risultati[0].ok === false, 'speed: tempo scaduto = sbagliata');
    clearTimeout(sess.prossimo); $('#b-fine') && fineSpeed(); chiudi();
  } catch (e) { err.push('Errore: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  coda.length = 0; $('#modal').hidden = true;
  Object.assign(S, JSON.parse(salvato)); save(); aggiornaHUD();
  document.title = err.length ? 'TEST FALLITO' : 'TEST OK';
  document.body.insertAdjacentHTML('beforeend', `<pre id="test" style="position:fixed;top:60px;left:8px;z-index:99;background:#fff;padding:8px">${document.title} (3D: ${M.ok ? 'sì' : 'no'})\n${err.join('\n')}</pre>`);
}
