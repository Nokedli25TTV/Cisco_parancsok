'use strict';

/* =========================================================================
 * Naptár – naptar.js
 * Dogák, beadandók, vizsgák, szünetek időrendben. Csak jóváhagyott tagoknak;
 * felvenni és szerkeszteni szerkesztő vagy admin tud. Más módosítása élőben
 * megjelenik. A teendők pipái csak a saját böngészőben tárolódnak.
 * ========================================================================= */

const { esc, store, dayKey } = Hub;
const main = document.getElementById('main');
const dialog = document.getElementById('evDialog');
const db = Fiok.db;

const TIPUSOK = {
  doga:     { nev: 'Doga',     tone: 'var(--cat-security)' },
  beadando: { nev: 'Beadandó', tone: 'var(--cat-wan)' },
  vizsga:   { nev: 'Vizsga',   tone: 'var(--cat-routing)' },
  szunet:   { nev: 'Szünet',   tone: 'var(--cat-services)' },
  egyeb:    { nev: 'Egyéb',    tone: 'var(--cat-alapok)' }
};
const PIPA_KEY = 'hub-pipak';        // { "eseményId:sorszám": true }

const state = { events: [], filter: 'mind', past: false, editId: null, tipus: 'doga' };

/* ---------- Dátum segédek ---------- */
const toDate = (text) => {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function daysUntil(text) {
  const now = new Date();
  return Math.round((toDate(text) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

function whenText(ev) {
  const start = daysUntil(ev.datum);
  const end = ev.veg ? daysUntil(ev.veg) : start;
  if (end < 0) return 'elmúlt';
  if (start < 0) return 'most tart';
  if (start === 0) return 'ma';
  if (start === 1) return 'holnap';
  return `${start} nap múlva`;
}

const shortDate = (text) => toDate(text).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });

/* ---------- Betöltés ---------- */
async function load() {
  const today = dayKey();
  let query = db.from('esemenyek').select('*');
  query = state.past
    ? query.lt('datum', today).order('datum', { ascending: false }).limit(40)
    : query.or(`datum.gte.${today},veg.gte.${today}`).order('datum').order('ido', { nullsFirst: true });

  const { data, error } = await query;
  if (error) {
    main.querySelector('#list').innerHTML = `<p class="form-note bad">${esc(Fiok.hiba(error))}</p>`;
    return;
  }
  // A „korábbiak” között ne legyen ott, ami többnaposként még tart
  state.events = state.past ? data.filter((ev) => !ev.veg || ev.veg < today) : data;
  renderList();
}

/* ---------- Megjelenítés ---------- */
function eventHtml(ev) {
  const t = TIPUSOK[ev.tipus] || TIPUSOK.egyeb;
  const d = toDate(ev.datum);
  const when = whenText(ev);
  const soon = !state.past && daysUntil(ev.datum) >= 0 && daysUntil(ev.datum) <= 3;
  const pipak = store.get(PIPA_KEY, {});
  const teendok = Array.isArray(ev.teendok) ? ev.teendok : [];
  const meta = [
    ev.targy ? esc(ev.targy) : '',
    ev.ido ? esc(ev.ido.slice(0, 5)) : '',
    ev.veg ? `${esc(shortDate(ev.datum))} – ${esc(shortDate(ev.veg))}` : ''
  ].filter(Boolean).join(' · ');

  return `
    <article class="ev" style="--tone: ${t.tone}" data-id="${ev.id}">
      <div class="ev-date" aria-hidden="true">
        <b>${d.getDate()}</b>
        <span>${esc(d.toLocaleDateString('hu-HU', { month: 'short' }))}</span>
        <span>${esc(d.toLocaleDateString('hu-HU', { weekday: 'short' }))}</span>
      </div>
      <div class="ev-body">
        <p class="ev-meta">
          <span class="badge" data-tone>${t.nev}</span>
          ${meta ? `<span>${meta}</span>` : ''}
          <span class="ev-when${soon ? ' bad' : ''}">${when}</span>
        </p>
        <h3 class="ev-title">${esc(ev.cim)}</h3>
        ${ev.leiras ? `<p class="ev-desc">${esc(ev.leiras)}</p>` : ''}
        ${teendok.length ? `<ul class="ev-todo">${teendok.map((text, i) => `
          <li><label><input type="checkbox" data-i="${i}"${pipak[`${ev.id}:${i}`] ? ' checked' : ''}><span>${esc(text)}</span></label></li>`).join('')}</ul>` : ''}
        ${ev.link ? `<p><a href="${esc(ev.link)}" target="_blank" rel="noopener noreferrer">Kapcsolódó link megnyitása</a></p>` : ''}
        ${Fiok.szerkeszto() ? `
          <div class="btn-row ev-actions">
            <button class="btn btn-small" type="button" data-edit>Szerkesztés</button>
            <button class="btn btn-small" type="button" data-del>Törlés</button>
          </div>` : ''}
      </div>
    </article>`;
}

function renderList() {
  const host = main.querySelector('#list');
  const events = state.events.filter((ev) => state.filter === 'mind' || ev.tipus === state.filter);

  if (!events.length) {
    host.innerHTML = `<p class="empty-note">${state.past ? 'Nincs korábbi esemény.'
      : (state.filter === 'mind' ? 'Nincs közelgő esemény. Élvezd, amíg tart.' : 'Ilyen típusú esemény nincs a közeljövőben.')}</p>`;
    return;
  }

  // Hónaponként csoportosítva
  const groups = new Map();
  events.forEach((ev) => {
    const key = ev.datum.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ev);
  });

  host.innerHTML = [...groups.entries()].map(([key, list]) => {
    const title = toDate(`${key}-01`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
    return `<section class="ev-month"><h2 class="eyebrow">${esc(title)}</h2>${list.map(eventHtml).join('')}</section>`;
  }).join('');
}

function renderShell() {
  main.innerHTML = `
    <div class="page-head head-row">
      <div>
        <h1 class="page-title">Naptár</h1>
        <p class="page-sub">Dogák, beadandók, vizsgák és szünetek. A teendők pipái csak nálad látszanak.</p>
      </div>
      ${Fiok.szerkeszto() ? '<button id="newBtn" class="btn btn-primary" type="button">Új esemény</button>' : ''}
    </div>
    <div class="chip-row" id="filters">
      <button class="chip" type="button" data-f="mind" aria-pressed="true">Mind</button>
      ${Object.entries(TIPUSOK).map(([id, t]) => `<button class="chip" type="button" data-f="${id}" aria-pressed="false">${t.nev}</button>`).join('')}
    </div>
    <div id="list" class="ev-list"><p class="muted">Betöltés…</p></div>
    <div class="stage-foot">
      <button id="pastBtn" class="btn btn-small" type="button">Korábbi események</button>
      <button id="icsBtn" class="btn btn-small" type="button">Letöltés a telefon naptárába (.ics)</button>
    </div>`;
}

/* ---------- Szerkesztő ablak ---------- */
const f = (id) => document.getElementById(id);

function renderTypeChips() {
  f('evTipus').innerHTML = Object.entries(TIPUSOK)
    .map(([id, t]) => `<button class="chip" type="button" data-t="${id}" aria-pressed="${id === state.tipus}">${t.nev}</button>`)
    .join('');
}

function openEditor(ev) {
  state.editId = ev ? ev.id : null;
  state.tipus = ev ? ev.tipus : 'doga';
  f('evDialogTitle').textContent = ev ? 'Esemény szerkesztése' : 'Új esemény';
  f('evCim').value = ev ? ev.cim : '';
  f('evDatum').value = ev ? ev.datum : '';
  f('evIdo').value = ev && ev.ido ? ev.ido.slice(0, 5) : '';
  f('evTargy').value = ev && ev.targy ? ev.targy : '';
  f('evVeg').value = ev && ev.veg ? ev.veg : '';
  f('evLeiras').value = ev && ev.leiras ? ev.leiras : '';
  f('evTeendok').value = ev && Array.isArray(ev.teendok) ? ev.teendok.join('\n') : '';
  f('evLink').value = ev && ev.link ? ev.link : '';
  f('evMsg').innerHTML = '';
  // Tantárgy-javaslatok a már használt nevekből
  f('evTargyak').innerHTML = [...new Set(state.events.map((x) => x.targy).filter(Boolean))]
    .map((t) => `<option value="${esc(t)}">`).join('');
  renderTypeChips();
  dialog.showModal();
  f('evCim').focus();
}

async function saveEvent(e) {
  e.preventDefault();
  const fail = (text) => { f('evMsg').innerHTML = `<p class="form-note bad" role="alert">${esc(text)}</p>`; };

  const row = {
    cim: f('evCim').value.trim(),
    tipus: state.tipus,
    targy: f('evTargy').value.trim() || null,
    datum: f('evDatum').value,
    ido: f('evIdo').value || null,
    veg: f('evVeg').value || null,
    leiras: f('evLeiras').value.trim() || null,
    teendok: f('evTeendok').value.split('\n').map((s) => s.trim()).filter(Boolean),
    link: f('evLink').value.trim() || null
  };

  if (!row.cim) return fail('Adj nevet az eseménynek.');
  if (!row.datum) return fail('Válassz dátumot.');
  if (row.veg && row.veg < row.datum) return fail('Az utolsó nap nem lehet korábban, mint a kezdés.');
  if (row.link && !/^https?:\/\//i.test(row.link)) return fail('A link http:// vagy https:// kezdetű legyen.');

  const { error } = state.editId
    ? await db.from('esemenyek').update(row).eq('id', state.editId)
    : await db.from('esemenyek').insert(row);
  if (error) return fail(Fiok.hiba(error));

  dialog.close();
  return load();
}

/* ---------- Export a telefon naptárába ---------- */
function downloadIcs() {
  const compact = (text) => text.replace(/-/g, '');
  const escIcs = (text) => String(text).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const nextDay = (text) => {
    const d = toDate(text);
    d.setDate(d.getDate() + 1);
    return compact(dayKey(d));
  };
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Osztalyoldal//Naptar//HU', 'CALSCALE:GREGORIAN'];
  state.events.forEach((ev) => {
    const t = TIPUSOK[ev.tipus] || TIPUSOK.egyeb;
    lines.push('BEGIN:VEVENT', `UID:esemeny-${ev.id}@osztalyoldal`, `DTSTAMP:${stamp}`);
    if (ev.ido && !ev.veg) {
      const time = ev.ido.replace(/:/g, '').slice(0, 6).padEnd(6, '0');
      lines.push(`DTSTART:${compact(ev.datum)}T${time}`, `DTEND:${compact(ev.datum)}T${time}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${compact(ev.datum)}`, `DTEND;VALUE=DATE:${nextDay(ev.veg || ev.datum)}`);
    }
    lines.push(`SUMMARY:${escIcs(`${t.nev}: ${ev.cim}`)}`);
    const desc = [ev.targy, ev.leiras, ...(Array.isArray(ev.teendok) ? ev.teendok.map((x) => `- ${x}`) : [])].filter(Boolean).join('\n');
    if (desc) lines.push(`DESCRIPTION:${escIcs(desc)}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');

  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'osztaly-naptar.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Események ---------- */
function bind() {
  main.addEventListener('click', async (e) => {
    const chip = e.target.closest('#filters .chip');
    if (chip) {
      state.filter = chip.dataset.f;
      main.querySelectorAll('#filters .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      renderList();
      return;
    }
    if (e.target.closest('#newBtn')) { openEditor(null); return; }
    if (e.target.closest('#icsBtn')) { downloadIcs(); return; }
    if (e.target.closest('#pastBtn')) {
      state.past = !state.past;
      main.querySelector('#pastBtn').textContent = state.past ? 'Közelgő események' : 'Korábbi események';
      main.querySelector('#icsBtn').hidden = state.past;
      load();
      return;
    }

    const card = e.target.closest('.ev');
    if (!card) return;
    const ev = state.events.find((x) => String(x.id) === card.dataset.id);
    if (!ev) return;
    if (e.target.closest('[data-edit]')) openEditor(ev);
    else if (e.target.closest('[data-del]')) {
      if (!window.confirm(`Biztosan törlöd: „${ev.cim}”?`)) return;
      const { error } = await db.from('esemenyek').delete().eq('id', ev.id);
      if (error) window.alert(Fiok.hiba(error));
      else load();
    }
  });

  // Teendő kipipálása: csak helyben tárolódik
  main.addEventListener('change', (e) => {
    const box = e.target.closest('.ev-todo input');
    if (!box) return;
    const id = box.closest('.ev').dataset.id;
    const pipak = store.get(PIPA_KEY, {});
    if (box.checked) pipak[`${id}:${box.dataset.i}`] = true;
    else delete pipak[`${id}:${box.dataset.i}`];
    store.set(PIPA_KEY, pipak);
  });

  f('evForm').addEventListener('submit', saveEvent);
  f('evCancel').addEventListener('click', () => dialog.close());
  f('evTipus').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.tipus = chip.dataset.t;
    renderTypeChips();
  });
}

/* ---------- Indítás ---------- */
(async () => {
  if (!(await Fiok.kapu(main))) return;
  renderShell();
  bind();
  await load();
  Fiok.figyel('naptar', ['esemenyek'], () => { if (!dialog.open) load(); });
})();
