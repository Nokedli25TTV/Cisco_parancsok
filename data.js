'use strict';

/* =========================================================================
 * Packet Tracer parancstár – data.js
 *
 * Itt van MINDEN tartalom. Új parancs felvételéhez csak ezt a fájlt kell
 * szerkeszteni, az app.js-hez nem kell nyúlni.
 *
 * Kártya felépítése:
 * {
 *   id:       egyedi azonosító
 *   category: a CATEGORIES egyik id-je
 *   title:    kártya címe
 *   desc:     rövid leírás
 *   blocks:   [{ label, lang, code }]
 *   tip:      (opcionális) vizsgatipp, `backtick` között parancs formázással
 * }
 *
 * lang:
 *   'ios'    Cisco CLI – '!' kezdetű sor megjegyzés (az IOS átugorja)
 *   'pc'     PC Command Prompt – '#' kezdetű sor megjegyzés
 *   'gui'    grafikus lépések: "Menü > Almenü", "Mező: érték"
 *            (egy sorban több mező két szóközzel elválasztva)
 *   'python' MCU/SBC kód (itt nincs soronkénti magyarázat)
 *
 * SORONKÉNTI MAGYARÁZAT (ios / pc / gui):
 *   parancs  // magyarázat
 *   A " // " utáni rész csak megjelenik, a másolásba NEM kerül bele.
 * ========================================================================= */

const CATEGORIES = [
  { id: 'all',        label: 'Mind',        prompt: 'PT#' },
  { id: 'alapok',     label: 'Alapok',      prompt: 'R1#' },
  { id: 'switching',  label: 'Switching',   prompt: 'S1(config)#' },
  { id: 'redundancia',label: 'Redundancia', prompt: 'S1(config-if-range)#' },
  { id: 'routing',    label: 'Routing',     prompt: 'R1(config-router)#' },
  { id: 'ipv6',       label: 'IPv6',        prompt: 'R1(config-if)#' },
  { id: 'services',   label: 'Services',    prompt: 'Server>' },
  { id: 'security',   label: 'Security',    prompt: 'R1(config-line)#' },
  { id: 'wan',        label: 'WAN és VPN',  prompt: 'R1(config-crypto-map)#' },
  { id: 'wireless',   label: 'Wireless',    prompt: 'AP>' },
  { id: 'iot',        label: 'IoT',         prompt: 'MCU>' }
];

const COMMANDS = [

  /* =====================================================================
   * ALAPOK
   * ===================================================================== */
  {
    id: 'cli-modes',
    category: 'alapok',
    title: 'CLI módok és billentyűk',
    desc: 'Mozgás a módok között és a parancssor gyorsbillentyűi.',
    blocks: [
      {
        label: 'Router>',
        lang: 'ios',
        code: `
enable  // felhasználói (>) → privilegizált mód (#)
configure terminal  // → globális konfigurációs mód (config)#
interface gigabitEthernet 0/0  // → interfész mód (config-if)#
exit  // egy szinttel vissza
end  // vissza privilegizált módba
disable  // vissza felhasználói módba`
      },
      {
        label: 'Billentyűk',
        lang: 'gui',
        code: `
Tab: parancs kiegészítése
?: súgó, lehetséges folytatások
Ctrl+Z: azonnal vissza privilegizált módba
Ctrl+Shift+6: ping / traceroute megszakítása
Ctrl+A / Ctrl+E: ugrás a sor elejére / végére
Fel nyíl: korábbi parancsok`
      }
    ],
    tip: 'Elég a rövidítés, ha egyértelmű: `conf t`, `int g0/0`, `sh ip int br`, `no shut`. Konfigurációs módból a `do` előtaggal futtatható bármely show parancs.'
  },
  {
    id: 'basic-setup',
    category: 'alapok',
    title: 'Alap eszközbeállítás',
    desc: 'Név, banner, konzolbeállítás és mentés – szinte minden feladat eleje.',
    blocks: [{
      label: 'Router>',
      lang: 'ios',
      code: `
enable  // privilegizált mód
configure terminal  // globális konfigurációs mód
hostname R1  // eszköz neve
no ip domain-lookup  // elgépelt parancs ne induljon DNS-keresésre
banner motd #Csak engedelyezett hozzaferes!#  // napi üzenet belépéskor
line console 0  // konzol vonal
 logging synchronous  // naplóüzenet nem szakítja meg a gépelést
 exec-timeout 5 0  // kiléptetés 5 perc tétlenség után
exit
end
copy running-config startup-config  // mentés NVRAM-ba`
    }],
    tip: 'Mentésnél a „Destination filename” kérdésre Enter. Rövidebben: `write memory` vagy `wr`. Belépés előtti üzenet: `banner login #szöveg#` (PT switch-en csak a motd érhető el).'
  },
  {
    id: 'show-cmds',
    category: 'alapok',
    title: 'Ellenőrző show parancsok',
    desc: 'A leggyakoribb állapotlekérdezések privilegizált módban.',
    blocks: [{
      label: 'R1#',
      lang: 'ios',
      code: `
show running-config  // futó konfiguráció (RAM)
show startup-config  // mentett konfiguráció (NVRAM)
show ip interface brief  // interfészek, IP-címek, állapot röviden
show interfaces gigabitEthernet 0/0  // részletes interfészadatok, hibák
show ip route  // irányítótábla
show vlan brief  // VLAN-ok és portjaik
show mac address-table  // switch MAC-címtáblája
show arp  // IP–MAC összerendelések
show version  // IOS verzió, uptime, config-register
show flash:  // flash tartalma (IOS image)
show clock  // rendszeridő
show controllers serial 0/0/0  // soros kábelvég (DCE/DTE), clock rate
show running-config | include hostname  // csak a találó sorok
show running-config | begin interface  // kiírás az első találattól`
    }],
    tip: 'Konfigurációs módból: `do show ip interface brief`. Állapotok: `up/up` jó, `administratively down` = nincs `no shutdown`, `up/down` = 2. rétegbeli hiba (pl. hiányzó clock rate).'
  },
  {
    id: 'save-erase',
    category: 'alapok',
    title: 'Konfiguráció mentése és törlése',
    desc: 'Mentés, gyári állapot visszaállítása és újraindítás.',
    blocks: [{
      label: 'R1#',
      lang: 'ios',
      code: `
copy running-config startup-config  // futó konfig mentése
write memory  // ugyanez röviden (wr)
erase startup-config  // mentett konfig törlése
delete flash:vlan.dat  // VLAN-adatbázis törlése (switch)
reload  // újraindítás`
    }],
    tip: 'Switch teljes nullázása: `erase startup-config` + `delete flash:vlan.dat` + `reload`. Újraindításkor a „Save?” kérdésre `no`, különben visszamented a régit.'
  },
  {
    id: 'pc-cmds',
    category: 'alapok',
    title: 'PC parancssor',
    desc: 'Kliensoldali tesztelés a PC Desktop › Command Prompt ablakában.',
    blocks: [{
      label: 'PC › Command Prompt',
      lang: 'pc',
      code: `
ipconfig  // IP-cím, maszk, átjáró
ipconfig /all  // részletek: MAC, DNS, DHCP szerver
ipconfig /release  // DHCP cím elengedése
ipconfig /renew  // új DHCP cím kérése
ipv6config  // IPv6 címek
ping 192.168.1.1  // elérhetőség tesztje
tracert 192.168.2.10  // útvonal követése
arp -a  // ARP gyorsítótár
nslookup www.pelda.hu  // DNS feloldás tesztje
telnet 192.168.1.1  // Telnet kapcsolat
ssh -l admin 192.168.1.1  // SSH kapcsolat felhasználónévvel`
    }],
    tip: 'A PC-n `tracert`, a routeren `traceroute`. Az első ping gyakran elveszik (ARP), ez nem hiba.'
  },
  {
    id: 'discovery',
    category: 'alapok',
    title: 'Szomszédok felderítése (CDP, LLDP)',
    desc: 'Közvetlenül csatlakozó eszközök listázása, és a protokollok tiltása.',
    blocks: [
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show cdp neighbors  // közvetlen Cisco szomszédok
show cdp neighbors detail  // részletek: IP-cím, IOS, port
show lldp neighbors  // LLDP szomszédok`
      },
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
lldp run  // LLDP bekapcsolása (szabványos, alapból ki van)
no cdp run  // CDP kikapcsolása az egész eszközön
interface gigabitEthernet 0/1
 no cdp enable  // CDP tiltása egy porton
exit`
      }
    ],
    tip: 'Biztonsági okból a külső (ISP felé néző) porton érdemes a CDP-t tiltani.'
  },
  {
    id: 'ios-image',
    category: 'alapok',
    title: 'IOS image és licenc',
    desc: 'Rendszerkép mentése, betöltése, a boot forrás megadása és a security licenc.',
    blocks: [
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show flash:  // image fájl neve és mérete
copy flash: tftp:  // IOS mentése TFTP szerverre
copy tftp: flash:  // IOS letöltése a flash-be
show license  // aktív licencek`
      },
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
boot system flash:c1900-universalk9-mz.SPA.151-4.M4.bin  // melyik image-ből induljon
license boot module c1900 technology-package securityk9  // security csomag (VPN, ZPF)
end
copy running-config startup-config
reload  // a licenc újraindítás után él`
      }
    ],
    tip: 'A modulnév típusfüggő: 1941 → `c1900`, 2911 → `c2900`. Ellenőrzés: `show version` alján a Technology Package tábla.'
  },
  {
    id: 'password-recovery',
    category: 'alapok',
    title: 'Elfelejtett jelszó (router)',
    desc: 'Belépés a konfiguráció betöltése nélkül, majd új jelszó beállítása.',
    blocks: [
      {
        label: 'Előkészítés',
        lang: 'gui',
        code: `
Router ki- és bekapcsolása > indulás közben Ctrl+C (Break)
# Megjelenik: rommon 1 >`
      },
      {
        label: 'rommon 1 >',
        lang: 'ios',
        code: `
confreg 0x2142  // indulás a startup-config betöltése nélkül
reset  // újraindítás`
      },
      {
        label: 'Router# (a setup kérdésre: no)',
        lang: 'ios',
        code: `
copy startup-config running-config  // régi konfig betöltése
configure terminal
enable secret UjJelszo123  // új jelszó
config-register 0x2102  // következő indulás újra normál módon
end
copy running-config startup-config  // mentés
reload`
      }
    ],
    tip: 'Betöltés után az interfészek shutdown állapotban lehetnek – kapcsold vissza őket (`no shutdown`). A `show version` utolsó sora mutatja a config-register értékét.'
  },

  /* =====================================================================
   * SWITCHING
   * ===================================================================== */
  {
    id: 'vlan-create',
    category: 'switching',
    title: 'VLAN létrehozása',
    desc: 'VLAN-ok felvétele azonosítóval és névvel a switch VLAN-adatbázisába.',
    blocks: [
      {
        label: 'S1(config)#',
        lang: 'ios',
        code: `
vlan 10  // VLAN létrehozása, belépés VLAN módba
 name TANAROK  // VLAN neve
exit
vlan 20
 name DIAKOK
exit
vlan 99
 name MANAGEMENT
exit`
      },
      {
        label: 'S1#',
        lang: 'ios',
        code: `
show vlan brief  // VLAN-ok és hozzárendelt portok
show vlan id 10  // egy VLAN részletei`
      }
    ],
    tip: 'Törlés: `no vlan 20` – a portjai inaktívak lesznek, amíg másik VLAN-ba nem teszed őket. A VLAN-ok a `flash:vlan.dat` fájlban tárolódnak.'
  },
  {
    id: 'vlan-access',
    category: 'switching',
    title: 'Port hozzárendelése VLAN-hoz',
    desc: 'Access port egyenként, tartományra, illetve IP telefonos porton.',
    blocks: [
      {
        label: 'S1(config)#',
        lang: 'ios',
        code: `
interface fastEthernet 0/1  // egy port kiválasztása
 switchport mode access  // végponti (access) port
 switchport access vlan 10  // port a 10-es VLAN-ba
exit
interface range fastEthernet 0/2 - 10  // porttartomány egyszerre
 switchport mode access
 switchport access vlan 20
exit
interface fastEthernet 0/11
 switchport mode access
 switchport access vlan 10  // adat VLAN a PC-nek
 switchport voice vlan 150  // hang VLAN az IP telefonnak
exit`
      },
      {
        label: 'S1#',
        lang: 'ios',
        code: `
show interfaces fastEthernet 0/1 switchport  // port módja és VLAN-ja`
      }
    ],
    tip: 'Ha a VLAN még nem létezik, a switch automatikusan létrehozza (név nélkül). Több tartomány egyszerre: `interface range fa0/1 - 5 , fa0/7`.'
  },
  {
    id: 'vlan-trunk',
    category: 'switching',
    title: 'Trunk port',
    desc: 'Több VLAN forgalmát viszi két switch, vagy switch és router között.',
    blocks: [
      {
        label: 'S1(config)#',
        lang: 'ios',
        code: `
interface gigabitEthernet 0/1
 switchport mode trunk  // trönk port (802.1Q címkézés)
 switchport trunk native vlan 99  // címkézetlen VLAN – mindkét végen egyezzen
 switchport trunk allowed vlan 10,20,99  // csak ezek mehetnek át
 switchport nonegotiate  // DTP egyeztetés tiltása
exit`
      },
      {
        label: 'S1#',
        lang: 'ios',
        code: `
show interfaces trunk  // trönk portok, natív és engedélyezett VLAN-ok`
      }
    ],
    tip: 'Multilayer switch-en (3560/3650) előbb kell: `switchport trunk encapsulation dot1q`. VLAN hozzáadása a listához: `switchport trunk allowed vlan add 30`.'
  },
  {
    id: 'switch-mgmt',
    category: 'switching',
    title: 'Switch menedzsment IP (SVI)',
    desc: 'IP-cím a switchnek pinghez és távoli eléréshez (Telnet/SSH).',
    blocks: [{
      label: 'S1(config)#',
      lang: 'ios',
      code: `
interface vlan 99  // virtuális VLAN interfész (SVI)
 ip address 192.168.99.2 255.255.255.0  // a switch saját címe
 no shutdown  // az SVI alapból le van tiltva
exit
ip default-gateway 192.168.99.1  // átjáró más hálózatok eléréséhez`
    }],
    tip: 'Az SVI csak akkor lesz up, ha az adott VLAN-ban van aktív port (access vagy trönk). A PDF-es VLAN 1 változat ugyanígy működik: `interface vlan 1`.'
  },
  {
    id: 'vtp',
    category: 'switching',
    title: 'VTP (VLAN terjesztés)',
    desc: 'A szerver switchen létrehozott VLAN-ok automatikusan átkerülnek a kliensekre.',
    blocks: [
      {
        label: 'S1(config)# – VTP szerver',
        lang: 'ios',
        code: `
vtp domain CEG  // tartomány neve – mindenhol egyezzen
vtp password vtppass  // jelszó – mindenhol egyezzen
vtp version 2  // protokoll verzió
vtp mode server  // VLAN-okat létrehoz és terjeszt
vtp pruning  // csak a szükséges VLAN-ok forgalma megy a trönkön`
      },
      {
        label: 'S2(config)# – VTP kliens',
        lang: 'ios',
        code: `
vtp domain CEG  // ugyanaz, mint a szerveren
vtp password vtppass  // ugyanaz, mint a szerveren
vtp mode client  // csak átveszi a szerver VLAN-jait`
      },
      {
        label: 'S1#',
        lang: 'ios',
        code: `
show vtp status  // mód, tartomány, revíziószám
show vtp password  // beállított jelszó`
      }
    ],
    tip: 'A VTP csak trönkön terjed. `vtp mode transparent`: saját VLAN-okat kezel, a VTP-t csak továbbítja. Új switch beépítése előtt nullázd a revíziószámot (pl. transparent, majd vissza client).'
  },

  /* =====================================================================
   * REDUNDANCIA
   * ===================================================================== */
  {
    id: 'stp',
    category: 'redundancia',
    title: 'STP / RSTP (feszítőfa)',
    desc: 'Hurokmentesítés: gyökér switch kijelölése, portfast és BPDU guard.',
    blocks: [
      {
        label: 'S1(config)#',
        lang: 'ios',
        code: `
spanning-tree mode rapid-pvst  // gyors STP (RSTP) mód
spanning-tree vlan 10 root primary  // ez legyen a gyökér a VLAN 10-ben
spanning-tree vlan 20 root secondary  // tartalék gyökér
spanning-tree vlan 1 priority 4096  // prioritás kézzel (0–61440, 4096-os lépés)
spanning-tree portfast default  // portfast minden access porton
spanning-tree portfast bpduguard default  // BPDU guard a portfast portokon`
      },
      {
        label: 'S1(config)# – portokon',
        lang: 'ios',
        code: `
interface range fastEthernet 0/1 - 20  // végpontok felé néző portok
 spanning-tree portfast  // azonnal továbbító állapot
 spanning-tree bpduguard enable  // BPDU érkezésekor a port letiltódik
exit
interface gigabitEthernet 0/2
 spanning-tree guard root  // ezen a porton nem jöhet új gyökér
exit`
      },
      {
        label: 'S1#',
        lang: 'ios',
        code: `
show spanning-tree  // gyökér, portszerepek és állapotok
show spanning-tree vlan 10  // egy VLAN feszítőfája
show spanning-tree summary  // mód, globális portfast / BPDU guard`
      }
    ],
    tip: 'A kisebb prioritás nyer (azonosnál a kisebb MAC). Portfast-ot soha ne tegyél switch–switch kapcsolatra. Lassú linkfelépülés miatti DHCP/TFTP időtúllépés ellen is a portfast segít.'
  },
  {
    id: 'etherchannel',
    category: 'redundancia',
    title: 'EtherChannel (portösszefogás)',
    desc: 'Több fizikai link egy logikai kapcsolatként: nagyobb sávszélesség, tartalék.',
    blocks: [
      {
        label: 'S1(config)# – LACP',
        lang: 'ios',
        code: `
interface range gigabitEthernet 0/1 - 2  // összefogandó portok
 channel-group 1 mode active  // LACP, aktívan kezdeményez
exit
interface port-channel 1  // a logikai interfész
 switchport mode trunk  // beállítás már a port-channelen
 switchport trunk allowed vlan 10,20,99
exit`
      },
      {
        label: 'S2(config)# – túloldal',
        lang: 'ios',
        code: `
interface range gigabitEthernet 0/1 - 2  // ugyanazok a portok
 channel-group 1 mode passive  // LACP, válaszol a kezdeményezésre
exit
interface port-channel 1
 switchport mode trunk
exit`
      },
      {
        label: 'Módpárosítások',
        lang: 'gui',
        code: `
LACP (szabványos): active + active, vagy active + passive
PAgP (Cisco): desirable + desirable, vagy desirable + auto
Statikus: on + on (nincs egyeztetés)`
      },
      {
        label: 'S1#',
        lang: 'ios',
        code: `
show etherchannel summary  // csoportok, protokoll, tagportok (P = aktív tag)
show interfaces port-channel 1  // összesített sávszélesség`
      }
    ],
    tip: 'A tagportok sebessége, duplexe és VLAN-beállítása egyezzen. passive + passive vagy auto + auto nem épít fel csatornát.'
  },
  {
    id: 'hsrp',
    category: 'redundancia',
    title: 'HSRP (tartalék átjáró)',
    desc: 'Két router közös virtuális átjárócímmel; ha az aktív kiesik, a tartalék átveszi.',
    blocks: [
      {
        label: 'R1(config)# – aktív router',
        lang: 'ios',
        code: `
interface gigabitEthernet 0/1
 ip address 192.168.1.2 255.255.255.0  // saját valós cím
 standby version 2  // HSRP v2
 standby 1 ip 192.168.1.1  // virtuális átjárócím (a PC-k ezt kapják)
 standby 1 priority 150  // nagyobb prioritás = aktív (alap: 100)
 standby 1 preempt  // visszaveszi az aktív szerepet, ha újra él
exit`
      },
      {
        label: 'R2(config)# – tartalék router',
        lang: 'ios',
        code: `
interface gigabitEthernet 0/1
 ip address 192.168.1.3 255.255.255.0  // saját valós cím
 standby version 2  // a verzió egyezzen
 standby 1 ip 192.168.1.1  // ugyanaz a virtuális cím
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show standby  // állapot, aktív és standby router
show standby brief  // tömör összesítés`
      }
    ],
    tip: 'A kliensek default gateway-e a virtuális cím. Alapidőzítők: hello 3 mp, hold 10 mp. Terhelésmegosztáshoz két csoportot használj eltérő aktív routerrel.'
  },

  /* =====================================================================
   * ROUTING
   * ===================================================================== */
  {
    id: 'iface-ip',
    category: 'routing',
    title: 'Interfész IP-cím és loopback',
    desc: 'Router interfészek címzése és bekapcsolása – alapból minden port le van tiltva.',
    blocks: [{
      label: 'R1(config)#',
      lang: 'ios',
      code: `
interface gigabitEthernet 0/0  // interfész kiválasztása
 description LAN  // leírás (show-ban látszik)
 ip address 192.168.1.1 255.255.255.0  // IPv4 cím és maszk
 duplex auto  // auto | half | full
 speed auto  // auto | 10 | 100 | 1000
 no shutdown  // interfész bekapcsolása
exit
interface serial 0/0/0  // soros interfész
 ip address 10.0.0.1 255.255.255.252  // /30 pont-pont link
 clock rate 64000  // órajel – csak a DCE oldalon
 no shutdown
exit
interface loopback 0  // virtuális interfész, mindig up
 ip address 1.1.1.1 255.255.255.255  // /32 cím (pl. router-id)
exit`
    }],
    tip: 'A DCE kábelvéget a PT óra ikonnal jelzi, a routeren: `show controllers serial 0/0/0`.'
  },
  {
    id: 'static-route',
    category: 'routing',
    title: 'Statikus route',
    desc: 'Távoli hálózat elérése next-hop címmel, kimenő interfésszel, tartalékkal, összevonva.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
ip route 192.168.2.0 255.255.255.0 10.0.0.2  // cél hálózat, maszk, next-hop
ip route 192.168.3.0 255.255.255.0 serial 0/0/0  // kimenő interfésszel
ip route 192.168.2.0 255.255.255.0 10.0.1.2 150  // lebegő (tartalék) út, AD = 150
ip route 192.168.96.0 255.255.240.0 10.0.0.2  // összevont út: 192.168.96.0/20`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ip route  // S = statikus, C = közvetlen, L = helyi
show ip route static  // csak a statikus utak`
      }
    ],
    tip: 'Adminisztratív távolság: közvetlen 0, statikus 1, EIGRP 90, OSPF 110, RIP 120. A lebegő út AD-je legyen nagyobb az elsődlegesénél. Törlés: `no ip route` ugyanazokkal a paraméterekkel.'
  },
  {
    id: 'default-route',
    category: 'routing',
    title: 'Alapértelmezett útvonal',
    desc: 'Minden ismeretlen célú csomagot a szolgáltató (ISP) felé küld.',
    blocks: [{
      label: 'R1(config)#',
      lang: 'ios',
      code: `
ip route 0.0.0.0 0.0.0.0 203.0.113.1  // next-hop címmel
ip route 0.0.0.0 0.0.0.0 serial 0/0/0  // vagy kimenő interfésszel`
    }],
    tip: 'A `show ip route` kimenetében `S*` és a „Gateway of last resort” sor jelzi. Dinamikus routinggal továbbadható: `default-information originate`.'
  },
  {
    id: 'router-on-stick',
    category: 'routing',
    title: 'Router-on-a-stick (VLAN-ok közti routing)',
    desc: 'VLAN-onként egy alinterfész 802.1Q címkézéssel. A switch felőli port trönk.',
    blocks: [{
      label: 'R1(config)#',
      lang: 'ios',
      code: `
interface gigabitEthernet 0/0
 no ip address  // a fizikai portnak nincs címe
 no shutdown  // ezzel az alinterfészek is feléledhetnek
exit
interface gigabitEthernet 0/0.10  // alinterfész a VLAN 10-hez
 encapsulation dot1Q 10  // címke: VLAN 10
 ip address 192.168.10.1 255.255.255.0  // a VLAN 10 átjárója
exit
interface gigabitEthernet 0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
exit`
    }],
    tip: 'A kliensek default gateway-e az adott alinterfész címe. Natív VLAN alinterfészen: `encapsulation dot1Q 99 native`.'
  },
  {
    id: 'l3-switch',
    category: 'routing',
    title: 'Multilayer switch (VLAN-ok közti routing)',
    desc: 'SVI-k mint átjárók, routolt port a router felé, trönk a többi switch felé.',
    blocks: [{
      label: 'MLS(config)#',
      lang: 'ios',
      code: `
ip routing  // routing bekapcsolása a switchen
interface vlan 10  // SVI – a VLAN 10 átjárója
 ip address 192.168.10.1 255.255.255.0
 no shutdown
exit
interface vlan 20
 ip address 192.168.20.1 255.255.255.0
 no shutdown
exit
interface gigabitEthernet 0/1  // router felé néző port
 no switchport  // routolt (L3) port lesz
 ip address 10.0.0.1 255.255.255.252
exit
interface range fastEthernet 0/1 - 2  // trönk a többi switch felé
 switchport trunk encapsulation dot1q  // 3560-on kötelező
 switchport mode trunk
exit
ip route 0.0.0.0 0.0.0.0 10.0.0.2  // alapértelmezett út a router felé`
    }],
    tip: 'A VLAN-oknak létezniük kell a switchen (`vlan 10`), és legyen bennük aktív port, különben az SVI down marad. A switch DHCP szerver is lehet (`ip dhcp pool`).'
  },
  {
    id: 'nat-pat',
    category: 'routing',
    title: 'PAT (NAT overload)',
    desc: 'Sok belső privát cím egyetlen külső címen – az „otthoni routeres” NAT.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
interface gigabitEthernet 0/0
 ip nat inside  // belső (LAN) oldal
exit
interface serial 0/0/0
 ip nat outside  // külső (ISP) oldal
exit
access-list 1 permit 192.168.0.0 0.0.255.255  // mely belső címek fordítódjanak
ip nat inside source list 1 interface serial 0/0/0 overload  // mind a külső port címén
ip route 0.0.0.0 0.0.0.0 serial 0/0/0  // kijárat az internet felé`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ip nat translations  // aktív fordítások (forgalom után)
show ip nat statistics  // találatok, inside/outside interfészek
clear ip nat translation *  // dinamikus fordítások törlése`
      }
    ],
    tip: 'Fogalmak: inside local = belső privát cím, inside global = kifelé látszó publikus cím. Ha nincs fordítás, ellenőrizd az inside/outside jelölést és az ACL-t.'
  },
  {
    id: 'nat-static-dynamic',
    category: 'routing',
    title: 'Statikus NAT, port-továbbítás, dinamikus NAT',
    desc: 'Szerver elérése kívülről, illetve publikus címkészletből kiosztott címek.',
    blocks: [
      {
        label: 'R1(config)# – statikus',
        lang: 'ios',
        code: `
ip nat inside source static 192.168.1.20 203.0.113.10  // 1:1 fordítás (pl. webszerver)
ip nat inside source static tcp 192.168.1.30 80 203.0.113.11 80  // port-továbbítás: csak a 80-as port`
      },
      {
        label: 'R1(config)# – dinamikus',
        lang: 'ios',
        code: `
ip nat pool KULSO 203.0.113.20 203.0.113.30 netmask 255.255.255.224  // publikus címkészlet
access-list 2 permit 192.168.10.0 0.0.0.255  // belső címek
ip nat inside source list 2 pool KULSO  // egy belső gép = egy külső cím
! Ha kevés a cím, a sor végére: overload`
      }
    ],
    tip: 'Mindkét változathoz kell az interfészeken az `ip nat inside` / `ip nat outside`. Dinamikus NAT-nál egyszerre csak annyi gép netezhet, ahány cím a készletben van.'
  },
  {
    id: 'rip',
    category: 'routing',
    title: 'RIPv2',
    desc: 'Távolságvektor alapú dinamikus routing: a közvetlenül csatolt hálózatok hirdetése.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
router rip  // RIP folyamat indítása
 version 2  // RIPv2: maszkot is küld (VLSM)
 no auto-summary  // ne vonja össze osztályhatáron
 network 192.168.1.0  // hirdetett hálózat (osztályos, maszk nélkül)
 network 10.0.0.0
 passive-interface gigabitEthernet 0/0  // LAN felé ne küldjön frissítést
 default-information originate  // alapértelmezett út hirdetése
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ip protocols  // futó routing protokollok, hálózatok
show ip route rip  // RIP-pel tanult utak (R)
debug ip rip  // frissítések élő figyelése
undebug all  // minden debug kikapcsolása`
      }
    ],
    tip: 'Max. 15 hop, frissítés 30 mp-enként, AD = 120. Hitelesítés: `key chain` + az interfészen `ip rip authentication mode md5`.'
  },
  {
    id: 'ospf',
    category: 'routing',
    title: 'OSPF',
    desc: 'Kapcsolatállapot alapú routing területekkel (area), költség alapú útválasztással.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
router ospf 1  // OSPF folyamat (a szám csak helyi)
 router-id 1.1.1.1  // egyedi azonosító
 network 192.168.1.0 0.0.0.255 area 0  // hálózat wildcard maszkkal, 0-s terület
 network 10.0.0.0 0.0.0.3 area 0  // /30 link
 passive-interface gigabitEthernet 0/0  // LAN felé nincs hello
 default-information originate  // alapértelmezett út továbbhirdetése
 auto-cost reference-bandwidth 1000  // referencia sávszélesség (Mbps)
exit`
      },
      {
        label: 'R1(config)# – interfészen',
        lang: 'ios',
        code: `
interface gigabitEthernet 0/1
 ip ospf cost 10  // útvonal költsége kézzel
 ip ospf priority 100  // DR-választás (0 = sosem DR)
 ip ospf hello-interval 5  // hello idő (mp) – szomszédnál egyezzen
 ip ospf dead-interval 20  // halott idő (mp)
 bandwidth 100000  // sávszélesség a költségszámításhoz (kbit/s)
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ip ospf neighbor  // szomszédok és állapotuk (FULL)
show ip ospf interface brief  // OSPF-es interfészek, költség
show ip route ospf  // OSPF-fel tanult utak (O)
show ip protocols  // router-id, hálózatok, passzív portok
clear ip ospf process  // újraindítás (új router-id életbe lép)`
      }
    ],
    tip: 'Wildcard = 255.255.255.255 mínusz a maszk (/24 → `0.0.0.255`, /30 → `0.0.0.3`). Több területnél a határ router (ABR) hálózatai más-más `area` számot kapnak. AD = 110.'
  },
  {
    id: 'ospf-auth',
    category: 'routing',
    title: 'OSPF hitelesítés (MD5)',
    desc: 'Csak az azonos kulccsal rendelkező routerek lesznek szomszédok.',
    blocks: [{
      label: 'R1(config)#',
      lang: 'ios',
      code: `
router ospf 1  // belépés az OSPF folyamatba
 area 0 authentication message-digest  // MD5 hitelesítés a 0-s területen
exit
interface serial 0/0/0  // a szomszéd felé néző interfész
 ip ospf message-digest-key 1 md5 OSPFpass  // kulcs – a szomszédnál ugyanez
exit`
    }],
    tip: 'Mindkét routeren be kell állítani, különben megszakad a szomszédság. Egyszerű jelszavas változat: `area 0 authentication` + `ip ospf authentication-key titok`.'
  },
  {
    id: 'eigrp',
    category: 'routing',
    title: 'EIGRP',
    desc: 'Cisco hibrid routing protokoll: gyors konvergencia, sávszélesség + késleltetés metrika.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
router eigrp 100  // AS szám – minden routeren egyezzen
 eigrp router-id 1.1.1.1  // azonosító
 network 192.168.1.0 0.0.0.255  // hálózat wildcard maszkkal
 network 10.0.0.0 0.0.0.3
 no auto-summary  // ne összegezzen osztályhatáron
 passive-interface gigabitEthernet 0/0  // LAN felé nincs hello
 variance 2  // egyenlőtlen költségű terheléselosztás
exit
interface serial 0/0/0
 bandwidth 1544  // sávszélesség a metrikához (kbit/s)
 ip summary-address eigrp 100 192.168.0.0 255.255.252.0  // összevont út hirdetése
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ip eigrp neighbors  // szomszédok
show ip eigrp topology  // successor és feasible successor utak
show ip route eigrp  // EIGRP utak (D)`
      }
    ],
    tip: 'AD: belső 90, külső 170. A `network` maszk nélkül osztályos címként értelmeződik.'
  },
  {
    id: 'redistribute',
    category: 'routing',
    title: 'Útvonalak újraelosztása (redistribute)',
    desc: 'Statikus vagy más protokollból tanult utak továbbadása.',
    blocks: [{
      label: 'R1(config)#',
      lang: 'ios',
      code: `
router ospf 1  // belépés az OSPF folyamatba
 redistribute static subnets  // statikus utak OSPF-be
 redistribute rip subnets  // RIP utak OSPF-be
 redistribute eigrp 100 subnets  // EIGRP utak OSPF-be
exit
router rip  // belépés a RIP folyamatba
 redistribute static  // statikus utak RIP-be
 redistribute ospf 1 metric 3  // OSPF utak RIP-be, 3 hop metrikával
exit
router eigrp 100  // belépés az EIGRP folyamatba
 redistribute static  // statikus utak EIGRP-be
 redistribute ospf 1 metric 10000 100 255 1 1500  // sávszél., késl., megbízh., terhelés, MTU
exit`
    }],
    tip: 'OSPF-be a `subnets` nélkül csak osztályos hálózatok kerülnek át. EIGRP-be más protokollból csak az öt metrikaértékkel lehet újraelosztani.'
  },

  /* =====================================================================
   * IPv6
   * ===================================================================== */
  {
    id: 'ipv6-addressing',
    category: 'ipv6',
    title: 'IPv6 címzés',
    desc: 'Globális, link-local és EUI-64 címek, SLAAC kliens, ellenőrzés.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
ipv6 unicast-routing  // IPv6 routing és RA üzenetek bekapcsolása
interface gigabitEthernet 0/0
 ipv6 address 2001:db8:acad:1::1/64  // globális unicast cím
 ipv6 address fe80::1 link-local  // saját link-local cím
 no shutdown
exit
interface gigabitEthernet 0/1
 ipv6 address 2001:db8:acad:2::/64 eui-64  // interfész ID a MAC-ből
 no shutdown
exit
interface gigabitEthernet 0/2
 ipv6 enable  // csak link-local cím
 ipv6 address autoconfig  // cím SLAAC-kal (kliensként)
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ipv6 interface brief  // IPv6 címek röviden
show ipv6 interface gigabitEthernet 0/0  // részletek, csoportcímek
show ipv6 route  // IPv6 irányítótábla
show ipv6 neighbors  // szomszédtábla (az IPv6 „ARP”-ja)`
      },
      {
        label: 'PC › Command Prompt',
        lang: 'pc',
        code: `
ipv6config  // a PC IPv6 címei
ping 2001:db8:acad:1::1  // IPv6 ping`
      }
    ],
    tip: 'Rövidítés: vezető nullák elhagyhatók, egy nullás blokksor `::`-ra cserélhető (címenként egyszer). Link-local: FE80::/10, ULA (belső): FC00::/7.'
  },
  {
    id: 'ipv6-static',
    category: 'ipv6',
    title: 'IPv6 statikus route',
    desc: 'Távoli IPv6 hálózatok, alapértelmezett és tartalék útvonal.',
    blocks: [{
      label: 'R1(config)#',
      lang: 'ios',
      code: `
ipv6 route 2001:db8:acad:3::/64 2001:db8:acad:12::2  // next-hop címmel
ipv6 route 2001:db8:acad:4::/64 serial 0/0/0  // kimenő interfésszel
ipv6 route 2001:db8:acad:5::/64 gigabitEthernet 0/1 fe80::2  // link-local next-hop + interfész
ipv6 route ::/0 serial 0/0/0  // alapértelmezett út
ipv6 route 2001:db8:acad:3::/64 2001:db8:acad:13::2 150  // lebegő tartalék út`
    }],
    tip: 'Előfeltétel: `ipv6 unicast-routing`. Ethernet porton link-local next-hop-hoz az interfészt is meg kell adni. Ellenőrzés: `show ipv6 route static`.'
  },
  {
    id: 'ipv6-dynamic',
    category: 'ipv6',
    title: 'IPv6 dinamikus routing (OSPFv3, RIPng)',
    desc: 'IPv6-nál nincs network parancs: az interfészeket kell bevonni.',
    blocks: [
      {
        label: 'R1(config)# – OSPFv3',
        lang: 'ios',
        code: `
ipv6 router ospf 1  // OSPFv3 folyamat
 router-id 1.1.1.1  // kötelező, ha nincs IPv4 cím
exit
interface gigabitEthernet 0/0
 ipv6 ospf 1 area 0  // interfész bevonása
exit
interface serial 0/0/0
 ipv6 ospf 1 area 0
exit`
      },
      {
        label: 'R1(config)# – RIPng',
        lang: 'ios',
        code: `
ipv6 router rip RIPNG  // RIPng folyamat névvel
exit
interface gigabitEthernet 0/0
 ipv6 rip RIPNG enable  // interfész bevonása
exit
interface serial 0/0/0
 ipv6 rip RIPNG enable
 ipv6 rip RIPNG default-information originate  // alapértelmezett út hirdetése
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ipv6 protocols  // futó IPv6 routing protokollok
show ipv6 ospf neighbor  // OSPFv3 szomszédok
show ipv6 route ospf  // OSPFv3 utak`
      }
    ],
    tip: 'A RIPng folyamat neve minden interfészen ugyanaz legyen. Előfeltétel: `ipv6 unicast-routing`.'
  },
  {
    id: 'ipv6-dhcp',
    category: 'ipv6',
    title: 'SLAAC és DHCPv6',
    desc: 'Automatikus IPv6 címkiosztás: állapotmentes és állapottartó változat.',
    blocks: [
      {
        label: 'R1(config)# – állapotmentes',
        lang: 'ios',
        code: `
ipv6 unicast-routing  // RA üzenetek küldése
ipv6 dhcp pool ALLAPOTMENTES  // pool csak DNS-hez, domainhez
 dns-server 2001:db8:acad:1::10  // DNS szerver
 domain-name pelda.hu
exit
interface gigabitEthernet 0/0
 ipv6 address 2001:db8:acad:1::1/64
 ipv6 nd other-config-flag  // O flag: cím SLAAC-kal, DNS DHCPv6-tal
 ipv6 dhcp server ALLAPOTMENTES  // pool hozzárendelése
exit`
      },
      {
        label: 'R1(config)# – állapottartó',
        lang: 'ios',
        code: `
ipv6 dhcp pool ALLAPOTTARTO  // pool címkiosztáshoz
 address prefix 2001:db8:acad:2::/64 lifetime infinite infinite  // kiosztandó címtartomány
 dns-server 2001:db8:acad:1::10
 domain-name pelda.hu
exit
interface gigabitEthernet 0/1
 ipv6 address 2001:db8:acad:2::1/64
 ipv6 nd managed-config-flag  // M flag: a címet is DHCPv6 adja
 ipv6 dhcp server ALLAPOTTARTO
exit`
      },
      {
        label: 'PC › Desktop › IP Configuration',
        lang: 'gui',
        code: `
IPv6 Configuration: Automatic`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ipv6 dhcp pool  // pool-ok és kiosztott címek`
      }
    ],
    tip: 'Csak SLAAC-hoz (flag nélkül) elég az `ipv6 unicast-routing` és egy /64-es cím az interfészen. A kliens átjárója mindig a router link-local címe.'
  },
  {
    id: 'ipv6-acl',
    category: 'ipv6',
    title: 'IPv6 ACL',
    desc: 'Csak nevesített lista létezik, és ipv6 traffic-filterrel kerül az interfészre.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
ipv6 access-list WEB_SZURO  // nevesített IPv6 ACL
 permit tcp 2001:db8:acad:1::/64 host 2001:db8:acad:2::10 eq 80  // HTTP engedélyezése
 deny icmp any any echo-request  // ping tiltása
 permit ipv6 any any  // minden más engedélyezése
exit
interface gigabitEthernet 0/0
 ipv6 traffic-filter WEB_SZURO in  // alkalmazás (ip access-group helyett)
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ipv6 access-list  // IPv6 ACL-ek és találatok`
      }
    ],
    tip: 'Nincs wildcard, prefixhossz van. A lista végén rejtett `permit icmp any any nd-na`, `permit icmp any any nd-ns` és `deny ipv6 any any` áll.'
  },

  /* =====================================================================
   * SERVICES
   * ===================================================================== */
  {
    id: 'tftp',
    category: 'services',
    title: 'TFTP mentés és visszaállítás',
    desc: 'Konfiguráció és IOS image mentése TFTP szerverre, majd visszatöltése.',
    blocks: [
      {
        label: 'Szerver › Services',
        lang: 'gui',
        code: `
Services > TFTP > Service: On
# A mentett fájlok ugyanitt, a fájllistában jelennek meg`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
copy running-config tftp:  // futó konfig mentése a szerverre
! Address or name of remote host []? 192.168.1.10
! Destination filename [R1-confg]? R1-mentes
copy startup-config tftp:  // mentett konfig mentése
copy tftp: running-config  // visszatöltés a futó konfigba
copy flash: tftp:  // IOS image mentése
copy tftp: flash:  // IOS image visszatöltése`
      }
    ],
    tip: 'A `copy` parancsokat egyenként írd be: a router rákérdez az IP-címre és a fájlnévre, Enter = alapérték. A TFTP UDP-t használ, nincs jogosultságkezelés, csak kis fájlokhoz.'
  },
  {
    id: 'ftp',
    category: 'services',
    title: 'FTP szerver és kliens',
    desc: 'Felhasználó a szerveren, majd fájlműveletek PC-ről vagy a routerről.',
    blocks: [
      {
        label: 'Szerver › Services › FTP',
        lang: 'gui',
        code: `
Service: On
Username: cisco  Password: cisco
Jogosultság: Write, Read, Delete, Rename, List > Add`
      },
      {
        label: 'PC › Command Prompt',
        lang: 'pc',
        code: `
ftp 192.168.1.10  // kapcsolódás (felhasználó: cisco, jelszó: cisco)
dir  // szerver fájljainak listája
put sampleFile.txt  // feltöltés
get sampleFile.txt  // letöltés
rename sampleFile.txt uj.txt  // átnevezés
delete uj.txt  // törlés
quit  // kilépés`
      },
      {
        label: 'R1(config)# majd R1#',
        lang: 'ios',
        code: `
ip ftp username cisco  // FTP felhasználó a routernek
ip ftp password cisco  // FTP jelszó
end
copy running-config ftp:  // konfig mentése FTP-re
copy flash: ftp:  // IOS image mentése FTP-re`
      }
    ],
    tip: 'Az FTP TCP-t használ (20/21-es port), felhasználóval és jogosultságokkal.'
  },
  {
    id: 'email',
    category: 'services',
    title: 'Email szerver (SMTP/POP3)',
    desc: 'Levelezési domain és postafiókok a szerveren, levelezőkliens a PC-n.',
    blocks: [
      {
        label: 'Szerver › Services › EMAIL',
        lang: 'gui',
        code: `
SMTP Service: On  POP3 Service: On
Domain Name: pelda.hu > Set
User: anna  Password: anna123 > +
User: bela  Password: bela123 > +`
      },
      {
        label: 'PC › Desktop › Email › Configure Mail',
        lang: 'gui',
        code: `
Your Name: Anna
Email Address: anna@pelda.hu
Incoming Mail Server: mail.pelda.hu
Outgoing Mail Server: mail.pelda.hu
User Name: anna
Password: anna123
Save > Compose > Send
Receive`
      }
    ],
    tip: 'A `mail.pelda.hu` névhez kell egy A rekord a DNS szerveren – vagy írd be közvetlenül a szerver IP-címét. SMTP: küldés (25), POP3: fogadás (110).'
  },
  {
    id: 'dhcp-router',
    category: 'services',
    title: 'DHCP szerver a routeren',
    desc: 'Címkészlet (pool) átjáróval és DNS-sel; a fix címeket előbb ki kell zárni.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
ip dhcp excluded-address 192.168.10.1 192.168.10.10  // ezeket ne ossza ki
ip dhcp pool LAN10  // pool létrehozása
 network 192.168.10.0 255.255.255.0  // kiosztható hálózat
 default-router 192.168.10.1  // átjáró a klienseknek
 dns-server 192.168.10.5  // DNS szerver a klienseknek
 domain-name pelda.hu  // tartománynév
exit`
      },
      {
        label: 'R1(config)# – router mint DHCP kliens',
        lang: 'ios',
        code: `
interface gigabitEthernet 0/1
 ip address dhcp  // a port DHCP-től kér címet (pl. ISP felé)
 no shutdown
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ip dhcp binding  // kiosztott címek és MAC-ek
show ip dhcp pool  // pool-ok kihasználtsága`
      }
    ],
    tip: 'Kliensen: Desktop › IP Configuration › DHCP. Kizárás törlése: `no ip dhcp excluded-address` ugyanazokkal a címekkel.'
  },
  {
    id: 'dhcp-server',
    category: 'services',
    title: 'DHCP szerver (Server-PT) és relay',
    desc: 'Grafikus DHCP pool a szerveren; másik alhálózatból a router továbbítja a kérést.',
    blocks: [
      {
        label: 'Szerver › Services › DHCP',
        lang: 'gui',
        code: `
Service: On
Pool Name: LAN20
Default Gateway: 192.168.20.1
DNS Server: 192.168.1.10
Start IP Address: 192.168.20.11
Subnet Mask: 255.255.255.0
Maximum Number of Users: 50
Add`
      },
      {
        label: 'R1(config)# – a kliensek felőli interfészen',
        lang: 'ios',
        code: `
interface gigabitEthernet 0/1
 ip helper-address 192.168.1.10  // DHCP kérések továbbítása a szervernek
exit`
      }
    ],
    tip: 'Új pool: Add, meglévő (pl. serverPool) módosítása: Save. A szervernek legyen útvonala a kliens hálózat felé (default gateway).'
  },
  {
    id: 'dns',
    category: 'services',
    title: 'DNS szerver',
    desc: 'Névfeloldás a szerveren: A rekord (név → IP) és CNAME (álnév).',
    blocks: [
      {
        label: 'Szerver › Services › DNS',
        lang: 'gui',
        code: `
DNS Service: On
Name: www.pelda.hu  Type: A Record  Address: 192.168.1.20 > Add
Name: mail.pelda.hu  Type: A Record  Address: 192.168.1.10 > Add
Name: web.pelda.hu  Type: CNAME  Host Name: www.pelda.hu > Add`
      },
      {
        label: 'R1(config)# – router mint DNS kliens',
        lang: 'ios',
        code: `
ip domain-lookup  // névfeloldás bekapcsolása
ip name-server 192.168.1.10  // DNS szerver címe`
      },
      {
        label: 'PC › Command Prompt',
        lang: 'pc',
        code: `
nslookup www.pelda.hu  // feloldás tesztje
ping www.pelda.hu  // név alapján`
      }
    ],
    tip: 'A kliensek DNS Server mezőjében (vagy a DHCP poolban) ennek a szervernek a címe legyen.'
  },
  {
    id: 'ntp',
    category: 'services',
    title: 'Idő és NTP',
    desc: 'Rendszeridő kézzel vagy NTP szerverről, hitelesítéssel.',
    blocks: [
      {
        label: 'R1#',
        lang: 'ios',
        code: `
clock set 14:30:00 17 Sep 2026  // rendszeridő kézi beállítása
show clock detail  // idő és a forrása`
      },
      {
        label: 'R1(config)# – NTP kliens',
        lang: 'ios',
        code: `
clock timezone CET 1  // időzóna (UTC+1)
ntp server 192.168.1.10  // NTP szerver címe
ntp update-calendar  // hardveróra frissítése NTP-ből
ntp authenticate  // hitelesítés bekapcsolása
ntp authentication-key 1 md5 NTPpa55  // kulcs – a szerveren ugyanez
ntp trusted-key 1  // megbízható kulcs`
      },
      {
        label: 'Szerver › Services › NTP',
        lang: 'gui',
        code: `
Service: On
Authentication: Enable  Key: 1  Password: NTPpa55`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ntp status  // szinkronizált-e, stratum
show ntp associations  // NTP szerverek`
      }
    ],
    tip: 'Router is lehet NTP forrás: `ntp master` (a PT-ben jellemzően a Server-PT az). Szinkronizálás eltarthat egy-két percig.'
  },
  {
    id: 'syslog',
    category: 'services',
    title: 'Syslog (naplózás)',
    desc: 'Eseménynaplók küldése központi szerverre, belépések naplózása.',
    blocks: [
      {
        label: 'Szerver › Services',
        lang: 'gui',
        code: `
Services > SYSLOG > Service: On`
      },
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
logging on  // naplózás bekapcsolása
logging host 192.168.1.10  // syslog szerver
logging trap debugging  // 0–7 minden szint menjen a szerverre
service timestamps log datetime msec  // pontos időbélyeg
login on-failure log  // sikertelen belépések naplózása
login on-success log  // sikeres belépések naplózása
! Opcionális: konzolra ne írjon üzeneteket
no logging console  // konzolüzenetek kikapcsolása`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show logging  // naplózási beállítások és helyi napló`
      }
    ],
    tip: 'Szintek: 0 emergencies, 1 alerts, 2 critical, 3 errors, 4 warnings, 5 notifications, 6 informational, 7 debugging. Teszt: kapcsolj le-fel egy interfészt.'
  },
  {
    id: 'snmp',
    category: 'services',
    title: 'SNMP',
    desc: 'Eszközadatok lekérdezése hálózatfelügyeleti programmal (MIB Browser).',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
snmp-server community public ro  // csak olvasható közösség
snmp-server community private rw  // írható közösség`
      },
      {
        label: 'PC › Desktop › MIB Browser',
        lang: 'gui',
        code: `
Advanced
Address: 192.168.1.1  Read Community: public  Write Community: private
SNMP Version: v2 > OK
Operations: Get > GO`
      }
    ],
    tip: 'A közösségnév gyakorlatilag jelszó – éles hálózatban kerüld a `public` / `private` neveket.'
  },
  {
    id: 'voip',
    category: 'services',
    title: 'IP telefonok (CME)',
    desc: 'A router mint telefonközpont: telefonszámok és DHCP a telefonoknak.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
telephony-service  // hívásvezérlő szolgáltatás
 max-ephones 5  // telefonok max. száma
 max-dn 5  // telefonszámok max. száma
 ip source-address 192.168.10.1 port 2000  // a router címe a telefonok felé
 auto assign 1 to 5  // számok automatikus kiosztása
exit
ephone-dn 1  // 1. telefonszám-bejegyzés
 number 1001  // a hívószám
exit
ephone-dn 2
 number 1002
exit
ip dhcp pool VOICE  // DHCP a telefonoknak
 network 192.168.10.0 255.255.255.0  // kiosztható hálózat
 default-router 192.168.10.1  // átjáró
 option 150 ip 192.168.10.1  // TFTP (CME) szerver a telefonoknak
exit`
      },
      {
        label: 'S1(config)#',
        lang: 'ios',
        code: `
interface range fastEthernet 0/1 - 5  // telefonok portjai
 switchport mode access
 switchport voice vlan 1  // hang VLAN a telefonoknak
exit`
      },
      {
        label: 'IP Phone',
        lang: 'gui',
        code: `
Physical > IP_PHONE_POWER_ADAPTER a tápcsatlakozóba
Várj, amíg a kijelzőn megjelenik a telefonszám
GUI > kagyló felvétele > szám tárcsázása`
      }
    ],
    tip: 'Kézi gombkiosztás: `ephone 1` › `mac-address 0012.17F0.A883` › `button 1:1`. Telefon újraregisztrálása: `ephone 1` › `restart`.'
  },

  /* =====================================================================
   * SECURITY
   * ===================================================================== */
  {
    id: 'passwords',
    category: 'security',
    title: 'Jelszavak (enable, console, VTY)',
    desc: 'Privilegizált mód, konzol és távoli vonalak védelme, jelszótitkosítás.',
    blocks: [{
      label: 'R1(config)#',
      lang: 'ios',
      code: `
enable secret Cisco123  // privilegizált mód jelszava (hash-elve)
line console 0  // konzol vonal
 password cisco  // konzol jelszó
 login  // jelszókérés bekapcsolása
exit
line vty 0 4  // távoli (Telnet/SSH) vonalak
 password cisco  // VTY jelszó
 login  // jelszókérés
exit
service password-encryption  // sima jelszavak titkosítása a konfigban`
    }],
    tip: 'Switch-en: `line vty 0 15`. Az `enable secret` erősebb és felülírja az `enable password`-öt.'
  },
  {
    id: 'hardening',
    category: 'security',
    title: 'Belépésvédelem és felesleges szolgáltatások',
    desc: 'Jelszóhossz, tiltás hibás próbálkozás után, időkorlát, szolgáltatások tiltása.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
security passwords min-length 10  // minimális jelszóhossz
login block-for 120 attempts 3 within 60  // 120 mp tiltás 3 hibás próba után (60 mp-en belül)
login on-failure log  // sikertelen belépések naplózása
no ip http server  // webes felület kikapcsolása
no cdp run  // CDP kikapcsolása`
      },
      {
        label: 'R1(config)# – vonalakon',
        lang: 'ios',
        code: `
line vty 0 4
 exec-timeout 5 30  // kiléptetés 5 perc 30 mp tétlenség után
 privilege level 15  // belépéskor rögtön privilegizált mód
exit`
      }
    ],
    tip: 'A minimális hossz csak az ezután beállított jelszavakra vonatkozik. Tiltott állapot ellenőrzése: `show login`.'
  },
  {
    id: 'ssh',
    category: 'security',
    title: 'SSH távoli elérés',
    desc: 'Titkosított távoli kezelés helyi felhasználóval és RSA kulccsal.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
hostname R1  // nem maradhat az alapértelmezett név
ip domain-name pelda.hu  // kell a kulcsgeneráláshoz
username admin privilege 15 secret Cisco123  // helyi felhasználó
crypto key generate rsa general-keys modulus 1024  // RSA kulcs (SSHv2-höz min. 768 bit)
ip ssh version 2  // csak SSHv2
ip ssh time-out 60  // ennyi mp alatt kell belépni
ip ssh authentication-retries 2  // hibás próbálkozások száma
line vty 0 4
 login local  // helyi felhasználóval lehet belépni
 transport input ssh  // csak SSH, Telnet tiltva
exit`
      },
      {
        label: 'PC › Command Prompt',
        lang: 'pc',
        code: `
ssh -l admin 192.168.1.1  // belépés felhasználónévvel`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show ip ssh  // SSH verzió, időkorlát, próbálkozások
show ssh  // aktív SSH kapcsolatok`
      }
    ],
    tip: 'Kulcs törlése (SSH leáll): `crypto key zeroize rsa`. Belépés IP szerinti korlátozása: standard ACL + `access-class` a VTY-on.'
  },
  {
    id: 'telnet',
    category: 'security',
    title: 'Telnet távoli elérés',
    desc: 'Titkosítatlan távoli kezelés – csak ha a feladat kifejezetten kéri.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
enable secret Cisco123  // enélkül távolról nem lehet privilegizált módba lépni
line vty 0 4
 password cisco  // VTY jelszó
 login  // jelszókérés
 transport input telnet  // csak Telnet
exit`
      },
      {
        label: 'PC › Command Prompt',
        lang: 'pc',
        code: `
telnet 192.168.1.1  // kapcsolódás`
      }
    ],
    tip: 'Hibaüzenet enable jelszó nélkül: „% No password set”. SSH és Telnet egyszerre: `transport input telnet ssh`.'
  },
  {
    id: 'acl-standard',
    category: 'security',
    title: 'Standard ACL',
    desc: 'Csak forrás IP alapján szűr. A célhoz minél közelebb kell alkalmazni.',
    blocks: [
      {
        label: 'R1(config)# – számozott',
        lang: 'ios',
        code: `
access-list 10 remark Diakhalo tiltasa  // megjegyzés a listához
access-list 10 deny 192.168.20.0 0.0.0.255  // a 192.168.20.0/24 tiltása
access-list 10 deny host 192.168.30.5  // egyetlen gép tiltása
access-list 10 permit any  // minden más engedélyezése
interface gigabitEthernet 0/1
 ip access-group 10 out  // alkalmazás kimenő irányban
exit`
      },
      {
        label: 'R1(config)# – nevesített, VTY-korlátozás',
        lang: 'ios',
        code: `
ip access-list standard CSAK_ADMIN  // nevesített standard ACL
 permit host 192.168.1.5  // csak ez a gép
 15 permit host 192.168.1.6  // beszúrás sorszámmal
 deny any  // minden más tiltva
exit
line vty 0 4
 access-class CSAK_ADMIN in  // csak az ACL szerinti gépek léphetnek be távolról
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show access-lists  // ACL-ek és találatszámok
show ip interface gigabitEthernet 0/1  // melyik ACL van az interfészen`
      }
    ],
    tip: 'Sorszámok: standard 1–99 és 1300–1999. Minden ACL végén rejtett `deny any` van. Wildcard: /24 → `0.0.0.255`, /26 → `0.0.0.63`. Törlés: `no access-list 10`, nevesítettben egy sor: `no 15`.'
  },
  {
    id: 'acl-extended',
    category: 'security',
    title: 'Extended ACL',
    desc: 'Forrás, cél, protokoll és port alapján szűr. A forráshoz közel kell alkalmazni.',
    blocks: [
      {
        label: 'R1(config)# – számozott',
        lang: 'ios',
        code: `
access-list 100 permit tcp 192.168.10.0 0.0.0.255 host 192.168.1.20 eq 80  // HTTP a webszerverre
access-list 100 permit tcp 192.168.10.0 0.0.0.255 any eq 443  // HTTPS bárhová
access-list 100 permit udp 192.168.10.0 0.0.0.255 host 192.168.1.10 eq 53  // DNS
access-list 100 deny icmp 192.168.10.0 0.0.0.255 any echo  // ping tiltása
access-list 100 permit ip any any  // minden más engedélyezése
interface gigabitEthernet 0/0
 ip access-group 100 in  // bejövő irányban, a forrás mellett
exit`
      },
      {
        label: 'R1(config)# – nevesített, visszatérő forgalom',
        lang: 'ios',
        code: `
ip access-list extended VISSZATERO  // nevesített extended ACL
 permit tcp any 192.168.10.0 0.0.0.255 established  // csak belülről indított TCP kapcsolatok válaszai
 permit tcp any any range 20 21  // porttartomány (FTP)
 deny ip any any  // minden más tiltva
exit
interface gigabitEthernet 0/0
 ip access-group VISSZATERO out  // kimenő irányban a LAN felé
exit`
      }
    ],
    tip: 'Sorszámok: 100–199 és 2000–2699. Operátorok: `eq` egyenlő, `neq` nem egyenlő, `lt` kisebb, `gt` nagyobb, `range` tartomány. Portok: FTP 20/21, SSH 22, Telnet 23, SMTP 25, DNS 53, TFTP 69, HTTP 80, POP3 110, HTTPS 443. Interfészenként irányonként csak egy ACL lehet.'
  },
  {
    id: 'port-security',
    category: 'security',
    title: 'Port security',
    desc: 'MAC-cím alapú védelem az access portokon, a nem használt portok letiltása.',
    blocks: [
      {
        label: 'S1(config)#',
        lang: 'ios',
        code: `
interface fastEthernet 0/1
 switchport mode access  // csak access porton működik
 switchport port-security  // portbiztonság bekapcsolása
 switchport port-security maximum 2  // max. 2 MAC-cím
 switchport port-security mac-address sticky  // tanult címek mentése a konfigba
 switchport port-security mac-address 0001.4292.8A2B  // MAC-cím kézzel
 switchport port-security violation restrict  // protect | restrict | shutdown
exit
interface range fastEthernet 0/20 - 24  // nem használt portok
 switchport mode access
 switchport access vlan 999  // parkoló VLAN
 shutdown  // letiltás
exit`
      },
      {
        label: 'S1#',
        lang: 'ios',
        code: `
show port-security  // összesítő portonként
show port-security interface fastEthernet 0/1  // állapot, sértések száma
show port-security address  // biztonságos MAC-címek`
      }
    ],
    tip: 'Sértéskor: `protect` eldob, nem jelez; `restrict` eldob, naplóz és számlál; `shutdown` (alap) err-disabled állapotba teszi a portot. Újraélesztés: `shutdown`, majd `no shutdown`.'
  },
  {
    id: 'dhcp-snooping',
    category: 'security',
    title: 'DHCP snooping',
    desc: 'Hamis DHCP szerverek kiszűrése: csak a megbízható portról jöhet DHCP válasz.',
    blocks: [
      {
        label: 'S1(config)#',
        lang: 'ios',
        code: `
ip dhcp snooping  // globális bekapcsolás
ip dhcp snooping vlan 10,20  // mely VLAN-okban
no ip dhcp snooping information option  // 82-es opció ki (több switchnél kell)
interface gigabitEthernet 0/1
 ip dhcp snooping trust  // megbízható port: DHCP szerver / trönk felé
exit
interface range fastEthernet 0/1 - 24
 ip dhcp snooping limit rate 10  // max. 10 DHCP üzenet/mp a nem megbízható portokon
exit`
      },
      {
        label: 'S1#',
        lang: 'ios',
        code: `
show ip dhcp snooping  // beállítások, megbízható portok
show ip dhcp snooping binding  // tanult IP–MAC–port összerendelések`
      }
    ],
    tip: 'Alapból minden port nem megbízható: csak a szerver felé néző (vagy trönk) portot jelöld trust-nak – minden switchen az útvonal mentén.'
  },
  {
    id: 'aaa',
    category: 'security',
    title: 'AAA hitelesítés (helyi, RADIUS, TACACS+)',
    desc: 'Központi felhasználókezelés hitelesítő szerverrel, helyi tartalékkal.',
    blocks: [
      {
        label: 'R1(config)# – helyi AAA',
        lang: 'ios',
        code: `
username admin secret Cisco123  // tartalék helyi felhasználó
aaa new-model  // AAA bekapcsolása
aaa authentication login default local  // belépés helyi felhasználókkal
aaa authentication login SSH-LOGIN local  // külön lista az SSH-hoz
line vty 0 4
 login authentication SSH-LOGIN  // lista hozzárendelése a VTY-hoz
exit`
      },
      {
        label: 'R1(config)# – RADIUS szerverrel',
        lang: 'ios',
        code: `
radius-server host 192.168.1.10  // RADIUS szerver
radius-server key radiuspa55  // közös titkos kulcs
aaa authentication login default group radius local  // előbb RADIUS, ha nem elérhető: helyi
line console 0
 login authentication default  // a default lista a konzolon
exit`
      },
      {
        label: 'R1(config)# – TACACS+ szerverrel',
        lang: 'ios',
        code: `
tacacs-server host 192.168.1.11  // TACACS+ szerver
tacacs-server key tacacspa55  // közös titkos kulcs
aaa authentication login default group tacacs+ local  // előbb TACACS+, ha nem elérhető: helyi`
      },
      {
        label: 'Szerver › Services › AAA',
        lang: 'gui',
        code: `
Service: On
Client Name: R1  Client IP: 192.168.1.1  Secret: radiuspa55  ServerType: Radius > Add
Username: admin2  Password: admin2pa55 > Add`
      }
    ],
    tip: 'Az `aaa new-model` után a konzolra és a VTY-ra is felhasználónév kell – előbb hozd létre a helyi felhasználót. A szerveren a Client IP a router szerver felé néző címe.'
  },
  {
    id: 'zpf',
    category: 'security',
    title: 'Zóna alapú tűzfal (ZPF)',
    desc: 'Zónák, forgalomosztály, szabály, zónapár, majd az interfészek zónába helyezése.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
zone security BELSO  // 1. zónák létrehozása
zone security KULSO  // külső zóna
access-list 101 permit ip 192.168.1.0 0.0.0.255 any  // vizsgálandó forgalom
class-map type inspect match-all BELSO-FORGALOM  // 2. forgalomosztály
 match access-group 101  // ACL alapján
exit
policy-map type inspect BELSO-KIFELE  // 3. tevékenység
 class type inspect BELSO-FORGALOM  // melyik osztályra vonatkozik
  inspect  // vizsgál és engedi a válaszokat (drop | pass)
 exit
exit
zone-pair security BELSO-KULSO source BELSO destination KULSO  // 4. zónapár iránya
 service-policy type inspect BELSO-KIFELE  // szabály a zónapárra
exit
interface gigabitEthernet 0/1
 zone-member security BELSO  // 5. interfész a belső zónába
exit
interface serial 0/0/0
 zone-member security KULSO  // külső interfész a külső zónába
exit`
      },
      {
        label: 'R1(config)# – protokoll alapú osztály',
        lang: 'ios',
        code: `
class-map type inspect match-any PROTOKOLLOK  // match-any = VAGY, match-all = ÉS
 match protocol http  // webforgalom
 match protocol https  // titkosított web
 match protocol dns  // névfeloldás
 match protocol icmp  // ping
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show zone security  // zónák és tagjaik
show zone-pair security  // zónapárok
show policy-map type inspect zone-pair sessions  // aktív vizsgált kapcsolatok`
      }
    ],
    tip: 'Előfeltétel a securityk9 licenc (lásd: IOS image és licenc). Zónák között alapból minden tiltott, a válaszforgalmat az `inspect` engedi vissza.'
  },

  /* =====================================================================
   * WAN ÉS VPN
   * ===================================================================== */
  {
    id: 'ppp',
    category: 'wan',
    title: 'Soros link: PPP, PAP, CHAP',
    desc: 'PPP beágyazás a soros interfészen, hitelesítéssel.',
    blocks: [
      {
        label: 'R1(config)# – PPP',
        lang: 'ios',
        code: `
interface serial 0/0/0
 ip address 10.0.0.1 255.255.255.252
 encapsulation ppp  // PPP beágyazás (gyári: hdlc)
 clock rate 64000  // csak DCE oldalon
 no shutdown
exit`
      },
      {
        label: 'R1(config)# – PAP',
        lang: 'ios',
        code: `
username R2 password paptitok  // a másik router neve és jelszava
interface serial 0/0/0
 ppp authentication pap  // PAP hitelesítés megkövetelése
 ppp pap sent-username R1 password paptitok  // saját név és jelszó küldése
exit`
      },
      {
        label: 'R1(config)# – CHAP',
        lang: 'ios',
        code: `
hostname R1  // CHAP-nál a hostname a felhasználónév
username R2 password chaptitok  // a szomszéd hostname-je, közös jelszó
interface serial 0/0/0
 ppp authentication chap  // CHAP – mindkét routeren kell
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show interfaces serial 0/0/0  // beágyazás, LCP állapot
debug ppp authentication  // hitelesítés hibakeresése
undebug all`
      }
    ],
    tip: 'Mindkét oldalon ugyanaz legyen a beágyazás. CHAP-nál a jelszó egyezzen, a felhasználónév pedig a másik router hostname-je (kis- és nagybetű számít). A PAP titkosítatlanul küld, a CHAP nem.'
  },
  {
    id: 'gre',
    category: 'wan',
    title: 'GRE alagút',
    desc: 'Virtuális pont-pont kapcsolat két telephely között az interneten át.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
interface tunnel 0  // virtuális alagút interfész
 ip address 172.16.0.1 255.255.255.252  // alagút belső címe
 tunnel source serial 0/0/0  // saját külső interfész
 tunnel destination 209.165.200.226  // a másik router publikus címe
 tunnel mode gre ip  // GRE (alapértelmezett)
exit
ip route 192.168.2.0 255.255.255.0 172.16.0.2  // távoli LAN az alagúton át`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show interfaces tunnel 0  // forrás, cél, állapot
show ip interface brief  // az alagút up/up legyen`
      }
    ],
    tip: 'A másik routeren tükörképesen: forrás és cél felcserélve, alagútcím `172.16.0.2`. A GRE nem titkosít, viszont OSPF is futhat rajta.'
  },
  {
    id: 'ipsec-s2s',
    category: 'wan',
    title: 'Site-to-site IPsec VPN',
    desc: 'Titkosított alagút két router között: IKE (1. fázis), IPsec (2. fázis), crypto map.',
    blocks: [
      {
        label: 'R1(config)# – 1. érdekes forgalom és IKE',
        lang: 'ios',
        code: `
access-list 110 permit ip 192.168.1.0 0.0.0.255 192.168.3.0 0.0.0.255  // titkosítandó forgalom
crypto isakmp policy 10  // IKE 1. fázis szabály
 encryption aes 256  // titkosítás
 hash sha  // integritás
 authentication pre-share  // előre megosztott kulcs
 group 5  // Diffie-Hellman csoport
 lifetime 86400  // élettartam (mp)
exit
crypto isakmp key vpnpa55 address 10.2.2.2  // közös kulcs a társ címével`
      },
      {
        label: 'R1(config)# – 2. IPsec és crypto map',
        lang: 'ios',
        code: `
crypto ipsec transform-set VPN-SET esp-aes esp-sha-hmac  // titkosítás és hitelesítés
crypto map VPN-MAP 10 ipsec-isakmp  // crypto map létrehozása
 description VPN R3 fele  // leírás
 set peer 10.2.2.2  // a másik végpont
 set transform-set VPN-SET  // a 2. fázis beállításai
 match address 110  // az érdekes forgalom ACL-je
exit
interface serial 0/0/0
 crypto map VPN-MAP  // alkalmazás a külső interfészen
exit`
      },
      {
        label: 'R1#',
        lang: 'ios',
        code: `
show crypto isakmp sa  // IKE (1. fázis) állapot
show crypto ipsec sa  // titkosított / visszafejtett csomagok száma
show crypto map  // crypto map beállítások`
      }
    ],
    tip: 'Előfeltétel a securityk9 licenc. A túloldalon tükörképesen (ACL-ben forrás és cél felcserélve, `set peer` és `key address` a túloldal címe). Az alagút az első érdekes forgalomra (pl. PC–PC ping) épül fel. NAT mellett a VPN forgalmat `deny` sorral ki kell zárni a NAT ACL-ből.'
  },
  {
    id: 'remote-vpn',
    category: 'wan',
    title: 'Távoli elérésű VPN (PC kliens)',
    desc: 'A PC VPN kliense csatlakozik a routerhez, és belső címet kap.',
    blocks: [
      {
        label: 'R1(config)#',
        lang: 'ios',
        code: `
username vpnuser password cisco  // VPN felhasználó
aaa new-model  // AAA bekapcsolása
aaa authentication login VPN-AUTH local  // hitelesítési lista
aaa authorization network VPN-AUTHOR local  // jogosultsági lista
ip local pool VPN-POOL 192.168.0.20 192.168.0.25  // klienseknek kiosztott címek
crypto isakmp policy 10  // IKE 1. fázis szabály
 encryption 3des  // titkosítás
 hash sha  // integritás
 authentication pre-share  // előre megosztott kulcs
 group 2  // Diffie-Hellman csoport
exit
crypto isakmp client configuration group VPNCSOPORT  // VPN csoport
 key cisco123  // csoportkulcs
 pool VPN-POOL  // innen kapnak címet a kliensek
 netmask 255.255.255.0  // a kiosztott címek maszkja
exit
crypto ipsec transform-set VPN-SET esp-3des esp-sha-hmac  // IPsec titkosítás és hitelesítés
crypto dynamic-map DYN-MAP 10  // dinamikus map ismeretlen kliens címekhez
 set transform-set VPN-SET  // transform set hozzárendelése
 reverse-route  // útvonal a kliens felé
exit
crypto map CLIENT-MAP client authentication list VPN-AUTH  // felhasználók hitelesítése
crypto map CLIENT-MAP isakmp authorization list VPN-AUTHOR  // csoport jogosultságai
crypto map CLIENT-MAP client configuration address respond  // címet ad a kliensnek
crypto map CLIENT-MAP 10 ipsec-isakmp dynamic DYN-MAP  // dinamikus map a crypto mapbe
interface gigabitEthernet 0/1
 crypto map CLIENT-MAP  // külső interfészen
exit`
      },
      {
        label: 'PC › Desktop › VPN',
        lang: 'gui',
        code: `
GroupName: VPNCSOPORT  Group Key: cisco123
Host IP (Server IP): 203.0.113.1
Username: vpnuser  Password: cisco
Connect`
      }
    ],
    tip: 'Előfeltétel a securityk9 licenc. Sikeres csatlakozás után a PC a VPN-POOL-ból kap belső címet (`ipconfig`). Az `aaa new-model` miatt a konzolhoz is felhasználónév kell.'
  },

  /* =====================================================================
   * WIRELESS & HOME
   * ===================================================================== */
  {
    id: 'home-router',
    category: 'wireless',
    title: 'Home router alapbeállítások',
    desc: 'WRT300N / Home Router: internetkapcsolat, LAN-címzés és DHCP a GUI fülön.',
    blocks: [
      {
        label: 'Home Router › GUI › Setup',
        lang: 'gui',
        code: `
Internet Setup: Automatic Configuration - DHCP  // vagy Static IP
Router IP: 192.168.0.1  Subnet Mask: 255.255.255.0  // LAN oldali cím
DHCP Server: Enabled  // címosztás a klienseknek
Start IP Address: 192.168.0.100  Maximum Number of Users: 50
Save Settings`
      },
      {
        label: 'GUI › Administration › Management',
        lang: 'gui',
        code: `
Router Password: Admin123  Re-Enter to Confirm: Admin123  // webes belépés jelszava
Save Settings`
      }
    ],
    tip: 'Kliens böngészőjéből is elérhető: `http://192.168.0.1` (alapból admin / admin). LAN IP módosítása után frissítsd a kliensek DHCP címét.'
  },
  {
    id: 'home-wifi',
    category: 'wireless',
    title: 'Home router Wi-Fi és titkosítás',
    desc: 'SSID, csatorna és WPA2 Personal beállítása.',
    blocks: [{
      label: 'Home Router › GUI › Wireless',
      lang: 'gui',
      code: `
Basic Wireless Settings
Network Name (SSID): OTTHONI_WIFI  // hálózat neve
Standard Channel: 6  // csatorna (1, 6, 11 nem fedik egymást)
SSID Broadcast: Enabled  // látható legyen-e a név
Save Settings
Wireless Security
Security Mode: WPA2 Personal
Encryption: AES
Passphrase: Jelszo1234  // min. 8 karakter
Save Settings`
    }],
    tip: 'Az SSID kis- és nagybetűérzékeny.'
  },
  {
    id: 'access-point',
    category: 'wireless',
    title: 'Access Point (AP) konfiguráció',
    desc: 'AccessPoint-PT: SSID és WPA2-PSK a Config fülön, a vezeték nélküli Port 1 alatt.',
    blocks: [{
      label: 'AP › Config › Port 1',
      lang: 'gui',
      code: `
Port Status: On
SSID: IRODA_WIFI
2.4 GHz Channel: 6
Authentication: WPA2-PSK
PSK Pass Phrase: Jelszo1234
Encryption Type: AES`
    }],
    tip: 'Az AP csak 2. rétegbeli eszköz: nincs saját DHCP-je, a kliensek a vezetékes hálózat DHCP szerverétől kapnak címet.'
  },
  {
    id: 'wireless-client',
    category: 'wireless',
    title: 'Vezeték nélküli kliens csatlakoztatása',
    desc: 'Asztali PC-be Wi-Fi modul, majd csatlakozás a hálózathoz.',
    blocks: [{
      label: 'PC › Physical, majd Config',
      lang: 'gui',
      code: `
Physical > Power gomb: kikapcsolás
Physical > Ethernet modul ki > WPC300N be
Physical > Power gomb: bekapcsolás
Config > Wireless0
SSID: IRODA_WIFI
Authentication: WPA2-PSK  PSK Pass Phrase: Jelszo1234
Encryption Type: AES
IP Configuration: DHCP
# Alternatíva: Desktop > PC Wireless > Connect > Refresh > Connect`
    }],
    tip: 'Laptopnál ugyanígy cseréld a modult. Tablet és okostelefon alapból vezeték nélküli.'
  },

  /* =====================================================================
   * IoT
   * ===================================================================== */
  {
    id: 'iot-registration',
    category: 'iot',
    title: 'IoT Registration Server beállítása',
    desc: 'A szerver IoT szolgáltatása, majd felhasználói fiók létrehozása böngészőből.',
    blocks: [
      {
        label: 'Szerver › Services',
        lang: 'gui',
        code: `
Services > IoT > Service: On`
      },
      {
        label: 'PC › Desktop › Web Browser',
        lang: 'gui',
        code: `
URL: http://192.168.1.10
Sign up now
Username: admin  Password: admin > Create`
      }
    ],
    tip: 'Ha van DNS rekord is, a szerver név alapján is elérhető (pl. `iot.pelda.hu`).'
  },
  {
    id: 'iot-connect',
    category: 'iot',
    title: 'IoT eszköz csatlakoztatása',
    desc: 'Okoseszköz regisztrálása a Registration Serverre vagy a Home Gateway-re.',
    blocks: [{
      label: 'IoT eszköz › Config',
      lang: 'gui',
      code: `
FastEthernet0 (vagy Wireless0) > IP Configuration: DHCP
Settings > IoT Server: Remote Server
Server Address: 192.168.1.10
User Name: admin
Password: admin
Connect
# Home Gateway esetén: IoT Server: Home Gateway`
    }],
    tip: 'Sikeres csatlakozás után az eszköz megjelenik a szerver webes felületén (IoT Server › Devices). Home Gateway (DLC100) felülete: `192.168.25.1`, admin / admin.'
  },
  {
    id: 'iot-condition',
    category: 'iot',
    title: 'IoT feltételes szabály',
    desc: 'Automatizálás a szerver webes felületén: ha a mozgásérzékelő jelez, kinyílik a garázsajtó.',
    blocks: [{
      label: 'PC › Web Browser › IoT Server',
      lang: 'gui',
      code: `
URL: http://192.168.1.10 > bejelentkezés
Conditions > Add
Name: Garazs_nyit  Enabled: pipa
If: Motion Detector On is true
Then set: Garage Door On to true
OK
# Zárás: új szabály, If: Motion Detector On is false, Then: Garage Door On to false`
    }],
    tip: 'Az eszköz tulajdonságának pontos neve a Devices listában látható. IoT eszközzel szimulációban Alt + kattintással lehet interakcióba lépni.'
  },
  {
    id: 'iot-mcu-garage',
    category: 'iot',
    title: 'Garázsajtó nyitása MCU-val',
    desc: 'Nyomógomb → MCU → garázsajtó közvetlen vezérlés, IoT Custom Cable kábelezéssel.',
    blocks: [
      {
        label: 'Kábelezés és projekt',
        lang: 'gui',
        code: `
Push Button D0 > MCU D0  (IoT Custom Cable)
Garage Door D0 > MCU D1  (IoT Custom Cable)
MCU > Programming > New > Template: Empty - Python
main.py szerkesztése > Run`
      },
      {
        label: 'MCU › main.py',
        lang: 'python',
        code: `
from gpio import *
from time import *

BUTTON = 0   # D0: nyomógomb
DOOR = 1     # D1: garázsajtó

def main():
    pinMode(BUTTON, IN)
    pinMode(DOOR, OUT)
    door_open = False
    prev = LOW
    while True:
        state = digitalRead(BUTTON)
        # felfutó él: épp most nyomták meg a gombot
        if state == HIGH and prev == LOW:
            door_open = not door_open
            if door_open:
                customWrite(DOOR, "1")
                print("Garazsajto: NYITVA")
            else:
                customWrite(DOOR, "0")
                print("Garazsajto: ZARVA")
        prev = state
        delay(100)

if __name__ == "__main__":
    main()`
      }
    ],
    tip: 'A gombot szimulációban Alt + kattintással nyomhatod meg. Ha az ajtó nem reagál, nézd meg a garázsajtó Advanced › Programming kódjában, milyen bemenetet vár.'
  }
];
