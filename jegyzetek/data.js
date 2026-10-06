'use strict';

/* =========================================================================
 * Jegyzetek – data.js
 *
 * Itt van MINDEN jegyzet. Új jegyzethez csak ezt a fájlt kell szerkeszteni.
 *
 * Jegyzet felépítése:
 * {
 *   id:     egyedi azonosító (ez lesz a link: jegyzetek/#id)
 *   targy:  a TARGYAK egyik id-je
 *   cim:    a jegyzet címe
 *   leiras: egy-két mondat arról, mi van benne
 *   tema:   (opcionális) a gyakorló témája – ha van, megjelenik a „Gyakorold” gomb
 *   reszek: [{ cim, blokkok: [...] }]
 * }
 *
 * Blokkok (mindegyik egy tömb, az első elem a típus):
 *   ['p', 'szöveg']                       bekezdés
 *   ['ul', ['elem', ['elem', ['alpont', 'alpont']]]]   felsorolás (alpontokkal)
 *   ['ol', ['első', 'második']]           számozott lista
 *   ['key', 'szöveg']                     kiemelt „ezt jegyezd meg” doboz
 *   ['table', ['Fejléc', …], [['cella', …], …]]
 *   ['code', 'címke', `parancsok`]        kódblokk; a "!" vagy "#" kezdetű sor megjegyzés
 *
 * Szövegben: `parancs` kódként, **fontos** félkövéren jelenik meg.
 * ========================================================================= */

const TARGYAK = [
  { id: 'halozat', nev: 'Hálózatok II.' },
  { id: 'szerver', nev: 'Szerverek – Linux' },
  { id: 'hpiot',   nev: 'Hálózat programozása és IoT' },
  { id: 'ikt',     nev: 'IKT projektmunka II.' }
];

const JEGYZETEK = [

  /* =====================================================================
   * HÁLÓZATOK II.
   * ===================================================================== */
  {
    id: 'ospf-egyteruletu',
    targy: 'halozat',
    cim: 'Egyterületű OSPF',
    leiras: 'Hogyan működik az OSPF egyetlen területen: szomszédság, DR/BDR választás, költség, és a beállítás parancsai.',
    tema: 'ospf-egy',
    reszek: [
      {
        cim: 'Mi az OSPF?',
        blokkok: [
          ['ul', [
            '**Kapcsolatállapot-alapú** (link-state) forgalomirányító protokoll: minden router a terület teljes térképét ismeri, nem csak a szomszédok „pletykáit”.',
            'A legjobb utat a **Dijkstra-féle SPF** (Shortest Path First) algoritmus számolja ki.',
            'Metrikája a **költség** (cost), ami a sávszélességből számolódik.',
            'Adminisztratív távolsága **110**, osztály nélküli (a maszkot is hirdeti), nyílt szabvány.',
            'Közvetlenül IP fölött megy, protokollszáma **89**. Multicast címei: `224.0.0.5` (minden OSPF router) és `224.0.0.6` (DR és BDR).',
            'IPv4-hez az **OSPFv2**, IPv6-hoz az **OSPFv3** való.'
          ]],
          ['table', ['Adatbázis', 'Tábla', 'Mit tartalmaz', 'Parancs'], [
            ['Szomszédsági', 'szomszédtábla', 'kikkel van kétirányú kapcsolat', '`show ip ospf neighbor`'],
            ['Kapcsolatállapot (LSDB)', 'topológiatábla', 'a terület összes routere és linkje – a területen belül mindenkinél azonos', '`show ip ospf database`'],
            ['Továbbítási', 'irányítótábla', 'az SPF által kiszámolt legjobb utak', '`show ip route`']
          ]]
        ]
      },
      {
        cim: 'OSPF csomagtípusok',
        blokkok: [
          ['table', ['#', 'Név', 'Mire való'], [
            ['1', 'Hello', 'szomszédok felfedezése és életben tartása'],
            ['2', 'DBD (Database Description)', 'az LSDB tartalomjegyzéke, ezzel hasonlítják össze az adatbázisokat'],
            ['3', 'LSR (Link-State Request)', 'hiányzó bejegyzés elkérése'],
            ['4', 'LSU (Link-State Update)', 'válasz az LSR-re és változás hirdetése – ebben utaznak az LSA-k'],
            ['5', 'LSAck', 'az LSU nyugtázása']
          ]],
          ['key', 'Hello időzítők alapból Ethernet és pont-pont linken: **Hello 10 mp, Dead 40 mp** (a Dead a Hello négyszerese). Ha két szomszédnál nem egyezik, nem lesznek szomszédok.']
        ]
      },
      {
        cim: 'Szomszédsági állapotok',
        blokkok: [
          ['ol', [
            '**Down** – még nem jött Hello.',
            '**Init** – jött Hello, de a saját router ID-m még nincs benne.',
            '**Two-Way** – kétirányú a kapcsolat; többszörös hozzáférésű hálózaton itt van a DR/BDR választás.',
            '**ExStart** – eldől, ki kezdi az adatbáziscserét (a nagyobb router ID).',
            '**Exchange** – DBD csomagok cseréje.',
            '**Loading** – hiányzó adatok lekérése LSR/LSU csomagokkal.',
            '**Full** – az adatbázisok megegyeznek, kész a szomszédság.'
          ]],
          ['p', 'A `show ip ospf neighbor` kimenetében a jó állapot `FULL`, illetve két DROTHER között `2WAY`.']
        ]
      },
      {
        cim: 'Router ID és DR/BDR választás',
        blokkok: [
          ['p', 'A **router ID** egy 32 bites, IP-cím alakú azonosító. Így dől el:'],
          ['ol', [
            'a kézzel megadott `router-id` parancs,',
            'ha nincs: a legnagyobb **loopback** IP-cím,',
            'ha az sincs: a legnagyobb **aktív fizikai interfész** IP-címe.'
          ]],
          ['p', 'Többszörös hozzáférésű hálózaton (pl. Ethernet switch mögött több router) nem mindenki szinkronizál mindenkivel, hanem választanak egy **DR**-t (kijelölt router) és egy **BDR**-t (tartalék).'],
          ['ul', [
            'A legnagyobb **interfész-prioritás** nyer (alapérték 1, tartomány 0–255).',
            'Egyenlőség esetén a legnagyobb **router ID** dönt.',
            'A `0` prioritású router soha nem lehet DR vagy BDR.',
            'A választás **nem preemptív**: aki később jön, hiába jobb, nem veszi el a szerepet. Új választáshoz: `clear ip ospf process`.',
            'Pont-pont linken nincs DR/BDR.'
          ]]
        ]
      },
      {
        cim: 'Költség',
        blokkok: [
          ['key', 'Költség = referencia-sávszélesség / az interfész sávszélessége. A referencia alapból **100 Mbps**, ezért a FastEthernet, a Gigabit és a 10 Gigabit is **1**-es költségű – ezt illik átállítani.'],
          ['table', ['Interfész', 'Költség (alap referencia)'], [
            ['10 Gigabit Ethernet', '1'],
            ['Gigabit Ethernet', '1'],
            ['Fast Ethernet (100 Mbps)', '1'],
            ['Ethernet (10 Mbps)', '10'],
            ['Soros 1,544 Mbps (T1)', '64']
          ]],
          ['p', 'Egy útvonal költsége a kimenő interfészek költségeinek összege. A kisebb a jobb.']
        ]
      },
      {
        cim: 'Beállítás',
        blokkok: [
          ['code', 'R1(config)#', `router ospf 10
 router-id 1.1.1.1
 network 192.168.1.0 0.0.0.255 area 0
 network 10.0.0.0 0.0.0.3 area 0
 passive-interface gigabitEthernet 0/0
 auto-cost reference-bandwidth 1000
 default-information originate
! a folyamat száma (10) csak helyi, a szomszédnál lehet más`],
          ['code', 'R1(config-if)# – interfészen', `ip ospf 10 area 0
ip ospf cost 15
ip ospf priority 255
ip ospf hello-interval 5
ip ospf dead-interval 20`],
          ['ul', [
            'A `network` parancsban **wildcard maszk** kell: 255.255.255.255 mínusz az alhálózati maszk.',
            'A `passive-interface` a LAN felé leállítja a Hello küldést, de a hálózatot továbbra is hirdeti.',
            'A `default-information originate` csak akkor hirdet alapértelmezett utat, ha a routeren van is ilyen (`ip route 0.0.0.0 0.0.0.0 …`).',
            'Az `auto-cost reference-bandwidth` értékét **minden** routeren ugyanarra kell állítani.'
          ]]
        ]
      },
      {
        cim: 'Ellenőrzés',
        blokkok: [
          ['table', ['Parancs', 'Mit mutat'], [
            ['`show ip ospf neighbor`', 'szomszédok, állapotuk (FULL/DR, FULL/BDR, 2WAY/DROTHER), Dead időzítő'],
            ['`show ip protocols`', 'folyamatazonosító, router ID, hirdetett hálózatok, passzív interfészek'],
            ['`show ip ospf`', 'router ID, területek, SPF futások száma'],
            ['`show ip ospf interface`', 'terület, költség, prioritás, DR/BDR, Hello/Dead időzítők'],
            ['`show ip ospf interface brief`', 'az OSPF-es interfészek rövid listája'],
            ['`show ip route ospf`', 'csak az OSPF-ből tanult útvonalak (O jelzés)']
          ]],
          ['key', 'Ha nincs szomszédság, ezeket nézd: azonos alhálózat és maszk, azonos terület, azonos Hello/Dead időzítő, nem passzív az interfész, nem ütközik a router ID, egyezik a hitelesítés.']
        ]
      }
    ]
  },

  {
    id: 'ospf-tobbteruletu',
    targy: 'halozat',
    cim: 'Többterületű OSPF',
    leiras: 'Miért bontjuk területekre a hálózatot, milyen routertípusok és LSA-k vannak, és hogyan kell beállítani.',
    tema: 'ospf-tobb',
    reszek: [
      {
        cim: 'Miért kell több terület?',
        blokkok: [
          ['p', 'Egyetlen terület kis hálózatnál jó. Ha túl nagyra nő, három gond jön elő:'],
          ['ul', [
            '**nagy irányítótábla** – az OSPF magától nem von össze útvonalakat,',
            '**nagy kapcsolatállapot-adatbázis** (LSDB),',
            '**gyakori SPF-újraszámítás** – minden változásra mindenki újraszámol.'
          ]],
          ['p', 'Megoldás: a hálózatot **területekre** (area) bontjuk. Egy terület azon routerek csoportja, amelyek LSDB-je megegyezik.'],
          ['key', 'A több terület három előnye: **kisebb irányítótáblák** (a területek határán összevonhatók a címek), **kevesebb LSA-forgalom**, **ritkább SPF-számítás** (a változás hatása a területen belül marad).']
        ]
      },
      {
        cim: 'Kétszintű hierarchia',
        blokkok: [
          ['ul', [
            ['**Gerinchálózati (tranzit) terület – area 0**', [
              'feladata a csomagok gyors továbbítása a területek között,',
              'minden más területnek **közvetlenül ehhez kell kapcsolódnia**,',
              'végfelhasználók jellemzően nincsenek benne.'
            ]],
            ['**Normál (nem gerinc) terület**', [
              'a felhasználókat és az erőforrásokat köti össze,',
              'általában szervezeti vagy földrajzi egységenként alakítják ki,',
              'altípusai: szabványos, elzárt (stub), teljesen elzárt (totally stubby), részben elzárt (NSSA).'
            ]]
          ]],
          ['p', 'Két normál terület közti forgalom (**interarea** forgalom) mindig átmegy a 0-s területen.'],
          ['table', ['Cisco ajánlás', 'Érték'], [
            ['Routerek száma egy területen', 'legfeljebb 50'],
            ['Egy router hány területhez tartozzon', 'legfeljebb 3'],
            ['Szomszédok száma routerenként', 'legfeljebb 60']
          ]]
        ]
      },
      {
        cim: 'Routertípusok',
        blokkok: [
          ['table', ['Típus', 'Mitől az'], [
            ['Belső router', 'minden interfésze ugyanabban a területben van'],
            ['Gerinchálózati router', 'van interfésze a 0-s területben'],
            ['**ABR** (területi határrouter)', 'interfészei különböző területekhez tartoznak'],
            ['**ASBR** (autonóm rendszer határroutere)', 'legalább egy interfésze külső hálózatra (más AS-re, más routing protokollra) néz']
          ]],
          ['p', 'Egy router egyszerre több típus is lehet, például gerinchálózati router és ABR.']
        ]
      },
      {
        cim: 'LSA-típusok',
        blokkok: [
          ['p', 'Az LSA-k az LSDB „rekordjai”: külön-külön egy-egy részletet írnak le, együtt a teljes topológiát. A többterületű OSPF-nek az első ötöt kell ismernie.'],
          ['table', ['Típus', 'Név', 'Ki küldi', 'Meddig jut', 'Mit hirdet'], [
            ['1', 'Router LSA', 'minden router', 'csak a saját területén belül', 'a router közvetlen linkjeit; azonosítója a küldő router ID-je'],
            ['2', 'Network LSA', 'a DR', 'csak a saját területén belül', 'egy többszörös hozzáférésű hálózat routereit; azonosítója a DR interfészének IP-címe'],
            ['3', 'Summary LSA', 'az ABR', 'másik területbe', 'más területek hálózatait; azonosítója a hálózat címe'],
            ['4', 'ASBR Summary LSA', 'az ABR', 'másik területbe', 'hol van az ASBR és hogyan érhető el; azonosítója az ASBR router ID-je'],
            ['5', 'External LSA', 'az ASBR', 'az egész autonóm rendszerben', 'az OSPF-en kívüli (külső) hálózatokat; azonosítója a külső hálózat címe']
          ]],
          ['ul', [
            '2-es típus csak ott van, ahol DR is van (többszörös hozzáférésű és NBMA hálózat).',
            '3-as típusú LSA érkezésekor a router **nem futtat teljes SPF-et**, csak beírja vagy törli az útvonalat.',
            '4-es típus csak akkor keletkezik, ha van ASBR a területen.',
            'Sok 3-as és 5-ös LSA elárasztást okoz, ezért az ABR-en és az ASBR-en kézi **útvonal-összevonás** ajánlott.'
          ]]
        ]
      },
      {
        cim: 'Útvonalak az irányítótáblában',
        blokkok: [
          ['table', ['Jelzés', 'Jelentés', 'Honnan'], [
            ['`O`', 'területen belüli (intra-area) útvonal', '1-es és 2-es LSA'],
            ['`O IA`', 'területek közötti (interarea) útvonal', '3-as LSA'],
            ['`O E1` / `O E2`', 'külső útvonal (1-es vagy 2-es típusú)', '5-ös LSA']
          ]],
          ['p', 'A legjobb utak számítási sorrendje:'],
          ['ol', [
            'a saját területen belüli célok,',
            'a többi terület hálózatai,',
            'a külső autonóm rendszerek hálózatai (az elzárt területek routerei ezt kihagyják).'
          ]]
        ]
      },
      {
        cim: 'Beállítás és útvonal-összevonás',
        blokkok: [
          ['p', 'A megvalósítás négy lépése: követelmények összegyűjtése → paraméterek (címzés, területek, topológia) megadása → beállítás → ellenőrzés.'],
          ['p', 'Külön parancs nincs a többterületű OSPF-hez: attól lesz egy router ABR, hogy a `network` soraiban több terület szerepel.'],
          ['code', 'R1(config)# – ABR az 1-es és a 0-s terület között', `router ospf 10
 router-id 1.1.1.1
 network 10.1.1.0 0.0.0.255 area 1
 network 10.1.2.0 0.0.0.255 area 1
 network 192.168.10.0 0.0.0.3 area 0
! összevonás: az 1-es terület hálózatait egy sorban hirdeti a gerinc felé
 area 1 range 10.1.0.0 255.255.252.0`],
          ['ul', [
            'Útvonal-összevonás **csak ABR-en és ASBR-en** állítható be, és mindig kézzel – az OSPF nem von össze automatikusan.',
            'Területek közötti összevonás az ABR-en: `area terület range cím maszk` (itt **alhálózati maszk** kell, nem wildcard).',
            'Külső útvonalakat az ASBR von össze (5-ös LSA).',
            'Az összevont útvonal akkor jelenik meg, ha legalább egy alhálózat beleesik a tartományba; metrikája a tartományba eső alhálózatok **legkisebb** költsége.'
          ]]
        ]
      },
      {
        cim: 'Ellenőrzés',
        blokkok: [
          ['table', ['Parancs', 'Mire jó'], [
            ['`show ip protocols`', 'hány területben van a router, mely hálózatokat hirdeti'],
            ['`show ip ospf interface brief`', 'melyik interfész melyik területben van, költség, állapot'],
            ['`show ip route ospf`', '`O`, `O IA`, `O E1/E2` útvonalak – a leggyakrabban használt ellenőrzés'],
            ['`show ip ospf database`', 'az LSDB tartalma LSA-típusonként'],
            ['`show ip ospf neighbor`', 'szomszédságok – ugyanaz, mint egy területnél']
          ]],
          ['p', 'OSPFv3-nál ugyanezek `ipv6` szóval: `show ipv6 protocols`, `show ipv6 ospf interface brief`, `show ipv6 route ospf`, `show ipv6 ospf database`.']
        ]
      }
    ]
  },

  /* =====================================================================
   * SZERVEREK – LINUX
   * ===================================================================== */
  {
    id: 'linux-tortenet',
    targy: 'szerver',
    cim: 'Linux 1. – A Linux története',
    leiras: 'Honnan jön a Linux: UNIX, GNU, Minix, Torvalds – és a licencek, jogviták, védjegy.',
    tema: 'linux-tortenet',
    reszek: [
      {
        cim: 'Hálózati operációs rendszerek',
        blokkok: [
          ['p', 'Két fő irány van: a **Microsoft Windows** alapú és a **Unix/Linux** alapú kiszolgálók. Mindenhol ott vannak a szuperszámítógépektől (tudományos, katonai cél) a nagy- és kisvállalati szervereken át az otthoni mikroszerverekig.'],
          ['key', 'A világ legnagyobb szuperszámítógépeinek (TOP500) operációs rendszere gyakorlatilag kizárólag Linux.']
        ]
      },
      {
        cim: 'Mit jelent a „Linux” név?',
        blokkok: [
          ['ul', [
            'Szigorúan véve a Linux **csak a rendszermag (kernel)**, nem a teljes operációs rendszer.',
            'A kernelt **Linus Torvalds** kezdte fejleszteni **1991**-ben.',
            'A kernel a **GNU projekt** alapprogramjaira épül (pl. `ls`, `echo`, libc), ezért a pontos név **GNU/Linux**.',
            'A köznyelv a teljes rendszert is Linuxnak hívja, a disztribúció nevével együtt (pl. „SuSE Linux”).',
            'A Debian használja a GNU/Linux nevet, a SuSE nem. Torvalds szerint a Linux nem GNU projekt.'
          ]],
          ['p', 'A **disztribúció** olyan összeállítás, amely a Linux kernelt és az alaprendszert használja, a sajátosságát pedig az ezen felül válogatott és testre szabott programok adják. Több száz létezik.']
        ]
      },
      {
        cim: 'Előzmények: a 80-as évek',
        blokkok: [
          ['table', ['Rendszer', 'Jellemző'], [
            ['MS-DOS', 'zárt forráskódú; az IBM PC-kkel árasztotta el a világot'],
            ['Mac OS', 'zárt; a Macintosh jobb gép volt, de drága, és kevés perifériája volt'],
            ['UNIX', 'jó tulajdonságok, de drága, nagygépekre tervezték, zárt forráskód – főleg intézmények, kutatóközpontok használták']
          ]]
        ]
      },
      {
        cim: 'GNU és Minix',
        blokkok: [
          ['ul', [
            ['**GNU projekt** – Richard M. Stallman (RMS), **1983**', [
              'szabad szoftveres mozgalom: szabadon felhasználható, minőségi programok készítése és terjesztése,',
              'saját kernele a **GNU/Hurd** lett volna, de máig nem készült el.'
            ]],
            ['**Minix** – Andrew S. Tanenbaum, **1987**', [
              'Hollandiában élő amerikai professzor írta, **oktatási céllal**, a nulláról,',
              'Intel 8086 processzorra készült,',
              'kb. 12 000 sor, és a **forráskódja nyílt** volt (a könyvével együtt lehetett megkapni),',
              'ez volt az első eset, hogy bárki elolvashatta egy működő operációs rendszer forrását.'
            ]]
          ]],
          ['p', 'A Minix körül kialakult levelezőlisták egyik olvasója volt Linus Torvalds, svéd anyanyelvű finn egyetemista.']
        ]
      },
      {
        cim: 'Licencek',
        blokkok: [
          ['table', ['Licenc', 'Mire vonatkozik', 'Lényege'], [
            ['**GPL** (GNU General Public License)', 'a Linux kernel és a legtöbb GNU program', 'aki terjeszti, köteles a forráskódot (és a módosításait) elérhetővé tenni, hogy bárki megnézhesse, módosíthassa és ugyanilyen feltételekkel továbbadhassa'],
            ['**LGPL** (Lesser GPL)', 'sok programkönyvtár (lib)', 'engedékenyebb a GPL-nél'],
            ['**MIT**', 'X Window System', 'nagyon megengedő']
          ]],
          ['ul', [
            'A kernel **GPL v2** alatt maradt, nem váltott v3-ra: a v3-mal nem lehetne másolásvédett környezetben használni, és több ezer fejlesztő hozzájárulása kellene.',
            'Torvalds 1997-ben: a GPL alá helyezés volt a legjobb döntése.',
            'Méretek: a Red Hat 7.1 (2001) kb. 30 millió kódsor, ebből a kernel csak 8% (2,4 millió). A kernel 2020-ban kb. 27,8 millió sor.'
          ]]
        ]
      },
      {
        cim: 'Jogviták és védjegy',
        blokkok: [
          ['ul', [
            'Az **SCO** (UNIX-szállító) beperelte az **IBM**-et, mondván, UNIX-ból származó kód került a Linux kernelbe.',
            'A **Novell** megtámadta az SCO-t a UNIX jogai miatt, és az SCO **elveszítette** a pert – így az IBM elleni keresetnek sem maradt alapja.',
            'A bizonytalan jogi helyzet miatt jött létre az **OSRM** (Open Source Risk Management): nyílt forrású fejlesztők és felhasználók jogi védelme.',
            'A „Linux” név eleinte nem volt védve. **1994**-ben William R. Della Croce Jr. a saját nevére jegyeztette be, és jogdíjat követelt.',
            'Torvalds és több szervezet fellépett ellene; **1997**-ben nyertek. Azóta a védjegy Torvaldsé, az ügyeket a **Linux Mark Institute (LMI)** intézi.'
          ]]
        ]
      }
    ]
  },

  {
    id: 'linux-jellemzok',
    targy: 'szerver',
    cim: 'Linux 2. – A Linux jellemzői',
    leiras: 'Ki fejleszti a kernelt, mi a kooperatív és a preemptív multitaszk, és hogyan dönt az ütemező.',
    tema: 'linux-jellemzok',
    reszek: [
      {
        cim: 'Öt alaptulajdonság',
        blokkok: [
          ['key', 'A GNU/Linux **nyílt forrású**, **többfeladatos**, **többfelhasználós**, **multiplatformos** és **hálózati** operációs rendszer.']
        ]
      },
      {
        cim: 'Ki fejleszti?',
        blokkok: [
          ['ul', [
            'A kernelt önkéntes csapat fejleszti **Linus Torvalds irányítása alatt** – amit nem így fejlesztenek, nem kerül a kernelbe.',
            'A disztribúciókat hasonló felépítésű, másik csapatok készítik, saját vezetővel.',
            ['Tévhit, hogy főleg éjszakázó egyetemisták írják. A valóság:', [
              'a fejlesztők túlnyomó többsége **fizetésért, munkaidőben**, informatikai nagyvállalatoknál dolgozik rajta,',
              'egy LWN.net felmérés szerint (2.6.19 → 2.6.20) 741 fejlesztő dolgozott egy kiadáson, és az otthoni, hobbi fejlesztők aránya csak kb. 7–11% volt.'
            ]],
            'Élen járó cégek a felmérésben: **Red Hat**, IBM, Novell, Linux Foundation, Intel, Oracle, Google.'
          ]]
        ]
      },
      {
        cim: 'Többfeladatos működés',
        blokkok: [
          ['p', 'Ahány végrehajtó (mag vagy szál) van, annyi feladat futhat valóban egyszerre. Ha több a feladat, **időosztással** kell hozzáférniük a processzorhoz.'],
          ['table', ['', 'Kooperatív', 'Preemptív'], [
            ['Ki dönt a váltásról?', 'maga a feladat: önként lemond (yielding) és újra sorba áll', 'az **ütemező**: a kiosztott idő (**timeslice**) leteltével elveszi a processzort'],
            ['Gyenge pontja', 'egy rosszul megírt vagy végtelen ciklusba került program az egész magot lefoglalja', 'bonyolultabb megvalósítás'],
            ['Példa', 'Mac OS 9 és elődei', 'Linux, Windows, UNIX, modern macOS']
          ]],
          ['p', 'PC-n a 386-os processzor óta lehet Linuxot és UNIX-ot futtatni, mert az elődök nem voltak képesek preemptív működésre.']
        ]
      },
      {
        cim: 'Az ütemező irányelve',
        blokkok: [
          ['p', 'Azt a szabályrendszert, ami szerint az ütemező sorba állítja a folyamatokat, **ütemezési irányelvnek** (scheduler policy) hívjuk. Két ellentétes célt kell egyensúlyozni: **gyors válaszidő** (low latency) és **nagy áteresztőképesség**.'],
          ['table', ['Folyamattípus', 'Jellemző', 'Hogyan kezeli az ütemező'], [
            ['**I/O-függő**', 'kevés számítás, sok várakozás (lemez, billentyűzet, képernyő)', 'előre sorolja: gyakran fut, de rövid ideig – ettől lesz jó a rendszer reakcióideje'],
            ['**Processzorfüggő**', 'sok számítás, folyamatosan le tudná foglalni a processzort', 'hátrébb sorolja: ritkábban fut, de hosszabb időszeletet kap']
          ]],
          ['p', 'A Linux az I/O-függő folyamatoknak kedvez, de a processzorfüggőket sem hanyagolja el. A 2.5 → 2.6 váltáskor (2003 körül) az ütemezőt jelentősen átírták – ez **Molnár Ingo** magyar fejlesztő munkája.']
        ]
      },
      {
        cim: 'Prioritások',
        blokkok: [
          ['ul', [
            'A magasabb prioritású folyamat hamarabb fut; az azonos szinten lévők **round-robin** elv szerint, körbe forogva.',
            'Linuxon a listán előrébb lévők nemcsak hamarabb, hanem **hosszabb időszeletet** is kapnak.',
            '**Dinamikus prioritás**: a kezdeti értéket az ütemező menet közben növelheti vagy csökkentheti, követve, hogy mit csinál éppen a folyamat.',
            'A prioritást a rendszer és a felhasználó is állíthatja.'
          ]],
          ['table', ['Tartomány', 'Értékek', 'Tudnivaló'], [
            ['**nice**', '−20 … +19, alapérték 0', 'a **nagyobb** érték **alacsonyabb** prioritást jelent; UNIX-szabvány'],
            ['**valós idejű**', '0 … 99', 'a valós idejű feladatok megelőzik a normál folyamatokat; a POSIX szabvány szerint készült']
          ]],
          ['code', 'Linux terminál', `# program indítása alacsonyabb prioritással
nice -n 10 ./mentes.sh
# futó folyamat prioritásának átállítása (PID alapján)
renice -n 5 -p 1234`]
        ]
      }
    ]
  },

  {
    id: 'linux-felepites',
    targy: 'szerver',
    cim: 'Linux 3. – Alkalmazása és felépítése',
    leiras: 'Hol használnak Linuxot, miből áll egy disztribúció, és mi van a kernelben.',
    tema: 'linux-felepites',
    reszek: [
      {
        cim: 'Célterületek',
        blokkok: [
          ['ul', [
            'Eredetileg a **386-os processzor védett módjának** tanulmányozására készült.',
            'A közösség elsősorban **kiszolgálókra** (webszerverekre) szánta.',
            'Rengeteg architektúrára átültették (portolták): x86, x86-64, ARM, PowerPC, MIPS, SPARC, Alpha és sok más.',
            '32 és 64 biten is **natívan** fut, nem emulálva.',
            '386-osnál régebbi Intel gépeken nem fut, de a belőle származó **ELKS** kernel igen (16 bites 8086 és 80286).'
          ]],
          ['p', 'A disztribúciók lehetnek általános célúak vagy egy célra kihegyezettek: stabilitás, biztonság, egy adott nyelv vagy régió, valós idejű működés, csak szabad szoftver. Speciális felhasználások: **adatmentés**, hibakeresés, **rendszer-helyreállítás**, partíciókezelés (parted, gparted), biztonsági tesztelés (Kali Linux).']
        ]
      },
      {
        cim: 'Asztali Linux',
        blokkok: [
          ['ul', [
            'Legelterjedtebb grafikus környezetek: **GNOME**, **KDE**, **Cinnamon**.',
            'A legtöbb igényre van megoldás: natív Linuxos változat, hasonló tudású szabad program (Firefox, LibreOffice, GIMP, Pidgin), vagy a windowsos program futtatása **Wine** (ingyenes) vagy CrossOver (üzleti) alatt.',
            'Kevés a profi kiadványszerkesztő és hangszerkesztő – ezeket nem portolták.',
            'A programok a disztribúció **csomagtárolójából** telepíthetők: ellenőrzöttek, teszteltek, az adott disztróra optimalizáltak és **digitálisan aláírtak**.',
            'A közösségi fordítás miatt több nyelven érhető el, mint a kereskedelmi szoftverek.'
          ]],
          ['p', 'Hogy mégsem mindenki ezt használja: a kezelése sokszor eltér a megszokott kereskedelmi rendszerekétől, és néhány program nem vagy csak nehézkesen érhető el rá.']
        ]
      },
      {
        cim: 'Szerver, beágyazott és különleges felhasználás',
        blokkok: [
          ['ul', [
            '**Szerveren** a stabilitása és a hosszú üzemideje miatt népszerű, és mert szerverre többnyire nem kell grafikus felület.',
            'Erre épül a **LAMP**: **L**inux, **A**pache, **M**ySQL, **P**erl/PHP/Python – nagyon sok webes rendszer alapja.',
            '**Beágyazott eszközökön** azért éri meg, mert olcsó és könnyen módosítható: router, tűzfal, NAS, telefon, óra, set-top-box.',
            '**Filmipar**: a Titanic (1997) óta; 2009-re a nagy stúdiók (DreamWorks, Pixar) kb. 95%-ban átálltak.',
            '**Közigazgatás, katonaság**: Brazília, Oroszország (saját katonai disztribúció), India, Franciaország, Németország.'
          ]]
        ]
      },
      {
        cim: 'Egy disztribúció részei',
        blokkok: [
          ['table', ['Réteg', 'Feladata'], [
            ['**Rendszermag (kernel)**', 'adattárolás, folyamatkezelés, memória- és erőforrás-kezelés, hálózati forgalom; megakadályozza a közvetlen hardverhozzáférést és elkülöníti a felhasználókat'],
            ['**Alaprendszer** (rendszerprogramok)', 'a kernel szolgáltatásait **rendszerhívásokon** keresztül használják; az operációs rendszertől elvárt funkciókat adják (pl. `mount`)'],
            ['**Alkalmazások**', 'egy-egy célfeladatot oldanak meg (pl. szövegszerkesztő)'],
            ['Kiegészítők', 'fordítók, programkönyvtárak, dokumentáció']
          ]]
        ]
      },
      {
        cim: 'Mi van a kernelben?',
        blokkok: [
          ['ul', [
            '**Folyamatkezelés** – létrehozza a folyamatokat, és az aktív folyamat váltogatásával megvalósítja a többfeladatos működést.',
            '**Memóriakezelés** – a memóriát és a swap területet osztja szét a folyamatok, a kernel részei és a gyorsítótárak között.',
            '**Eszközvezérlők (driverek)** – nagyon sok van belőlük; a hasonló hardverek driverei csoportokba sorolhatók, és a kernel többi része felé egységesen viselkednek.',
            '**Fájlrendszer-vezérlők** – egységes felületük a **Virtual File System (VFS)**.',
            '**Hálózatkezelés** – a programok felé a **BSD socket** felületen keresztül.'
          ]],
          ['key', 'A két legfontosabb rész a **folyamatkezelés** és a **memóriakezelés** – ezek nélkül semmi sem megy.']
        ]
      },
      {
        cim: 'Kerneltípusok',
        blokkok: [
          ['table', ['Típus', 'Példa'], [
            ['Monolitikus (makrokernel)', 'klasszikus UNIX-ok'],
            ['**Moduláris monolitikus**', '**Linux**'],
            ['Hibrid', 'Windows NT'],
            ['Mikrokernel', 'Minix'],
            ['Exokernel', 'kutatási rendszerek']
          ]],
          ['p', 'A Linux kernel **moduláris monolitikus**: a felhasználói mód felől egységes és védett, de egyes részei (modulok) működés közben betölthetők és eltávolíthatók. Így csak az a driver foglal memóriát, amelyikre tényleg szükség van.'],
          ['code', 'Linux terminál', `# betöltött modulok listája
lsmod
# modul betöltése és eltávolítása
modprobe modulnév
modprobe -r modulnév`]
        ]
      }
    ]
  }
];
