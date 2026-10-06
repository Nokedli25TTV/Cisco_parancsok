'use strict';

/* =========================================================================
 * Osztályoldal – kezdolap.js
 * Mai dátum, „most hányadik óra van”, visszaszámlálók.
 * Nyilvános adatok: adatok.js (CSENGETES, VISSZASZAMLALOK) + a saját
 * visszaszámlálók a böngésző tárhelyén.
 * Belépett tagnak ezen felül: hirdetések, a mai órái tantárggyal és teremmel,
 * és a naptár közelgő eseményei a visszaszámlálók között.
 * ========================================================================= */

const CD_KEY = 'hub-visszaszamlalok';
const $ = (id) => document.getElementById(id);

/** Belépős adatok; null = nincs betöltve (kilépett látogató) */
const privat = { orak: null, esemenyek: [] };

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const bell = (n) => CSENGETES.find((c) => c[0] === n);

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
/** A belépett tag mai órája az adott sorszámú órában (ha van) */
const lessonAt = (n) => (privat.orak || []).find((r) => n >= r.ora_tol && n <= r.ora_ig);
const lessonText = (r) => (r ? `${r.targy}${r.terem ? ` (${r.terem})` : ''}` : '');

function renderBells() {
  if (privat.orak) {
    $('bellLabel').textContent = 'Mai óráid';
    $('bells').className = 'bells bells-own';
    $('bells').innerHTML = privat.orak.length
      ? privat.orak.map((r) => {
        const a = bell(r.ora_tol);
        const b = bell(r.ora_ig);
        const orak = r.ora_tol === r.ora_ig ? `${r.ora_tol}.` : `${r.ora_tol}–${r.ora_ig}.`;
        return `<li data-from="${r.ora_tol}" data-to="${r.ora_ig}"><b>${orak}</b>${a && b ? `${a[1]}–${b[2]}` : ''} <span>${Hub.esc(lessonText(r))}</span></li>`;
      }).join('')
      : '<li>Ma nincs órád.</li>';
    return;
  }
  $('bellLabel').textContent = 'Csengetési rend';
  $('bells').className = 'bells';
  $('bells').innerHTML = CSENGETES
    .map(([n, a, b]) => `<li data-from="${n}" data-to="${n}"><b>${n}.</b>${a}–${b}</li>`)
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
  const own = privat.orak;                           // null, ha nincs belépve
  let current = 0;

  if (day === 0 || day === 6) {
    setNow('Hétvége', 'Hétfőn 07:30-kor kezdődik az 1. óra.', null);
  } else if (own && !own.length) {
    setNow('Ma nincs órád', 'Az órarended szerint ma szabad vagy.', null);
  } else {
    // Belépve a saját első és utolsó óra számít, különben a teljes csengetési rend
    const firstBell = (own && bell(Math.min(...own.map((r) => r.ora_tol)))) || CSENGETES[0];
    const lastBell = (own && bell(Math.max(...own.map((r) => r.ora_ig)))) || CSENGETES[CSENGETES.length - 1];
    const first = toMin(firstBell[1]);
    const last = toMin(lastBell[2]);

    if (min < first) {
      const left = first - min;
      const mit = own ? ` – ${lessonText(lessonAt(firstBell[0]))}` : '';
      setNow('Még nincs tanítás', left <= 120
        ? `A(z) ${firstBell[0]}. óra ${perc(left)} múlva kezdődik (${firstBell[1]})${mit}.`
        : `A(z) ${firstBell[0]}. óra ${firstBell[1]}-kor kezdődik${mit}.`, null);
    } else if (min >= last) {
      setNow(own ? 'Mára végeztél' : 'Mára vége a tanításnak', 'Holnap is lesz nap. Addig: gyakorló?', null);
    } else {
      for (let i = 0; i < CSENGETES.length; i++) {
        const [n, a, b] = CSENGETES[i];
        const start = toMin(a);
        const end = toMin(b);
        if (min >= start && min < end) {
          current = n;
          const r = lessonAt(n);
          const big = r ? `${n}. óra – ${r.targy}` : `${n}. óra`;
          const extra = own ? (r ? (r.terem ? ` Terem: ${r.terem}.` : '') : ' Neked most lyukasórád van.') : '';
          setNow(big, `Még ${perc(end - min)} – kicsengetés ${b}-kor.${extra}`, (min - start) / (end - start));
          break;
        }
        const next = CSENGETES[i + 1];
        if (next && min >= end && min < toMin(next[1])) {
          const nextStart = toMin(next[1]);
          const r = lessonAt(next[0]);
          setNow('Szünet', `A(z) ${next[0]}. óra ${perc(nextStart - min)} múlva kezdődik (${next[1]})${r ? ` – ${lessonText(r)}` : ''}.`,
            (min - end) / (nextStart - end));
          break;
        }
      }
    }
  }

  $('bells').querySelectorAll('li[data-from]').forEach((li) => {
    if (current && current >= Number(li.dataset.from) && current <= Number(li.dataset.to)) li.setAttribute('data-now', '');
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
    ...VISSZASZAMLALOK.map((c) => ({ ...c, kind: 'kozos' })),
    ...own.map((c) => ({ ...c, kind: 'sajat' })),
    ...privat.esemenyek.map((e) => ({ nev: e.cim, datum: e.datum, kind: 'naptar', cimke: e.cimke }))
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
        <p class="cd-date">${c.kind === 'naptar' ? `${Hub.esc(c.cimke)} · ` : ''}${dateText}</p>
        ${c.kind === 'sajat' ? `<button class="cd-del" type="button" data-id="${Hub.esc(c.id)}" aria-label="${Hub.esc(c.nev)} törlése" title="Törlés">✕</button>` : ''}
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

/* =========================================================================
 * BELÉPŐS RÉSZ: hirdetések, mai órák, naptár
 * A Supabase-könyvtár csak annak töltődik be, aki ezen az eszközön már
 * belépett – a nyilvános látogatónak a kezdőlap ugyanolyan könnyű marad.
 * ========================================================================= */
const TIPUS_CIMKE = { doga: 'Doga', beadando: 'Beadandó', vizsga: 'Vizsga', szunet: 'Szünet', egyeb: 'Naptár' };

const loadScript = (src) => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = resolve;
  s.onerror = reject;
  document.head.appendChild(s);
});

function renderNotices(list) {
  const section = $('hirdetesek');
  const canEdit = Fiok.szerkeszto();
  section.hidden = !list.length && !canEdit;

  $('noticeList').innerHTML = list.length
    ? list.map((h) => `
      <article class="notice"${h.kituzve ? ' data-pinned' : ''} data-id="${h.id}">
        <p class="notice-text">${Hub.esc(h.szoveg)}</p>
        <p class="notice-meta">
          ${h.kituzve ? 'kitűzve · ' : ''}${new Date(h.letrehozva).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })}
          ${canEdit ? ' · <button class="link-btn" type="button" data-del>törlés</button>' : ''}
        </p>
      </article>`).join('')
    : '<p class="empty-note">Nincs hirdetés.</p>';

  $('noticeForm').hidden = !canEdit;
}

async function loadPrivate() {
  const today = Hub.dayKey();
  const nap = new Date().getDay();
  const csoport = Hub.store.get('hub-csoport', null) || Fiok.profil.csoport || 'A';
  const until = new Date();
  until.setDate(until.getDate() + 45);

  const [hird, orak, esem] = await Promise.all([
    Fiok.db.from('hirdetesek').select('*').or(`lejar.is.null,lejar.gte.${today}`)
      .order('kituzve', { ascending: false }).order('letrehozva', { ascending: false }).limit(10),
    Fiok.db.from('orarend').select('*').eq('nap', nap).order('ora_tol'),
    Fiok.db.from('esemenyek').select('cim,tipus,datum').gte('datum', today).lte('datum', Hub.dayKey(until))
      .order('datum').limit(6)
  ]);

  if (!hird.error) renderNotices(hird.data);
  if (!orak.error) privat.orak = orak.data.filter((r) => r.csoport === 'mind' || r.csoport === csoport);
  if (!esem.error) privat.esemenyek = esem.data.map((e) => ({ ...e, cimke: TIPUS_CIMKE[e.tipus] || 'Naptár' }));

  renderBells();
  renderNow(new Date());
  renderCountdowns();
}

function bindNotices() {
  $('noticeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const szoveg = $('noticeText').value.trim();
    if (!szoveg) return;
    const { error } = await Fiok.db.from('hirdetesek').insert({
      szoveg,
      kituzve: $('noticePin').checked,
      lejar: $('noticeUntil').value || null
    });
    $('noticeMsg').textContent = error ? Fiok.hiba(error) : '';
    if (!error) {
      e.target.reset();
      loadPrivate();
    }
  });

  $('noticeList').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    if (!window.confirm('Biztosan törlöd ezt a hirdetést?')) return;
    const { error } = await Fiok.db.from('hirdetesek').delete().eq('id', btn.closest('.notice').dataset.id);
    if (error) window.alert(Fiok.hiba(error));
    else loadPrivate();
  });
}

async function initPrivate() {
  const note = $('privatNote');
  if (!Hub.config.key) return;                       // az adatbázis még nincs bekapcsolva

  if (!Hub.store.get('hub-fiok', null)) {
    note.innerHTML = `Az osztály tagjainak naptár, órarend és hirdetések is járnak: <a href="belepes/">lépj be vagy regisztrálj</a>.`;
    return;
  }

  try {
    if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    await loadScript('kozos/fiok.js');
  } catch (e) {
    return;                                          // nincs net: marad a nyilvános nézet
  }

  await Fiok.betolt();
  if (!Fiok.user) {
    note.innerHTML = `Lejárt a belépésed: <a href="belepes/">lépj be újra</a> a naptárhoz és az órarendhez.`;
    return;
  }
  if (!Fiok.tag()) {
    note.innerHTML = `A regisztrációd jóváhagyásra vár. Amint egy admin jóváhagyja, itt megjelenik a naptár és az órarended.`;
    return;
  }

  note.textContent = '';
  bindNotices();
  await loadPrivate();
  Fiok.figyel('kezdolap', ['hirdetesek', 'orarend', 'esemenyek'], loadPrivate);
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
initPrivate();
setInterval(tick, 15000);
/* Éjfél után a napok száma is változik */
setInterval(renderCountdowns, 10 * 60000);
