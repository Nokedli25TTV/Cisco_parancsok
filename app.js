'use strict';

/* =========================================================================
 * Packet Tracer parancstár – app.js
 * A tartalom a data.js-ben van (COMMANDS, CATEGORIES), ide nem kell nyúlni.
 *
 *  1. SEGÉDFÜGGVÉNYEK, IKONOK
 *  2. SZINTAXIS KIEMELÉS
 *  3. ADATOK ELŐKÉSZÍTÉSE (magyarázatok leválasztása)
 *  4. RENDERELÉS (szűrők, kártyák, tartalomjegyzék)
 *  5. KERESÉS + SZŰRÉS
 *  6. TARTALOMJEGYZÉK: AZ ÉPP OLVASOTT TÉMA KIEMELÉSE
 *  7. VÁGÓLAP, TÉMA, MAGYARÁZATOK, BILLENTYŰK
 *  8. INDÍTÁS
 * ========================================================================= */

const THEME_KEY = 'pt-cheatsheet-theme';
const NOTES_KEY = 'pt-cheatsheet-notes';

/* =========================================================================
 * 1. SEGÉDFÜGGVÉNYEK, IKONOK
 * ========================================================================= */
const $ = (sel) => document.querySelector(sel);

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);

/** Kis- és ékezetfüggetlen alak a kereséshez ("Jelszó" → "jelszo") */
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Tipp szöveg: `parancs` → <code>parancs</code>, a keresett szavak kiemelésével */
const richText = (s, tokens = []) => String(s).split(/`([^`]+)`/)
  .map((part, i) => (i % 2 ? `<code>${markText(part, tokens)}</code>` : markText(part, tokens)))
  .join('');

const catById = (id) => CATEGORIES.find((c) => c.id === id);

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* nem kritikus */ } }
};

const ICONS = {
  copy: '<svg class="icon-copy" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  check: '<svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>'
};

/** Kategória ikonok (24×24, vonalas). Ikon nélküli új kategória a „Mind” ikonját kapja. */
const CAT_ICONS = {
  all: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  alapok: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 10l3 2.5L7 15M12.5 15H17"/>',
  switching: '<path d="M4.5 8.5h14M15.5 5.5l3 3-3 3M19.5 15.5h-14M8.5 12.5l-3 3 3 3"/>',
  redundancia: '<circle cx="5.5" cy="12" r="2.5"/><circle cx="18.5" cy="12" r="2.5"/><path d="M7.6 10.6c1.9-3.1 6.9-3.1 8.8 0M7.6 13.4c1.9 3.1 6.9 3.1 8.8 0"/>',
  routing: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5"/>',
  ipv6: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.5 5.2 3.5 8.5s-1.1 6.2-3.5 8.5c-2.4-2.3-3.5-5.2-3.5-8.5s1.1-6.2 3.5-8.5z"/>',
  services: '<rect x="3.5" y="4" width="17" height="7" rx="2"/><rect x="3.5" y="13" width="17" height="7" rx="2"/><path d="M7.5 7.5h.01M7.5 16.5h.01M11 7.5h5.5M11 16.5h5.5"/>',
  security: '<path d="M12 3.2l7 2.8v5.3c0 4.6-3 8.1-7 9.5-4-1.4-7-4.9-7-9.5V6z"/><path d="M9 12l2.2 2.2 4-4.2"/>',
  wan: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.6 4.5 4.5 0 0 0 7 18.5z"/>',
  wireless: '<path d="M4.5 10.5a10.6 10.6 0 0 1 15 0M7.5 13.8a6.2 6.2 0 0 1 9 0M10.5 17a2 2 0 0 1 3 0M12 19.8h.01"/>',
  iot: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
  segedlet: '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8.5 6.5h7M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>'
};

/** Kódblokk típusikonok: >_ parancssor, nyíl = kattintás a grafikus felületen, </> programkód */
const BLOCK_ICONS = {
  ios: '<path d="M5 7.5l4 4-4 4M11.5 16.5H19"/>',
  pc: '<path d="M5 7.5l4 4-4 4M11.5 16.5H19"/>',
  gui: '<path d="M5.5 4.5l13 5.6-5.7 1.9-2.3 5.6z"/>',
  python: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M9.5 9.5v10"/>',
  steps: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  text: '<path d="M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>'
};

/** Ezekben a blokkokban van soronkénti parancs + magyarázat (és másolás gomb) */
const CODE_LANGS = new Set(['ios', 'pc', 'gui']);

const svgIcon = (paths, cls) => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const catIcon = (id, cls) => svgIcon(CAT_ICONS[id] || CAT_ICONS.all, cls);

/** Kategória színe; ha a CSS-ben nincs --cat-<id>, az akcentszín */
const catColor = (id) => `var(--cat-${id}, var(--accent))`;

/**
 * Kódblokk címke tagolása:
 *   "R1(config)# – VTP szerver"  → prompt + halványabb leírás
 *   "PC › Desktop › VPN"          → útvonal halvány elválasztókkal
 */
function labelHtml(label, lang) {
  const text = String(label || '');
  const m = text.match(/^(.+?)(\s+(?:[–-]\s+.+|\(.+\)))$/);
  const main = m ? m[1] : text;
  const path = main.split(/\s+›\s+/).map(esc).join(' <span class="lbl-sep" aria-hidden="true">›</span> ');
  const sub = m ? `<span class="lbl-sub">${esc(m[2])}</span>` : '';
  return `<span class="${lang === 'ios' ? 'lbl-prompt' : 'lbl-path'}">${path}</span>${sub}`;
}

/* =========================================================================
 * 2. SZINTAXIS KIEMELÉS
 * ========================================================================= */
const tok = (cls, text) => `<span class="t-${cls}">${esc(text)}</span>`;

const IP_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
const IPV6_RE = /^(?=[^:]*:[^:]*:)[0-9a-f:]+(\/\d{1,3})?$/i;
const PORT_RE = /^\d+(\/\d+)+(\.\d+)?$/;
const NUM_RE = /^\d+([,-]\d+)*$/;

const IOS_IFACE = new Set(['fastethernet', 'gigabitethernet', 'serial', 'ethernet', 'console', 'vty', 'loopback', 'tunnel', 'port-channel']);
const IOS_VALUE_AFTER = new Set([
  'name', 'password', 'secret', 'hostname', 'domain-name', 'username', 'pool', 'description',
  'standard', 'extended', 'access-class', 'remark', 'domain', 'key', 'key-string', 'community',
  'transform-set', 'map', 'group', 'zone', 'class-map', 'policy-map', 'inspect', 'access-list',
  'rip', 'dynamic-map', 'list', 'server', 'match-all', 'match-any', 'security', 'source', 'destination'
]);
const IOS_PATH = new Set(['running-config', 'startup-config']);
const IOS_KW = new Set([
  'any', 'host', 'eq', 'neq', 'lt', 'gt', 'range', 'in', 'out', 'tcp', 'udp', 'icmp', 'ip', 'ipv6',
  'echo', 'echo-request', 'www', 'established', 'overload', 'inside', 'outside', 'source',
  'static', 'interface', 'area', 'version', 'privilege', 'general-keys', 'modulus', 'input',
  'local', 'ssh', 'telnet', 'trap', 'datetime', 'msec', 'log', 'mode', 'access', 'trunk',
  'native', 'allowed', 'vlan', 'dot1q', 'debugging', 'sticky', 'mac-address', 'maximum',
  'violation', 'restrict', 'protect', 'shutdown', 'rsa', 'attempts', 'within', 'min-length',
  'nat', 'dhcp', 'motd', 'brief', 'port-security', 'excluded-address', 'lookup', 'ospf',
  'eigrp', 'root', 'primary', 'secondary', 'priority', 'portfast', 'bpduguard', 'default',
  'enable', 'guard', 'active', 'passive', 'desirable', 'auto', 'on', 'link-local', 'eui-64',
  'autoconfig', 'md5', 'message-digest', 'authentication', 'subnets', 'metric', 'lifetime',
  'infinite', 'prefix', 'type', 'match-all', 'match-any', 'security', 'destination', 'pap',
  'chap', 'ppp', 'gre', 'isakmp', 'ipsec-isakmp', 'client', 'configuration', 'address',
  'respond', 'authorization', 'network', 'login', 'radius', 'tacacs+', 'sha', 'aes',
  'esp-aes', 'esp-sha-hmac', 'esp-3des', 'netmask', 'port', 'to', 'technology-package',
  'module', 'boot', 'rw', 'ro', 'update-calendar', 'failure', 'success', 'on-failure',
  'on-success', 'counters', 'summary', 'detail', 'neighbors', 'neighbor', 'include', 'begin',
  'binding', 'information', 'option', 'trust', 'limit', 'rate', 'id', 'switchport', 'sa', 'sessions',
  'zone-pair', 'protocols', 'status', 'associations', 'dynamic', 'generate', 'zeroize',
  'passwords', 'list'
]);

/** Cisco IOS sor (behúzás nélkül) */
function hlIos(line) {
  if (/^\s*!/.test(line)) return tok('comment', line);

  const banner = line.match(/^(banner\s+\S+\s+)(.*)$/);
  if (banner) return tok('cmd', banner[1]) + tok('str', banner[2]);

  let out = '';
  let idx = 0;
  let cmdPos = 0;
  let prev = '';
  const parts = line.split(/(\s+)/);

  // sorszámmal kezdődő ACL sor (pl. "15 permit ...")
  if (/^\d+$/.test(parts[0]) && parts.length > 2) {
    out += tok('num', parts[0]) + parts[1];
    parts.splice(0, 2);
  }

  for (const part of parts) {
    if (!part) continue;
    if (/^\s+$/.test(part)) { out += part; continue; }

    const w = part.toLowerCase();
    let cls = '';

    if (idx === cmdPos && (w === 'no' || w === 'do')) { cls = 'neg'; cmdPos++; }
    else if (w === 'permit') cls = 'ok';
    else if (w === 'deny') cls = 'bad';
    else if (idx === cmdPos) cls = 'cmd';
    else if (IP_RE.test(w) || IPV6_RE.test(w)) cls = 'ip';
    else if (PORT_RE.test(w)) cls = 'iface';
    else if (NUM_RE.test(w)) cls = 'num';
    else if (IOS_IFACE.has(w)) cls = 'iface';
    else if (IOS_VALUE_AFTER.has(prev) && !IOS_KW.has(w)) cls = 'str';
    else if (IOS_PATH.has(w) || w.endsWith(':')) cls = 'path';
    else if (IOS_KW.has(w)) cls = 'kw';

    out += cls ? tok(cls, part) : esc(part);
    prev = w;
    idx++;
  }
  return out;
}

/** PC Command Prompt sor */
function hlPc(line) {
  if (/^\s*#/.test(line)) return tok('comment', line);

  let out = '';
  let idx = 0;
  for (const part of line.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) { out += part; continue; }

    let cls;
    if (idx === 0) cls = 'cmd';
    else if (/^[/-][a-z]/i.test(part)) cls = 'kw';
    else if (IP_RE.test(part) || IPV6_RE.test(part)) cls = 'ip';
    else cls = 'str';

    out += tok(cls, part);
    idx++;
  }
  return out;
}

/** Grafikus lépés: "Menü > Almenü" (›-ként jelenik meg), "Mező: érték" */
function hlGui(line) {
  if (/^\s*#/.test(line)) return tok('comment', line);

  return line.split(/(\s>\s)/).map((seg) => {
    if (/^\s>\s$/.test(seg)) return tok('sep', ' › ');

    return seg.split(/(\s{2,})/).map((chunk) => {
      if (!chunk) return chunk;
      if (/^\s+$/.test(chunk)) return tok('gap', chunk);   // több mező egy sorban
      const kv = chunk.match(/^([^:]+?):(\s+)(.*)$/);
      if (kv) return tok('key', kv[1] + ':') + kv[2] + tok('str', kv[3]);
      return tok('nav', chunk);
    }).join('');
  }).join('');
}

/** Python (MCU/SBC) sor */
const PY_RE = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(from|import|def|while|if|elif|else|return|not|and|or|in|for|True|False|None|pass|break|as)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\s*\()|\b([A-Z][A-Z0-9_]+)\b/g;

function hlPy(line) {
  let out = '';
  let last = 0;
  for (const m of line.matchAll(PY_RE)) {
    const [text, comment, str, kw, num, fn] = m;
    out += esc(line.slice(last, m.index));
    const cls = comment ? 'comment' : str ? 'pystr' : kw ? 'kw' : num ? 'num' : fn ? 'fn' : 'const';
    out += tok(cls, text);
    last = m.index + text.length;
  }
  return out + esc(line.slice(last));
}

const HIGHLIGHTERS = { ios: hlIos, pc: hlPc, gui: hlGui, python: hlPy };

/* =========================================================================
 * 3. ADATOK ELŐKÉSZÍTÉSE
 * ========================================================================= */

/** "parancs  // magyarázat" → { cmd, note } (python blokkban nem bont) */
function splitNote(raw, lang) {
  const line = raw.replace(/\s+$/, '');
  if (lang === 'python') return { cmd: line, note: '' };
  const m = line.match(/^(.*?\S)\s+\/\/\s+(.*)$/);
  return m ? { cmd: m[1], note: m[2] } : { cmd: line, note: '' };
}

function prepareData() {
  const known = new Set(CATEGORIES.map((c) => c.id));
  COMMANDS.forEach((item) => {
    if (!known.has(item.category)) {
      console.warn(`Ismeretlen kategória: "${item.category}" (${item.id})`);
    }
    item.blocks = item.blocks || [];
    item.blocks.forEach((b) => {
      if (b.lang === 'table') {                       // táblázat: nincs kód, csak fejléc és sorok
        b.lines = [];
        b.copyText = '';
        b.text = [b.head.join(' '), ...b.rows.map((r) => r.join(' '))].join('\n');
        return;
      }
      const code = b.code.replace(/^\n+/, '').replace(/\s+$/, '');
      b.lines = code.split('\n').map((l) => splitNote(l, b.lang));
      // Csak a bemásolható parancsblokkok kapnak másolás gombot
      b.copyText = CODE_LANGS.has(b.lang) || b.lang === 'python' ? b.lines.map((l) => l.cmd).join('\n') : '';
      b.text = code;
    });
  });
}

/* =========================================================================
 * 4. RENDERELÉS
 * ========================================================================= */
const els = {};
const state = { category: 'all', query: '' };
const cardRefs = [];                 // { item, el, titleEl, descEl, tipEl, haystack, lineRefs, tocItem, tocLink }
const sectionRefs = new Map();       // kategória id → { el, countEl }
const pillRefs = new Map();          // kategória id → { el, countEl }
const tocRefs = new Map();           // kategória id → { btn, countEl, list }

function renderFilters() {
  const frag = document.createDocumentFragment();

  CATEGORIES.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill';
    btn.dataset.cat = cat.id;
    btn.style.setProperty('--cat', catColor(cat.id));
    btn.setAttribute('aria-pressed', String(cat.id === state.category));
    btn.innerHTML = `${catIcon(cat.id, 'pill-icon')}${esc(cat.label)}<span class="pill-count"></span>`;
    frag.appendChild(btn);
    pillRefs.set(cat.id, { el: btn, countEl: btn.querySelector('.pill-count') });
  });

  els.filters.appendChild(frag);
}

/** Egy kódsor: parancs + (opcionális) magyarázat – a CSS teszi alá vagy mellé */
function renderLine(l, lang) {
  const indent = l.cmd.match(/^\s*/)[0].length;
  const body = l.cmd.slice(indent);
  const code = body ? HIGHLIGHTERS[lang](body) : '&#8203;';
  const note = l.note ? `<span class="ln-note">${esc(l.note)}</span>` : '';
  return `<div class="ln${l.note ? ' has-note' : ''}" style="--i:${indent}"><span class="ln-cmd">${code}</span>${note}</div>`;
}

/** Táblázat: a csak számokat tartalmazó oszlopok fix szélességű betűt kapnak */
const MONO_CELL = /^[\d\s./:,+–-]*$/;

function renderTable(b) {
  const mono = b.head.map((_, i) => b.rows.every((r) => MONO_CELL.test(String(r[i] ?? ''))));
  const cls = (i) => (mono[i] ? ' class="is-mono"' : '');
  const head = b.head.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('');
  const body = b.rows
    .map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${richText(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="code-body table-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/** Számozott lépéssor ('steps') vagy felsorolás ('text'); a "# " kezdetű sor alcím */
function renderList(b) {
  const tag = b.lang === 'steps' ? 'ol' : 'ul';
  let html = '';
  let open = false;
  const close = () => { if (open) { html += `</${tag}>`; open = false; } };

  b.lines.forEach((l) => {
    const line = l.cmd.trim();
    if (!line) return;
    if (line.startsWith('# ')) {
      close();
      html += `<p class="list-head">${richText(line.slice(2))}</p>`;
      return;
    }
    if (!open) { html += `<${tag} class="list-body">`; open = true; }
    html += `<li>${richText(line)}</li>`;
  });
  close();
  return `<div class="code-body list-block">${html}</div>`;
}

function renderBlock(b) {
  if (b.lang === 'table') return renderTable(b);
  if (b.lang === 'steps' || b.lang === 'text') return renderList(b);
  if (b.lang === 'python') {
    const html = b.lines.map((l) => hlPy(l.cmd)).join('\n');
    return `<pre class="code-body code-pre"><code>${html}</code></pre>`;
  }
  const hasNotes = b.lines.some((l) => l.note);   // csak ekkor kell magyarázat-oszlop
  return `<div class="code-body code-lines lang-${b.lang}${hasNotes ? ' has-notes' : ''}">${b.lines.map((l) => renderLine(l, b.lang)).join('')}</div>`;
}

function buildCard(item) {
  const card = document.createElement('article');
  card.className = 'card';
  card.id = `cmd-${item.id}`;

  const multi = item.blocks.length > 1;
  const blocksHtml = item.blocks.map((b, i) => {
    const aria = `Másolás: ${item.title}${multi ? ` – ${b.label}` : ''}`;
    const copyBtn = b.copyText ? `
          <button class="copy-btn" type="button" data-block="${i}" aria-label="${esc(aria)}">
            <span class="copy-icons" aria-hidden="true">${ICONS.copy}${ICONS.check}</span>
            <span class="copy-tip" aria-hidden="true">
              <span class="tip-idle">Másolás</span><span class="tip-done">Másolva!</span><span class="tip-fail">Nem sikerült</span>
            </span>
          </button>` : '';
    return `
      <div class="code">
        <div class="code-head">
          ${svgIcon(BLOCK_ICONS[b.lang] || BLOCK_ICONS.ios, `code-type type-${esc(b.lang)}`)}
          <span class="code-label">${labelHtml(b.label, b.lang)}</span>${copyBtn}
        </div>
        ${renderBlock(b)}
      </div>`;
  }).join('');

  card.innerHTML = `
    <header class="card-head">
      <h3 class="card-title"></h3>
      <p class="card-desc"></p>
    </header>
    ${item.tool ? '<div class="tool"></div>' : ''}
    ${blocksHtml}
    ${item.tip ? `<p class="card-tip">${ICONS.bulb}<span>${richText(item.tip)}</span></p>` : ''}`;

  if (item.tool === 'subnet') buildSubnetTool(card.querySelector('.tool'));

  const titleEl = card.querySelector('.card-title');
  const descEl = card.querySelector('.card-desc');
  const tipEl = card.querySelector('.card-tip > span');
  titleEl.textContent = item.title;
  descEl.textContent = item.desc;

  // Soronkénti keresési referenciák (a találati sorok kiemeléséhez)
  const lineEls = card.querySelectorAll('.ln');
  const flatLines = item.blocks.filter((b) => CODE_LANGS.has(b.lang)).flatMap((b) => b.lines);
  const lineRefs = Array.from(lineEls, (el, i) => ({
    el,
    text: norm(`${flatLines[i].cmd} ${flatLines[i].note}`)
  }));

  // Minden kereshető szöveg egy ékezet nélküli, kisbetűs sztringben
  const cat = catById(item.category);
  const haystack = norm([
    item.title, item.desc, item.tip || '', cat ? cat.label : '',
    ...item.blocks.flatMap((b) => [b.label || '', b.text || ''])
  ].join(' \n '));

  cardRefs.push({ item, el: card, titleEl, descEl, tipEl, haystack, lineRefs });
  return card;
}

function renderCards() {
  const frag = document.createDocumentFragment();

  CATEGORIES.filter((c) => c.id !== 'all').forEach((cat) => {
    const items = COMMANDS.filter((i) => i.category === cat.id);
    if (!items.length) return;

    const section = document.createElement('section');
    section.className = 'cat-section';
    section.style.setProperty('--cat', catColor(cat.id));
    section.setAttribute('aria-labelledby', `sec-${cat.id}`);
    section.innerHTML = `
      <div class="cat-head">
        <span class="cat-icon" aria-hidden="true">${catIcon(cat.id, '')}</span>
        <h2 class="cat-title" id="sec-${cat.id}">${esc(cat.label)} <span class="cat-count"></span></h2>
      </div>
      <div class="grid"></div>`;

    const grid = section.querySelector('.grid');
    items.forEach((item) => grid.appendChild(buildCard(item)));

    frag.appendChild(section);
    sectionRefs.set(cat.id, { el: section, countEl: section.querySelector('.cat-count') });
  });

  els.results.appendChild(frag);
}

/** Oldalsáv: kategóriagombok (szűrés, mint a pill-ek), alattuk a témák (ugrás a kártyához) */
function renderToc() {
  const frag = document.createDocumentFragment();

  CATEGORIES.forEach((cat) => {
    const group = document.createElement('div');
    group.className = 'toc-group';
    group.style.setProperty('--cat', catColor(cat.id));
    group.innerHTML = `
      <button class="toc-cat" type="button" data-cat="${esc(cat.id)}" aria-pressed="${cat.id === state.category}">
        ${catIcon(cat.id, 'toc-icon')}<span class="toc-label">${esc(cat.label)}</span><span class="toc-count"></span>
      </button>`;

    let list = null;
    if (cat.id !== 'all') {
      list = document.createElement('ul');
      list.className = 'toc-list';
      cardRefs.filter((r) => r.item.category === cat.id).forEach((ref) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'toc-link';
        link.href = `#${ref.el.id}`;
        link.textContent = ref.item.title;
        li.appendChild(link);
        list.appendChild(li);
        ref.tocItem = li;
        ref.tocLink = link;
      });
      group.appendChild(list);
    }

    frag.appendChild(group);
    const btn = group.querySelector('.toc-cat');
    tocRefs.set(cat.id, { btn, countEl: btn.querySelector('.toc-count'), list });
  });

  els.toc.appendChild(frag);
}

/* =========================================================================
 * 4/B. ALHÁLÓZAT-KALKULÁTOR (tool: 'subnet')
 * ========================================================================= */
const PREFIX_PRESETS = [24, 25, 26, 27, 28, 29, 30];

const toIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');

/** Cím típusa – a 169.254-es cím azt jelenti, hogy nem jött DHCP-válasz */
function ipKind(ip) {
  const a = (ip >>> 24) & 255;
  const b = (ip >>> 16) & 255;
  if (a === 10) return 'privát (10.0.0.0/8)';
  if (a === 172 && b >= 16 && b <= 31) return 'privát (172.16.0.0/12)';
  if (a === 192 && b === 168) return 'privát (192.168.0.0/16)';
  if (a === 127) return 'loopback';
  if (a === 169 && b === 254) return 'APIPA – nem kapott DHCP-címet';
  if (a >= 224 && a <= 239) return 'multicast';
  return 'publikus';
}

/** IP + prefix → hálózati cím, broadcast, első/utolsó gép, maszk, wildcard */
function calcSubnet(ipText, prefix) {
  const m = String(ipText).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m || !(prefix >= 0 && prefix <= 32)) return null;

  const octets = m.slice(1, 5).map(Number);
  if (octets.some((o) => o > 255)) return null;

  const ip = octets.reduce((acc, o) => acc * 256 + o, 0) >>> 0;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const wild = ~mask >>> 0;
  const net = (ip & mask) >>> 0;
  const bcast = (net | wild) >>> 0;
  const usable = prefix <= 30;                       // /31 és /32 nem osztható fel így
  const rem = prefix % 8;
  const octet = rem === 0 ? Math.max(1, prefix / 8) : Math.floor(prefix / 8) + 1;

  return {
    net: toIp(net),
    first: toIp(usable ? net + 1 : net),
    last: toIp(usable ? bcast - 1 : bcast),
    bcast: prefix === 32 ? '–' : toIp(bcast),
    mask: toIp(mask),
    wild: toIp(wild),
    hosts: usable
      ? (2 ** (32 - prefix) - 2).toLocaleString('hu-HU')
      : (prefix === 31 ? '2 (pont-pont link)' : '1 (egyetlen gép)'),
    step: `${rem === 0 ? 1 : 2 ** (8 - rem)} (${octet}. oktett)`,
    kind: ipKind(ip),
    ip: toIp(ip)
  };
}

const SUBNET_ROWS = [
  ['Hálózati cím', 'net'],
  ['Első használható', 'first'],
  ['Utolsó használható', 'last'],
  ['Broadcast cím', 'bcast'],
  ['Alhálózati maszk', 'mask'],
  ['Wildcard maszk', 'wild'],
  ['Használható gépek', 'hosts'],
  ['Lépésköz', 'step'],
  ['Cím típusa', 'kind']
];

function buildSubnetTool(host) {
  host.innerHTML = `
    <div class="tool-inputs">
      <label class="tool-field">
        <span>IP-cím</span>
        <input class="tool-ip" type="text" inputmode="decimal" spellcheck="false" autocomplete="off" value="192.168.10.37">
      </label>
      <label class="tool-field tool-field-prefix">
        <span>Prefix</span>
        <span class="tool-prefix-wrap">/<input class="tool-prefix" type="number" min="0" max="32" value="26"></span>
      </label>
    </div>
    <div class="tool-presets">${PREFIX_PRESETS.map((p) => `<button class="tool-preset" type="button" data-prefix="${p}">/${p}</button>`).join('')}</div>
    <dl class="tool-out"></dl>
    <div class="tool-cmds"></div>`;

  const ipEl = host.querySelector('.tool-ip');
  const prefixEl = host.querySelector('.tool-prefix');
  const outEl = host.querySelector('.tool-out');
  const cmdsEl = host.querySelector('.tool-cmds');

  const copyRow = (text) =>
    `<button class="tool-cmd" type="button" data-copy="${esc(text)}"><code>${esc(text)}</code>${ICONS.copy}</button>`;

  function update() {
    const slash = ipEl.value.match(/\/\s*(\d{1,2})\s*$/);      // „192.168.10.37/26” is jó
    if (slash) prefixEl.value = slash[1];

    const prefix = Number(prefixEl.value);
    const r = calcSubnet(ipEl.value.split('/')[0], prefix);

    host.querySelectorAll('.tool-preset').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.prefix) === prefix));
    });

    if (!r) {
      outEl.innerHTML = '<p class="tool-error">Írj be érvényes IP-címet (pl. 192.168.10.37) és 0–32 közötti prefixet.</p>';
      cmdsEl.innerHTML = '';
      return;
    }

    outEl.innerHTML = SUBNET_ROWS.map(([label, key]) => `
      <dt>${label}</dt>
      <dd><button class="tool-val" type="button" data-copy="${esc(r[key])}">${esc(r[key])}</button></dd>`).join('');

    cmdsEl.innerHTML =
      copyRow(`ip address ${r.ip} ${r.mask}`) +
      copyRow(`network ${r.net} ${r.wild} area 0`);
  }

  host.addEventListener('click', async (e) => {
    const preset = e.target.closest('.tool-preset');
    if (preset) {
      ipEl.value = ipEl.value.split('/')[0].trim();
      prefixEl.value = preset.dataset.prefix;
      update();
      return;
    }
    const copyEl = e.target.closest('[data-copy]');
    if (!copyEl) return;
    const ok = await copyText(copyEl.dataset.copy);
    showToast(ok ? `Másolva: ${copyEl.dataset.copy}` : 'A másolás nem sikerült');
  });

  ipEl.addEventListener('input', update);
  prefixEl.addEventListener('input', update);
  update();
}

/* =========================================================================
 * 5. KERESÉS + SZŰRÉS
 * ========================================================================= */

/** Találatok kiemelése <mark>-kal (ékezetfüggetlenül) */
function markText(text, tokens) {
  if (!tokens.length) return esc(text);
  const n = norm(text);
  if (n.length !== text.length) return esc(text);

  const ranges = [];
  tokens.forEach((t) => {
    let i = n.indexOf(t);
    while (i !== -1) {
      ranges.push([i, i + t.length]);
      i = n.indexOf(t, i + t.length);
    }
  });
  if (!ranges.length) return esc(text);

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0].slice()];
  for (const [s, e] of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  let out = '';
  let pos = 0;
  merged.forEach(([s, e]) => {
    out += esc(text.slice(pos, s)) + `<mark>${esc(text.slice(s, e))}</mark>`;
    pos = e;
  });
  return out + esc(text.slice(pos));
}

/** Kódsorok kiemelése: amelyik sor az összes keresőszót tartalmazza */
function markLines(ref, tokens) {
  ref.lineRefs.forEach((l) => {
    const hit = tokens.length > 0 && tokens.every((t) => l.text.includes(t));
    l.el.classList.toggle('is-hit', hit);
  });
}

function applyFilters() {
  const tokens = norm(state.query).split(/\s+/).filter(Boolean);
  const perCat = {};
  const visiblePerCat = {};
  let total = 0;

  cardRefs.forEach((ref) => {
    const cat = ref.item.category;
    const matches = tokens.every((t) => ref.haystack.includes(t));
    const visible = matches && (state.category === 'all' || state.category === cat);

    if (matches) perCat[cat] = (perCat[cat] || 0) + 1;
    if (visible) {
      visiblePerCat[cat] = (visiblePerCat[cat] || 0) + 1;
      total++;
      ref.titleEl.innerHTML = markText(ref.item.title, tokens);
      ref.descEl.innerHTML = markText(ref.item.desc, tokens);
      if (ref.tipEl) ref.tipEl.innerHTML = richText(ref.item.tip, tokens);
      ref.tocLink.innerHTML = markText(ref.item.title, tokens);
      markLines(ref, tokens);
    }
    ref.el.hidden = !visible;
    ref.tocItem.hidden = !visible;
  });

  sectionRefs.forEach((ref, catId) => {
    const n = visiblePerCat[catId] || 0;
    ref.el.hidden = n === 0;
    ref.countEl.textContent = n;
  });

  const allCount = Object.values(perCat).reduce((a, b) => a + b, 0);
  const countFor = (catId) => (catId === 'all' ? allCount : (perCat[catId] || 0));

  pillRefs.forEach((ref, catId) => {
    const n = countFor(catId);
    ref.countEl.textContent = n;
    ref.el.dataset.empty = String(n === 0);
    ref.el.setAttribute('aria-pressed', String(catId === state.category));
  });

  tocRefs.forEach((ref, catId) => {
    const n = countFor(catId);
    ref.countEl.textContent = n;
    ref.btn.dataset.empty = String(n === 0);
    ref.btn.setAttribute('aria-pressed', String(catId === state.category));
    if (ref.list) ref.list.hidden = !visiblePerCat[catId];
  });

  const filtered = tokens.length > 0 || state.category !== 'all';
  els.count.textContent = filtered ? `${total} / ${COMMANDS.length}` : `${COMMANDS.length} téma`;

  els.empty.hidden = total > 0;
  if (total === 0) {
    els.emptyText.textContent = state.query
      ? `Erre nincs találat: „${state.query}”. Próbálj rövidebb kifejezést, vagy válts a Mind kategóriára.`
      : 'Ebben a kategóriában még nincs parancs.';
  }

  els.clear.hidden = state.query.length === 0;
  els.prompt.textContent = catById(state.category).prompt;

  visibleRefs = cardRefs.filter((r) => !r.el.hidden);
  scheduleSpy();
}

function setCategory(id) {
  if (!catById(id) || id === state.category) return;
  state.category = id;
  applyFilters();
  if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'instant' });
  const pill = pillRefs.get(id);
  if (pill && pill.el.offsetParent) pill.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function setQuery(q) {
  state.query = q;
  if (els.search.value !== q) els.search.value = q;
  applyFilters();
}

/* =========================================================================
 * 6. TARTALOMJEGYZÉK: AZ ÉPP OLVASOTT TÉMA KIEMELÉSE
 * ========================================================================= */
let headerHeight = 0;
let visibleRefs = [];                // a látható kártyák, dokumentum-sorrendben
let activeRef = null;
let spyFrame = 0;
let spyLockUntil = 0;                // oldalsáv-kattintás után a görgetés ne írja felül

/** A ragadós fejléc valós magassága CSS-változóba (görgetési eltolás, oldalsáv teteje) */
function watchHeader() {
  const update = () => {
    headerHeight = els.topbar.offsetHeight;
    document.documentElement.style.setProperty('--header-h', `${headerHeight}px`);
    scheduleSpy();
  };
  update();
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(els.topbar);
  else window.addEventListener('resize', update);
}

/** Csak az oldalsávot görgeti (az oldalt nem), hogy az aktív téma látsszon */
function revealInToc(link) {
  const box = els.toc;
  const boxRect = box.getBoundingClientRect();
  const rect = link.getBoundingClientRect();
  if (rect.top < boxRect.top + 48 || rect.bottom > boxRect.bottom - 48) {
    box.scrollTop += rect.top - boxRect.top - box.clientHeight / 3;
  }
}

function setActive(ref) {
  if (ref === activeRef) return;
  if (activeRef) {
    activeRef.tocLink.classList.remove('is-active');
    activeRef.tocLink.removeAttribute('aria-current');
  }
  activeRef = ref;
  if (!ref) return;
  ref.tocLink.classList.add('is-active');
  ref.tocLink.setAttribute('aria-current', 'location');
  revealInToc(ref.tocLink);
}

/** Aktív téma: az utolsó kártya, amelynek a teteje már a fejléc alá ért */
function updateSpy() {
  spyFrame = 0;
  if (!els.toc.clientHeight || performance.now() < spyLockUntil) return;   // oldalsáv rejtve
  if (!visibleRefs.length) { setActive(null); return; }

  const doc = document.documentElement;
  const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= doc.scrollHeight - 2;
  let current = visibleRefs[0];

  if (atBottom) {
    current = visibleRefs[visibleRefs.length - 1];
  } else {
    const line = headerHeight + 40;
    for (const ref of visibleRefs) {
      if (ref.el.getBoundingClientRect().top > line) break;
      current = ref;
    }
  }
  setActive(current);
}

function scheduleSpy() {
  if (!spyFrame) spyFrame = requestAnimationFrame(updateSpy);
}

/** Közvetlen link egy témára (pl. index.html#cmd-ospf): betöltés után odagörget */
function scrollToHash() {
  let id = '';
  try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
  const target = id && document.getElementById(id);
  if (target && target.classList.contains('card')) {
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
}

/* =========================================================================
 * 7. VÁGÓLAP, TÉMA, MAGYARÁZATOK, BILLENTYŰK
 * ========================================================================= */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) { /* tovább a tartalék megoldásra */ }

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

function setButtonState(btn, value) {
  clearTimeout(btn._timer);
  btn.dataset.state = value;
  btn._timer = setTimeout(() => { delete btn.dataset.state; }, 1600);
}

let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

/** A magyarázatok nélküli, bemásolható kódot másolja */
async function copyBlock(item, blockIndex, btn, announce) {
  const block = item.blocks[blockIndex];
  if (!block) return;
  const ok = await copyText(block.copyText);
  if (btn) setButtonState(btn, ok ? 'copied' : 'failed');
  if (announce) showToast(ok ? `Másolva: ${item.title}` : 'A másolás nem sikerült');
}

function applyTheme(theme, persist) {
  document.documentElement.setAttribute('data-theme', theme);
  els.theme.setAttribute('aria-label', theme === 'dark' ? 'Világos téma bekapcsolása' : 'Sötét téma bekapcsolása');
  if (persist) storage.set(THEME_KEY, theme);
}

function applyNotes(on, persist) {
  document.documentElement.setAttribute('data-notes', on ? 'on' : 'off');
  els.notes.setAttribute('aria-pressed', String(on));
  if (persist) storage.set(NOTES_KEY, on ? 'on' : 'off');
}

const notesOn = () => document.documentElement.getAttribute('data-notes') !== 'off';

function isTypingTarget(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

function bindEvents() {
  els.search.addEventListener('input', (e) => setQuery(e.target.value));

  els.search.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      // az első olyan találat, amiben van bemásolható parancs (a táblázatos kártyákat átugorja)
      const first = cardRefs.find((r) => !r.el.hidden && r.item.blocks.some((b) => b.copyText));
      if (first) {
        const index = first.item.blocks.findIndex((b) => b.copyText);
        copyBlock(first.item, index, first.el.querySelectorAll('.copy-btn')[0], true);
      }
    } else if (e.key === 'Escape') {
      if (els.search.value) { e.preventDefault(); setQuery(''); }
      else els.search.blur();
    }
  });

  els.clear.addEventListener('click', () => { setQuery(''); els.search.focus(); });

  els.filters.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (pill) setCategory(pill.dataset.cat);
  });

  // Oldalsáv: kategória = szűrés, téma = ugrás (a hivatkozás maga görget)
  els.toc.addEventListener('click', (e) => {
    const catBtn = e.target.closest('.toc-cat');
    if (catBtn) { setCategory(catBtn.dataset.cat); return; }

    const link = e.target.closest('.toc-link');
    const ref = link && cardRefs.find((r) => r.tocLink === link);
    if (ref) {
      spyLockUntil = performance.now() + 1200;
      setActive(ref);
    }
  });

  window.addEventListener('scroll', scheduleSpy, { passive: true });
  window.addEventListener('resize', scheduleSpy);
  window.addEventListener('scrollend', () => { spyLockUntil = 0; });

  els.results.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const card = btn.closest('.card');
    const ref = cardRefs.find((r) => r.el === card);
    if (ref) copyBlock(ref.item, Number(btn.dataset.block), btn, false);
  });

  els.emptyReset.addEventListener('click', () => {
    state.category = 'all';
    setQuery('');
    els.search.focus();
  });

  els.theme.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark', true);
  });

  els.notes.addEventListener('click', () => applyNotes(!notesOn(), true));

  // "/" vagy Ctrl/Cmd+K → keresés, "m" → magyarázatok ki/be
  document.addEventListener('keydown', (e) => {
    const typing = isTypingTarget(document.activeElement);
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    const cmdK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';

    if ((e.key === '/' && plain && !typing) || cmdK) {
      e.preventDefault();
      els.search.focus();
      els.search.select();
    } else if (e.key.toLowerCase() === 'm' && plain && !typing) {
      applyNotes(!notesOn(), true);
    }
  });
}

/* =========================================================================
 * 8. INDÍTÁS
 * ========================================================================= */
function init() {
  els.topbar = $('#topbar');
  els.results = $('#results');
  els.filters = $('#filters');
  els.toc = $('#toc');
  els.search = $('#search');
  els.clear = $('#clearSearch');
  els.prompt = $('#searchPrompt');
  els.count = $('#resultCount');
  els.empty = $('#empty');
  els.emptyText = $('#emptyText');
  els.emptyReset = $('#emptyReset');
  els.theme = $('#themeToggle');
  els.notes = $('#notesToggle');
  els.toast = $('#toast');

  applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
  applyNotes(storage.get(NOTES_KEY) !== 'off', false);

  prepareData();
  renderFilters();
  renderCards();
  renderToc();
  watchHeader();
  bindEvents();
  applyFilters();
  scrollToHash();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
