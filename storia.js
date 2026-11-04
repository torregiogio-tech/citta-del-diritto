// Contenuti del mondo: le 10 cittadine, i monumenti con la loro "lezione", i rompicapi dei varchi.
// Tutti i fatti vengono dalla sbobina (2_sbobina.md). I **grassetti** diventano evidenziati nell'app.
export const PASSO = 95;   // una cittadina ogni 95 m verso nord (deve combaciare con mondo.js)
const SLOT = { A: [-13, 13], B: [13, 13], C: [-13, -11], D: [13, -11] };
export const posto = (k, slot) => ({ x: SLOT[slot][0], z: -PASSO * k + SLOT[slot][1] });
const L = (k, slot, id, nome, cosa, info) => ({ id, nome, ...posto(k, slot), ...cosa, info });

export const CITTA = [
  { nome: 'Borgo dello Studente', colore: '#7ed957', palestra: null,
    amico: 'Questo è il nostro borgo: a sinistra casa tua con l\'armadio, a destra la biblioteca con tutti gli argomenti. Il viaggio comincia a nord, oltre il primo varco!' },
  { nome: 'Città di Confine', colore: '#7fb3e0', palestra: 'g1', slot: 'C',
    amico: 'Benvenuti a Città di Confine! Qui si studia lo **Stato**: **popolo, territorio e sovranità**. Vedi l\'ambasciata? Lì si parla di cittadinanza.',
    luoghi: [
      L(1, 'A', 'm-ambasciata', 'Ambasciata', { stile: 'ambasciata' }, 'All\'ambasciata si parla di **cittadinanza**. In Italia vale soprattutto lo **ius sanguinis**: è italiano chi ha padre o madre italiani (**dal 2025** con limiti per chi nasce all\'estero e ha un\'altra cittadinanza). Lo **ius soli** vale solo in casi rari: se i genitori sono **ignoti o apolidi**. Lo straniero nato in Italia che ci ha vissuto legalmente fino ai 18 anni può diventare cittadino con una **dichiarazione entro un anno**.'),
      L(1, 'B', 'm-faro', 'Faro', { speciale: 'faro' }, 'Il faro guarda il **mare territoriale**: anche il mare fa parte del **territorio** dello Stato, insieme alla **terraferma** e allo **spazio aereo**. Gli elementi dello Stato sono tre: **popolo, territorio e sovranità**. E la sovranità ha un aspetto **interno** (comandare sul territorio) e uno **esterno** (indipendenza dagli altri Stati).'),
    ] },
  { nome: 'Borgo delle Urne', colore: '#f2c14e', palestra: 'g2', slot: 'D',
    amico: 'Borgo delle Urne: qui si vota! Democrazia, **forme di governo** e **sistemi elettorali**. Occhio al palco del comizio.',
    luoghi: [
      L(2, 'A', 'm-palco', 'Palco del comizio', { speciale: 'palco' }, 'Dal palco si chiede il voto: è la **democrazia rappresentativa**. Accanto ci sono gli strumenti di **democrazia diretta**: l\'**iniziativa popolare** (**50.000 elettori**, art. 71), la **petizione** (art. 50) e il **referendum abrogativo** (art. 75: **500.000 firme** o **5 Consigli regionali**, con il **quorum**). Il referendum **costituzionale** (art. 138) invece **non ha quorum**.'),
      L(2, 'C', 'm-elettorale', 'Ufficio elettorale', { stile: 'sportelli', muro: '#fff3c4' }, 'Il sistema elettorale **trasforma i voti in seggi**. Col **maggioritario** vince chi prende più voti: pochi partiti e Governi stabili. Col **proporzionale** i seggi vanno in proporzione ai voti: tanti partiti e un Parlamento che "fotografa" il Paese. L\'Italia oggi ha un sistema **misto**, il **Rosatellum**.'),
    ] },
  { nome: 'Roma dei Palazzi', colore: '#d98e4a', palestra: 'g3', slot: 'C',
    amico: 'Roma dei Palazzi! **Montecitorio** è la Camera, **Palazzo Madama** il Senato, **Palazzo Chigi** il Governo. Qui si fanno le leggi.',
    luoghi: [
      L(3, 'A', 'm-madama', 'Palazzo Madama', { stile: 'madama' }, 'Palazzo Madama è il **Senato**: **200 senatori** più i senatori a vita. La Camera ha **400 deputati**. È un **bicameralismo perfetto**: le due Camere hanno **gli stessi poteri**, **entrambe** danno la fiducia e una legge va approvata da entrambe **nello stesso identico testo**. Se una la modifica, c\'è la **navetta**.'),
      L(3, 'B', 'm-chigi', 'Palazzo Chigi', { stile: 'chigi' }, 'Palazzo Chigi è la sede del **Governo**. Come nasce: **consultazioni** e **incarico** (sono prassi), poi **nomina** del Presidente del Consiglio e dei ministri, **giuramento** davanti al Presidente della Repubblica e **fiducia** di entrambe le Camere **entro 10 giorni** (art. 94).'),
    ] },
  { nome: 'Colle dei Garanti', colore: '#f0d9a0', palestra: 'g4', slot: 'D',
    amico: 'Il Colle dei Garanti: il **Quirinale** del Presidente della Repubblica e la **Consulta** della Corte costituzionale. Sono i **garanti** della Costituzione.',
    luoghi: [
      L(4, 'A', 'm-consulta', 'Palazzo della Consulta', { stile: 'consulta' }, 'Qui siede la **Corte costituzionale**: **15 giudici**, 5 nominati dal **Presidente della Repubblica**, 5 eletti dal **Parlamento in seduta comune**, 5 dalle **supreme magistrature**. Restano **9 anni** e **non sono rieleggibili**. Le sue decisioni **non si possono impugnare** (art. 137).'),
      L(4, 'C', 'm-colle', 'Loggia del Presidente', { stile: 'costituente', muro: '#f7ead0' }, 'Il **Presidente della Repubblica** rappresenta l\'**unità nazionale** (art. 87). È eletto dal **Parlamento in seduta comune** più i **delegati regionali**, per **7 anni**: nei primi tre scrutini servono i **2/3**, dal quarto la **maggioranza assoluta**. Serve almeno **50 anni** di età. Nessun suo atto vale senza la **controfirma** di un ministro.'),
    ] },
  { nome: 'Città delle Fonti', colore: '#b08a3a', palestra: 'g5', slot: 'C',
    amico: 'Città delle Fonti: Costituzione, leggi, decreti, regolamenti. Ricordati la **scala delle fonti**: ti servirà al prossimo varco!',
    luoghi: [
      L(5, 'A', 'm-gazzetta', 'Gazzetta Ufficiale', { stile: 'gazzetta' }, 'Le leggi si **pubblicano** sulla **Gazzetta Ufficiale** ed entrano in vigore di solito **15 giorni dopo**: è la **vacatio legis**. Da lì vale *ignorantia legis non excusat*: non conoscere la legge non è una scusa. Prima della pubblicazione c\'è la **promulgazione** del Presidente, **entro un mese**.'),
      L(5, 'B', 'm-costituente', 'Sala della Costituente', { stile: 'costituente' }, 'La Costituzione è entrata in vigore il **1° gennaio 1948**. È **rigida**: si cambia solo con l\'**art. 138**, cioè due voti per Camera a **3 mesi** di distanza, con la **maggioranza assoluta** nella seconda votazione. Con i **2/3** niente referendum. La **forma repubblicana** non si può cambiare (art. 139).'),
    ] },
  { nome: 'Quartiere Europa', colore: '#4a7fc1', palestra: 'g6', slot: 'D',
    amico: 'Quartiere Europa! Qui si parla di **Unione europea** e di **bilancio dello Stato**. Quella torre di vetro è il Parlamento europeo.',
    luoghi: [
      L(6, 'A', 'm-strasburgo', 'Parlamento europeo', { speciale: 'torre' }, 'L\'UE è un\'unione di **27 Stati**. L\'Italia le ha ceduto **parte della sovranità** grazie all\'**art. 11** della Costituzione. Se una norma UE **con effetto diretto** contrasta con una legge italiana, il giudice **disapplica** la legge italiana (**sentenza Granital, 1984**), salvo i **controlimiti**: i principi fondamentali e i diritti inviolabili.'),
      L(6, 'C', 'm-ragioneria', 'Ragioneria dello Stato', { stile: 'ragioneria' }, 'Il **bilancio**: **entro il 15 ottobre** il Governo presenta il disegno di legge di bilancio e le Camere devono approvarlo **entro il 31 dicembre**, così entra in vigore il 1° gennaio. Se non ce la fanno c\'è l\'**esercizio provvisorio**, autorizzato **con legge** per **massimo 4 mesi**.'),
    ] },
  { nome: 'Città delle Autonomie', colore: '#e3b26a', palestra: 'g7', slot: 'C',
    amico: 'Città delle Autonomie: **Regioni, Comuni** e **Pubblica Amministrazione**. Qui ognuno ha le sue competenze, ricordatelo per l\'art. 117!',
    luoghi: [
      L(7, 'A', 'm-municipio', 'Municipio', { stile: 'municipio' }, 'Con la riforma del **Titolo V (2001)** la Repubblica è fatta di **Comuni, Province, Città metropolitane, Regioni e Stato**, tutti **pari** (art. 114). Le funzioni amministrative vanno **di norma ai Comuni**, secondo la **sussidiarietà** (art. 118).'),
      L(7, 'B', 'm-sportelli', 'Sportelli della PA', { stile: 'sportelli' }, 'La **Pubblica Amministrazione** deve agire secondo **legalità, imparzialità e buon andamento** (art. 97). Decide con un **provvedimento** alla fine di un **procedimento** (legge **241/1990**). Un atto sbagliato si impugna davanti al **TAR**, per **incompetenza, violazione di legge o eccesso di potere**.'),
    ] },
  { nome: 'Città della Giustizia', colore: '#9aa0aa', palestra: 'g8', slot: 'D',
    amico: 'Città della Giustizia: **diritti, libertà** e **magistratura**. Quel posto con le sbarre è il carcere: ti racconto dell\'art. 13 e dell\'art. 27.',
    luoghi: [
      L(8, 'A', 'm-carcere', 'Carcere', { speciale: 'carcere' }, 'L\'**art. 13**: la **libertà personale** è **inviolabile**. Si può essere arrestati solo per **atto motivato dell\'autorità giudiziaria** e nei casi previsti dalla legge (**riserva di legge assoluta**). Se la polizia agisce d\'urgenza, entro **48 ore** lo comunica al giudice, che **convalida entro altre 48**, altrimenti l\'atto perde effetto. L\'**art. 27**: le pene devono tendere alla **rieducazione** e **non c\'è la pena di morte**.'),
      L(8, 'C', 'm-csm', 'Consiglio superiore della magistratura', { stile: 'csm' }, 'Il **CSM** decide sulla carriera dei magistrati ed è presieduto dal **Presidente della Repubblica**: **2/3** dei membri sono **togati** (eletti dai magistrati), **1/3** **laici** (eletti dal Parlamento). I giudici sono **soggetti soltanto alla legge** (art. 101) e **inamovibili** (art. 107).'),
    ] },
  { nome: 'Città Universitaria', colore: '#c8553d', palestra: null,
    amico: 'Ce l\'abbiamo fatta: la Città Universitaria! Là in fondo c\'è il **Rettorato**. Dieci domande su tutto il programma. Forza!',
    luoghi: [
      L(9, 'A', 'm-giurisprudenza', 'Facoltà di Giurisprudenza', { stile: 'aula' }, 'Un consiglio del prof per l\'orale: è meglio dire **"democrazia liberale"** che solo "democrazia". Non c\'è solo il voto, ma anche **diritti, pluralismo, separazione dei poteri** e rispetto della **Costituzione**.'),
    ] },
];

// I rompicapi: uno per percorso. Il varco k (tra la città k e la k+1) si apre risolvendo il rompicapo k
// e, dal varco 1 in poi, con la medaglia della palestra della città k. Il varco 9 vuole tutte le medaglie.
export const ENIGMI = [
  { tipo: 'leve', titolo: 'Le leve dello Stato',
    intro: 'Davanti al varco ci sono 4 leve. Ognuna ha un\'affermazione: **alza solo quelle vere** e poi prova il varco. Comincio io a spiegarti: lo Stato ha tre elementi…',
    leve: [
      { t: 'Gli elementi dello Stato sono popolo, territorio e sovranità.', v: true },
      { t: 'Il territorio comprende anche il mare territoriale e lo spazio aereo.', v: true },
      { t: 'In Italia la cittadinanza si acquista soprattutto per ius soli.', v: false, perche: 'No: vale soprattutto lo **ius sanguinis**; lo ius soli solo in casi rari.' },
      { t: 'La sovranità ha un aspetto interno e uno esterno.', v: true },
    ] },
  { tipo: 'pedane', titolo: 'Il cammino della storia',
    intro: 'Pesta le pedane **in ordine storico**: dalla prima forma di Stato moderno all\'ultima. Se sbagli, si ricomincia.',
    etichette: ['Stato assoluto', 'Stato di polizia', 'Stato liberale', 'Democrazia pluralista'],
    aiuto: 'Prima il re comanda su tutto (**assoluto**), poi lo fa "per il bene del popolo" (**di polizia**), poi lo si limita con la Costituzione (**liberale**), infine il potere va a tutti (**democrazia pluralista**).' },
  { tipo: 'pedane', titolo: 'Come nasce un Governo',
    intro: 'Pesta le pedane nell\'ordine in cui **nasce un Governo**.',
    etichette: ['Consultazioni', 'Incarico', 'Scioglimento riserva', 'Nomina', 'Giuramento', 'Fiducia'],
    aiuto: 'Il Presidente **consulta**, poi dà l\'**incarico**; l\'incaricato **scioglie la riserva**, arrivano **nomina** e **giuramento**, e infine la **fiducia** delle Camere entro 10 giorni.' },
  { tipo: 'leve', titolo: 'Le leve dei garanti',
    intro: '5 leve sul Presidente della Repubblica e sulla Corte costituzionale. **Alza solo le vere.**',
    leve: [
      { t: 'Il Presidente della Repubblica è eletto dal Parlamento in seduta comune con i delegati regionali.', v: true },
      { t: 'Il Presidente della Repubblica resta in carica 5 anni.', v: false, perche: 'Sono **7 anni**, più della legislatura.' },
      { t: 'Il Presidente può rinviare una legge alle Camere una sola volta.', v: true },
      { t: 'I giudici costituzionali sono 15 e restano in carica 9 anni.', v: true },
      { t: 'Le sentenze della Corte costituzionale si possono impugnare in Cassazione.', v: false, perche: 'Le decisioni della Corte **non si possono impugnare** (art. 137).' },
    ] },
  { tipo: 'pedane', titolo: 'Il ponte delle fonti',
    intro: 'Il ponte delle fonti: pesta le pedane **dalla fonte più alta alla più bassa** della gerarchia.',
    etichette: ['Costituzione', 'Fonti UE', 'Leggi e decreti', 'Regolamenti', 'Consuetudini'],
    aiuto: 'In cima **Costituzione e leggi costituzionali**, poi le **fonti UE**, poi le fonti primarie (**leggi**, **decreti-legge**, **decreti legislativi**), poi i **regolamenti**, e all\'ultimo gradino le **consuetudini**.' },
  { tipo: 'sportello', titolo: 'Lo sportello degli atti UE', insegna: 'ATTI UE',
    intro: 'L\'impiegato vuole sapere **come funziona ogni atto dell\'UE**. Abbina ogni atto alla descrizione giusta.',
    voci: ['Regolamento', 'Direttiva', 'Decisione', 'Raccomandazione'],
    scelte: ['Vincola in tutto ed è direttamente applicabile', 'Vincola nel risultato: va recepita', 'Vincola in tutto, ma solo i destinatari', 'Non è vincolante'],
    giuste: [0, 1, 2, 3],
    aiuto: '**Regolamento**: vale subito per tutti. **Direttiva**: lo Stato sceglie i mezzi e la recepisce entro un termine. **Decisione**: vincola solo chi è indicato. **Raccomandazione** e parere: non vincolano.' },
  { tipo: 'sportello', titolo: 'Lo sportello dell\'art. 117', insegna: 'ART. 117',
    intro: 'Chi fa le leggi su cosa? Per ogni materia scegli: **Stato** (esclusiva), **concorrente** (lo Stato fa i principi, la Regione i dettagli) o **Regione** (residuale).',
    voci: ['Difesa', 'Moneta', 'Ambiente', 'Salute', 'Governo del territorio', 'Energia', 'Turismo', 'Agricoltura', 'Commercio'],
    scelte: ['Stato', 'Concorrente', 'Regione'],
    giuste: [0, 0, 0, 1, 1, 1, 2, 2, 2],
    aiuto: '**Esclusiva dello Stato**: esteri, difesa, moneta, giustizia, ordine pubblico, concorrenza, **ambiente**. **Concorrente**: salute, istruzione, governo del territorio, energia. **Residuale** (Regione): tutto il resto, per esempio agricoltura, turismo, commercio.' },
  { tipo: 'leve', titolo: 'Le leve della libertà',
    intro: '5 leve su libertà e giustizia. **Alza solo le vere** e prova il varco.',
    leve: [
      { t: 'La libertà personale è inviolabile (art. 13).', v: true },
      { t: 'Se la polizia arresta d\'urgenza, il giudice deve convalidare entro 48 + 48 ore.', v: true },
      { t: 'Le pene devono tendere alla rieducazione del condannato.', v: true },
      { t: 'Il CSM è presieduto dal Ministro della Giustizia.', v: false, perche: 'È presieduto dal **Presidente della Repubblica**.' },
      { t: 'La regola delle 48 + 48 ore vale per il sequestro della stampa.', v: false, perche: 'Per la stampa la regola è **24 + 24 ore**; le 48 + 48 sono per la **libertà personale**.' },
    ] },
  { tipo: 'medaglie', titolo: 'Il varco del Rettorato', intro: 'L\'ultimo varco si apre solo con **tutte e 8 le medaglie**.' },
];
