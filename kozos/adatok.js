'use strict';

/* =========================================================================
 * Osztályoldal – adatok.js
 * A kezdőlap nyilvános, kézzel szerkeszthető adatai.
 * FIGYELEM: ez a fájl nyilvános (GitHub). Órarend, dolgozatidőpont, név
 * NEM kerülhet ide – azok belépés mögé, adatbázisba mennek.
 * ========================================================================= */

/** Csengetési rend: [óra sorszáma, kezdés, vége] */
const CSENGETES = [
  [1,  '07:30', '08:15'],
  [2,  '08:25', '09:10'],
  [3,  '09:20', '10:05'],
  [4,  '10:20', '11:05'],
  [5,  '11:15', '12:00'],
  [6,  '12:15', '13:00'],
  [7,  '13:15', '14:00'],
  [8,  '14:10', '14:55'],
  [9,  '15:00', '15:45'],
  [10, '15:50', '16:35']
];

/** Mindenkinél megjelenő visszaszámlálók. datum: ÉÉÉÉ-HH-NN.
 *  A lejárt dátumok maguktól eltűnnek. Ide csak nyilvános dátum kerüljön
 *  (szünet, ünnep, vizsgaidőszak) – a saját dogáidat az oldalon vedd fel. */
const VISSZASZAMLALOK = [
  { nev: 'Október 23. – munkaszüneti nap', datum: '2026-10-23' },
  { nev: 'Szenteste', datum: '2026-12-24' }
];
