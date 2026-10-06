'use strict';

/* =========================================================================
 * Osztályoldal – hub.js
 * Közös részek minden lapon: fejléc és navigáció, téma, tárolás, segédek.
 *
 * A lap a <html> elemen adja meg, hol van:
 *   data-root="."   a gyökérhez vezető relatív út ("." vagy "..")
 *   data-page="…"   az aktuális menüpont id-je (lásd MENU)
 * ========================================================================= */

const Hub = (() => {
  const root = document.documentElement.dataset.root || '.';
  const page = document.documentElement.dataset.page || '';

  /** A belépős részek (naptár, órarend, hirdetések) adatbázisa.
   *  A kulcs a Supabase NYILVÁNOS (publishable / anon) kulcsa: böngészőbe szánt,
   *  nem titok – a védelmet a supabase/schema.sql szabályai adják.
   *  A titkos (secret / service_role) kulcs SOHA nem kerülhet ide.
   *  Üres kulcsnál a belépős menüpontok nem jelennek meg. */
  const config = {
    url: 'https://yrqpwajcsasxkiqlkrnl.supabase.co',
    key: 'sb_publishable_gOeYEDcClEhqLaPyT8weUw_9e2kZhlO'
  };

  /** Új modul felvétele: ide egy sor, és a fejlécben minden lapon megjelenik.
   *  priv: csak bekapcsolt adatbázissal látszik. */
  const MENU = [
    { id: 'kezdolap',   label: 'Kezdőlap',   href: `${root}/` },
    { id: 'parancstar', label: 'Parancstár', href: `${root}/parancstar/` },
    { id: 'jegyzetek',  label: 'Jegyzetek',  href: `${root}/jegyzetek/` },
    { id: 'gyakorlo',   label: 'Gyakorló',   href: `${root}/gyakorlo/` },
    { id: 'naptar',     label: 'Naptár',     href: `${root}/naptar/`,  priv: true },
    { id: 'orarend',    label: 'Órarend',    href: `${root}/orarend/`, priv: true }
  ];

  const FIOK_KEY = 'hub-fiok';               // { nev, szerep } – csak a fejléc kiírásához

  const THEME_KEY = 'pt-cheatsheet-theme';   // a parancstárral közös kulcs

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /** `kód` → <code>, **kiemelés** → <strong> (a szöveg többi része escape-elve) */
  const rich = (s) => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* nem kritikus */ }
    }
  };

  function applyTheme(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.setAttribute('aria-label', theme === 'dark' ? 'Világos téma bekapcsolása' : 'Sötét téma bekapcsolása');
    if (persist) { try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* nem kritikus */ } }
  }

  /** A fejléc jobb szélén: „Belépés” vagy a belépett tag keresztneve */
  function showFiok(hint) {
    const link = document.getElementById('fiokLink');
    if (!link) return;
    link.textContent = hint && hint.nev ? hint.nev.split(' ').pop() : 'Belépés';
    link.title = hint && hint.nev ? `${hint.nev} – fiók` : 'Belépés vagy regisztráció';
  }

  /** A fiok.js hívja belépés, kilépés és profilbetöltés után */
  function setFiokHint(hint) {
    store.set(FIOK_KEY, hint);
    showFiok(hint);
  }

  function renderHeader() {
    const host = document.getElementById('hubbar');
    if (!host) return;
    host.className = 'hubbar';
    host.innerHTML = `
      <div class="hubbar-inner">
        <a class="hub-brand" href="${root}/">
          <span class="hub-brand-tile" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M3 9.5 12 5l9 4.5-9 4.5z"/><path d="M7 12v4.5c1.4 1.3 3.1 2 5 2s3.6-.7 5-2V12M21 9.5V15"/></svg>
          </span>
          <span>Osztály<strong>oldal</strong></span>
        </a>
        <nav class="hub-nav" aria-label="Fő menü">
          ${MENU.filter((m) => !m.priv || config.key).map((m) =>`<a href="${m.href}"${m.id === page ? ' aria-current="page"' : ''}>${m.label}</a>`).join('')}
        </nav>
        <div class="hub-actions">
          ${config.key ? `<a id="fiokLink" class="btn btn-small" href="${root}/belepes/"></a>` : ''}
          <button id="themeToggle" class="icon-btn" type="button">
            <svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            <svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>
          </button>
        </div>
      </div>`;

    const current = host.querySelector('.hub-nav [aria-current]');
    if (current) current.scrollIntoView({ block: 'nearest', inline: 'center' });   // keskeny kijelzőn a menü görgethető
    showFiok(store.get(FIOK_KEY, null));
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark', false);
    document.getElementById('themeToggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  }

  /** Fisher–Yates keverés (új tömböt ad vissza) */
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Helyi dátum → "2026-10-06" (az időzóna nem tolja el, mint a toISOString) */
  function dayKey(d = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  renderHeader();

  return { root, page, config, esc, rich, store, shuffle, dayKey, setFiokHint };
})();
