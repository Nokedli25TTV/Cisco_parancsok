'use strict';

/* =========================================================================
 * Órarend – orarend.js
 * Heti órarend az A vagy a B csoport szerint. Csak jóváhagyott tagoknak;
 * szerkeszteni szerkesztő vagy admin tud. Az időpontok a csengetési rendből
 * (adatok.js) jönnek.
 * ========================================================================= */

const { esc, store } = Hub;
const main = document.getElementById('main');
const db = Fiok.db;

const NAPOK = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek'];
const CSOPORT_KEY = 'hub-csoport';

const state = { rows: [], csoport: 'A', edit: false };

const bell = (n) => CSENGETES.find((c) => c[0] === n);
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Hányadik óra megy éppen (0, ha szünet vagy nincs tanítás) */
function currentPeriod(now) {
  const min = now.getHours() * 60 + now.getMinutes();
  const hit = CSENGETES.find(([, a, b]) => min >= toMin(a) && min < toMin(b));
  return hit ? hit[0] : 0;
}

async function load() {
  const { data, error } = await db.from('orarend').select('*').order('nap').order('ora_tol');
  if (error) {
    main.querySelector('#week').innerHTML = `<p class="form-note bad">${esc(Fiok.hiba(error))}</p>`;
    return;
  }
  state.rows = data;
  renderWeek();
}

function lessonHtml(r, isNow) {
  const from = bell(r.ora_tol);
  const to = bell(r.ora_ig);
  const orak = r.ora_tol === r.ora_ig ? `${r.ora_tol}. óra` : `${r.ora_tol}–${r.ora_ig}. óra`;
  const ido = from && to ? `${from[1]}–${to[2]}` : '';
  const hely = [r.terem, r.tanar].filter(Boolean).map(esc).join(' · ');
  return `
    <article class="lesson"${isNow ? ' data-now' : ''} data-id="${r.id}">
      <p class="lesson-time">${orak}${ido ? ` · ${ido}` : ''}</p>
      <h3 class="lesson-name">${esc(r.targy)}</h3>
      <p class="lesson-meta">${hely}${state.edit && r.csoport !== 'mind' ? ` · ${esc(r.csoport)} csoport` : ''}</p>
      ${state.edit ? `<button class="btn btn-small" type="button" data-del aria-label="${esc(r.targy)} törlése">Törlés</button>` : ''}
    </article>`;
}

function renderWeek() {
  const now = new Date();
  const today = now.getDay();                        // 1 = hétfő
  const period = currentPeriod(now);
  // Szerkesztéskor mindkét csoport órái látszanak
  const visible = state.rows.filter((r) => state.edit || r.csoport === 'mind' || r.csoport === state.csoport);

  main.querySelector('#week').innerHTML = NAPOK.map((nev, i) => {
    const nap = i + 1;
    const list = visible.filter((r) => r.nap === nap);
    return `
      <section class="day"${nap === today ? ' data-today' : ''}>
        <h2 class="day-name">${nev}${nap === today ? ' <span class="badge">ma</span>' : ''}</h2>
        ${list.length
          ? list.map((r) => lessonHtml(r, nap === today && period >= r.ora_tol && period <= r.ora_ig)).join('')
          : '<p class="faint day-empty">nincs óra</p>'}
      </section>`;
  }).join('');
}

function renderShell() {
  main.innerHTML = `
    <div class="page-head head-row">
      <div>
        <h1 class="page-title">Órarend</h1>
        <p class="page-sub">A saját csoportod órái. A csoportot a fiókodnál is beállíthatod.</p>
      </div>
      <div class="btn-row">
        <div class="chip-row" id="groups">
          <button class="chip" type="button" data-cs="A">A csoport</button>
          <button class="chip" type="button" data-cs="B">B csoport</button>
        </div>
        ${Fiok.szerkeszto() ? '<button id="editBtn" class="btn btn-small" type="button">Szerkesztés</button>' : ''}
      </div>
    </div>
    <div id="week" class="week"><p class="muted">Betöltés…</p></div>

    <form id="addForm" class="panel form section" hidden>
      <h2 class="section-title">Óra hozzáadása</h2>
      <div class="form-cols form-cols-4">
        <div>
          <label class="label" for="aNap">Nap</label>
          <select id="aNap" class="field">${NAPOK.map((n, i) => `<option value="${i + 1}">${n}</option>`).join('')}</select>
        </div>
        <div>
          <label class="label" for="aTol">Első óra</label>
          <input id="aTol" class="field" type="number" min="1" max="12" value="1" required>
        </div>
        <div>
          <label class="label" for="aIg">Utolsó óra</label>
          <input id="aIg" class="field" type="number" min="1" max="12" value="1" required>
        </div>
        <div>
          <label class="label" for="aCsoport">Kinek</label>
          <select id="aCsoport" class="field">
            <option value="mind">mindenkinek</option>
            <option value="A">A csoport</option>
            <option value="B">B csoport</option>
          </select>
        </div>
      </div>
      <div class="form-cols form-cols-4">
        <div class="span-2">
          <label class="label" for="aTargy">Tantárgy</label>
          <input id="aTargy" class="field" type="text" maxlength="60" required>
        </div>
        <div>
          <label class="label" for="aTerem">Terem</label>
          <input id="aTerem" class="field" type="text" maxlength="20">
        </div>
        <div>
          <label class="label" for="aTanar">Tanár</label>
          <input id="aTanar" class="field" type="text" maxlength="40">
        </div>
      </div>
      <div id="addMsg"></div>
      <div><button class="btn btn-primary" type="submit">Hozzáadás</button></div>
    </form>`;
}

function showGroup() {
  main.querySelectorAll('#groups .chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cs === state.csoport)));
}

function bind() {
  main.addEventListener('click', async (e) => {
    const chip = e.target.closest('#groups .chip');
    if (chip) {
      state.csoport = chip.dataset.cs;
      store.set(CSOPORT_KEY, state.csoport);
      showGroup();
      renderWeek();
      return;
    }
    if (e.target.closest('#editBtn')) {
      state.edit = !state.edit;
      main.querySelector('#editBtn').textContent = state.edit ? 'Kész' : 'Szerkesztés';
      main.querySelector('#addForm').hidden = !state.edit;
      renderWeek();
      return;
    }
    const del = e.target.closest('.lesson [data-del]');
    if (del) {
      const id = del.closest('.lesson').dataset.id;
      const { error } = await db.from('orarend').delete().eq('id', id);
      if (error) window.alert(Fiok.hiba(error));
      else load();
    }
  });

  main.querySelector('#addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = (id) => main.querySelector(`#${id}`).value.trim();
    const msg = main.querySelector('#addMsg');
    const row = {
      nap: Number(val('aNap')),
      ora_tol: Number(val('aTol')),
      ora_ig: Number(val('aIg')),
      csoport: val('aCsoport'),
      targy: val('aTargy'),
      terem: val('aTerem') || null,
      tanar: val('aTanar') || null
    };
    if (!row.targy) { msg.innerHTML = '<p class="form-note bad" role="alert">Írd be a tantárgyat.</p>'; return; }
    if (row.ora_ig < row.ora_tol) { msg.innerHTML = '<p class="form-note bad" role="alert">Az utolsó óra nem lehet az első előtt.</p>'; return; }

    const { error } = await db.from('orarend').insert(row);
    if (error) { msg.innerHTML = `<p class="form-note bad" role="alert">${esc(Fiok.hiba(error))}</p>`; return; }
    msg.innerHTML = '';
    main.querySelector('#aTargy').value = '';
    load();
  });
}

(async () => {
  if (!(await Fiok.kapu(main))) return;
  state.csoport = store.get(CSOPORT_KEY, null) || Fiok.profil.csoport || 'A';
  renderShell();
  showGroup();
  bind();
  await load();
  Fiok.figyel('orarend', ['orarend'], load);
  setInterval(renderWeek, 60000);                    // az „éppen most” kiemelés frissítése
})();
