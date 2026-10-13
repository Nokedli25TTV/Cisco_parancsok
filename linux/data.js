'use strict';

/* =========================================================================
 * Linux parancstár – data.js
 *
 * Itt van MINDEN tartalom. Új parancs felvételéhez csak ezt a fájlt kell
 * szerkeszteni; a megjelenítő a parancstar/app.js (közös a Cisco oldallal).
 *
 * Kártya felépítése:
 * {
 *   id:       egyedi azonosító (link: linux/#cmd-<id>)
 *   category: a LINUX_CATEGORIES egyik id-je
 *   title:    kártya címe
 *   desc:     rövid leírás
 *   jog:      (opcionális) 'root' | 'user' | 'vegyes' – ki futtathatja
 *   jogNote:  (opcionális) pontosítás a jogosultsághoz
 *   blocks:   [{ label, lang, code }] – lásd lejjebb a lang értékeit
 *   tool:     (opcionális) 'chmod' (jogosultság-kalkulátor) | 'valtozok' (saját adatok)
 *   tip:      (opcionális) tipp; `backtick` között parancs,
 *             [szöveg](#kartya-id) ugrás másik kártyára
 * }
 *
 * lang:
 *   'bash'   Linux parancssor – '#' kezdetű sor megjegyzés
 *   'conf'   konfigurációs fájl tartalma
 *   'sql'    SQL utasítások
 *   'gui'    grafikus lépések: "Menü > Almenü", "Mező: érték"
 *   'steps'  számozott lépéssor      'text'  felsorolás ("# " = alcím)
 *   'table'  táblázat: head: [...], rows: [[...], ...]
 *
 * SORONKÉNTI MAGYARÁZAT (bash / conf / sql):
 *   parancs  // magyarázat
 *   A " // " utáni rész csak megjelenik, a másolásba NEM kerül bele.
 *
 * KITÖLTHETŐ ÉRTÉKEK: a {{USER}}, {{IP}} stb. helyére az kerül, amit az olvasó
 * a „Saját adatok” kártyán beírt (alapérték: VALTOZOK.def).
 *
 * FIGYELEM: a kódblokkok JavaScript sablonszövegek, ezért bennük a ${...}
 * elé \ kell (pl. \${1:-Budapest}), és visszafelé dőlő idézőjel nem lehet.
 * ========================================================================= */

const VALTOZOK = [
  { key: 'USER', label: 'Felhasználóneved', def: 'diak' },
  { key: 'IP',   label: 'A szerver statikus IP-címe', def: '192.168.109.27' },
  { key: 'GW',   label: 'Átjáró (gateway)', def: '192.168.109.1' },
  { key: 'IF',   label: 'Hálózati kártya neve', def: 'ens33' },
  { key: 'DNS',  label: 'DNS-szerver', def: '1.1.1.2' },
  { key: 'PORT', label: 'SSH port', def: '11223' }
];

/** hue: a kategória színe (oklch árnyalat, 0–360); icon: 24×24-es vonalas SVG */
const LINUX_CATEGORIES = [
  { id: 'all',       label: 'Mind',            prompt: 'debian#' },
  { id: 'segedlet',  label: 'Segédlet',        prompt: '~$' },
  { id: 'telepites', label: 'Telepítés',       prompt: 'install', hue: 258,
    icon: '<path d="M12 3.5v10M8 10l4 4 4-4M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2"/>' },
  { id: 'rendszer',  label: 'Rendszer, felhasználók', prompt: 'root#', hue: 300,
    icon: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.6 3.3-5.5 7-5.5s6.4 1.9 7 5.5"/>' },
  { id: 'fajlok',    label: 'Fájlok, mappák',  prompt: '~$', hue: 88,
    icon: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>' },
  { id: 'jogok',     label: 'Jogosultságok',   prompt: 'chmod', hue: 22,
    icon: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>' },
  { id: 'lemez',     label: 'Lemez, folyamatok', prompt: 'df -h', hue: 55,
    icon: '<ellipse cx="12" cy="6.5" rx="7.5" ry="3"/><path d="M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11"/>' },
  { id: 'halozat',   label: 'Hálózat',         prompt: 'ip a', hue: 222,
    icon: '<circle cx="12" cy="5.5" r="2.5"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/><path d="M12 8v4M5.5 16v-4h13v4"/>' },
  { id: 'csomag',    label: 'Csomagok, letöltés', prompt: 'apt', hue: 148,
    icon: '<path d="M12 3.5l8 4.3v8.4l-8 4.3-8-4.3V7.8z"/><path d="M4 7.8l8 4.3 8-4.3M12 12.1v8.4"/>' },
  { id: 'ssh',       label: 'SSH, szolgáltatások', prompt: 'ssh', hue: 185,
    icon: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M13.5 9.5l2 2"/>' },
  { id: 'szoveg',    label: 'Naplófájl, szöveg', prompt: 'grep', hue: 345,
    icon: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M8 9.5h5M8 12h3"/>' },
  { id: 'script',    label: 'Szkript',         prompt: 'bash', hue: 320,
    icon: '<path d="M8.5 7L3.5 12l5 5M15.5 7l5 5-5 5M13.5 5l-3 14"/>' },
  { id: 'web',       label: 'Web, adatbázis',  prompt: 'mysql>', hue: 240,
    icon: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.3 3.5 5.2 3.5 8.5s-1.1 6.2-3.5 8.5c-2.4-2.3-3.5-5.2-3.5-8.5s1.1-6.2 3.5-8.5z"/>' }
];

const LINUX_COMMANDS = [

  /* =====================================================================
   * SEGÉDLET
   * ===================================================================== */
  {
    id: 'dolgozat-menet',
    category: 'segedlet',
    title: 'Dolgozat feladatról feladatra',
    desc: 'Az 1. Linux dolgozat feladatai sorrendben. Kattints, és a megfelelő kártyára ugrasz.',
    blocks: [{
      label: 'Melyik feladathoz melyik kártya',
      lang: 'steps',
      code: `
# Telepítés
Virtuális gép és Debian: [VM beállításai](#vm-beallitas), [partíciók](#particiok), [a telepítő lépései](#telepito)
# Jelenítse meg
Pontos idő, dátum, időzóna: [date és timedatectl](#ido-datum)
IP-cím: [ip a](#ip-cim)
Partíciók és szabad hely: [lsblk, df -h](#lemezek)
Futó folyamatok: [top, ps aux](#folyamatok)
# Állítsa be
Statikus IP, DNS, ping: [statikus IP](#statikus-ip), [DNS-szerver](#dns), [ping](#ping)
Tükörszerver, majd csak a csomaglisták frissítése: [sources.list](#sources-list), [apt update](#apt)
SSH másik porton: [sshd_config](#ssh-port), utána [belépés az új porton](#ssh-belepes)
bashrc letöltése és beírása két fájlba: [bashrc](#bashrc)
Újraindítás: [reboot](#leallitas)
sudo, mc, tree, duf telepítése, felhasználó a sudo csoportba: [apt install](#apt), [sudo csoport](#sudo-csoport)
# Feladatok
Program telepítése forráskódból (cowsay): [git clone, make install](#forraskod)
Mappa a home-ban, „other” rwx jog: [mkdir](#mkdir), [chmod](#chmod), [kalkulátor](#chmod-kalkulator)
Fájl felmásolása és kicsomagolása: [scp](#scp), [7z, zip, tar](#tomorites)
Naplófájl: [sorok száma](#wc), [első és utolsó sorok](#head-tail), [keresés](#grep), [egyedi lista és számolás](#cso-receptek)
Szkript paraméterrel, csak a tulajdonos futtathatja: [ido.sh](#script-ido)
# Szolgáltatás
Webszerver, PHP, adatbázis, phpMyAdmin: [telepítés](#lamp)
A web mappa másolása és a tulajdonos beállítása: [másolás](#web-masolas), [chown](#chown)
Adatbázis létrehozása és az oldal bekötése: [adatbázis](#adatbazis), [config.php](#web-config)`
    }],
    tip: 'Minden feladat után készíts teljes képernyős képet úgy, hogy a parancs ÉS az eredménye is látsszon – ami a képről nem derül ki, arra nem jár pont. Egy `clear` után újra kiadott ellenőrző parancs (`ip a`, `ls -ld`, `groups`) a legtisztább bizonyíték.'
  },
  {
    id: 'sajat-adatok',
    category: 'segedlet',
    title: 'Saját adatok: írd be egyszer, és minden parancs a tiéd',
    desc: 'Amit itt megadsz, az kerül be az összes kártya parancsaiba – így másolás után nem kell átírnod.',
    tool: 'valtozok',
    blocks: [],
    tip: 'Az adatok csak ebben a böngészőben tárolódnak. Az órai szabály szerint a statikus cím utolsó száma a gépszám + 10 (a 17-es gépen `192.168.109.27`). Az átjárót az `ip r` kimenetének `default via …` sora mutatja meg, a kártya nevét az `ip a`.'
  },
  {
    id: 'prompt',
    category: 'segedlet',
    title: 'Ki vagyok éppen? A prompt vége: # vagy $',
    desc: 'A sor elején álló prompt megmutatja, kiként vagy belépve és melyik mappában állsz.',
    jog: 'user',
    blocks: [
      {
        label: 'A prompt részei',
        lang: 'table',
        head: ['Amit látsz', 'Jelentése'],
        rows: [
          ['`{{USER}}@szerver:~$`', 'sima felhasználó vagy – a végén `$`'],
          ['`root@szerver:~#`', 'rendszergazda (root) vagy – a végén `#`'],
          ['`~`', 'a saját home mappádban állsz (`/home/{{USER}}`, rootnál `/root`)'],
          ['`/etc/network`', 'a `:` után mindig az aktuális mappa áll']
        ]
      },
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
whoami  // kiírja, melyik felhasználó vagy most
su -  // átváltás rootra (a root jelszavát kéri)
exit  // vissza az előző felhasználóhoz`
      }
    ],
    tip: 'Ezen az oldalon a kódblokk címkéje mutatja, kiként kell futtatni: `root@szerver:~#` = rootként, `{{USER}}@szerver:~$` = sima felhasználóként is megy. Részletek: [váltás rootra](#root-valtas).'
  },
  {
    id: 'ki-mit-futtathat',
    category: 'segedlet',
    title: 'Mihez kell root jog?',
    desc: 'Ökölszabály: megnézni szinte mindent lehet, a rendszeren változtatni csak root tud.',
    blocks: [{
      label: 'Műveletek jogosultság szerint',
      lang: 'table',
      head: ['Művelet', 'Kell root?', 'Miért'],
      rows: [
        ['Megnézni: `date`, `ip a`, `lsblk`, `df -h`, `top`, `ps`, `who`, `ls`', 'nem', 'csak olvas, nem változtat'],
        ['Saját fájlok: `mkdir`, `cp`, `rm`, `nano`, `chmod` a home mappádban', 'nem', 'a saját fájljaidnak te vagy a tulajdonosa'],
        ['Szövegfeldolgozás: `grep`, `wc`, `head`, `tail`, `awk`, `sort`', 'nem', 'elég, ha olvasni tudod a fájlt'],
        ['Letöltés: `wget`, `curl`, `git clone`, `scp`', 'nem', 'oda ment, ahová írni tudsz'],
        ['Csomagok: `apt update`, `apt install`, `dpkg -i`', '**igen**', 'a rendszer programjait módosítja'],
        ['Rendszerfájl szerkesztése az `/etc` alatt', '**igen**', 'a konfigurációs fájlok a root tulajdonában vannak'],
        ['Szolgáltatások: `systemctl restart …`', '**igen**', 'mindenkit érint, nem csak téged'],
        ['Tulajdonos váltása: `chown`', '**igen**', 'fájlt másnak „ajándékozni” csak root tud'],
        ['Felhasználók: `usermod`, `adduser`, más jelszava', '**igen**', 'mások fiókját érinti'],
        ['`reboot`, `poweroff`, `timedatectl set-timezone`', '**igen**', 'az egész gépet érinti'],
        ['Írás a `/var/www/html` mappába', '**igen**', 'a mappa a root, illetve a `www-data` tulajdona'],
        ['`make install`', '**igen**', 'a `/usr/local` alá másol']
      ]
    }],
    tip: 'Ha „Permission denied” vagy „Engedély megtagadva” a válasz, szinte mindig az a baj, hogy nem rootként futtattad. Vagy válts rootra (`su -`), vagy írd elé: `sudo` – ehhez a felhasználódnak a [sudo csoportban](#sudo-csoport) kell lennie.'
  },
  {
    id: 'fontos-fajlok',
    category: 'segedlet',
    title: 'Fontos fájlok és mappák',
    desc: 'Melyik beállítás melyik fájlban van – ezeket kéri a dolgozat.',
    blocks: [{
      label: 'Hol mi található',
      lang: 'table',
      head: ['Fájl vagy mappa', 'Mi van benne', 'Kártya'],
      rows: [
        ['`/etc`', 'minden program konfigurációs fájlja', '–'],
        ['`/etc/network/interfaces`', 'hálózati kártyák: DHCP vagy statikus IP', '[statikus IP](#statikus-ip)'],
        ['`/etc/resolv.conf`', 'DNS-szerver címe', '[DNS](#dns)'],
        ['`/etc/apt/sources.list`', 'tükörszerverek: honnan töltse le az apt a csomagokat', '[sources.list](#sources-list)'],
        ['`/etc/ssh/sshd_config`', 'az SSH-szerver beállításai, például a port', '[SSH port](#ssh-port)'],
        ['`/etc/hostname`', 'a gép neve', '[gépnév](#gepnev)'],
        ['`/etc/passwd`, `/etc/group`', 'felhasználók és csoportok listája', '[felhasználók](#felhasznalok)'],
        ['`/home/{{USER}}`', 'a saját home mappád, rövidítve `~`', '[cd, pwd](#hol-vagyok)'],
        ['`/root`', 'a root felhasználó home mappája', '–'],
        ['`~/.bashrc`', 'a parancssor beállításai: prompt, színek, rövidítések', '[bashrc](#bashrc)'],
        ['`/var/www/html`', 'a webszerver alapértelmezett mappája', '[web](#web-masolas)'],
        ['`/var/log`', 'naplófájlok', '[grep](#grep)']
      ]
    }]
  },
  {
    id: 'atiranyitas',
    category: 'segedlet',
    title: 'Átirányítás és cső: >  >>  |  &&',
    desc: 'Egy parancs kimenetét fájlba írhatod, vagy továbbadhatod egy másik parancsnak.',
    jog: 'user',
    jogNote: 'de a célfájlt írni kell tudnod',
    blocks: [
      {
        label: 'Jelek',
        lang: 'table',
        head: ['Jel', 'Mit csinál', 'Példa'],
        rows: [
          ['`>`', 'a kimenetet fájlba írja, a fájl régi tartalmát **felülírja**', '`cat bashrc > ~/.bashrc`'],
          ['`>>`', 'a fájl **végéhez fűzi**', '`echo "sor" >> jegyzet.txt`'],
          ['`<`', 'a fájl tartalmát adja a parancsnak bemenetként', '`mysql -u root chat_db < chat.sql`'],
          ['`|`', 'cső: az egyik parancs kimenete a másik bemenete', '`ps aux | grep ssh`'],
          ['`&&`', 'a második csak akkor fut, ha az első sikerült', '`apt update && apt install mc`'],
          ['`;`', 'egymás után futtat, akkor is, ha az első hibás', '`date; whoami`']
        ]
      },
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
ls -l /etc > lista.txt  // a lista nem a képernyőre, hanem a fájlba kerül
cat lista.txt | wc -l  // hány sor lett belőle
grep "ssh" lista.txt >> talalatok.txt  // a találatokat hozzáfűzi egy másik fájlhoz`
      }
    ],
    tip: 'A `>` kérdés nélkül felülír. A cső a naplófeldolgozás alapja: [receptek](#cso-receptek).'
  },
  {
    id: 'sugo',
    category: 'segedlet',
    title: 'Súgó és gyorsbillentyűk',
    desc: 'Ha nem jut eszedbe egy kapcsoló, a gép megmondja. A net nélkül is működik.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
man grep  // a parancs teljes leírása; kilépés: q, keresés: /szó
grep --help  // rövid súgó a kapcsolókról
history  // a korábban beírt parancsok listája
history | grep apt  // csak azok, amikben szerepel az „apt”
clear  // képernyő törlése`
      },
      {
        label: 'Billentyűk a parancssorban',
        lang: 'table',
        head: ['Billentyű', 'Mit csinál'],
        rows: [
          ['Tab', 'kiegészíti a parancsot vagy a fájlnevet; kétszer nyomva kilistázza a lehetőségeket'],
          ['↑ / ↓', 'előző és következő parancs'],
          ['Ctrl + C', 'megszakítja a futó parancsot (pl. `ping`, `top`)'],
          ['Ctrl + L', 'képernyő törlése, mint a `clear`'],
          ['Ctrl + R', 'keresés a korábbi parancsok között'],
          ['Ctrl + D', 'kilépés, mint az `exit`'],
          ['q', 'kilépés a `man`, `less`, `top` programból']
        ]
      }
    ],
    tip: 'A dolgozatban nincs net, de a `man` és a `--help` ott is megy. Hosszú útvonalat soha ne gépelj végig: pár betű, aztán Tab.'
  },

  /* =====================================================================
   * TELEPÍTÉS
   * ===================================================================== */
  {
    id: 'vm-beallitas',
    category: 'telepites',
    title: 'Virtuális gép beállításai (VMware)',
    desc: 'Ezekkel az értékekkel kell létrehozni a gépet, mielőtt a Debian telepítő elindul.',
    blocks: [{
      label: 'VMware › New Virtual Machine',
      lang: 'table',
      head: ['Beállítás', 'Érték'],
      rows: [
        ['Operációs rendszer', 'Debian GNU/Linux, 64 bit'],
        ['Firmware', 'BIOS (nem UEFI)'],
        ['Partíciós tábla', 'MBR (msdos)'],
        ['Processzor', '2 vCPU'],
        ['Memória', '2–4 GB'],
        ['Merevlemez', '25 GB'],
        ['Hálózat', 'engedélyezve, Bridge mód'],
        ['Telepítő', 'Debian 13 DVD iso a CD/DVD meghajtóban'],
        ['Telepítési mód', 'szöveges (CLI), grafikus környezet nélkül']
      ]
    }],
    tip: 'Bridge módban a virtuális gép ugyanabba a hálózatba kerül, mint a gazdagép, és a tanterem DHCP-szerverétől kap címet. A beállítások képernyőképén látsszon a memória, a CPU, a lemez és a hálózati mód.'
  },
  {
    id: 'particiok',
    category: 'telepites',
    title: 'Partíciók kézi felosztása',
    desc: 'A telepítőben a „Kézi” (Manual) particionálást kell választani, és ezt az öt partíciót létrehozni.',
    blocks: [{
      label: 'Telepítő › Lemezek particionálása › Kézi',
      lang: 'table',
      head: ['#', 'Méret', 'Fájlrendszer', 'Csatolási pont', 'Megjegyzés'],
      rows: [
        ['1.', '1 GB', 'ext4', '`/boot`', 'elsődleges, a lemez elején'],
        ['2.', '14 GB', 'ext4', '`/`', 'gyökér'],
        ['3.', '2 GB', 'swap', '–', 'logikai, a szabad hely végén'],
        ['4.', 'maradék', 'ext4', '`/home`', 'ami a többi után megmarad'],
        ['5.', '3 GB', 'ext4', '`/var`', '']
      ]
    }],
    tip: 'A „maradék” méretű `/home` partíciót érdemes utoljára létrehozni: előbb a 3 GB-os `/var`, és ami marad, az lesz a `/home`. MBR lemezen legfeljebb 4 elsődleges partíció lehet, ezért a többi logikai lesz – az `lsblk` kimenetében az 1K méretű `sda3` a kiterjesztett partíció, az nem hiba. Ellenőrzés telepítés után: [lsblk](#lemezek).'
  },
  {
    id: 'telepito',
    category: 'telepites',
    title: 'A Debian telepítő lépései',
    desc: 'Amire a telepítő közben figyelni kell, hogy a végén csak parancssoros rendszer legyen.',
    blocks: [{
      label: 'Debian 13 telepítő',
      lang: 'steps',
      code: `
Indításkor a szöveges **Install** módot válaszd, ne a Graphical installt
Gépnév: a saját vezetékneved és a teremszám, például \`vezeteknev-109\`
Root jelszó, majd felhasználó: teljes név = a saját neved, felhasználónév = a monogramod
Particionálás: **Kézi** – lásd a [partíciók](#particiok) kártyát
Hálózati tükör használata: **Nem** – a tükröt később kézzel állítod be a [sources.list](#sources-list) fájlban
Szoftverválasztás: csak az **SSH server** és a **standard system utilities** maradjon bejelölve; az asztali környezetről és a GNOME-ról vedd le a jelölést (szóköz)
GRUB rendszerbetöltő: **Igen**, a virtuális merevlemezre: \`/dev/sda\`
Újraindítás után belépés a konzolon, és jöhetnek az [első teendők](#dolgozat-menet)`
    }],
    tip: 'Ha bejelölve marad egy asztali környezet, a telepítés sokkal tovább tart, és a végén grafikus felület indul – az pontlevonás. Az SSH server viszont kell, különben nem tudsz PuTTY-val belépni.'
  },

  /* =====================================================================
   * RENDSZER, FELHASZNÁLÓK
   * ===================================================================== */
  {
    id: 'ido-datum',
    category: 'rendszer',
    title: 'Pontos idő, dátum, időzóna',
    desc: 'A dátum megjelenítése és az időzóna beállítása, ha nem a magyar időt mutatja.',
    jog: 'vegyes',
    jogNote: 'megnézni bárki tudja, az időzónát állítani csak root',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
date  // pontos idő és dátum, a végén az időzóna rövidítése (CEST, CET)
timedatectl  // részletesen: helyi idő, időzóna, van-e hálózati időszinkron
timedatectl set-timezone Europe/Budapest  // időzóna átállítása magyarra
timedatectl list-timezones | grep Buda  // ha nem jut eszedbe a zóna pontos neve`
    }],
    tip: 'A magyar idő a `date` kimenetében `CEST` (nyári) vagy `CET` (téli) jelzéssel látszik. Ha `UTC` áll ott, állítsd át az időzónát, és futtasd újra a `date` parancsot a képernyőképhez.'
  },
  {
    id: 'gepnev',
    category: 'rendszer',
    title: 'Gépnév és rendszerinformáció',
    desc: 'A gép neve, a Debian és a kernel verziója.',
    jog: 'vegyes',
    jogNote: 'megnézni bárki tudja, átnevezni csak root',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
hostname  // a gép neve
hostnamectl  // gépnév, operációs rendszer, kernel egy helyen
hostnamectl set-hostname vezeteknev-109  // gépnév átállítása (újra be kell lépni, hogy a prompt is mutassa)
cat /etc/os-release  // a Debian verziója
uname -a  // kernelverzió és architektúra`
    }]
  },
  {
    id: 'leallitas',
    category: 'rendszer',
    title: 'Újraindítás és leállítás',
    desc: 'A szerver újraindítása vagy kikapcsolása parancssorból.',
    jog: 'root',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
reboot  // azonnali újraindítás
poweroff  // kikapcsolás
shutdown -r now  // újraindítás most – ugyanaz, mint a reboot
shutdown -h +5  // leállítás 5 perc múlva; visszavonás: shutdown -c`
    }],
    tip: 'SSH-n keresztül újraindítva a kapcsolat megszakad – ez normális. Várj fél percet, és lépj be újra.'
  },
  {
    id: 'ki-vagyok',
    category: 'rendszer',
    title: 'Ki van belépve? whoami, who, w, last',
    desc: 'Melyik felhasználó vagyok, kik vannak még a gépen, és ki mikor lépett be.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
whoami  // a jelenlegi felhasználóneved (su után már azt írja, akire váltottál)
who am i  // kiként LÉPTÉL BE eredetileg, melyik terminálon és honnan
who  // kik vannak most belépve
w  // ugyanez bővebben: mióta, honnan, és éppen mit futtatnak
last  // a korábbi belépések listája: ki, mikor, honnan
last -n 10  // csak a legutóbbi 10
id  // felhasználó- és csoportazonosítóid (uid, gid, csoportok)
groups  // melyik csoportoknak vagy tagja`
      },
      {
        label: 'Mi a különbség?',
        lang: 'table',
        head: ['Parancs', 'Mit mond meg'],
        rows: [
          ['`whoami`', 'kinek a jogaival futnak most a parancsaid'],
          ['`who am i`', 'kiként jelentkeztél be – `su -` után is az eredeti nevet mutatja'],
          ['`who`', 'az összes belépett felhasználó'],
          ['`w`', 'a belépettek és az aktuális tevékenységük, felül a gép terhelése'],
          ['`last`', 'belépési napló visszamenőleg']
        ]
      }
    ],
    tip: 'Ha Debian 13-on a `last` „command not found” hibát ad, telepíteni kell: `apt install wtmpdb`.'
  },
  {
    id: 'root-valtas',
    category: 'rendszer',
    title: 'Váltás rootra: su és sudo',
    desc: 'Kétféleképp lehet rendszergazdai joggal dolgozni: átváltasz rootra, vagy egyetlen parancsot futtatsz így.',
    jog: 'vegyes',
    jogNote: 'a su a root jelszavát kéri, a sudo a sajátodat – és csak a sudo csoport tagjainak megy',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
su -  // teljes átváltás rootra, a root jelszavával; a prompt vége # lesz
exit  // vissza a saját felhasználódhoz
su - {{USER}}  // rootból vissza egy másik felhasználóra (ehhez nem kell jelszó)
sudo apt update  // egyetlen parancs root joggal, a SAJÁT jelszavaddal
sudo -i  // root parancssor sudo-val`
      },
      {
        label: 'su vagy sudo?',
        lang: 'table',
        head: ['', '`su -`', '`sudo parancs`'],
        rows: [
          ['Melyik jelszó kell', 'a rooté', 'a sajátod'],
          ['Meddig tart', 'amíg ki nem lépsz (`exit`)', 'csak arra az egy parancsra'],
          ['Feltétel', 'tudnod kell a root jelszót', 'a `sudo` csomag telepítve, és benne vagy a `sudo` csoportban']
        ]
      }
    ],
    tip: 'A kötőjel számít: `su -` a root teljes környezetét betölti (például a `/sbin` is bekerül az útvonalba), a sima `su` nem – utána egyes parancsok „command not found” hibát adhatnak. Friss Debianon a `sudo` nincs telepítve: [sudo csoport](#sudo-csoport).'
  },
  {
    id: 'sudo-csoport',
    category: 'rendszer',
    title: 'sudo telepítése, felhasználó a sudo csoportba',
    desc: 'Hogy a saját felhasználód is futtathasson parancsot root joggal.',
    jog: 'root',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
apt install sudo  // a sudo program telepítése (friss Debianon nincs fent)
usermod -aG sudo {{USER}}  // a felhasználó hozzáadása a sudo csoporthoz
groups {{USER}}  // ellenőrzés: a listában szerepelnie kell a sudo szónak`
    }],
    tip: 'A `-a` (append) nélkül az `usermod -G` az összes többi csoportból KIVESZI a felhasználót – mindig `-aG` legyen. A változás csak új belépés után él: lépj ki és vissza, utána próbáld: `sudo whoami` → `root`.'
  },
  {
    id: 'felhasznalok',
    category: 'rendszer',
    title: 'Felhasználók és jelszavak',
    desc: 'Új felhasználó létrehozása, jelszóváltás, a felhasználók listája.',
    jog: 'root',
    jogNote: 'a saját jelszavadat sima felhasználóként is megváltoztathatod',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
adduser teszt  // új felhasználó: bekéri a jelszót és a nevet, létrehozza a /home/teszt mappát
passwd teszt  // egy felhasználó jelszavának átírása
passwd  // a SAJÁT jelszavad megváltoztatása (ehhez nem kell root)
deluser teszt  // felhasználó törlése (a home mappája megmarad)
cat /etc/passwd  // az összes felhasználó; soronként: név:x:uid:gid:leírás:home:shell
cat /etc/group  // csoportok és tagjaik`
    }]
  },
  {
    id: 'bashrc',
    category: 'rendszer',
    title: 'bashrc letöltése és beállítása',
    desc: 'A .bashrc a parancssor kinézetét és rövidítéseit adja. Letöltjük, és a tartalmát beírjuk a felhasználó és a root fájljába.',
    jog: 'root',
    jogNote: 'a /root/.bashrc fájlt csak root írhatja',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
wget https://raw.githubusercontent.com/bahamas10/dotfiles/refs/heads/master/bashrc  // letöltés az aktuális mappába, bashrc néven
cat bashrc > /home/{{USER}}/.bashrc  // a tartalmát beírja a felhasználó .bashrc fájljába (felülírja)
cat bashrc > /root/.bashrc  // ugyanez a root fájljába
source ~/.bashrc  // azonnali betöltés; különben a következő belépéskor lép életbe`
    }],
    tip: 'A feladat szövege „irányítsa a fájlba” – ezért `cat … >`, nem `cp`. A pont a fájlnév elején rejtett fájlt jelent: csak az `ls -a` mutatja. Siker esetén a prompt megváltozik (színes lesz, kiírja a mappát).'
  },

  /* =====================================================================
   * FÁJLOK, MAPPÁK
   * ===================================================================== */
  {
    id: 'hol-vagyok',
    category: 'fajlok',
    title: 'Hol vagyok? Mozgás a mappák között',
    desc: 'Az aktuális mappa kiírása és a mappaváltás.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
pwd  // kiírja, melyik mappában állsz – teljes útvonallal
cd /etc/network  // belépés egy mappába (abszolút útvonal: a / gyökértől)
cd beadando_feladat  // belépés az aktuális mappán belüli mappába (relatív útvonal)
cd ..  // egy szinttel feljebb
cd ~  // haza: /home/{{USER}}; a sima cd ugyanezt csinálja
cd -  // vissza oda, ahol az előbb voltál`
      },
      {
        label: 'Útvonalak',
        lang: 'table',
        head: ['Jel', 'Jelentése'],
        rows: [
          ['`/`', 'a gyökér: minden mappa innen indul'],
          ['`~`', 'a saját home mappád'],
          ['`.`', 'az aktuális mappa (ezért `./ido.sh`)'],
          ['`..`', 'a szülőmappa'],
          ['`/etc/ssh`', 'abszolút útvonal – bárhonnan ugyanoda mutat'],
          ['`web/sql`', 'relatív útvonal – onnan számít, ahol állsz']
        ]
      }
    ]
  },
  {
    id: 'ls',
    category: 'fajlok',
    title: 'Listázás: ls és tree',
    desc: 'Mi van egy mappában: nevek, részletek, rejtett fájlok, almappák.',
    jog: 'user',
    blocks: [{
      label: '{{USER}}@szerver:~$',
      lang: 'bash',
      code: `
ls  // az aktuális mappa tartalma, csak a nevek
ls -l  // részletesen: jogosultság, tulajdonos, csoport, méret, dátum
ls -a  // a rejtett (ponttal kezdődő) fájlokat is mutatja
ls -la /var/www/html  // részletes lista rejtettekkel, megadott mappáról
ls -lh  // a méretek olvashatóan: K, M, G
ls -R  // az összes almappa tartalma is, rekurzívan
ls -ld beadando_feladat  // magának a MAPPÁNAK az adatai, nem a tartalmáé
tree  // a mappaszerkezet fa alakban (telepíteni kell: apt install tree)
tree -L 2  // csak két szint mélyen
tree -d  // csak a mappák`
    }],
    tip: 'Jogosultság ellenőrzéséhez mappánál mindig `ls -ld` kell, mert a sima `ls -l mappa` a mappa TARTALMÁT listázza. A sor elejének olvasása: [jogosultságok](#jogok-olvasasa). Ha véletlenül `sl`-t írsz, és átmegy egy kisvonat a képernyőn: az az `sl` nevű tréfaprogram, nem hiba.'
  },
  {
    id: 'mkdir',
    category: 'fajlok',
    title: 'Mappa és fájl létrehozása',
    desc: 'Új mappa, egymásba ágyazott mappák, üres fájl.',
    jog: 'user',
    jogNote: 'ott, ahová írni tudsz – a saját home mappádban mindig',
    blocks: [{
      label: '{{USER}}@szerver:~$',
      lang: 'bash',
      code: `
mkdir /home/{{USER}}/beadando_feladat  // mappa létrehozása teljes útvonallal
mkdir beadando_feladat  // ugyanez, ha már a home mappádban állsz
mkdir -p projekt/web/css  // a hiányzó szülőmappákat is létrehozza
touch jegyzet.txt  // üres fájl létrehozása
ls -ld /home/{{USER}}/beadando_feladat  // ellenőrzés`
    }],
    tip: 'Ha rootként hozod létre a mappát a felhasználó home-jában, a tulajdonosa root lesz. Javítás: `chown {{USER}}:{{USER}} /home/{{USER}}/beadando_feladat` – lásd [chown](#chown).'
  },
  {
    id: 'torles',
    category: 'fajlok',
    title: 'Törlés: rm és rmdir',
    desc: 'Fájl és mappa törlése. Linuxon nincs lomtár: ami törölve van, az elveszett.',
    jog: 'user',
    jogNote: 'a saját fájljaidra; máséra root kell',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
rm jegyzet.txt  // egy fájl törlése
rmdir ures_mappa  // mappa törlése – CSAK akkor, ha üres
rm -r mappa  // mappa törlése a teljes tartalmával együtt (rekurzívan)
rm -rf mappa  // ugyanez kérdés és hibaüzenet nélkül
rm -r *  // az aktuális mappa TELJES tartalmának törlése`
      },
      {
        label: 'rmdir vagy rm?',
        lang: 'table',
        head: ['Parancs', 'Mit töröl', 'Ha a mappa nem üres'],
        rows: [
          ['`rmdir mappa`', 'csak üres mappát', 'hibát ad: „Directory not empty”'],
          ['`rm fajl`', 'fájlt', 'mappára hibát ad: „Is a directory”'],
          ['`rm -r mappa`', 'mappát mindennel, ami benne van', 'kitörli az egészet']
        ]
      }
    ],
    tip: 'Az `rm -r *` előtt mindig futtass egy `pwd` parancsot, hogy biztosan jó mappában állsz. Rootként, rossz helyen kiadva az egész rendszert le lehet vele törölni.'
  },
  {
    id: 'masolas',
    category: 'fajlok',
    title: 'Másolás, áthelyezés, átnevezés: cp és mv',
    desc: 'Fájlok és mappák másolása, mozgatása; az átnevezés is az mv-vel megy.',
    jog: 'user',
    jogNote: 'a forrást olvasni, a célt írni kell tudnod',
    blocks: [{
      label: '{{USER}}@szerver:~$',
      lang: 'bash',
      code: `
cp jegyzet.txt masolat.txt  // fájl másolása új néven
cp jegyzet.txt /tmp/  // fájl másolása másik mappába, azonos néven
cp -r web /tmp/  // mappa másolása a teljes tartalmával (-r nélkül mappát nem másol)
cp -r web/* /var/www/html/  // a mappa TARTALMÁNAK másolása, a mappa nélkül
mv regi.txt uj.txt  // átnevezés
mv jegyzet.txt /tmp/  // áthelyezés másik mappába`
    }],
    tip: 'A csillag számít: `cp -r web /var/www/html/` a `web` mappát magát másolja be (lesz `/var/www/html/web`), a `cp -r web/* /var/www/html/` csak azt, ami benne van. A feladatban „a web mappa teljes tartalmát” kell másolni – tehát a csillagos kell: [web másolás](#web-masolas).'
  },
  {
    id: 'megnezes',
    category: 'fajlok',
    title: 'Fájl tartalmának megnézése',
    desc: 'Rövid fájlhoz cat, hosszúhoz less, az elejéhez és a végéhez head és tail.',
    jog: 'user',
    jogNote: 'ha a fájlra van olvasási jogod',
    blocks: [{
      label: '{{USER}}@szerver:~$',
      lang: 'bash',
      code: `
cat /etc/hostname  // a teljes fájl kiírása a képernyőre
cat -n ido.sh  // sorszámozva
less /etc/ssh/sshd_config  // lapozható nézet: nyilak, szóköz = lap; /szó = keresés; q = kilépés
head -n 15 SSH_2k.log  // az első 15 sor
tail -n 15 SSH_2k.log  // az utolsó 15 sor
tail -f /var/log/syslog  // folyamatosan mutatja az új sorokat; kilépés: Ctrl+C`
    }],
    tip: 'Részletesen a naplófájloknál: [head és tail](#head-tail), [grep](#grep).'
  },
  {
    id: 'szerkesztok',
    category: 'fajlok',
    title: 'Szövegszerkesztők: nano, mcedit, mc',
    desc: 'Konfigurációs fájlok szerkesztése parancssorban.',
    jog: 'vegyes',
    jogNote: 'megnyitni bárki tudja, de az /etc alatti fájlokat csak rootként lehet elmenteni',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
nano /etc/network/interfaces  // fájl megnyitása nano-ban; ha nem létezik, mentéskor létrehozza
mcedit /etc/network/interfaces  // a Midnight Commander szerkesztője (apt install mc)
mc  // kétpaneles fájlkezelő: másolás, mozgatás, szerkesztés menüből`
      },
      {
        label: 'Billentyűk',
        lang: 'table',
        head: ['Művelet', 'nano', 'mcedit', 'mc (fájlkezelő)'],
        rows: [
          ['Mentés', 'Ctrl + O, majd Enter', 'F2', '–'],
          ['Kilépés', 'Ctrl + X', 'F10', 'F10'],
          ['Keresés', 'Ctrl + W', 'F7', 'Ctrl + S'],
          ['Sor kivágása', 'Ctrl + K', '–', '–'],
          ['Beillesztés', 'Ctrl + U', '–', '–'],
          ['Megnézés / szerkesztés', '–', '–', 'F3 / F4'],
          ['Másolás / áthelyezés', '–', '–', 'F5 / F6'],
          ['Új mappa / törlés', '–', '–', 'F7 / F8']
        ]
      }
    ],
    tip: 'Ha nano-ban mentéskor „Permission denied” jön, nem rootként nyitottad meg: lépj ki mentés nélkül (Ctrl + X, majd N), és nyisd meg újra rootként vagy `sudo nano …` paranccsal. PuTTY-ban a beillesztés jobb egérgomb.'
  },
  {
    id: 'kereses',
    category: 'fajlok',
    title: 'Fájl keresése: find és which',
    desc: 'Hol van egy fájl a rendszerben, és hol van egy parancs programja.',
    jog: 'user',
    jogNote: 'rootként a teljes rendszert átnézi, hibaüzenetek nélkül',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
find / -name "sshd_config"  // fájl keresése név szerint a teljes rendszerben
find /home -name "*.log"  // minden .log végű fájl a /home alatt
find /var/www -type d  // csak a mappák
which nano  // hol van a nano program fájlja`
    }]
  },

  /* =====================================================================
   * JOGOSULTSÁGOK
   * ===================================================================== */
  {
    id: 'chmod-kalkulator',
    category: 'jogok',
    title: 'Jogosultság-kalkulátor (chmod)',
    desc: 'Kattintsd be, ki mit tehet a fájllal – megkapod a számot, az ls -l szerinti alakot és a kész parancsot.',
    tool: 'chmod',
    blocks: [],
    tip: 'A szám három jegye: tulajdonos, csoport, többiek. Egy jegy az `r` = 4, `w` = 2, `x` = 1 értékek összege. A kész parancsban a `fajl` vagy `mappa` szót cseréld a saját nevedre.'
  },
  {
    id: 'jogok-olvasasa',
    category: 'jogok',
    title: 'Jogosultságok olvasása az ls -l kimenetéből',
    desc: 'Mit jelent a sor eleji tíz karakter, és mi a különbség fájl és mappa között.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
ls -l ido.sh  // -rwx------ 1 {{USER}} {{USER}} 60 Oct  9 05:56 ido.sh
ls -ld beadando_feladat  // drwxrwxrwx 3 {{USER}} {{USER}} 4096 Oct  9 05:43 beadando_feladat`
      },
      {
        label: 'A sor részei balról jobbra',
        lang: 'table',
        head: ['Rész', 'Példa', 'Jelentése'],
        rows: [
          ['1. karakter', '`-` vagy `d`', 'típus: `-` fájl, `d` mappa, `l` hivatkozás (link)'],
          ['2–4. karakter', '`rwx`', 'a **tulajdonos** (user, `u`) jogai'],
          ['5–7. karakter', '`r-x`', 'a **csoport** (group, `g`) jogai'],
          ['8–10. karakter', '`r--`', 'a **többiek** (other, `o`) jogai'],
          ['utána', '`{{USER}} {{USER}}`', 'tulajdonos és csoport neve'],
          ['utána', '`4096`', 'méret bájtban, majd a módosítás ideje és a név']
        ]
      },
      {
        label: 'Mit jelent a három betű?',
        lang: 'table',
        head: ['Betű', 'Érték', 'Fájlnál', 'Mappánál'],
        rows: [
          ['`r`', '4', 'olvasható a tartalma', 'listázható, mi van benne (`ls`)'],
          ['`w`', '2', 'módosítható', 'létrehozhatsz és törölhetsz benne fájlokat'],
          ['`x`', '1', 'futtatható programként', 'be lehet lépni (`cd`)'],
          ['`-`', '0', 'az adott jog nincs meg', 'az adott jog nincs meg']
        ]
      },
      {
        label: 'Gyakori értékek',
        lang: 'table',
        head: ['Szám', 'Betűkkel', 'Mire jó'],
        rows: [
          ['644', '`rw-r--r--`', 'sima fájl: a tulajdonos írja, mindenki olvassa'],
          ['755', '`rwxr-xr-x`', 'mappa vagy mindenki által futtatható program'],
          ['700', '`rwx------`', 'csak a tulajdonos olvashatja, írhatja, futtathatja'],
          ['600', '`rw-------`', 'titkos fájl: csak a tulajdonos olvassa és írja'],
          ['777', '`rwxrwxrwx`', 'mindenki mindent – csak ha a feladat kéri']
        ]
      }
    ],
    tip: 'Kiszámolni nem kell fejben: [kalkulátor](#chmod-kalkulator). Beállítás: [chmod](#chmod), tulajdonos: [chown](#chown).'
  },
  {
    id: 'chmod',
    category: 'jogok',
    title: 'Jogosultság beállítása: chmod',
    desc: 'Kétféle írásmód: betűkkel hozzáadsz vagy elveszel egy jogot, számmal egyszerre az egészet megadod.',
    jog: 'vegyes',
    jogNote: 'a saját fájljaidon te, máséin csak root',
    blocks: [
      {
        label: '{{USER}}@szerver:~$ – betűkkel',
        lang: 'bash',
        code: `
chmod o+rwx /home/{{USER}}/beadando_feladat  // a többieknek (other) olvasás, írás, belépés
chmod u+x ido.sh  // a tulajdonos futtathatja
chmod go-rwx ido.sh  // a csoporttól és a többiektől minden jog elvéve
chmod a+r jegyzet.txt  // mindenki (all) olvashatja
ls -ld /home/{{USER}}/beadando_feladat  // ellenőrzés: drwxrwxrwx vagy drwxr-xrwx`
      },
      {
        label: '{{USER}}@szerver:~$ – számmal',
        lang: 'bash',
        code: `
chmod 700 ido.sh  // csak a tulajdonos: olvas, ír, futtat (-rwx------)
chmod 644 jegyzet.txt  // tulajdonos ír és olvas, a többiek csak olvasnak
chmod 755 mappa  // tulajdonos mindent, a többiek belépnek és olvasnak
chmod -R 755 /var/www/html  // rekurzívan: a mappa és minden, ami benne van
ls -l ido.sh  // ellenőrzés`
      },
      {
        label: 'A betűs írásmód',
        lang: 'table',
        head: ['Kinek', 'Mit', 'Melyik jogot'],
        rows: [
          ['`u` tulajdonos', '`+` hozzáad', '`r` olvasás'],
          ['`g` csoport', '`-` elvesz', '`w` írás'],
          ['`o` többiek', '`=` pontosan ennyi legyen', '`x` futtatás / belépés'],
          ['`a` mindenki', '', '']
        ]
      }
    ],
    tip: '„Az other rendelkezzen rwx jogosultsággal” = `chmod o+rwx`. „Csak a user futtathassa” = `chmod 700`. A betűs alak a meglévő jogokhoz ad vagy vesz el, a számos mindent egyszerre felülír.'
  },
  {
    id: 'chown',
    category: 'jogok',
    title: 'Tulajdonos és csoport: chown',
    desc: 'Kié legyen a fájl vagy mappa. A webszerver fájljainál ez kötelező lépés.',
    jog: 'root',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
chown {{USER}}:{{USER}} /home/{{USER}}/beadando_feladat  // tulajdonos:csoport beállítása egy mappán
chown {{USER}} jegyzet.txt  // csak a tulajdonos cseréje
chgrp www-data jegyzet.txt  // csak a csoport cseréje
chown -R www-data:www-data /var/www/html  // rekurzívan: a mappa, minden almappa és fájl
ls -ld /var/www/html  // ellenőrzés: drwxr-xr-x … www-data www-data … /var/www/html`
    }],
    tip: 'A `www-data` az a felhasználó, akinek a nevében az Apache webszerver fut. Ha a weboldal fájljai nem az övéi, az oldal nem tud fájlt feltölteni vagy írni. A `-R` nélkül csak maga a mappa vált gazdát, a tartalma nem.'
  },

  /* =====================================================================
   * LEMEZ, FOLYAMATOK
   * ===================================================================== */
  {
    id: 'lemezek',
    category: 'lemez',
    title: 'Partíciók és szabad hely',
    desc: 'Milyen lemezek és partíciók vannak, hová vannak csatolva, és mennyi rajtuk a szabad hely.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
lsblk  // lemezek és partíciók fa alakban: méret, típus, csatolási pont
lsblk -f  // a fájlrendszer típusával együtt (ext4, swap)
df -h  // szabad és foglalt hely csatolási pontonként, olvasható mértékegységgel
df -h /home  // csak az a partíció, amin a /home van
duf  // ugyanez színes táblázatban (apt install duf)
du -sh /var/www/html  // egy mappa teljes mérete
free -h  // memória és swap: összes, foglalt, szabad`
      },
      {
        label: 'Melyik mire való?',
        lang: 'table',
        head: ['Kérdés', 'Parancs'],
        rows: [
          ['Milyen partíciók vannak?', '`lsblk`'],
          ['Mennyi a szabad hely?', '`df -h` vagy `duf`'],
          ['Mekkora ez a mappa?', '`du -sh mappa`'],
          ['Mennyi a szabad memória?', '`free -h`']
        ]
      }
    ],
    tip: 'A `-h` (human-readable) nélkül a `df` kilobájtban ír ki mindent, nehezen olvasható. A `df -h` kimenetében a `tmpfs` és `udev` sorok memóriában lévő rendszermappák; a valódi partíciók a `/dev/sda…` sorok.'
  },
  {
    id: 'folyamatok',
    category: 'lemez',
    title: 'Futó folyamatok: top, ps, kill',
    desc: 'Mi fut éppen a gépen, mennyi processzort és memóriát használ, és hogyan állítható le.',
    jog: 'user',
    jogNote: 'más felhasználó folyamatát leállítani csak root tudja',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
top  // élő lista a folyamatokról, processzorhasználat szerint; kilépés: q
ps aux  // pillanatkép az összes folyamatról
ps aux | grep apache  // csak azok a sorok, amikben szerepel az „apache”
kill 1234  // a 1234-es azonosítójú (PID) folyamat leállítása
kill -9 1234  // erőszakos leállítás, ha a sima kill nem elég`
      },
      {
        label: 'A top fejléce',
        lang: 'table',
        head: ['Oszlop', 'Jelentése'],
        rows: [
          ['PID', 'a folyamat azonosítója – ezt kéri a `kill`'],
          ['USER', 'kinek a nevében fut'],
          ['PR / NI', 'prioritás és nice érték'],
          ['%CPU / %MEM', 'processzor- és memóriahasználat'],
          ['COMMAND', 'a program neve']
        ]
      }
    ],
    tip: 'A képernyőképhez a `top` futás közben jó; ha inkább nem mozgó listát akarsz, `ps aux`. Barátságosabb, színes változat: `htop` (telepíteni kell).'
  },

  /* =====================================================================
   * HÁLÓZAT
   * ===================================================================== */
  {
    id: 'ip-cim',
    category: 'halozat',
    title: 'IP-cím, hálózati kártya, átjáró',
    desc: 'Mi a gép IP-címe, hogy hívják a hálózati kártyát, és merre van az átjáró.',
    jog: 'user',
    jogNote: 'az ifconfig csak rootként érhető el',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
ip a  // minden hálózati kártya és IP-címe (teljes alak: ip address)
ip -br a  // rövid, táblázatos nézet: kártya, állapot, cím
ip r  // útválasztás; a „default via …” sorban az átjáró (gateway) címe
hostname -I  // csak az IP-címek, semmi más
ifconfig  // a régi parancs ugyanerre (apt install net-tools)`
    }],
    tip: 'Az `ip a` kimenetében a `lo` a gép saját belső (loopback) kártyája, a másik (például `{{IF}}`) a valódi. A címe az `inet` sorban van, például `192.168.109.242/24`. Ha a sor végén ott a `dynamic` szó, a címet DHCP-től kapta; statikus cím mellett nincs ott.'
  },
  {
    id: 'statikus-ip',
    category: 'halozat',
    title: 'Statikus IP-cím beállítása',
    desc: 'A DHCP-től kapott cím helyett fix cím beállítása az /etc/network/interfaces fájlban.',
    jog: 'root',
    blocks: [
      {
        label: 'root@szerver:~# – előtte nézd meg',
        lang: 'bash',
        code: `
ip a  // a kártya neve és a jelenlegi (DHCP-s) cím – ebből látszik a hálózat
ip r  // a „default via” utáni cím az átjáró
nano /etc/network/interfaces  // a hálózati beállítások fájlja`
      },
      {
        label: '/etc/network/interfaces – ezt cseréld',
        lang: 'conf',
        code: `
# The primary network interface
allow-hotplug {{IF}}
iface {{IF}} inet dhcp  // ezt a sort kell átírni: dhcp → static`
      },
      {
        label: '/etc/network/interfaces – erre',
        lang: 'conf',
        code: `
# The primary network interface
auto {{IF}}  // a kártya induláskor automatikusan felkapcsol (az allow-hotplug is jó)
iface {{IF}} inet static  // fix cím a DHCP helyett
    address {{IP}}/24  // a szerver címe és a maszk (/24 = 255.255.255.0)
    gateway {{GW}}  // az átjáró: amit az „ip r” mutatott`
      },
      {
        label: 'root@szerver:~# – érvényesítés és ellenőrzés',
        lang: 'bash',
        code: `
systemctl restart networking  // a hálózat újraindítása az új beállításokkal
ip a  // ellenőrzés: az új cím látszik, és már nincs mellette a „dynamic” szó
ping -c 4 {{GW}}  // elérhető-e az átjáró`
      }
    ],
    tip: 'A két leggyakoribb hiba: az `address` szót egy d-vel írni (`adress`), és a `dhcp` szót bent felejteni – ilyenkor a fájl hibás, és a régi cím marad. A fájl többi részét (a `lo` kártya sorait) ne bántsd. Ha SSH-n dolgozol, a cím váltásakor megszakad a kapcsolat: lépj be újra az új címen. Ha a régi cím is megmaradt az új mellett, egy `reboot` rendbe teszi.'
  },
  {
    id: 'dns',
    category: 'halozat',
    title: 'DNS-szerver beállítása',
    desc: 'Melyik szervertől kérdezze meg a gép, hogy egy névhez (google.com) milyen IP-cím tartozik.',
    jog: 'root',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
nano /etc/resolv.conf  // a DNS-beállítások fájlja
cat /etc/resolv.conf  // ellenőrzés`
      },
      {
        label: '/etc/resolv.conf',
        lang: 'conf',
        code: `
nameserver {{DNS}}  // a DNS-szerver címe; több sor is lehet, sorban próbálja őket`
      }
    ],
    tip: 'Ha IP-címre megy a ping (`ping 1.1.1.1`), de névre nem (`ping google.com` → „Temporary failure in name resolution”), akkor a hálózat jó, csak a DNS hiányzik vagy hibás.'
  },
  {
    id: 'ping',
    category: 'halozat',
    title: 'Kapcsolat ellenőrzése: ping',
    desc: 'Elérhető-e egy másik gép. Hálózati hibánál belülről kifelé haladva érdemes próbálni.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
ping -c 4 google.com  // 4 csomagot küld, aztán magától megáll és összesít
ping google.com  // megállás nélkül pingel; leállítás: Ctrl+C`
      },
      {
        label: 'Ha nem megy: ebben a sorrendben',
        lang: 'table',
        head: ['Próba', 'Ha ez sem megy, itt a hiba'],
        rows: [
          ['`ping -c 4 {{GW}}` (átjáró)', 'rossz az IP-cím, a maszk vagy a kártya neve – [statikus IP](#statikus-ip)'],
          ['`ping -c 4 1.1.1.1` (internet, IP-vel)', 'rossz vagy hiányzik a `gateway` sor'],
          ['`ping -c 4 google.com` (névvel)', 'rossz a DNS – [resolv.conf](#dns)']
        ]
      }
    ],
    tip: 'Jó eredmény: `4 packets transmitted, 4 received, 0% packet loss`. Linuxon a ping magától nem áll meg, mint Windowson – ezért kell a `-c 4`.'
  },
  {
    id: 'portok',
    category: 'halozat',
    title: 'Nyitott portok: ss',
    desc: 'Melyik program melyik porton figyel – ezzel bizonyítható, hogy az SSH tényleg az új porton megy.',
    jog: 'vegyes',
    jogNote: 'bárki futtathatja, de a program nevét csak rootként mutatja',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
ss -tlnp  // t: TCP, l: figyelő (listening) portok, n: számokkal, p: a program nevével
ss -tlnp | grep ssh  // csak az SSH sora – itt látszik a port
ss -tlnp | grep :80  // figyel-e valami a 80-as (web) porton`
    }]
  },

  /* =====================================================================
   * CSOMAGOK, LETÖLTÉS
   * ===================================================================== */
  {
    id: 'sources-list',
    category: 'csomag',
    title: 'Tükörszerver beállítása: sources.list',
    desc: 'Az apt ebből a fájlból tudja, honnan töltse le a csomagokat. Hálózati tükör nélküli telepítés után csak a DVD van benne.',
    jog: 'root',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
nano /etc/apt/sources.list  // a csomagforrások listája
apt update  // utána: CSAK a csomaglisták frissítése`
      },
      {
        label: '/etc/apt/sources.list (Debian 13 „trixie”)',
        lang: 'conf',
        code: `
deb https://deb.debian.org/debian/ trixie contrib main non-free non-free-firmware
# deb-src https://deb.debian.org/debian/ trixie contrib main non-free non-free-firmware

deb https://deb.debian.org/debian/ trixie-updates contrib main non-free non-free-firmware
# deb-src https://deb.debian.org/debian/ trixie-updates contrib main non-free non-free-firmware

deb https://deb.debian.org/debian/ trixie-proposed-updates contrib main non-free non-free-firmware
# deb-src https://deb.debian.org/debian/ trixie-proposed-updates contrib main non-free non-free-firmware

deb https://deb.debian.org/debian/ trixie-backports contrib main non-free non-free-firmware
# deb-src https://deb.debian.org/debian/ trixie-backports contrib main non-free non-free-firmware

deb https://security.debian.org/debian-security/ trixie-security contrib main non-free non-free-firmware
# deb-src https://security.debian.org/debian-security/ trixie-security contrib main non-free non-free-firmware`
      },
      {
        label: 'Egy sor felépítése',
        lang: 'table',
        head: ['Rész', 'Példa', 'Jelentése'],
        rows: [
          ['típus', '`deb`', 'kész (bináris) csomagok; a `deb-src` a forráskód'],
          ['cím', '`https://deb.debian.org/debian/`', 'a tükörszerver'],
          ['kiadás', '`trixie`', 'a Debian 13 kódneve; `-updates`, `-security`: frissítések'],
          ['komponensek', '`main contrib non-free`', 'szabad, vegyes és nem szabad csomagok']
        ]
      }
    ],
    tip: 'Ha a fájlban van `deb cdrom:` kezdetű sor, tegyél elé `#` jelet (vagy töröld), különben az apt a DVD-t keresi. A feladat szerint utána CSAK a csomaglistákat kell frissíteni: `apt update` – az `apt upgrade` már a programokat is frissítené. A teljes fájl a másolás gombbal egyben kimásolható.'
  },
  {
    id: 'apt',
    category: 'csomag',
    title: 'Csomagkezelés: apt',
    desc: 'Programok telepítése, frissítése, eltávolítása. Telepítés előtt mindig apt update.',
    jog: 'root',
    jogNote: 'keresni és adatot megnézni (search, show, list) bárki tud',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
apt update  // a csomagLISTÁK frissítése: megtudja, mi érhető el – semmit nem telepít
apt upgrade  // a már telepített programok frissítése
apt install sudo mc tree duf  // több csomag telepítése egyszerre
apt install -y net-tools wget unzip  // -y: nem kérdez rá, automatikusan igent mond
apt remove mc  // eltávolítás (a beállítófájlok maradnak)
apt purge mc  // eltávolítás a beállítófájlokkal együtt
apt autoremove  // a már feleslegessé vált függőségek törlése
apt search cowsay  // keresés a csomagok között
apt show tree  // egy csomag leírása, verziója, függőségei`
      },
      {
        label: 'update vagy upgrade?',
        lang: 'table',
        head: ['Parancs', 'Mit csinál', 'Telepít valamit?'],
        rows: [
          ['`apt update`', 'letölti a tükörszerverről az elérhető csomagok listáját', 'nem'],
          ['`apt upgrade`', 'a telepített programokat újabb verzióra cseréli', 'igen'],
          ['`apt install x`', 'feltelepíti a csomagot és minden függőségét', 'igen']
        ]
      }
    ],
    tip: 'Ha az `apt install` azt írja, „Unable to locate package”, vagy elgépelted a nevet, vagy nem futott `apt update` a [sources.list](#sources-list) beállítása után. A dolgozatban kért csomagok: `sudo` (parancs root joggal), `mc` (fájlkezelő), `tree` (mappafa), `duf` (lemezhasználat).'
  },
  {
    id: 'dpkg-apt',
    category: 'csomag',
    title: 'dpkg vagy apt?',
    desc: 'Mindkettő csomagot telepít, de más szinten: a dpkg egyetlen fájlt, az apt mindent, ami kell hozzá.',
    jog: 'root',
    blocks: [
      {
        label: 'Különbségek',
        lang: 'table',
        head: ['', '`dpkg`', '`apt`'],
        rows: [
          ['Szintje', 'alapvető, alacsony szintű telepítő', 'magasabb szintű, „okosabb”'],
          ['Honnan telepít', 'egy már letöltött `.deb` fájlból', 'a tükörszerverekről tölti le'],
          ['Függőségek', 'nem telepíti őket – hibát ad, ha hiányoznak', 'az összes függőséget feltelepíti'],
          ['Kapcsolatuk', 'a tényleges telepítést végzi', 'a háttérben a dpkg-t használja']
        ]
      },
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
dpkg -i csomag.deb  // letöltött .deb fájl telepítése
apt -f install  // ha a dpkg függőség miatt elakadt: pótolja a hiányzókat
apt install ./csomag.deb  // .deb fájl telepítése apt-tal – a függőségeket is hozza
dpkg -l  // az összes telepített csomag listája
dpkg -l | grep apache  // telepítve van-e az apache`
      }
    ]
  },
  {
    id: 'wget-curl',
    category: 'csomag',
    title: 'Letöltés a netről: wget és curl',
    desc: 'Fájl letöltése parancssorból, vagy egy weboldal válaszának kiírása.',
    jog: 'user',
    jogNote: 'oda ment, ahová írni tudsz',
    blocks: [{
      label: '{{USER}}@szerver:~$',
      lang: 'bash',
      code: `
wget https://raw.githubusercontent.com/bahamas10/dotfiles/refs/heads/master/bashrc  // letöltés az aktuális mappába, az eredeti néven
wget -O sajat_nev.txt https://pelda.hu/fajl.txt  // letöltés megadott néven (nagy O)
curl -4 wttr.in/Budapest  // a válasz kiírása a képernyőre; -4: IPv4-en keresztül
curl -O https://pelda.hu/fajl.zip  // letöltés fájlba curl-lel
curl -s wttr.in/Budapest  // -s: csendes mód, nem írja ki a letöltés állapotát`
    }],
    tip: 'Alapállás: a `wget` fájlba ment, a `curl` a képernyőre ír. Ha valamelyik nincs fent: `apt install wget curl`.'
  },
  {
    id: 'forraskod',
    category: 'csomag',
    title: 'Telepítés forráskódból: git clone és make',
    desc: 'Ha egy program nincs csomagban, a forrását letöltöd GitHubról, és a make telepíti.',
    jog: 'vegyes',
    jogNote: 'letölteni bárki tudja, a make install-hoz root kell',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
apt install git make  // ha még nincsenek fent
cd ~  // a home mappába
git clone https://github.com/cowsay-org/cowsay.git  // a tároló letöltése egy cowsay nevű mappába
cd cowsay  // belépés a letöltött mappába
make install  // telepítés a Makefile utasításai szerint
cowsay "Sajat Nev"  // futtatás – a tehén kimondja, amit idézőjelbe írsz`
    }],
    tip: 'A `make` a mappában lévő `Makefile` nevű fájl utasításait hajtja végre: a sima `make` lefordítja a programot, a `make install` a helyére másolja (a `/usr/local` alá, ezért kell root). A `make` nem készít .deb csomagot. Ha „No such file or directory” hibát kapsz, nem a `cowsay` mappában állsz.'
  },
  {
    id: 'tomorites',
    category: 'csomag',
    title: 'Kicsomagolás: 7z, zip, tar',
    desc: 'Tömörített fájlok kibontása. Mindegyik formátumhoz más program kell.',
    jog: 'user',
    jogNote: 'a telepítéshez root kell',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
apt install 7zip unzip  // a kicsomagolók telepítése
cd /home/{{USER}}/beadando_feladat  // abba a mappába, ahol a tömörített fájl van
7zz x gyakorlo-feladat.7z  // .7z kibontása a mappaszerkezet megtartásával
unzip csomag.zip  // .zip kibontása az aktuális mappába
unzip csomag.zip -d /var/www/html/joomla  // .zip kibontása megadott mappába
tar -xzf csomag.tar.gz  // .tar.gz kibontása (x: kibont, z: gzip, f: fájl)
tar -czf mentes.tar.gz mappa  // mappa becsomagolása .tar.gz fájlba`
    }],
    tip: 'Debian 13-on a `7zip` csomag parancsa `7zz`. Ha nem találja, próbáld így: `7z x fajl.7z` (ez a `p7zip-full` csomag parancsa). Az `x` a mappákat is megtartja; az `e` mindent egy mappába ömleszt.'
  },

  /* =====================================================================
   * SSH, SZOLGÁLTATÁSOK
   * ===================================================================== */
  {
    id: 'systemctl',
    category: 'ssh',
    title: 'Szolgáltatások kezelése: systemctl',
    desc: 'Háttérben futó szolgáltatások (SSH, hálózat, webszerver, adatbázis) indítása, leállítása, állapota.',
    jog: 'root',
    jogNote: 'az állapotot (status) bárki megnézheti',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
systemctl status ssh  // fut-e, mióta, és az utolsó naplósorai; kilépés: q
systemctl restart ssh  // újraindítás – konfigurációs fájl módosítása után kell
systemctl start apache2  // elindítás
systemctl stop apache2  // leállítás
systemctl enable apache2  // a gép indulásakor automatikusan induljon
systemctl disable apache2  // ne induljon automatikusan
systemctl is-active mariadb  // egyszavas válasz: active vagy inactive`
      },
      {
        label: 'A dolgozatban előforduló szolgáltatások',
        lang: 'table',
        head: ['Szolgáltatás', 'Név a systemctl-ben', 'Beállítófájl'],
        rows: [
          ['Hálózat', '`networking`', '`/etc/network/interfaces`'],
          ['SSH-szerver', '`ssh`', '`/etc/ssh/sshd_config`'],
          ['Webszerver', '`apache2`', '`/etc/apache2/`'],
          ['Adatbázis', '`mariadb`', '`/etc/mysql/`']
        ]
      }
    ],
    tip: 'Szabály: beállítófájl módosítása után a szolgáltatást újra kell indítani, különben a régi beállítással fut tovább. Ha a `status` pirossal `failed` állapotot mutat, a beállítófájlban van elírás.'
  },
  {
    id: 'ssh-port',
    category: 'ssh',
    title: 'SSH-szerver másik porton',
    desc: 'Az SSH alapból a 22-es porton figyel. A portot az sshd_config fájlban lehet átírni.',
    jog: 'root',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
nano /etc/ssh/sshd_config  // az SSH-szerver beállításai`
      },
      {
        label: '/etc/ssh/sshd_config',
        lang: 'conf',
        code: `
#Port 22  // ezt a sort keresd meg (Ctrl+W, „Port”) …
Port {{PORT}}  // … és írd át így: a # jel nélkül, az új porttal`
      },
      {
        label: 'root@szerver:~# – érvényesítés és ellenőrzés',
        lang: 'bash',
        code: `
systemctl restart ssh  // az SSH-szerver újraindítása
ss -tlnp | grep ssh  // ellenőrzés: a sorban az új portnak kell szerepelnie
systemctl status ssh  // ha nem indult el: itt látszik, mi a hiba`
      }
    ],
    tip: 'A `#` jellel kezdődő sor megjegyzés, nem él – a jelet ki kell törölni. A port legfeljebb 65535 lehet: ha a feladat ennél nagyobb számot kér (például 112233), az érvénytelen, és az SSH nem indul el vele – használj érvényeset (például 11223), és írd oda, miért. A már élő SSH-kapcsolatod az újraindítás után is megmarad, de új belépéshez már az új port kell: [belépés](#ssh-belepes).'
  },
  {
    id: 'ssh-belepes',
    category: 'ssh',
    title: 'Belépés SSH-val: ssh és PuTTY',
    desc: 'Távoli belépés a szerverre egy másik gépről, parancssorból vagy PuTTY-val.',
    jog: 'user',
    blocks: [
      {
        label: 'Windows PowerShell vagy másik Linux',
        lang: 'bash',
        code: `
ssh {{USER}}@{{IP}}  // belépés az alapértelmezett 22-es porton
ssh -p {{PORT}} {{USER}}@{{IP}}  // belépés másik porton (kis p)
exit  // kilépés a szerverről`
      },
      {
        label: 'PuTTY',
        lang: 'gui',
        code: `
Host Name (or IP address): {{IP}}
Port: {{PORT}}
Connection type: SSH
Open > login as: {{USER}}`
      }
    ],
    tip: 'Root felhasználóval SSH-n alapból nem lehet jelszóval belépni: lépj be a saját felhasználóddal, utána `su -`. Első csatlakozáskor a kulcs elfogadására kérdez rá: Accept / yes. PuTTY-ban a kijelölés másol, a jobb egérgomb beilleszt.'
  },
  {
    id: 'scp',
    category: 'ssh',
    title: 'Fájlmásolás gépek között: scp',
    desc: 'Fájl felmásolása a szerverre vagy letöltése onnan, SSH-n keresztül. A parancsot a SAJÁT gépeden futtatod, nem a szerveren.',
    jog: 'user',
    jogNote: 'a célmappába írni kell tudnod',
    blocks: [
      {
        label: 'A saját (Windows) gépeden: PowerShell',
        lang: 'bash',
        code: `
scp -P {{PORT}} gyakorlo-feladat.7z {{USER}}@{{IP}}:/home/{{USER}}/beadando_feladat/  // feltöltés a szerverre (NAGY P a port!)
scp gyakorlo-feladat.7z {{USER}}@{{IP}}:/home/{{USER}}/beadando_feladat/  // ugyanez, ha az SSH még a 22-es porton megy
scp -P {{PORT}} {{USER}}@{{IP}}:/home/{{USER}}/ido.sh .  // letöltés a szerverről az aktuális mappába
scp -P {{PORT}} -r web {{USER}}@{{IP}}:/home/{{USER}}/  // teljes mappa feltöltése (-r)`
      },
      {
        label: 'A parancs felépítése',
        lang: 'table',
        head: ['Rész', 'Jelentése'],
        rows: [
          ['`scp`', 'secure copy: másolás SSH-n keresztül'],
          ['`-P {{PORT}}`', 'az SSH port – az scp-nél NAGY P, az ssh-nál kis p'],
          ['`gyakorlo-feladat.7z`', 'mit: a forrásfájl (abban a mappában állj, ahol van)'],
          ['`{{USER}}@{{IP}}:`', 'hová: felhasználó, szerver, majd kettőspont'],
          ['`/home/{{USER}}/beadando_feladat/`', 'a célmappa a szerveren']
        ]
      }
    ],
    tip: 'A kettőspont nélkül az scp nem a szerverre másol, hanem helyben készít egy furcsa nevű fájlt. Ha „Permission denied” jön a célmappára, a mappa nem a tiéd – [chown](#chown) vagy [chmod](#chmod). Grafikus megoldás: WinSCP, ugyanezzel a címmel, porttal, felhasználóval. Utána kibontás: [7zz x](#tomorites).'
  },

  /* =====================================================================
   * NAPLÓFÁJL, SZÖVEG
   * ===================================================================== */
  {
    id: 'wc',
    category: 'szoveg',
    title: 'Sorok megszámolása: wc',
    desc: 'Hány sorból, szóból, karakterből áll egy fájl – vagy egy másik parancs kimenete.',
    jog: 'user',
    blocks: [{
      label: '{{USER}}@szerver:~$',
      lang: 'bash',
      code: `
wc -l beadando_feladat/SSH_2k.log  // sorok száma (-l: lines)
wc -w jegyzet.txt  // szavak száma
wc -c jegyzet.txt  // bájtok száma
grep "Failed password" beadando_feladat/SSH_2k.log | wc -l  // egy másik parancs kimenetének sorai`
    }],
    tip: 'A kimenet: a szám, utána a fájl neve, például `2000 beadando_feladat/SSH_2k.log`.'
  },
  {
    id: 'head-tail',
    category: 'szoveg',
    title: 'Első és utolsó sorok: head és tail',
    desc: 'Egy fájl eleje és vége. Kapcsoló nélkül 10 sort mutatnak.',
    jog: 'user',
    blocks: [{
      label: '{{USER}}@szerver:~$',
      lang: 'bash',
      code: `
head -n 15 beadando_feladat/SSH_2k.log  // az első 15 sor
tail -n 15 beadando_feladat/SSH_2k.log  // az utolsó 15 sor
head beadando_feladat/SSH_2k.log  // kapcsoló nélkül az első 10
tail -f /var/log/syslog  // élőben követi a fájl végét; kilépés: Ctrl+C
grep "Invalid user" beadando_feladat/SSH_2k.log | head -n 5  // a találatok közül csak az első 5`
    }],
    tip: 'Ha „az első és utolsó 15 sort” kell egy képernyőképen megmutatni, add ki egymás után a kettőt, vagy egy sorban: `head -n 15 fajl; tail -n 15 fajl`.'
  },
  {
    id: 'grep',
    category: 'szoveg',
    title: 'Keresés a szövegben: grep',
    desc: 'Kiírja azokat a sorokat, amelyekben szerepel a keresett szöveg. A -c megszámolja őket.',
    jog: 'user',
    jogNote: 'ha a fájlra van olvasási jogod',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
grep "Invalid user" beadando_feladat/SSH_2k.log  // minden sor, amiben szerepel az „Invalid user”
grep -c "Invalid user" beadando_feladat/SSH_2k.log  // hány ilyen SOR van (-c: count)
grep "Failed password" beadando_feladat/SSH_2k.log  // sikertelen jelszópróbálkozások
grep -c "Failed password" beadando_feladat/SSH_2k.log  // ezek száma
grep "authentication failure" beadando_feladat/SSH_2k.log  // hitelesítési hibák
grep "root" beadando_feladat/SSH_2k.log  // a root felhasználót érintő sorok`
      },
      {
        label: 'Hasznos kapcsolók',
        lang: 'table',
        head: ['Kapcsoló', 'Mit csinál', 'Példa'],
        rows: [
          ['`-c`', 'a találati sorok számát írja ki, nem a sorokat', '`grep -c "Failed" naplo.log`'],
          ['`-i`', 'nem különbözteti meg a kis- és nagybetűt', '`grep -i "invalid" naplo.log`'],
          ['`-v`', 'megfordítja: azok a sorok, amikben NINCS benne', '`grep -v "root" naplo.log`'],
          ['`-n`', 'a sor számát is kiírja', '`grep -n "Port" /etc/ssh/sshd_config`'],
          ['`-r`', 'a mappa összes fájljában keres', '`grep -r "password" /etc/apache2`'],
          ['`-E`', 'több minta egyszerre: `a|b`', '`grep -E "Failed|Invalid" naplo.log`']
        ]
      }
    ],
    tip: 'A szóközt tartalmazó mintát mindig idézőjelbe kell tenni. A grep megkülönbözteti a kis- és nagybetűt: az `Invalid user` (sor eleji esemény) és az `invalid user` (a „Failed password for invalid user” sorokban) két külön minta, más-más darabszámmal. A `grep -c` sorokat számol; ugyanazt adja, mint a `grep … | wc -l`.'
  },
  {
    id: 'sort-uniq',
    category: 'szoveg',
    title: 'Rendezés és egyedi sorok: sort, uniq',
    desc: 'A sorok ABC- vagy számsorrendbe rendezése, az ismétlődések kiszűrése és megszámolása.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
sort nevek.txt  // ABC-sorrendbe rendez
sort -u nevek.txt  // rendez, és minden sort csak egyszer hagy meg (-u: unique)
sort -r nevek.txt  // fordított sorrend
sort -n szamok.txt  // számként rendez (különben a 10 megelőzi a 9-et)
sort nevek.txt | uniq  // az egymás utáni azonos sorokból egyet hagy
sort nevek.txt | uniq -c  // elé írja, hányszor fordult elő
sort nevek.txt | uniq -c | sort -nr  // a leggyakoribb kerül felülre`
      },
      {
        label: 'Kapcsolók',
        lang: 'table',
        head: ['Parancs', 'Kapcsoló', 'Jelentése'],
        rows: [
          ['`sort`', '`-u`', 'egyedi sorok – ugyanaz, mint a `sort | uniq`'],
          ['`sort`', '`-n`', 'számérték szerint rendez'],
          ['`sort`', '`-r`', 'csökkenő sorrend'],
          ['`uniq`', '`-c`', 'megszámolja az ismétlődéseket']
        ]
      }
    ],
    tip: 'A `uniq` csak az EGYMÁS UTÁN álló azonos sorokat vonja össze, ezért előtte mindig `sort` kell.'
  },
  {
    id: 'awk',
    category: 'szoveg',
    title: 'Oszlop kivágása: awk és cut',
    desc: 'Egy sorból csak egy darab kell: az awk a sort mezőkre vágja, és kiírja, amelyiket kéred.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
awk '{print $1}' fajl.txt  // minden sor első szava (a mezőket szóköz választja el)
awk '{print $1, $3}' fajl.txt  // az első és a harmadik szó
awk '{print $NF}' fajl.txt  // az utolsó szó ($NF: a mezők száma)
awk -F: '{print $1}' /etc/passwd  // -F: a mezőhatár most a kettőspont → a felhasználónevek
awk -F'Invalid user ' '{print $2}' naplo.log  // mezőhatár egy egész szöveg: ami UTÁNA áll, az a 2. mező
cut -d: -f1 /etc/passwd  // ugyanez cut-tal: -d a határoló, -f a mező sorszáma`
      },
      {
        label: 'Hogyan vágja szét az awk a sort?',
        lang: 'table',
        head: ['Sor', 'Parancs', 'Eredmény'],
        rows: [
          ['`Dec 24 07:07:38 LabSZ sshd[24206]: Invalid user test9 from 52.80.34.196`', "`awk '{print $1, $2}'`", '`Dec 24`'],
          ['ugyanez', "`awk -F'Invalid user ' '{print $2}'`", '`test9 from 52.80.34.196`'],
          ['`test9 from 52.80.34.196`', "`awk '{print $1}'`", '`test9`']
        ]
      }
    ],
    tip: 'Az awk programját aposztrófok közé kell tenni, a `$1`, `$2` a mezők sorszáma, a `$0` a teljes sor. Ezekből áll össze a dolgozat felhasználónév-listája: [receptek](#cso-receptek).'
  },
  {
    id: 'cso-receptek',
    category: 'szoveg',
    title: 'Receptek csővel: egyedi lista, gyakoriság',
    desc: 'A naplófájlos feladatok megoldása több parancs összekötésével. Minden cső (|) az előző lépés kimenetét adja tovább.',
    jog: 'user',
    blocks: [
      {
        label: '{{USER}}@szerver:~$ – a próbált felhasználónevek egyedi, ABC-rendezett listája',
        lang: 'bash',
        code: `
grep "Invalid user" beadando_feladat/SSH_2k.log | awk -F'Invalid user ' '{print $2}' | awk '{print $1}' | sort -u`
      },
      {
        label: 'Lépésenként',
        lang: 'table',
        head: ['Lépés', 'Mit csinál', 'Ami kijön belőle'],
        rows: [
          ['`grep "Invalid user" fajl`', 'csak az ilyen sorok maradnak', '`… sshd[24206]: Invalid user test9 from 52.80.34.196`'],
          ["`awk -F'Invalid user ' '{print $2}'`", 'levágja mindazt, ami a minta előtt van', '`test9 from 52.80.34.196`'],
          ["`awk '{print $1}'`", 'a maradékból az első szó: a név', '`test9`'],
          ['`sort -u`', 'ABC-sorrend, minden név csak egyszer', '`admin`, `api`, `boot`, …']
        ]
      },
      {
        label: '{{USER}}@szerver:~$ – melyik nevet hányszor próbálták (leggyakoribb elöl)',
        lang: 'bash',
        code: `
grep "Invalid user" beadando_feladat/SSH_2k.log | awk -F'Invalid user ' '{print $2}' | awk '{print $1}' | sort | uniq -c | sort -nr`
      },
      {
        label: 'A végén a három lépés',
        lang: 'table',
        head: ['Lépés', 'Mit csinál'],
        rows: [
          ['`sort`', 'egymás mellé rendezi az azonos neveket – enélkül a `uniq` nem számol jól'],
          ['`uniq -c`', 'összevonja őket, és elé írja a darabszámot: `21 admin`'],
          ['`sort -nr`', 'a darabszám szerint, csökkenő sorrendben rendez']
        ]
      },
      {
        label: '{{USER}}@szerver:~$ – további receptek',
        lang: 'bash',
        code: `
grep "Invalid user" beadando_feladat/SSH_2k.log | awk '{print $NF}' | sort | uniq -c | sort -nr | head -n 5  // az 5 legtöbbet próbálkozó IP-cím
grep "Invalid user" beadando_feladat/SSH_2k.log | awk -F'Invalid user ' '{print $2}' | awk '{print $1}' | sort -u | wc -l  // hány KÜLÖNBÖZŐ nevet próbáltak
grep -c "Invalid user" beadando_feladat/SSH_2k.log  // hány ilyen esemény volt összesen`
      }
    ],
    tip: 'Építsd fel lépésenként: előbb csak a `grep`, nézd meg a kimenetet, aztán tedd hozzá a következő csövet (↑ billentyű, és a sor végére írod). Így rögtön látod, melyik lépésnél romlik el. A parancsok alapjai: [grep](#grep), [awk](#awk), [sort és uniq](#sort-uniq).'
  },

  /* =====================================================================
   * SZKRIPT
   * ===================================================================== */
  {
    id: 'script-ido',
    category: 'script',
    title: 'Szkript paraméterrel: ido.sh',
    desc: 'Időjárás-lekérdező szkript, amelynek a város paraméterként adható meg, és csak a tulajdonosa futtathatja.',
    jog: 'user',
    jogNote: 'a saját mappádban; a curl telepítéséhez root kell',
    blocks: [
      {
        label: '{{USER}}@szerver:~$ – létrehozás',
        lang: 'bash',
        code: `
nano ido.sh  // a szkript fájljának megnyitása; beírod az alábbi három sort, mentés: Ctrl+O, Enter, Ctrl+X`
      },
      {
        label: 'ido.sh – a fájl tartalma',
        lang: 'bash',
        code: `
#!/bin/bash
VAROS="\${1:-Budapest}"  // az 1. paraméter kerül a VAROS változóba; ha nincs megadva, Budapest lesz
curl -4 "wttr.in/$VAROS"  // lekéri a megadott város időjárását`
      },
      {
        label: '{{USER}}@szerver:~$ – jogosultság és futtatás',
        lang: 'bash',
        code: `
chmod 700 ido.sh  // CSAK a tulajdonos olvashatja, írhatja és futtathatja
ls -l ido.sh  // ellenőrzés: -rwx------
./ido.sh Miskolc  // futtatás paraméterrel
./ido.sh  // paraméter nélkül Budapestet mutatja`
      },
      {
        label: 'Ugyanez nano nélkül, egy lépésben',
        lang: 'bash',
        code: `
cat << 'EOF' > ido.sh
#!/bin/bash
VAROS="\${1:-Budapest}"
curl -4 "wttr.in/$VAROS"
EOF`
      }
    ],
    tip: 'Az első sor (`#!/bin/bash`, a „shebang”) mondja meg, melyik program futtassa a fájlt – ez nem megjegyzés, kötelező. A `./` azért kell, mert az aktuális mappa nincs benne a keresési útvonalban. Ha „Permission denied” a futtatásnál: hiányzik az `x` jog – [chmod](#chmod). Ha „curl: command not found”: `apt install curl`. Az utolsó blokkot egyben kell bemásolni, az `EOF` sorig.'
  },
  {
    id: 'script-alapok',
    category: 'script',
    title: 'Szkript alapok: paraméterek, futtatás',
    desc: 'Amit egy egyszerű bash szkripthez tudni kell.',
    jog: 'user',
    blocks: [
      {
        label: 'Jelölések a szkriptben',
        lang: 'table',
        head: ['Jelölés', 'Jelentése'],
        rows: [
          ['`#!/bin/bash`', 'első sor: a bash futtassa a fájlt'],
          ['`# szöveg`', 'megjegyzés, nem fut le'],
          ['`$1`, `$2`', 'az első és második paraméter (`./ido.sh Miskolc` → `$1` = Miskolc)'],
          ['`$0`', 'a szkript neve'],
          ['`$#`', 'a megadott paraméterek száma'],
          ['`NEV="érték"`', 'változó létrehozása – az `=` körül NINCS szóköz'],
          ['`$NEV`', 'a változó értékének felhasználása'],
          ['`${1:-Budapest}`', 'az első paraméter, vagy ha üres, akkor Budapest'],
          ['`echo "szöveg"`', 'kiírás a képernyőre']
        ]
      },
      {
        label: '{{USER}}@szerver:~$',
        lang: 'bash',
        code: `
chmod u+x szkript.sh  // futtatási jog a tulajdonosnak (a többi jog marad)
chmod 700 szkript.sh  // kizárólag a tulajdonos fér hozzá
./szkript.sh  // futtatás az aktuális mappából – kell hozzá az x jog
bash szkript.sh  // futtatás x jog nélkül is: a bash-nek adod oda olvasásra`
      }
    ],
    tip: '„Csak a user által futtatható” = `chmod 700` (vagy `chmod u+x,go-rwx`). A sima `chmod +x` mindenkinek ad futtatási jogot – az nem ugyanaz.'
  },

  /* =====================================================================
   * WEB, ADATBÁZIS
   * ===================================================================== */
  {
    id: 'lamp',
    category: 'web',
    title: 'Webszerver, PHP, adatbázis, phpMyAdmin telepítése',
    desc: 'PHP-képes webszerver adatbázissal: Apache + MariaDB + PHP, és a böngészős adatbázis-kezelő.',
    jog: 'root',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
apt update  // előtte mindig
apt install apache2 mariadb-server php libapache2-mod-php php-mysql phpmyadmin  // minden egyben
systemctl status apache2  // fut-e a webszerver
systemctl status mariadb  // fut-e az adatbázis`
      },
      {
        label: 'Melyik csomag mire kell',
        lang: 'table',
        head: ['Csomag', 'Mi ez'],
        rows: [
          ['`apache2`', 'a webszerver'],
          ['`mariadb-server`', 'az adatbázis-kezelő (MySQL-kompatibilis)'],
          ['`php`', 'a PHP nyelv'],
          ['`libapache2-mod-php`', 'ettől tud az Apache PHP-t futtatni'],
          ['`php-mysql`', 'ettől éri el a PHP az adatbázist – nélküle az oldal nem tud csatlakozni'],
          ['`phpmyadmin`', 'adatbázis-kezelés böngészőből']
        ]
      },
      {
        label: 'A phpMyAdmin telepítőjének kérdései',
        lang: 'steps',
        code: `
Webszerver kiválasztása: az **apache2** soron nyomj **szóközt** (megjelenik a csillag), utána Tab és Enter
Adatbázis beállítása a dbconfig-common segítségével: **Yes / Igen**
A phpMyAdmin saját adatbázis-jelszava: tetszőleges, kétszer kell beírni
Próba böngészőből: \`http://{{IP}}/\` (az Apache alapoldala) és \`http://{{IP}}/phpmyadmin\``
      }
    ],
    tip: 'A leggyakoribb hiba, hogy az apache2-t nem jelölöd ki szóközzel, csak Entert nyomsz – ilyenkor a `/phpmyadmin` cím „Not Found” hibát ad. Javítás: `dpkg-reconfigure phpmyadmin`. Más PHP-s oldalakhoz további modulok is kellhetnek: `apt install php-zip php-gd php-mbstring php-curl php-xml`, utána `systemctl restart apache2`.'
  },
  {
    id: 'web-masolas',
    category: 'web',
    title: 'Weboldal másolása a webszerver mappájába',
    desc: 'Az Apache a /var/www/html mappából szolgálja ki az oldalt. Ide kell másolni a web mappa teljes tartalmát.',
    jog: 'root',
    blocks: [{
      label: 'root@szerver:~#',
      lang: 'bash',
      code: `
cp -r /home/{{USER}}/beadando_feladat/web/* /var/www/html/  // a web mappa TARTALMA, almappákkal együtt
ls -la /var/www/html  // ellenőrzés: ott vannak a fájlok
chown -R www-data:www-data /var/www/html  // minden a webszerver felhasználójáé legyen
ls -ld /var/www/html  // ellenőrzés: … www-data www-data … /var/www/html`
    }],
    tip: 'A `/*` miatt a fájlok közvetlenül a `html` mappába kerülnek, nem egy `html/web` almappába. Ha a böngészőben a saját oldal helyett az Apache alapoldala („It works”) jön be, a gyári `index.html` van útban: `rm /var/www/html/index.html`. A tulajdonosról bővebben: [chown](#chown).'
  },
  {
    id: 'adatbazis',
    category: 'web',
    title: 'Adatbázis és felhasználó létrehozása',
    desc: 'Új adatbázis, hozzá saját felhasználó jelszóval, majd a táblák betöltése egy .sql fájlból.',
    jog: 'root',
    jogNote: 'rootként a mysql jelszó nélkül beenged',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
mysql -u root  // belépés az adatbázis-kezelőbe rootként; a prompt MariaDB [(none)]> lesz`
      },
      {
        label: 'MariaDB [(none)]>',
        lang: 'sql',
        code: `
CREATE DATABASE IF NOT EXISTS chat_db;  // az adatbázis létrehozása
CREATE USER 'chat_user'@'localhost' IDENTIFIED BY 'Jelszo123!';  // felhasználó jelszóval
GRANT ALL PRIVILEGES ON chat_db.* TO 'chat_user'@'localhost';  // minden jog az adatbázis összes táblájára
FLUSH PRIVILEGES;  // a jogosultságok azonnali érvényesítése
EXIT;  // kilépés`
      },
      {
        label: 'root@szerver:~# – táblák betöltése és ellenőrzés',
        lang: 'bash',
        code: `
mysql -u root chat_db < /var/www/html/sql/chat.sql  // az .sql fájl utasításainak lefuttatása a chat_db adatbázison
mysql -u chat_user -p chat_db -e "SHOW TABLES;"  // ellenőrzés az új felhasználóval; a jelszót bekéri`
      }
    ],
    tip: 'Minden SQL-utasítás végére pontosvessző kell – ha lemarad, a `->` prompt azt jelzi, hogy még vár a folytatásra. A név és a jelszó szabadon választható, de jegyezd fel, mert a [config.php](#web-config) fájlba ugyanezt kell beírni. Ugyanez böngészőből: `http://{{IP}}/phpmyadmin` › Importálás › a `chat.sql` kiválasztása › Indítás. Újabb rendszeren a `mysql` helyett `mariadb` a parancs neve, ugyanúgy működik.'
  },
  {
    id: 'web-config',
    category: 'web',
    title: 'Az oldal bekötése az adatbázisba: config.php',
    desc: 'A weboldal egy beállítófájlból tudja, melyik adatbázishoz, milyen névvel és jelszóval csatlakozzon.',
    jog: 'root',
    blocks: [
      {
        label: 'root@szerver:~#',
        lang: 'bash',
        code: `
nano /var/www/html/sql/config.php  // a kapcsolat adatai – a változók nevei már benne vannak`
      },
      {
        label: 'Amit be kell írni',
        lang: 'table',
        head: ['Adat', 'Érték'],
        rows: [
          ['Szerver (host)', '`localhost`'],
          ['Felhasználó', '`chat_user`'],
          ['Jelszó', '`Jelszo123!`'],
          ['Adatbázis', '`chat_db`']
        ]
      },
      {
        label: 'Teszt böngészőből',
        lang: 'steps',
        code: `
Nyisd meg: \`http://{{IP}}/\` – a belépőoldalnak kell megjelennie
Regisztrálj egy fiókot, majd lépj be vele
Küldj egy üzenetet – ha megjelenik, az adatbázis-kapcsolat működik`
      }
    ],
    tip: 'A négy adatnak betűre egyeznie kell azzal, amit az [adatbázis](#adatbazis) létrehozásakor megadtál. Ha az oldal üres vagy adatbázishibát ír: elírás van a config.php-ban, vagy hiányzik a `php-mysql` csomag (telepítés után `systemctl restart apache2`).'
  },
  {
    id: 'joomla',
    category: 'web',
    title: 'Órai példa: Joomla telepítése',
    desc: 'Tartalomkezelő letöltése, kibontása a webmappába, és adatbázis készítése hozzá.',
    jog: 'root',
    blocks: [
      {
        label: 'root@szerver:~# – letöltés és kibontás',
        lang: 'bash',
        code: `
apt update
apt install -y wget unzip  // letöltő és kicsomagoló
apt install -y php php-cli php-fpm php-json php-common php-mysql php-zip php-gd php-mbstring php-curl php-xml php-pear php-bcmath  // a Joomlának kellő PHP-modulok
wget https://update.joomla.org/releases/6.1.3/Joomla_6.1.3-Stable-Full_Package.zip  // a telepítőcsomag letöltése
unzip Joomla_6.1.3-Stable-Full_Package.zip -d /var/www/html/joomla  // kibontás a joomla almappába
chown -R www-data:www-data /var/www/html/joomla  // hogy a webszerver írni tudja a fájljait
systemctl restart apache2  // az új PHP-modulok betöltése`
      },
      {
        label: 'root@szerver:~# – adatbázis',
        lang: 'bash',
        code: `
mysql -u root -p  // belépés; a -p jelszót kér`
      },
      {
        label: 'MariaDB [(none)]>',
        lang: 'sql',
        code: `
CREATE DATABASE joomladb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;  // adatbázis ékezet- és emojitámogatással
CREATE USER 'joomlauser'@'localhost' IDENTIFIED BY 'Passw0rd2026!';  // felhasználó jelszóval
GRANT ALL PRIVILEGES ON joomladb.* TO 'joomlauser'@'localhost';  // teljes hozzáférés a joomladb adatbázishoz
FLUSH PRIVILEGES;  // érvényesítés
EXIT;`
      },
      {
        label: 'Elérés böngészőből',
        lang: 'table',
        head: ['Felület', 'Cím'],
        rows: [
          ['Weboldal', '`http://{{IP}}/joomla`'],
          ['Adminfelület', '`http://{{IP}}/joomla/administrator`']
        ]
      }
    ]
  }
];
