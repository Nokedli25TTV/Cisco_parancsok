'use strict';

/* =========================================================================
 * Osztályoldal – kezdolap.js
 * Mai dátum, „most hányadik óra van”, visszaszámlálók.
 * Adatok: adatok.js (CSENGETES, VISSZASZAMLALOK) + a saját visszaszámlálók
 * a böngésző tárhelyén.
 * ========================================================================= */

const CD_KEY = 'hub-visszaszamlalok';
const $ = (id) => document.getElementById(id);

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/* ---------- Dátum ---------- */
function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

function renderToday(now) {
  const text = now.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' });
  $('todayTitle').textContent = text.charAt(0).toUpperCase() + text.slice(1);
  $('todayWeek').textContent = `${now.getFullYear()} · ${isoWeek(now)}. hét`;
}

/* ---------- Most: óra vagy szünet ---------- */
function renderBells() {
  $('bells').innerHTML = CSENGETES
    .map(([n, a, b]) => `<li data-n="${n}"><b>${n}.</b>${a}–${b}</li>`)
    .join('');
}

function setNow(big, sub, ratio) {
  $('nowBig').textContent = big;
  $('nowSub').textContent = sub;
  const bar = $('nowBar');
  bar.hidden = ratio === null;
  if (ratio !== null) bar.firstElementChild.style.width = `${Math.round(ratio * 100)}%`;
}

const perc = (n) => `${n} perc`;

function renderNow(now) {
  const min = now.getHours() * 60 + now.getMinutes();
  const day = now.getDay();
  let current = 0;

  if (day === 0 || day === 6) {
    setNow('Hétvége', 'Hétfőn 07:30-kor kezdődik az 1. óra.', null);
  } else {
    const first = toMin(CSENGETES[0][1]);
    const last = toMin(CSENGETES[CSENGETES.length - 1][2]);

    if (min < first) {
      const left = first - min;
      setNow('Még nincs tanítás', left <= 120
        ? `Az 1. óra ${perc(left)} múlva kezdődik (${CSENGETES[0][1]}).`
        : `Az 1. óra ${CSENGETES[0][1]}-kor kezdődik.`, null);
    } else if (min >= last) {
      setNow('Mára vége a tanításnak', 'Holnap is lesz nap. Addig: gyakorló?', null);
    } else {
      for (let i = 0; i < CSENGETES.length; i++) {
        const [n, a, b] = CSENGETES[i];
        const start = toMin(a);
        const end = toMin(b);
        if (min >= start && min < end) {
          current = n;
          setNow(`${n}. óra`, `Még ${perc(end - min)} – kicsengetés ${b}-kor.`, (min - start) / (end - start));
          break;
        }
        const next = CSENGETES[i + 1];
        if (next && min >= end && min < toMin(next[1])) {
          const nextStart = toMin(next[1]);
          setNow('Szünet', `A(z) ${next[0]}. óra ${perc(nextStart - min)} múlva kezdődik (${next[1]}).`,
            (min - end) / (nextStart - end));
          break;
        }
      }
    }
  }

  $('bells').querySelectorAll('li').forEach((li) => {
    if (Number(li.dataset.n) === current) li.setAttribute('data-now', '');
    else li.removeAttribute('data-now');
  });
}

/* ---------- Visszaszámlálók ---------- */
function daysUntil(dateText, now) {
  const [y, m, d] = dateText.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function renderCountdowns() {
  const now = new Date();
  const own = Hub.store.get(CD_KEY, []);
  const all = [
    ...VISSZASZAMLALOK.map((c) => ({ ...c, own: false })),
    ...own.map((c) => ({ ...c, own: true }))
  ]
    .map((c) => ({ ...c, days: daysUntil(c.datum, now) }))
    .filter((c) => c.days >= 0 && !Number.isNaN(c.days))
    .sort((a, b) => a.days - b.days);

  const host = $('countdowns');
  if (!all.length) {
    host.innerHTML = '<p class="empty-note">Nincs közelgő esemény. Vegyél fel egyet lent: doga, szünet, vizsga.</p>';
    return;
  }

  host.innerHTML = all.map((c) => {
    const [y, m, d] = c.datum.split('-').map(Number);
    const dateText = new Date(y, m - 1, d)
      .toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    const num = c.days === 0 ? 'Ma' : c.days;
    const unit = c.days === 0 ? '' : '<span class="cd-unit">nap</span>';
    return `
      <article class="cd"${c.days <= 3 ? ' data-soon' : ''}>
        <p class="cd-num">${num}${unit}</p>
        <p class="cd-name">${Hub.esc(c.nev)}</p>
        <p class="cd-date">${dateText}</p>
        ${c.own ? `<button class="cd-del" type="button" data-id="${Hub.esc(c.id)}" aria-label="${Hub.esc(c.nev)} törlése" title="Törlés">✕</button>` : ''}
      </article>`;
  }).join('');
}

function bindCountdowns() {
  $('cdDate').min = Hub.dayKey();

  $('cdForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nev = $('cdName').value.trim();
    const datum = $('cdDate').value;
    if (!nev || !datum) return;
    const own = Hub.store.get(CD_KEY, []);
    own.push({ id: `${Date.now()}`, nev, datum });
    Hub.store.set(CD_KEY, own);
    e.target.reset();
    renderCountdowns();
  });

  $('countdowns').addEventListener('click', (e) => {
    const btn = e.target.closest('.cd-del');
    if (!btn) return;
    Hub.store.set(CD_KEY, Hub.store.get(CD_KEY, []).filter((c) => c.id !== btn.dataset.id));
    renderCountdowns();
  });
}

/* ---------- Gyakorló állása a csempén ---------- */
function renderPracticeMeta() {
  const data = Hub.store.get('hub-gyakorlo', {});
  const last = (data.vizsgak || [])[0];
  if (last) $('practiceMeta').textContent = `legutóbbi próbavizsga: ${last.pct}%`;
}

/* ---------- Indítás ---------- */
function tick() {
  const now = new Date();
  renderToday(now);
  renderNow(now);
}

renderBells();
tick();
renderCountdowns();
bindCountdowns();
renderPracticeMeta();
setInterval(tick, 15000);
/* Éjfél után a napok száma is változik */
setInterval(renderCountdowns, 10 * 60000);
