'use strict';

/* =========================================================================
 * Gyakorló – gyakorlo.js
 * 1. Segédek, tárolás
 * 2. Alhálózat-számítás és feladatgenerálás
 * 3. Kérdések egységes alakra hozása (kvíz és vizsga)
 * 4. Menü
 * 5. Kvíz és próbavizsga (közös futtató)
 * 6. Terminál
 * 7. Alhálózat-gyakorló
 * 8. Tanulókártyák
 * 9. Útvonal (hash)
 *
 * Tartalom: kerdesek.js. Haladás: a böngésző tárhelyén (csak ezen az eszközön).
 * ========================================================================= */

/* =========================================================================
 * 1. SEGÉDEK, TÁROLÁS
 * ========================================================================= */
const { esc, rich, store, shuffle, dayKey } = Hub;
const main = document.getElementById('main');

const STAT_KEY = 'hub-gyakorlo';     // { temak: { id: { ok, ossz } }, vizsgak: [{ d, pct, jegy, n }] }
const CARD_KEY = 'hub-kartyak';      // { kártyaId: { b: doboz 1–5, d: 'ÉÉÉÉ-HH-NN' mikor esedékes } }

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
const temaNev = (id) => (TEMAK.find((t) => t.id === id) || PARANCSTEMAK.find((t) => t.id === id) || { nev: id }).nev;

let cleanup = null;                  // az aktuális nézet takarítója (időzítő, billentyűfigyelő)

function setView(html, onLeave) {
  if (cleanup) cleanup();
  cleanup = onLeave || null;
  main.innerHTML = html;
}

function addStat(tema, ok) {
  const data = store.get(STAT_KEY, {});
  data.temak = data.temak || {};
  const s = data.temak[tema] || { ok: 0, ossz: 0 };
  s.ossz += 1;
  if (ok) s.ok += 1;
  data.temak[tema] = s;
  store.set(STAT_KEY, data);
}

function grade(pct) {
  if (pct >= 85) return 'jeles (5)';
  if (pct >= 70) return 'jó (4)';
  if (pct >= 55) return 'közepes (3)';
  if (pct >= 40) return 'elégséges (2)';
  return 'elégtelen (1)';
}

/** Témaválasztó gombsor: több is kijelölhető, legalább egy marad */
function chipsHtml(list, selected, counts) {
  return `<div class="chip-row" data-chips>${list.map((t) => `
    <button class="chip" type="button" data-id="${esc(t.id)}" aria-pressed="${selected.has(t.id)}">
      ${esc(t.nev)}${counts ? `<span class="chip-count">${counts[t.id] || 0}</span>` : ''}
    </button>`).join('')}</div>`;
}

function bindChips(host, selected, onChange) {
  host.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const id = chip.dataset.id;
    if (selected.has(id)) {
      if (selected.size === 1) return;
      selected.delete(id);
    } else {
      selected.add(id);
    }
    chip.setAttribute('aria-pressed', String(selected.has(id)));
    if (onChange) onChange();
  });
}

const backLink = '<a class="back-link" href="#">← Gyakorló</a>';

/* =========================================================================
 * 2. ALHÁLÓZAT
 * ========================================================================= */
const toIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');

function subnetOf(ipNum, prefix) {
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const wild = ~mask >>> 0;
  const net = (ipNum & mask) >>> 0;
  const bcast = (net | wild) >>> 0;
  return {
    ip: toIp(ipNum),
    prefix,
    net: toIp(net),
    first: toIp(net + 1),
    last: toIp(bcast - 1),
    bcast: toIp(bcast),
    mask: toIp(mask),
    wild: toIp(wild),
    hosts: String(2 ** (32 - prefix) - 2)
  };
}

/** Véletlen privát cím /16–/30 prefixszel; a cím nem a hálózati és nem a broadcast cím */
function randomSubnet() {
  const prefix = pick([24, 24, 25, 26, 26, 27, 27, 28, 28, 29, 30, 30, 23, 22, 20, 16]);
  const base = pick([
    () => (10 << 24) | (rand(0, 255) << 16) | (rand(0, 255) << 8),
    () => (172 << 24) | (rand(16, 31) << 16) | (rand(0, 255) << 8),
    () => (192 << 24) | (168 << 16) | (rand(0, 255) << 8)
  ])() >>> 0;
  const size = 2 ** (32 - prefix);
  const net = (((base | rand(0, 255)) >>> 0) & ((0xffffffff << (32 - prefix)) >>> 0)) >>> 0;
  return subnetOf((net + rand(1, size - 2)) >>> 0, prefix);
}

const SUBNET_FIELDS = [
  ['net', 'Hálózati cím', 'a(z) {c} hálózati címe'],
  ['first', 'Első használható cím', 'a(z) {c} hálózat első használható gépcíme'],
  ['last', 'Utolsó használható cím', 'a(z) {c} hálózat utolsó használható gépcíme'],
  ['bcast', 'Broadcast cím', 'a(z) {c} hálózat broadcast címe'],
  ['mask', 'Alhálózati maszk', 'az alhálózati maszk a /{p} prefixhez'],
  ['wild', 'Wildcard maszk', 'a wildcard maszk a /{p} prefixhez'],
  ['hosts', 'Használható gépek száma', 'a használható gépcímek száma egy /{p} prefixű hálózatban']
];

/* =========================================================================
 * 3. KÉRDÉSEK EGYSÉGES ALAKRA HOZÁSA
 * Minden elem: { tema, q, prompt?, kind: 'mc' | 'typed', options?, correct?,
 *                check(válasz), solution, m }
 * ========================================================================= */
function itemFromQuestion(k) {
  if (k.a) {
    const options = shuffle(k.a.map((text, i) => ({ text, ok: i === 0 })));
    return {
      tema: k.t, q: k.q, m: k.m, kind: 'mc',
      options: options.map((o) => o.text),
      correct: options.findIndex((o) => o.ok),
      solution: k.a[0],
      check(ans) { return ans === this.correct; }
    };
  }
  return {
    tema: k.t, q: k.q, m: k.m, kind: 'typed', mono: Boolean(k.ios),
    solution: k.be[0],
    check: (ans) => (k.ios
      ? IOS.match(k.be, ans || '')
      : k.be.some((b) => norm(b) === norm(ans || '')))
  };
}

/** Egylépéses terminálfeladat vizsgakérdésként */
function itemFromCommand(f) {
  const step = f.lepesek[0];
  return {
    tema: f.t, q: f.q, prompt: step.p, kind: 'typed', mono: true,
    m: 'A kulcsszavak rövidítve is jók (pl. `sh ip int br`).',
    solution: IOS.display(step.c),
    check: (ans) => IOS.match(step.c, ans || '')
  };
}

function itemFromSubnet() {
  const s = randomSubnet();
  const [key, , text] = pick(SUBNET_FIELDS);
  const what = text.replace('{c}', `${s.ip}/${s.prefix}`).replace('{p}', s.prefix);
  return {
    tema: 'alhalo', q: `Mi ${what}?`, kind: 'typed', mono: true,
    m: `${s.ip}/${s.prefix}: hálózat ${s.net}, gépek ${s.first} – ${s.last}, broadcast ${s.bcast}, maszk ${s.mask}, wildcard ${s.wild}.`,
    solution: s[key],
    check: (ans) => norm(ans || '') === s[key]
  };
}

/* =========================================================================
 * 4. MENÜ
 * ========================================================================= */
const MODES = [
  { id: 'kviz', nev: 'Kvíz', tone: 'var(--cat-switching)',
    leiras: 'Feleletválasztós és beírós kérdések témánként, azonnali magyarázattal.',
    icon: '<path d="M9.2 9a3 3 0 1 1 4.6 2.5c-.9.6-1.8 1.3-1.8 2.5M12 17.5h.01"/><circle cx="12" cy="12" r="9"/>' },
  { id: 'parancs', nev: 'Terminál', tone: 'var(--cat-services)',
    leiras: 'Feladatot kapsz, és be kell írnod a pontos IOS parancsokat – rövidítve is jó.',
    icon: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 10l3 2.5L7 15M12.5 15H17"/>' },
  { id: 'alhalo', nev: 'Alhálózat', tone: 'var(--cat-segedlet)',
    leiras: 'Véletlen IP-cím és prefix: számold ki a hálózatot, a broadcastot és a maszkokat.',
    icon: '<circle cx="12" cy="5.5" r="2.5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M12 8v4M5.5 16v-4h13v4"/>' },
  { id: 'kartyak', nev: 'Tanulókártyák', tone: 'var(--cat-wan)',
    leiras: 'Portok, fogalmak, parancsok. Amit nem tudsz, hamarabb jön elő újra.',
    icon: '<rect x="3.5" y="7" width="14" height="12" rx="2"/><path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4h10A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H17.5"/>' },
  { id: 'vizsga', nev: 'Próbavizsga', tone: 'var(--cat-security)',
    leiras: 'Vegyes kérdéssor időre, a végén százalék, jegy és a hibák átnézése.',
    icon: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>' }
];

function viewMenu() {
  const data = store.get(STAT_KEY, {});
  const temak = Object.values(data.temak || {});
  const ossz = temak.reduce((n, s) => n + s.ossz, 0);
  const ok = temak.reduce((n, s) => n + s.ok, 0);
  const due = dueCards(allCards(), store.get(CARD_KEY, {})).seen.length;
  const last = (data.vizsgak || [])[0];

  const meta = {
    kviz: `${KERDESEK.length} kérdés${ossz ? ` · eddig ${Math.round((ok / ossz) * 100)}% jó` : ''}`,
    parancs: `${PARANCSFELADATOK.length} feladat`,
    alhalo: 'végtelen feladat',
    kartyak: due ? `${due} kártya ismétlésre vár` : `${allCards().length} kártya`,
    vizsga: last ? `legutóbb ${last.pct}% – ${last.jegy}` : 'még nem volt'
  };

  setView(`
    <div class="page-head">
      <h1 class="page-title">Gyakorló</h1>
      <p class="page-sub">Válassz módot. A haladásod ezen az eszközön marad meg, a böngészőben.</p>
    </div>
    <div class="grid">
      ${MODES.map((m) => `
        <a class="tile" href="#${m.id}" style="--tone: ${m.tone}">
          <span class="tile-icon" aria-hidden="true"><svg class="hub-icon" viewBox="0 0 24 24">${m.icon}</svg></span>
          <span class="tile-title">${m.nev}</span>
          <span class="tile-desc">${m.leiras}</span>
          <span class="tile-meta">${esc(meta[m.id])}</span>
        </a>`).join('')}
    </div>
    ${(data.vizsgak || []).length ? `
      <section class="section stage">
        <div class="section-head"><h2 class="section-title">Korábbi próbavizsgák</h2></div>
        <ul class="history panel">
          ${data.vizsgak.map((v) => `<li><span>${esc(v.d)} · ${v.n} kérdés</span><span><strong>${v.pct}%</strong> – ${esc(v.jegy)}</span></li>`).join('')}
        </ul>
      </section>` : ''}`);
}

/* =========================================================================
 * 5. KVÍZ ÉS PRÓBAVIZSGA
 * ========================================================================= */
function viewQuizSetup(mode) {
  const isExam = mode === 'vizsga';
  const selected = new Set(TEMAK.map((t) => t.id));
  const counts = {};
  KERDESEK.forEach((k) => { counts[k.t] = (counts[k.t] || 0) + 1; });
  let count = isExam ? 20 : 10;
  const extras = { parancs: true, alhalo: true };

  setView(`
    <div class="stage">
      ${backLink}
      <div class="page-head">
        <h1 class="page-title">${isExam ? 'Próbavizsga' : 'Kvíz'}</h1>
        <p class="page-sub">${isExam
          ? 'Időre megy, kérdésenként egy perc. Közben nincs visszajelzés, a végén kapsz százalékot, jegyet és átnézheted a hibáidat.'
          : 'Minden válasz után rögtön látod a megoldást és a magyarázatot.'}</p>
      </div>
      <div class="panel setup">
        <div class="setup-group">
          <span class="label">Témák</span>
          ${chipsHtml(TEMAK, selected, counts)}
        </div>
        ${isExam ? `
        <div class="setup-group">
          <span class="label">Kerüljön bele</span>
          <div class="chip-row" id="extras">
            <button class="chip" type="button" data-id="parancs" aria-pressed="true">Parancsbeírás</button>
            <button class="chip" type="button" data-id="alhalo" aria-pressed="true">Alhálózat-számítás</button>
          </div>
        </div>` : ''}
        <div class="setup-group">
          <span class="label">Kérdések száma</span>
          <div class="chip-row" id="counts">
            ${(isExam ? [10, 20, 30] : [5, 10, 20]).map((n) => `<button class="chip" type="button" data-n="${n}" aria-pressed="${n === count}">${n}</button>`).join('')}
          </div>
        </div>
        <div><button id="start" class="btn btn-primary" type="button">Indítás</button></div>
      </div>
    </div>`);

  bindChips(main.querySelector('[data-chips]'), selected);

  main.querySelector('#counts').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    count = Number(chip.dataset.n);
    main.querySelectorAll('#counts .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  });

  if (isExam) {
    main.querySelector('#extras').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      extras[chip.dataset.id] = !extras[chip.dataset.id];
      chip.setAttribute('aria-pressed', String(extras[chip.dataset.id]));
    });
  }

  main.querySelector('#start').addEventListener('click', () => {
    startRun(mode, buildItems([...selected], count, isExam ? extras : {}));
  });
}

function buildItems(temak, count, extras) {
  const pool = shuffle(KERDESEK.filter((k) => temak.includes(k.t))).map(itemFromQuestion);
  const items = [];

  // Vizsgán a kérdések kb. 15–15%-a parancsbeírás és alhálózat
  const share = Math.max(1, Math.round(count * 0.15));
  if (extras.parancs) {
    const single = shuffle(PARANCSFELADATOK.filter((f) => f.lepesek.length === 1));
    items.push(...single.slice(0, share).map(itemFromCommand));
  }
  if (extras.alhalo) {
    for (let i = 0; i < share; i++) items.push(itemFromSubnet());
  }

  items.push(...pool.slice(0, Math.max(0, count - items.length)));
  return shuffle(items);
}

function startRun(mode, items) {
  if (!items.length) return;
  const isExam = mode === 'vizsga';
  const run = {
    items,
    idx: 0,
    answers: items.map(() => null),
    shown: items.map(() => false),            // kvíz: megmutattuk-e már a megoldást
    deadline: isExam ? Date.now() + items.length * 60000 : 0
  };

  const answered = (i) => run.answers[i] !== null && run.answers[i] !== '';
  const isOk = (i) => answered(i) && run.items[i].check(run.answers[i]);

  function timeText() {
    const left = Math.max(0, Math.round((run.deadline - Date.now()) / 1000));
    return { left, text: `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}` };
  }

  function render() {
    const item = run.items[run.idx];
    const ans = run.answers[run.idx];
    const shown = run.shown[run.idx];
    const lastOne = run.idx === run.items.length - 1;
    const t = isExam ? timeText() : null;

    let body = '';
    if (item.kind === 'mc') {
      body = `<div class="answers">${item.options.map((o, i) => {
        let state = '';
        if (shown && i === item.correct) state = 'ok';
        else if (shown && i === ans) state = 'bad';
        else if (!shown && i === ans) state = 'picked';
        return `<button class="answer" type="button" data-i="${i}"${state ? ` data-state="${state}"` : ''}${shown ? ' disabled' : ''}>
          <kbd>${i + 1}</kbd><span>${esc(o)}</span></button>`;
      }).join('')}</div>`;
    } else {
      const state = shown ? (isOk(run.idx) ? 'ok' : 'bad') : '';
      body = `<form class="typed-row" id="typed">
        <input id="typedInput" class="field${item.mono ? ' mono' : ''}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
          placeholder="${item.prompt ? 'Írd be a parancsot' : 'Írd be a választ'}" value="${esc(ans || '')}"${state ? ` data-state="${state}"` : ''}${shown ? ' readonly' : ''}>
        ${isExam || shown ? '' : '<button class="btn" type="submit">Ellenőrzés</button>'}
      </form>`;
    }

    const feedback = shown ? `
      <div class="feedback" role="status">
        <p class="feedback-title ${isOk(run.idx) ? 'ok' : 'bad'}">${isOk(run.idx) ? 'Helyes!' : `Nem jó. A megoldás: ${esc(item.solution)}`}</p>
        ${item.m ? `<p>${rich(item.m)}</p>` : ''}
      </div>` : '';

    main.innerHTML = `
      <div class="stage">
        <div class="progress-line">
          <span>${run.idx + 1} / ${run.items.length}</span>
          <div class="bar"><span style="width:${((run.idx + (shown ? 1 : 0)) / run.items.length) * 100}%"></span></div>
          ${isExam ? `<span id="timer" class="timer"${t.left <= 60 ? ' data-low' : ''}>${t.text}</span>` : ''}
        </div>
        <div class="panel">
          <p class="q-topic">${esc(item.tema === 'alhalo' ? 'Alhálózat-számítás' : temaNev(item.tema))}</p>
          <h1 class="q-text">${esc(item.q)}</h1>
          ${item.prompt ? `<p class="q-prompt">Itt állsz: <span class="mono">${esc(item.prompt)}</span></p>` : ''}
          ${body}
          ${feedback}
        </div>
        <div class="stage-foot">
          ${isExam
            ? `<button class="btn" type="button" id="prev"${run.idx === 0 ? ' disabled' : ''}>Előző</button>
               <div class="btn-row">
                 ${lastOne ? '' : '<button class="btn" type="button" id="next">Következő</button>'}
                 <button class="btn${lastOne ? ' btn-primary' : ''}" type="button" id="finish">Befejezés</button>
               </div>`
            : `<a class="btn" href="#">Kilépés</a>
               ${shown ? `<button class="btn btn-primary" type="button" id="next">${lastOne ? 'Eredmény' : 'Tovább'}</button>` : '<span></span>'}`}
        </div>
      </div>`;

    const input = main.querySelector('#typedInput');
    if (input && !shown) input.focus();
    else if (shown) main.querySelector('#next').focus();
  }

  /** Kvíz: a válasz lezárása és a megoldás megmutatása */
  function reveal() {
    if (run.shown[run.idx] || !answered(run.idx)) return;
    run.shown[run.idx] = true;
    addStat(run.items[run.idx].tema, isOk(run.idx));
    render();
  }

  function go(step) {
    const next = run.idx + step;
    if (next < 0) return;
    if (next >= run.items.length) { if (!isExam) finish(); return; }   // vizsgát csak a Befejezés gomb zár le
    run.idx = next;
    render();
  }

  function finish() {
    const total = run.items.length;
    const good = run.items.filter((_, i) => isOk(i)).length;
    const pct = Math.round((good / total) * 100);

    if (isExam) {
      run.items.forEach((it, i) => addStat(it.tema, isOk(i)));
      const data = store.get(STAT_KEY, {});
      data.vizsgak = [{ d: dayKey(), pct, jegy: grade(pct), n: total }, ...(data.vizsgak || [])].slice(0, 10);
      store.set(STAT_KEY, data);
    }

    const wrong = run.items.map((it, i) => ({ it, i })).filter(({ i }) => !isOk(i));
    setView(`
      <div class="stage">
        <div class="panel">
          <p class="eyebrow">${isExam ? 'Próbavizsga eredménye' : 'Kvíz eredménye'}</p>
          <p class="result-score">${pct}%</p>
          ${isExam ? `<p class="result-grade">${esc(grade(pct))}</p>` : ''}
          <p class="result-sub">${good} jó válasz ${total} kérdésből.${isExam ? ' A jegy tájékoztató: 40% / 55% / 70% / 85% a határ.' : ''}</p>
          <div class="btn-row" style="margin-top:16px">
            <a class="btn btn-primary" href="#${mode}" id="again">Új ${isExam ? 'próbavizsga' : 'kvíz'}</a>
            <a class="btn" href="#">Vissza a gyakorlóhoz</a>
          </div>
        </div>
        ${wrong.length ? `
          <section class="section">
            <div class="section-head"><h2 class="section-title">Ezeket nézd át</h2><span class="section-note">${wrong.length} hiba</span></div>
            <div class="review">
              ${wrong.map(({ it, i }) => {
                const given = !answered(i) ? 'nem válaszoltál'
                  : (it.kind === 'mc' ? it.options[run.answers[i]] : run.answers[i]);
                return `<div class="review-item">
                  <p class="review-q">${esc(it.q)}</p>
                  <p class="review-a">Te: <span class="bad">${esc(given)}</span></p>
                  <p class="review-a">Helyes: <span class="ok${it.mono ? ' mono' : ''}">${esc(it.solution)}</span></p>
                  ${it.m ? `<p class="review-a">${rich(it.m)}</p>` : ''}
                </div>`;
              }).join('')}
            </div>
          </section>` : '<p class="section-note" style="margin-top:14px">Hibátlan – nincs mit átnézni.</p>'}
      </div>`);

    // Ugyanarra a hash-re mutató link nem vált ki hashchange-et
    main.querySelector('#again').addEventListener('click', (e) => {
      if (location.hash === `#${mode}`) { e.preventDefault(); viewQuizSetup(mode); }
    });
    window.scrollTo(0, 0);
  }

  /* Eseménykezelés: egy helyen, a main elemen */
  function onClick(e) {
    const answer = e.target.closest('.answer');
    if (answer && !run.shown[run.idx]) {
      run.answers[run.idx] = Number(answer.dataset.i);
      if (isExam) render(); else reveal();
      return;
    }
    if (e.target.closest('#next')) go(1);
    else if (e.target.closest('#prev')) go(-1);
    else if (e.target.closest('#finish')) {
      const open = run.answers.filter((_, i) => !answered(i)).length;
      if (!open || window.confirm(`Még ${open} kérdésre nem válaszoltál. Biztosan befejezed?`)) finish();
    }
  }

  function onInput(e) {
    if (e.target.id === 'typedInput') run.answers[run.idx] = e.target.value;
  }

  function onSubmit(e) {
    if (e.target.id !== 'typed') return;
    e.preventDefault();
    if (isExam) go(1); else reveal();
  }

  function onKey(e) {
    const typing = e.target.tagName === 'INPUT';
    const item = run.items[run.idx];
    if (!typing && item.kind === 'mc' && /^[1-4]$/.test(e.key) && !run.shown[run.idx]) {
      const i = Number(e.key) - 1;
      if (i < item.options.length) {
        run.answers[run.idx] = i;
        if (isExam) render(); else reveal();
      }
    } else if (!typing && isExam && e.key === 'ArrowRight') go(1);
    else if (!typing && isExam && e.key === 'ArrowLeft') go(-1);
  }

  main.addEventListener('click', onClick);
  main.addEventListener('input', onInput);
  main.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKey);

  const timer = isExam ? setInterval(() => {
    const t = timeText();
    const el = document.getElementById('timer');
    if (el) {
      el.textContent = t.text;
      if (t.left <= 60) el.setAttribute('data-low', '');
    }
    if (t.left <= 0) finish();
  }, 1000) : 0;

  if (cleanup) cleanup();
  cleanup = () => {
    main.removeEventListener('click', onClick);
    main.removeEventListener('input', onInput);
    main.removeEventListener('submit', onSubmit);
    document.removeEventListener('keydown', onKey);
    if (timer) clearInterval(timer);
  };

  render();
  window.scrollTo(0, 0);
}

/* =========================================================================
 * 6. TERMINÁL
 * ========================================================================= */
function viewTerminal() {
  const selected = new Set(PARANCSTEMAK.map((t) => t.id));
  const counts = {};
  PARANCSFELADATOK.forEach((f) => { counts[f.t] = (counts[f.t] || 0) + 1; });

  let queue = [];
  let task = null;
  let step = 0;
  let tries = 0;
  let helped = false;
  let lines = [];                    // { cls, html }
  const score = { ok: 0, ossz: 0 };

  setView(`
    <div class="stage">
      ${backLink}
      <div class="page-head">
        <h1 class="page-title">Terminál</h1>
        <p class="page-sub">Írd be a feladathoz tartozó parancsokat, soronként Enterrel. Rövidítve is jó, ahogy az IOS-ben: <code>conf t</code>, <code>int g0/0</code>, <code>sh ip int br</code>.</p>
      </div>
      ${chipsHtml(PARANCSTEMAK, selected, counts)}
      <div class="panel" style="margin-top:16px">
        <p id="tTopic" class="q-topic"></p>
        <h2 id="tTask" class="q-text"></h2>
        <div class="term">
          <div class="term-head"><span>IOS terminál</span><span id="tScore"></span></div>
          <div id="tBody" class="term-body">
            <div id="tLines"></div>
            <form id="tForm" class="term-input-row">
              <label id="tPrompt" class="p" for="tInput"></label>
              <input id="tInput" class="term-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Parancs">
            </form>
          </div>
        </div>
        <p id="tSteps" class="term-steps"></p>
      </div>
      <div class="stage-foot">
        <button id="tHelp" class="btn" type="button">Megoldás mutatása</button>
        <button id="tNext" class="btn" type="button">Másik feladat</button>
      </div>
    </div>`);

  const el = (id) => main.querySelector(`#${id}`);

  function draw() {
    const done = step >= task.lepesek.length;
    el('tTopic').textContent = temaNev(task.t);
    el('tTask').textContent = task.q;
    el('tLines').innerHTML = lines.map((l) => `<div class="term-line ${l.cls}">${l.html}</div>`).join('');
    el('tForm').hidden = done;
    el('tPrompt').textContent = done ? '' : task.lepesek[step].p;
    el('tSteps').textContent = done
      ? (helped ? 'Kész – de segítséggel. Ez a feladat még előjön.' : 'Kész, hibátlanul!')
      : `${step + 1}. lépés (összesen ${task.lepesek.length})`;
    el('tScore').textContent = score.ossz ? `${score.ok} / ${score.ossz} segítség nélkül` : '';
    el('tHelp').disabled = done;
    el('tNext').textContent = done ? 'Következő feladat' : 'Másik feladat';
    el('tNext').classList.toggle('btn-primary', done);
    el('tBody').scrollTop = el('tBody').scrollHeight;
    if (!done) el('tInput').focus();
    else el('tNext').focus();
  }

  function nextTask() {
    if (!queue.length) queue = shuffle(PARANCSFELADATOK.filter((f) => selected.has(f.t)));
    task = queue.shift();
    step = 0;
    tries = 0;
    helped = false;
    lines = [];
    draw();
  }

  function advance() {
    step += 1;
    tries = 0;
    if (step >= task.lepesek.length) {
      score.ossz += 1;
      if (!helped) score.ok += 1;
      else queue.push(task);                         // amit segítséggel oldott meg, visszakerül a sor végére
      addStat(task.t, !helped);
      lines.push({ cls: 'done', html: helped ? '✓ Kész (segítséggel)' : '✓ Kész' });
    }
  }

  function onSubmit(e) {
    if (e.target.id !== 'tForm') return;
    e.preventDefault();
    const input = el('tInput');
    const value = input.value.trim();
    if (!value) return;
    const cur = task.lepesek[step];
    lines.push({ cls: '', html: `<span class="p">${esc(cur.p)}</span> ${esc(value)}` });
    input.value = '';

    if (IOS.match(cur.c, value)) {
      advance();
    } else {
      tries += 1;
      lines.push({ cls: 'err', html: '% Invalid input – ez nem a várt parancs.' });
      if (tries === 2) lines.push({ cls: 'hint', html: 'Tipp: nézd meg, jó módban vagy-e (a prompt mutatja), és nem hiányzik-e egy paraméter.' });
    }
    draw();
  }

  function onClick(e) {
    if (e.target.closest('#tNext')) nextTask();
    else if (e.target.closest('#tHelp')) {
      const cur = task.lepesek[step];
      helped = true;
      lines.push({ cls: 'hint', html: `Megoldás: <span class="p">${esc(cur.p)}</span> ${esc(IOS.display(cur.c))}` });
      advance();
      draw();
    } else if (e.target.closest('#tBody') && step < task.lepesek.length) {
      el('tInput').focus();
    }
  }

  main.addEventListener('submit', onSubmit);
  main.addEventListener('click', onClick);
  bindChips(main.querySelector('[data-chips]'), selected, () => { queue = []; nextTask(); });

  cleanup = () => {
    main.removeEventListener('submit', onSubmit);
    main.removeEventListener('click', onClick);
  };

  nextTask();
}

/* =========================================================================
 * 7. ALHÁLÓZAT-GYAKORLÓ
 * ========================================================================= */
function viewSubnet() {
  let s = null;
  let checked = false;
  const score = { ok: 0, ossz: 0 };

  setView(`
    <div class="stage">
      ${backLink}
      <div class="page-head">
        <h1 class="page-title">Alhálózat-számítás</h1>
        <p class="page-sub">Töltsd ki mind a hét mezőt, aztán ellenőrizd. Számológép nélkül az igazi – a vizsgán sem lesz.</p>
      </div>
      <form id="sForm" class="panel" autocomplete="off">
        <p class="eyebrow">A megadott cím</p>
        <p id="sGiven" class="subnet-given"></p>
        <div class="subnet-grid">
          ${SUBNET_FIELDS.map(([key, label]) => `
            <div>
              <label class="label" for="s-${key}">${label}</label>
              <input id="s-${key}" class="field mono" type="text" inputmode="${key === 'hosts' ? 'numeric' : 'decimal'}" data-key="${key}" spellcheck="false">
              <p class="subnet-fix" data-fix="${key}"></p>
            </div>`).join('')}
        </div>
        <div class="stage-foot">
          <span id="sScore" class="faint mono"></span>
          <div class="btn-row">
            <button id="sNew" class="btn" type="button">Új feladat</button>
            <button id="sCheck" class="btn btn-primary" type="submit">Ellenőrzés</button>
          </div>
        </div>
      </form>
      <p class="section-note" style="margin-top:14px">Elakadtál? A <a href="../parancstar/#cmd-subnet-calc">parancstár alhálózat-kalkulátora</a> megmutatja a számolást, a maszktáblázat pedig ott van alatta.</p>
    </div>`);

  const form = main.querySelector('#sForm');

  function newTask() {
    s = randomSubnet();
    checked = false;
    main.querySelector('#sGiven').textContent = `${s.ip} /${s.prefix}`;
    form.querySelectorAll('.field').forEach((f) => {
      f.value = '';
      f.removeAttribute('data-state');
      f.readOnly = false;
    });
    form.querySelectorAll('.subnet-fix').forEach((p) => { p.textContent = ''; });
    main.querySelector('#sCheck').disabled = false;
    main.querySelector('#sScore').textContent = score.ossz ? `${score.ok} / ${score.ossz} hibátlan` : '';
    form.querySelector('.field').focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    if (checked) return;
    checked = true;
    let allOk = true;
    form.querySelectorAll('.field').forEach((f) => {
      const key = f.dataset.key;
      const ok = norm(f.value).replace(/\s/g, '') === s[key];
      if (!ok) allOk = false;
      f.dataset.state = ok ? 'ok' : 'bad';
      f.readOnly = true;
      form.querySelector(`[data-fix="${key}"]`).textContent = ok ? '' : `helyesen: ${s[key]}`;
    });
    score.ossz += 1;
    if (allOk) score.ok += 1;
    addStat('alhalo', allOk);
    main.querySelector('#sCheck').disabled = true;
    main.querySelector('#sScore').textContent = `${allOk ? 'Hibátlan! ' : ''}${score.ok} / ${score.ossz} hibátlan`;
    main.querySelector('#sNew').focus();
  }

  form.addEventListener('submit', onSubmit);
  main.querySelector('#sNew').addEventListener('click', newTask);
  newTask();
}

/* =========================================================================
 * 8. TANULÓKÁRTYÁK (Leitner-dobozok)
 * Doboz 1–5; jó válasz után egy dobozzal feljebb kerül, és csak ennyi nap
 * múlva jön újra: 1, 3, 7, 14, 30. Rossz válasz után vissza az 1-es dobozba,
 * és a kör végén még egyszer előjön.
 * ========================================================================= */
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
let cardCache = null;

/** Saját kártyák + a parancstár magyarázott sorai (magyarázat → parancs) */
function allCards() {
  if (cardCache) return cardCache;
  const cards = KARTYAK.map((k) => ({ id: `${k.t}|${k.e}`, deck: k.t, front: k.e, back: k.h, ctx: '' }));

  if (typeof COMMANDS !== 'undefined') {
    COMMANDS.forEach((item) => {
      (item.blocks || []).forEach((b) => {
        if (b.lang !== 'ios' && b.lang !== 'pc') return;
        b.code.split('\n').forEach((raw) => {
          const m = raw.replace(/\s+$/, '').match(/^(.*?\S)\s+\/\/\s+(.*)$/);
          if (!m) return;
          const cmd = m[1].trim();
          cards.push({ id: `pt|${item.id}|${cmd}`, deck: `pt-${item.category}`, front: m[2], back: cmd, ctx: item.title, mono: true });
        });
      });
    });
  }
  cardCache = cards;
  return cards;
}

function allDecks() {
  const decks = PAKLIK.slice();
  if (typeof CATEGORIES !== 'undefined') {
    CATEGORIES.forEach((c) => {
      if (allCards().some((k) => k.deck === `pt-${c.id}`)) decks.push({ id: `pt-${c.id}`, nev: `Parancsok: ${c.label}` });
    });
  }
  return decks;
}

/** Esedékes kártyák: a már látottak (lejárt határidővel) és az újak külön */
function dueCards(cards, state) {
  const today = dayKey();
  const seen = [];
  const fresh = [];
  cards.forEach((c) => {
    const s = state[c.id];
    if (!s) fresh.push(c);
    else if (s.d <= today) seen.push(c);
  });
  return { seen, fresh };
}

function viewCards() {
  const decks = allDecks();
  const selected = new Set(PAKLIK.map((p) => p.id));
  const counts = {};
  allCards().forEach((c) => { counts[c.deck] = (counts[c.deck] || 0) + 1; });

  function setup() {
    setView(`
      <div class="stage">
        ${backLink}
        <div class="page-head">
          <h1 class="page-title">Tanulókártyák</h1>
          <p class="page-sub">Gondold végig a választ, fordítsd meg a kártyát, és mondd meg őszintén, tudtad-e. Amit tudtál, egyre ritkábban jön elő; amit nem, az holnap megint.</p>
        </div>
        <div class="panel setup">
          <div class="setup-group">
            <span class="label">Paklik</span>
            ${chipsHtml(decks, selected, counts)}
          </div>
          <div class="setup-group">
            <span class="label">Hol tartanak a kijelölt paklik kártyái</span>
            <div id="boxes" class="boxes"></div>
          </div>
          <div class="btn-row">
            <button id="cStart" class="btn btn-primary" type="button"></button>
          </div>
        </div>
      </div>`);

    const refresh = () => {
      const state = store.get(CARD_KEY, {});
      const cards = allCards().filter((c) => selected.has(c.deck));
      const boxes = [0, 0, 0, 0, 0, 0];
      cards.forEach((c) => { boxes[state[c.id] ? state[c.id].b : 0] += 1; });
      main.querySelector('#boxes').innerHTML = ['új', '1.', '2.', '3.', '4.', '5.']
        .map((label, i) => `<span><b>${boxes[i]}</b>${label}</span>`).join('');
      const { seen, fresh } = dueCards(cards, state);
      const n = Math.min(20, seen.length + fresh.length);
      const btn = main.querySelector('#cStart');
      btn.disabled = n === 0;
      btn.textContent = n ? `Indítás – ${n} kártya` : 'Mára nincs több ismételnivaló';
    };

    bindChips(main.querySelector('[data-chips]'), selected, refresh);
    main.querySelector('#cStart').addEventListener('click', session);
    refresh();
  }

  function session() {
    const state = store.get(CARD_KEY, {});
    const { seen, fresh } = dueCards(allCards().filter((c) => selected.has(c.deck)), state);
    // Előbb az ismétlés, utána az újak; egy körben legfeljebb 20 kártya
    let queue = [...shuffle(seen), ...shuffle(fresh)].slice(0, 20);
    const first = queue.length;                    // ennyi kártyával indul a kör
    let total = first;                             // a tévesztett kártyák a kör végén még egyszer előjönnek
    const retried = new Set();
    let known = 0;
    let flipped = false;

    function draw() {
      if (!queue.length) {
        setView(`
          <div class="stage">
            <div class="panel">
              <p class="eyebrow">Kör vége</p>
              <p class="result-score">${known} / ${first}</p>
              <p class="result-sub">kártyát tudtál elsőre. A többi holnap újra előjön.</p>
              <div class="btn-row" style="margin-top:16px">
                <button class="btn btn-primary" type="button" id="cMore">Még egy kör</button>
                <a class="btn" href="#">Vissza a gyakorlóhoz</a>
              </div>
            </div>
          </div>`, null);
        main.querySelector('#cMore').addEventListener('click', setup);
        return;
      }
      const c = queue[0];
      main.innerHTML = `
        <div class="stage">
          <div class="progress-line">
            <span>${total - queue.length + 1} / ${total}</span>
            <div class="bar"><span style="width:${((total - queue.length) / total) * 100}%"></span></div>
          </div>
          <button id="flash" class="flash" type="button" aria-live="polite">
            <span>
              ${c.ctx ? `<span class="flash-ctx">${esc(c.ctx)}</span><br>` : ''}
              <span class="flash-front">${esc(c.front)}</span>
              ${flipped
                ? `<span class="flash-back" style="display:block${c.mono ? '' : ';font-family:var(--font-ui)'}">${esc(c.back)}</span>`
                : '<span class="flash-hint" style="display:block">Kattints vagy nyomj szóközt a megfordításhoz</span>'}
            </span>
          </button>
          <div class="stage-foot">
            <a class="btn" href="#">Kilépés</a>
            ${flipped ? `<div class="btn-row">
              <button class="btn" type="button" id="cNo"><kbd>1</kbd> Nem tudtam</button>
              <button class="btn btn-primary" type="button" id="cYes"><kbd>2</kbd> Tudtam</button>
            </div>` : '<span></span>'}
          </div>
        </div>`;
    }

    function answer(ok) {
      const c = queue.shift();
      const st = store.get(CARD_KEY, {});
      const box = ok ? Math.min(5, ((st[c.id] && st[c.id].b) || 0) + 1) : 1;
      const due = new Date();
      due.setDate(due.getDate() + (ok ? BOX_DAYS[box] : 1));
      st[c.id] = { b: box, d: dayKey(due) };
      store.set(CARD_KEY, st);
      if (ok && !retried.has(c.id)) known += 1;
      if (!ok && !retried.has(c.id)) {
        retried.add(c.id);
        queue.push(c);
        total += 1;
      }
      flipped = false;
      draw();
    }

    function flip() {
      if (flipped || !queue.length) return;
      flipped = true;
      draw();
    }

    function onClick(e) {
      if (e.target.closest('#flash')) flip();
      else if (e.target.closest('#cYes')) answer(true);
      else if (e.target.closest('#cNo')) answer(false);
    }

    function onKey(e) {
      if (!queue.length) return;
      if (e.target.closest('a')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        if (!flipped) { e.preventDefault(); flip(); }
      } else if (flipped && e.key === '1') answer(false);
      else if (flipped && e.key === '2') answer(true);
    }

    setView('', () => {
      main.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    });
    main.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    draw();
  }

  setup();
}

/* =========================================================================
 * 9. ÚTVONAL
 * #            menü
 * #kviz        kvíz beállítása      #kviz=téma   azonnal indul a témából (jegyzetek gombja)
 * #parancs  #alhalo  #kartyak  #vizsga
 * ========================================================================= */
function route() {
  let hash = '';
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch (e) { hash = ''; }
  const [view, arg] = hash.split('=');

  if (view === 'kviz' && arg && TEMAK.some((t) => t.id === arg)) {
    setView('');
    startRun('kviz', buildItems([arg], 10, {}));
  } else if (view === 'kviz' || view === 'vizsga') viewQuizSetup(view);
  else if (view === 'parancs') viewTerminal();
  else if (view === 'alhalo') viewSubnet();
  else if (view === 'kartyak') viewCards();
  else viewMenu();

  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
