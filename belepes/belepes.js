'use strict';

/* =========================================================================
 * Fiók – belepes.js
 * Kilépve: belépés és regisztráció (e-mail + jelszó).
 * Belépve: saját adatok, kilépés; adminnak tagkezelés és induló adatok.
 * ========================================================================= */

const { esc } = Hub;
const main = document.getElementById('main');
const db = Fiok.db;

const note = (text, cls) => (text ? `<p class="form-note ${cls || 'bad'}" role="alert">${esc(text)}</p>` : '');

/* =========================================================================
 * KILÉPVE: belépés / regisztráció
 * ========================================================================= */
function viewAuth(mode, message) {
  const reg = mode === 'reg';
  main.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">${reg ? 'Regisztráció' : 'Belépés'}</h1>
      <p class="page-sub">${reg
        ? 'Regisztráció után egy adminnak jóvá kell hagynia – addig a naptár és az órarend nem látszik.'
        : 'A naptár, az órarend és a hirdetések csak az osztály tagjainak látszanak.'}</p>
    </div>
    <form id="authForm" class="panel form" novalidate>
      ${reg ? `
        <div>
          <label class="label" for="fNev">Neved (ahogy az osztály ismer)</label>
          <input id="fNev" class="field" type="text" autocomplete="name" minlength="2" maxlength="40" required>
        </div>
        <div>
          <span class="label">Csoport</span>
          <div class="chip-row" id="fCsoport">
            <button class="chip" type="button" data-cs="A" aria-pressed="false">A csoport</button>
            <button class="chip" type="button" data-cs="B" aria-pressed="false">B csoport</button>
          </div>
        </div>` : ''}
      <div>
        <label class="label" for="fEmail">E-mail-cím</label>
        <input id="fEmail" class="field" type="email" autocomplete="email" required>
      </div>
      <div>
        <label class="label" for="fPass">Jelszó${reg ? ' (legalább 8 karakter)' : ''}</label>
        <input id="fPass" class="field" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" minlength="8" required>
      </div>
      <div id="authMsg">${note(message)}</div>
      <div class="btn-row">
        <button id="authBtn" class="btn btn-primary" type="submit">${reg ? 'Regisztrálok' : 'Belépek'}</button>
        <button id="authSwitch" class="btn" type="button">${reg ? 'Már van fiókom' : 'Még nincs fiókom'}</button>
      </div>
      ${reg ? '' : '<p class="section-note">Elfelejtetted a jelszavad? Szólj az adminnak, ő tud újat beállítani.</p>'}
    </form>`;

  let csoport = null;
  const form = main.querySelector('#authForm');

  if (reg) {
    form.querySelector('#fCsoport').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      csoport = chip.dataset.cs;
      form.querySelectorAll('#fCsoport .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    });
  }

  form.querySelector('#authSwitch').addEventListener('click', () => viewAuth(reg ? 'login' : 'reg'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = form.querySelector('#authMsg');
    const email = form.querySelector('#fEmail').value.trim();
    const password = form.querySelector('#fPass').value;
    const nev = reg ? form.querySelector('#fNev').value.trim() : '';

    if (reg && nev.length < 2) { msg.innerHTML = note('Írd be a neved.'); return; }
    if (!email) { msg.innerHTML = note('Írd be az e-mail-címed.'); return; }
    if (password.length < 8) { msg.innerHTML = note('A jelszó legalább 8 karakter legyen.'); return; }
    if (reg && !csoport) { msg.innerHTML = note('Válaszd ki, melyik csoportban vagy.'); return; }

    const btn = form.querySelector('#authBtn');
    btn.disabled = true;
    msg.innerHTML = '';

    const { data, error } = reg
      ? await db.auth.signUp({ email, password, options: { data: { nev, csoport } } })
      : await db.auth.signInWithPassword({ email, password });

    if (error) {
      btn.disabled = false;
      msg.innerHTML = note(Fiok.hiba(error));
      return;
    }
    if (reg && !data.session) {
      // Ha a Supabase-ben be van kapcsolva az e-mail-megerősítés, nincs azonnali munkamenet
      viewAuth('login', 'A fiók létrejött, de az e-mail-megerősítés be van kapcsolva. Szólj az adminnak.');
      return;
    }
    start();
  });

  form.querySelector(reg ? '#fNev' : '#fEmail').focus();
}

/* =========================================================================
 * BELÉPVE: fiók
 * ========================================================================= */
function viewAccount() {
  const p = Fiok.profil;
  const varakozik = p.szerep === 'varakozo';

  main.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Szia, ${esc(p.nev.split(' ').pop())}!</h1>
      <p class="page-sub">${varakozik
        ? 'A regisztrációd megvan, de egy adminnak még jóvá kell hagynia. Szólj neki, utána frissítsd az oldalt.'
        : 'Be vagy lépve. A naptárat, az órarendet és a hirdetéseket a menüből éred el.'}</p>
    </div>

    <form id="profForm" class="panel form">
      <div class="kv">
        <span class="muted">E-mail</span><span>${esc(Fiok.user.email || '')}</span>
        <span class="muted">Szerep</span><span><span class="badge"${varakozik ? ' data-warn' : ''}>${esc(Fiok.SZEREPEK[p.szerep])}</span></span>
      </div>
      <div>
        <label class="label" for="pNev">Név</label>
        <input id="pNev" class="field" type="text" minlength="2" maxlength="40" value="${esc(p.nev)}" required>
      </div>
      <div>
        <span class="label">Csoport (az órarend eszerint mutatja az óráidat)</span>
        <div class="chip-row" id="pCsoport">
          <button class="chip" type="button" data-cs="A" aria-pressed="${p.csoport === 'A'}">A csoport</button>
          <button class="chip" type="button" data-cs="B" aria-pressed="${p.csoport === 'B'}">B csoport</button>
        </div>
      </div>
      <div id="profMsg"></div>
      <div class="btn-row">
        <button class="btn btn-primary" type="submit">Mentés</button>
        <button id="logout" class="btn" type="button">Kilépés</button>
      </div>
    </form>

    ${Fiok.admin() ? `
      <section class="section" aria-labelledby="tagokCim">
        <div class="section-head">
          <h2 id="tagokCim" class="section-title">Tagok</h2>
          <span id="tagokNote" class="section-note"></span>
        </div>
        <div id="tagok" class="panel members"><p class="muted">Betöltés…</p></div>
      </section>

      <section class="section" aria-labelledby="impCim">
        <div class="section-head"><h2 id="impCim" class="section-title">Induló adatok betöltése</h2></div>
        <div class="panel form">
          <p class="muted">Válaszd ki a gépedről a <code>Suli/indulo-adatok.json</code> fájlt: az órarend és a benne lévő határidők bekerülnek az adatbázisba. A meglévő órarendet lecseréli; a már felvett határidőket nem duplázza.</p>
          <div><input id="impFile" class="field file" type="file" accept=".json,application/json"></div>
          <div id="impMsg"></div>
        </div>
      </section>` : ''}`;

  let csoport = p.csoport;
  const form = main.querySelector('#profForm');

  form.querySelector('#pCsoport').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    csoport = chip.dataset.cs;
    form.querySelectorAll('#pCsoport .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = form.querySelector('#profMsg');
    const nev = form.querySelector('#pNev').value.trim();
    if (nev.length < 2) { msg.innerHTML = note('A név legalább 2 karakter legyen.'); return; }
    const { error } = await db.from('profilok').update({ nev, csoport }).eq('id', Fiok.user.id);
    if (error) { msg.innerHTML = note(Fiok.hiba(error)); return; }
    await Fiok.betolt();
    Hub.store.set('hub-csoport', csoport);
    msg.innerHTML = note('Elmentve.', 'ok');
  });

  form.querySelector('#logout').addEventListener('click', async () => {
    await db.auth.signOut();
    Hub.setFiokHint(null);
    viewAuth('login');
  });

  if (Fiok.admin()) {
    loadMembers();
    main.querySelector('#impFile').addEventListener('change', importSeed);
  }
}

/* =========================================================================
 * ADMIN: tagok
 * ========================================================================= */
async function loadMembers() {
  const host = main.querySelector('#tagok');
  if (!host) return;
  const { data, error } = await db.from('profilok').select('*').order('letrehozva');
  if (error) { host.innerHTML = note(Fiok.hiba(error)); return; }

  const rank = { varakozo: 0, admin: 1, szerkeszto: 2, tag: 3 };
  const list = data.slice().sort((a, b) => rank[a.szerep] - rank[b.szerep] || a.nev.localeCompare(b.nev, 'hu'));
  const waiting = list.filter((m) => m.szerep === 'varakozo').length;
  main.querySelector('#tagokNote').textContent = `${list.length} fő${waiting ? ` · ${waiting} jóváhagyásra vár` : ''}`;

  host.innerHTML = list.map((m) => {
    const me = m.id === Fiok.user.id;
    return `
      <div class="member" data-id="${esc(m.id)}" data-nev="${esc(m.nev)}">
        <div class="member-name">
          <strong>${esc(m.nev)}</strong>${me ? ' <span class="faint">(te)</span>' : ''}
          <span class="faint">${m.csoport ? `${esc(m.csoport)} csoport` : 'nincs csoport'}</span>
        </div>
        ${me ? `<span class="badge">${esc(Fiok.SZEREPEK[m.szerep])}</span>` : `
          <div class="member-actions">
            ${m.szerep === 'varakozo' ? '<button class="btn btn-small btn-primary" type="button" data-set="tag">Jóváhagyom</button>' : ''}
            <select class="field field-small" aria-label="${esc(m.nev)} szerepe">
              ${Object.entries(Fiok.SZEREPEK).map(([id, nev]) => `<option value="${id}"${id === m.szerep ? ' selected' : ''}>${esc(nev)}</option>`).join('')}
            </select>
            <button class="btn btn-small" type="button" data-del aria-label="${esc(m.nev)} törlése">Törlés</button>
          </div>`}
      </div>`;
  }).join('') + '<div id="tagokMsg"></div>';
}

async function setRole(id, szerep) {
  const { error } = await db.rpc('szerep_beallitas', { kinek: id, uj: szerep });
  if (error) main.querySelector('#tagokMsg').innerHTML = note(Fiok.hiba(error));
  else loadMembers();
}

main.addEventListener('click', async (e) => {
  const row = e.target.closest('.member');
  if (!row) return;
  const approve = e.target.closest('[data-set]');
  if (approve) { setRole(row.dataset.id, approve.dataset.set); return; }
  if (e.target.closest('[data-del]')) {
    if (!window.confirm(`Biztosan törlöd ${row.dataset.nev} fiókját? Ez nem vonható vissza.`)) return;
    const { error } = await db.rpc('tag_torlese', { kinek: row.dataset.id });
    if (error) main.querySelector('#tagokMsg').innerHTML = note(Fiok.hiba(error));
    else loadMembers();
  }
});

main.addEventListener('change', (e) => {
  const row = e.target.closest('.member');
  if (row && e.target.tagName === 'SELECT') setRole(row.dataset.id, e.target.value);
});

/* =========================================================================
 * ADMIN: induló adatok (Suli/indulo-adatok.json)
 * ========================================================================= */
const NAPOK = { hetfo: 1, kedd: 2, szerda: 3, csutortok: 4, pentek: 5 };

async function importSeed(e) {
  const msg = main.querySelector('#impMsg');
  const file = e.target.files[0];
  if (!file) return;

  let seed;
  try {
    seed = JSON.parse(await file.text());
  } catch (err) {
    msg.innerHTML = note('Ez nem érvényes JSON fájl.');
    return;
  }

  const targyak = seed.targyak || {};
  const orak = [];
  Object.entries(seed.orarend || {}).forEach(([nap, sorok]) => {
    if (!NAPOK[nap] || !Array.isArray(sorok)) return;
    sorok.forEach(([tol, ig, csoport, targy, terem, tanar]) => {
      orak.push({
        nap: NAPOK[nap], ora_tol: tol, ora_ig: ig, csoport,
        targy: targyak[targy] || targy, terem: terem || null, tanar: tanar || null
      });
    });
  });

  const hataridok = (seed.hataridok || []).map((h) => {
    const [datum, ido] = String(h.hatarido || '').split('T');
    return {
      cim: h.cim,
      tipus: h.tipus || 'egyeb',
      targy: h.targy || null,
      datum,
      ido: ido || null,
      leiras: [h.leadando ? `Leadandó: ${h.leadando}` : '', h.pont ? `${h.pont} pont` : ''].filter(Boolean).join('\n') || null,
      teendok: h.teendok || []
    };
  }).filter((h) => h.cim && /^\d{4}-\d{2}-\d{2}$/.test(h.datum));

  if (!orak.length && !hataridok.length) {
    msg.innerHTML = note('A fájlban nincs sem órarend, sem határidő.');
    return;
  }
  if (!window.confirm(`Betöltés: ${orak.length} órarendi sor (a meglévő órarend helyére) és ${hataridok.length} határidő. Mehet?`)) {
    e.target.value = '';
    return;
  }

  const errors = [];
  if (orak.length) {
    const del = await db.from('orarend').delete().gte('id', 0);
    if (del.error) errors.push(Fiok.hiba(del.error));
    else {
      const ins = await db.from('orarend').insert(orak);
      if (ins.error) errors.push(Fiok.hiba(ins.error));
    }
  }

  let ujHatarido = 0;
  if (hataridok.length) {
    const cur = await db.from('esemenyek').select('cim,datum');
    if (cur.error) errors.push(Fiok.hiba(cur.error));
    else {
      const megvan = new Set(cur.data.map((x) => `${x.cim}|${x.datum}`));
      const uj = hataridok.filter((h) => !megvan.has(`${h.cim}|${h.datum}`));
      ujHatarido = uj.length;
      if (uj.length) {
        const ins = await db.from('esemenyek').insert(uj);
        if (ins.error) errors.push(Fiok.hiba(ins.error));
      }
    }
  }

  e.target.value = '';
  msg.innerHTML = errors.length
    ? note(errors.join(' '))
    : note(`Kész: ${orak.length} órarendi sor és ${ujHatarido} új határidő került be.`, 'ok');
}

/* =========================================================================
 * INDÍTÁS
 * ========================================================================= */
async function start() {
  if (!Fiok.kesz) {
    main.innerHTML = '<div class="panel gate"><h1 class="section-title">A belépés még nincs bekapcsolva</h1><p class="muted">Az adatbázis-kapcsolat beállítása folyamatban van.</p></div>';
    return;
  }
  main.innerHTML = '<p class="muted">Betöltés…</p>';
  await Fiok.betolt();

  if (Fiok.betoltesiHiba) {
    main.innerHTML = `<div class="panel gate"><h1 class="section-title">Nem sikerült betölteni</h1><p class="muted">${esc(Fiok.betoltesiHiba)}</p><button class="btn" type="button" onclick="location.reload()">Újra</button></div>`;
  } else if (!Fiok.user) {
    viewAuth('login');
  } else if (!Fiok.profil) {
    // Van munkamenet, de nincs profil: a fiókot közben törölték
    await db.auth.signOut();
    Hub.setFiokHint(null);
    viewAuth('login', 'Ez a fiók már nem létezik. Regisztrálj újra.');
  } else {
    viewAccount();
  }
}

start();
