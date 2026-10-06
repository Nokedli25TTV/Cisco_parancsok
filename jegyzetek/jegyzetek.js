'use strict';

/* =========================================================================
 * Jegyzetek – jegyzetek.js
 * A data.js (TARGYAK, JEGYZETEK) megjelenítése. Útvonal: jegyzetek/#id
 * ========================================================================= */

const { esc, rich } = Hub;
const tocEl = document.getElementById('toc');
const mainEl = document.getElementById('main');

const byTargy = (id) => JEGYZETEK.filter((j) => j.targy === id);

/* ---------- Blokkok ---------- */
function listHtml(tag, items) {
  const li = items.map((item) => (Array.isArray(item)
    ? `<li>${rich(item[0])}${listHtml('ul', item[1])}</li>`
    : `<li>${rich(item)}</li>`)).join('');
  return `<${tag}>${li}</${tag}>`;
}

function codeHtml(label, code) {
  const lines = code.replace(/^\n+/, '').replace(/\s+$/, '').split('\n')
    .map((l) => (/^\s*[!#]/.test(l) ? `<span class="c">${esc(l)}</span>` : esc(l)))
    .join('\n');
  return `<div class="note-code"><div class="note-code-head">${esc(label)}</div><pre>${lines}</pre></div>`;
}

function blockHtml(b) {
  switch (b[0]) {
    case 'p': return `<p>${rich(b[1])}</p>`;
    case 'ul':
    case 'ol': return listHtml(b[0], b[1]);
    case 'key': return `<p class="note-key">${rich(b[1])}</p>`;
    case 'code': return codeHtml(b[1], b[2]);
    case 'table': return `<div class="table-wrap"><table class="table">
      <thead><tr>${b[1].map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${b[2].map((r) => `<tr>${r.map((c) => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
    default:
      console.warn(`Ismeretlen blokktípus: "${b[0]}"`);
      return '';
  }
}

/* ---------- Tartalomjegyzék ---------- */
function renderToc(activeId) {
  tocEl.innerHTML = TARGYAK.map((t) => {
    const notes = byTargy(t.id);
    const links = notes.length
      ? notes.map((j) => `<a href="#${j.id}"${j.id === activeId ? ' aria-current="true"' : ''}>${esc(j.cim)}</a>`).join('')
      : '<p class="none">Még nincs jegyzet</p>';
    return `<h2>${esc(t.nev)}</h2>${links}`;
  }).join('');
  /* Telefonon a megnyitott jegyzet fölött ne legyen ott a teljes lista */
  if (activeId) tocEl.setAttribute('data-open-note', '');
  else tocEl.removeAttribute('data-open-note');
}

/* ---------- Áttekintés ---------- */
function renderOverview() {
  document.title = 'Jegyzetek – Osztályoldal';
  mainEl.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Jegyzetek</h1>
      <p class="page-sub">Vázlatok az órai anyagból, tantárgyanként. Minden jegyzet végén ott a hozzá tartozó gyakorlás.</p>
    </div>
    ${TARGYAK.filter((t) => byTargy(t.id).length).map((t) => `
      <section class="section">
        <div class="section-head"><h2 class="section-title">${esc(t.nev)}</h2></div>
        <div class="grid">
          ${byTargy(t.id).map((j) => `
            <a class="tile" href="#${j.id}">
              <span class="tile-title">${esc(j.cim)}</span>
              <span class="tile-desc">${esc(j.leiras)}</span>
              <span class="tile-meta">${j.reszek.length} rész</span>
            </a>`).join('')}
        </div>
      </section>`).join('')}`;
}

/* ---------- Egy jegyzet ---------- */
function renderNote(note) {
  const targy = TARGYAK.find((t) => t.id === note.targy);
  document.title = `${note.cim} – Jegyzetek`;
  mainEl.innerHTML = `
    <article class="note">
      <a class="back-link" href="#">← Összes jegyzet</a>
      <p class="eyebrow">${esc(targy ? targy.nev : '')}</p>
      <h1>${esc(note.cim)}</h1>
      <p class="lead">${esc(note.leiras)}</p>
      <div class="btn-row">
        ${note.tema ? `<a class="btn btn-primary" href="../gyakorlo/#kviz=${encodeURIComponent(note.tema)}">Gyakorold kvízzel</a>` : ''}
        <button class="btn" type="button" id="printBtn">Nyomtatás</button>
      </div>
      ${note.reszek.map((r) => `<h2>${esc(r.cim)}</h2>${r.blokkok.map(blockHtml).join('')}`).join('')}
    </article>`;
  document.getElementById('printBtn').addEventListener('click', () => window.print());
}

/* ---------- Útvonal ---------- */
function route() {
  let id = '';
  try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { id = ''; }
  const note = JEGYZETEK.find((j) => j.id === id);
  renderToc(note ? note.id : '');
  if (note) renderNote(note);
  else renderOverview();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
