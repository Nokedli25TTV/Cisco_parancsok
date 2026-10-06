'use strict';

/* =========================================================================
 * Osztályoldal – fiok.js
 * Kapcsolat a Supabase adatbázissal, belépett felhasználó, szerepek.
 * Csak a belépős lapok töltik be (a supabase-js könyvtár UTÁN).
 *
 * Szerepek: varakozo → tag → szerkeszto → admin (lásd supabase/schema.sql).
 * A gombok elrejtése itt csak kényelem: hogy ki mit olvashat és írhat,
 * azt az adatbázis szabályai döntik el, nem ez a kód.
 * ========================================================================= */

const Fiok = (() => {
  const { config, root, esc } = Hub;
  const kesz = Boolean(config.key && window.supabase);
  const db = kesz ? window.supabase.createClient(config.url, config.key) : null;

  let user = null;
  let profil = null;
  let betoltesiHiba = '';

  const SZEREPEK = {
    varakozo: 'jóváhagyásra vár',
    tag: 'tag',
    szerkeszto: 'szerkesztő',
    admin: 'admin'
  };

  /** A Supabase angol hibaüzenetei érthető magyarul */
  function hiba(error) {
    const msg = (error && error.message) || String(error || '');
    if (/Invalid login credentials/i.test(msg)) return 'Hibás e-mail-cím vagy jelszó.';
    if (/already registered|already been registered/i.test(msg)) return 'Ezzel az e-mail-címmel már van fiók. Lépj be.';
    if (/Password should be at least|weak password/i.test(msg)) return 'A jelszó túl rövid vagy túl gyenge (legalább 8 karakter legyen).';
    if (/valid email|invalid format|email address.*invalid/i.test(msg)) return 'Ez nem tűnik érvényes e-mail-címnek.';
    if (/rate limit|too many/i.test(msg)) return 'Túl sok próbálkozás. Várj pár percet, és próbáld újra.';
    if (/Email not confirmed/i.test(msg)) return 'Az e-mail-cím nincs megerősítve. Szólj az adminnak.';
    if (/Signups not allowed/i.test(msg)) return 'A regisztráció jelenleg ki van kapcsolva.';
    if (/row-level security|permission denied|not allowed/i.test(msg)) return 'Ehhez nincs jogosultságod.';
    if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Nem sikerült elérni a szervert. Van internet?';
    return msg || 'Ismeretlen hiba történt.';
  }

  /** Munkamenet és profil betöltése; a fejléc is ebből frissül */
  async function betolt() {
    user = null;
    profil = null;
    betoltesiHiba = '';
    if (!db) return null;

    const { data, error } = await db.auth.getSession();
    if (error) betoltesiHiba = hiba(error);
    user = data && data.session ? data.session.user : null;

    if (user) {
      const res = await db.from('profilok').select('*').eq('id', user.id).maybeSingle();
      if (res.error) betoltesiHiba = hiba(res.error);
      profil = res.data || null;
    }
    // Ha a profil csak hálózati hiba miatt nem jött le, a fejléc maradjon a régi
    if (!betoltesiHiba) Hub.setFiokHint(profil ? { nev: profil.nev, szerep: profil.szerep } : null);
    return profil;
  }

  const tag = () => Boolean(profil && profil.szerep !== 'varakozo');
  const szerkeszto = () => Boolean(profil && (profil.szerep === 'szerkeszto' || profil.szerep === 'admin'));
  const admin = () => Boolean(profil && profil.szerep === 'admin');

  const uzenet = (cim, szoveg, gomb) => `
    <div class="panel gate">
      <h1 class="section-title">${esc(cim)}</h1>
      <p class="muted">${szoveg}</p>
      ${gomb || ''}
    </div>`;

  /** Belépős lap kapuja: ha a látogató nem jóváhagyott tag, kiírja, mi a teendő,
   *  és false-t ad vissza. */
  async function kapu(host) {
    if (!db) {
      host.innerHTML = uzenet('Ez a rész még nincs bekapcsolva', 'Az adatbázis-kapcsolat beállítása folyamatban van.');
      return false;
    }
    host.innerHTML = '<p class="muted">Betöltés…</p>';
    await betolt();

    if (betoltesiHiba) {
      host.innerHTML = uzenet('Nem sikerült betölteni', esc(betoltesiHiba),
        '<button class="btn" type="button" onclick="location.reload()">Újra</button>');
      return false;
    }
    if (!user) {
      host.innerHTML = uzenet('Ehhez be kell lépned',
        'A naptár, az órarend és a hirdetések csak az osztály tagjainak látszanak.',
        `<a class="btn btn-primary" href="${root}/belepes/">Belépés vagy regisztráció</a>`);
      return false;
    }
    if (!tag()) {
      host.innerHTML = uzenet('Jóváhagyásra vársz',
        'A regisztrációd megvan, de egy adminnak még jóvá kell hagynia. Szólj neki, utána frissítsd az oldalt.',
        `<a class="btn" href="${root}/belepes/">Fiókom</a>`);
      return false;
    }
    return true;
  }

  /** Élő frissítés: a megadott táblák bármely változására lefut a visszahívás */
  function figyel(nev, tablak, cb) {
    if (!db) return;
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = setTimeout(cb, 250); };   // sorozatos változásnál egyszer frissít
    const ch = db.channel(nev);
    tablak.forEach((table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, later));
    ch.subscribe();
  }

  return {
    db, kesz, SZEREPEK, hiba, betolt, kapu, figyel, tag, szerkeszto, admin,
    get user() { return user; },
    get profil() { return profil; },
    get betoltesiHiba() { return betoltesiHiba; }
  };
})();
