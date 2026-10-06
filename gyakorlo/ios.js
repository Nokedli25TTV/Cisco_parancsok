'use strict';

/* =========================================================================
 * Gyakorló – ios.js
 * IOS parancsok összehasonlítása úgy, ahogy a router is elfogadná:
 *   - a kulcsszavak rövidíthetők (conf t, sh ip int br)
 *   - az interfésznevek bármelyik alakja jó (g0/0, gi 0/0, gigabitEthernet0/0)
 *   - a kis/nagybetű a kulcsszavaknál nem számít
 *   - a {kapcsos} zárójeles szó (név, jelszó) betűre pontosan kell
 * Valódi IOS-parancsfát nem ismer: a rövidítés akkor jó, ha legalább 3 betű
 * (vagy a MIN táblában megadott hossz), és az elvárt szó eleje.
 * ========================================================================= */

const IOS = (() => {
  const IF_TYPES = ['gigabitethernet', 'fastethernet', 'ethernet', 'serial', 'loopback', 'vlan', 'port-channel', 'tunnel'];
  const NUM = /^\d+(\/\d+)*(\.\d+)?(-\d+)?$/;      // 0/0, 0/0/0, 0/0.10, 0/1-4, 10

  /** Kulcsszavak, amelyek 3 betűnél rövidebben (vagy csak hosszabban) egyértelműek */
  const MIN = {
    terminal: 1, mode: 1,
    enable: 2, show: 2, exit: 2, write: 2, switchport: 2, shutdown: 2,
    ip: 2, no: 2, do: 2, access: 2, trunk: 2, brief: 2,
    configure: 4
  };

  function tokens(text) {
    const raw = String(text).trim()
      .replace(/(\d)\s*-\s*(\d)/g, '$1-$2')        // "f0/1 - 4" → "f0/1-4"
      .split(/\s+/).filter(Boolean);
    const out = [];

    for (let i = 0; i < raw.length; i++) {
      const tok = raw[i];
      if (tok.startsWith('{')) {
        out.push({ lit: tok.replace(/^\{|\}$/g, ''), raw: tok });
        continue;
      }

      // Interfész egyben ("g0/0") vagy két szóban ("gig 0/0")
      const joined = tok.match(/^([a-z-]+)(\d[\d/.-]*)$/i);
      let name = '';
      let num = '';
      if (joined && NUM.test(joined[2])) {
        [, name, num] = joined;
      } else if (/^[a-z-]+$/i.test(tok) && raw[i + 1] && NUM.test(raw[i + 1])) {
        name = tok;
        num = raw[i + 1];
      }
      const type = name && IF_TYPES.find((t) => t.startsWith(name.toLowerCase()));
      if (type) {
        out.push({ iface: type + num, raw: joined ? tok : `${tok} ${num}` });
        if (!joined) i++;
        continue;
      }
      out.push({ w: tok, raw: tok });
    }
    return out;
  }

  function matchOne(expected, input) {
    const e = tokens(expected);
    const u = tokens(input);
    if (e.length !== u.length) return false;

    return e.every((et, i) => {
      const ut = u[i];
      if (et.lit !== undefined) return ut.raw === et.lit;
      if (et.iface) return ut.iface === et.iface;
      if (ut.w === undefined) return false;

      const ew = et.w.toLowerCase();
      const uw = ut.w.toLowerCase();
      if (/^[a-z][a-z-]*$/.test(ew)) {
        return ew.startsWith(uw) && uw.length >= Math.min(ew.length, MIN[ew] || 3);
      }
      return ew === uw;                              // szám, IP-cím, dot1q
    });
  }

  /** expected: egy parancs vagy több elfogadott parancs tömbje */
  const match = (expected, input) => [].concat(expected).some((e) => matchOne(e, input));

  /** A megoldás megjelenítéséhez: a {kapcsos} jelölés nélkül */
  const display = (expected) => String([].concat(expected)[0]).replace(/[{}]/g, '');

  return { match, display };
})();
