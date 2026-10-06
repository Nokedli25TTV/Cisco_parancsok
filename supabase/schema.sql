-- =========================================================================
-- Osztályoldal – adatbázis (Supabase / PostgreSQL)
--
-- Futtatás: Supabase › SQL Editor › New query › az egész fájl bemásolása › Run.
-- Többször is lefuttatható, a meglévő adatokat nem törli.
--
-- Szerepek (profilok.szerep):
--   varakozo    regisztrált, de még nincs jóváhagyva – semmit nem lát
--   tag         olvashat: naptár, órarend, hirdetések
--   szerkeszto  írhat is: naptár, órarend, hirdetések
--   admin       ezen felül tagokat hagy jóvá, szerepet állít, tagot töröl
-- Az ELSŐ regisztráló automatikusan admin lesz.
--
-- A védelem nem azon múlik, hogy ez a fájl vagy a kulcs titkos-e, hanem a
-- lenti RLS szabályokon: a böngészőből csak az érhető el, amit ezek engednek.
-- =========================================================================

-- ---------- 1. Táblák ----------
create table if not exists public.profilok (
  id         uuid primary key references auth.users on delete cascade,
  nev        text not null check (char_length(nev) between 2 and 40),
  csoport    text check (csoport in ('A', 'B')),
  szerep     text not null default 'varakozo'
             check (szerep in ('varakozo', 'tag', 'szerkeszto', 'admin')),
  letrehozva timestamptz not null default now()
);

create table if not exists public.esemenyek (
  id         bigint generated always as identity primary key,
  cim        text not null check (char_length(cim) between 1 and 120),
  tipus      text not null default 'egyeb'
             check (tipus in ('doga', 'beadando', 'vizsga', 'szunet', 'egyeb')),
  targy      text check (char_length(targy) <= 60),
  datum      date not null,
  ido        time,
  veg        date check (veg is null or veg >= datum),   -- többnapos esemény utolsó napja
  leiras     text check (char_length(leiras) <= 2000),
  teendok    jsonb not null default '[]'::jsonb,         -- ["első teendő", "második"]
  link       text check (link is null or link ~ '^https?://'),
  letrehozta uuid default auth.uid() references public.profilok on delete set null,
  letrehozva timestamptz not null default now()
);

create table if not exists public.hirdetesek (
  id         bigint generated always as identity primary key,
  szoveg     text not null check (char_length(szoveg) between 1 and 600),
  kituzve    boolean not null default false,
  lejar      date,                                       -- e nap után már nem jelenik meg
  letrehozta uuid default auth.uid() references public.profilok on delete set null,
  letrehozva timestamptz not null default now()
);

create table if not exists public.orarend (
  id      bigint generated always as identity primary key,
  nap     smallint not null check (nap between 1 and 5),       -- 1 = hétfő
  ora_tol smallint not null check (ora_tol between 1 and 12),
  ora_ig  smallint not null check (ora_ig between 1 and 12),
  csoport text not null default 'mind' check (csoport in ('mind', 'A', 'B')),
  targy   text not null check (char_length(targy) between 1 and 60),
  terem   text check (char_length(terem) <= 20),
  tanar   text check (char_length(tanar) <= 40),
  check (ora_ig >= ora_tol)
);

create index if not exists esemenyek_datum_idx on public.esemenyek (datum);

-- ---------- 2. Segédfüggvények a szabályokhoz ----------
-- SECURITY DEFINER: a profilok táblát a hívó jogaitól függetlenül olvassák,
-- így a szabályok nem hivatkoznak körkörösen önmagukra.
create or replace function public.sajat_szerep()
returns text language sql stable security definer set search_path = '' as $$
  select szerep from public.profilok where id = (select auth.uid())
$$;

create or replace function public.tag_e()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.sajat_szerep() in ('tag', 'szerkeszto', 'admin'), false)
$$;

create or replace function public.szerkeszto_e()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.sajat_szerep() in ('szerkeszto', 'admin'), false)
$$;

create or replace function public.admin_e()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.sajat_szerep() = 'admin', false)
$$;

-- ---------- 3. Profil létrehozása regisztrációkor ----------
create or replace function public.uj_felhasznalo()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_nev     text := left(trim(coalesce(new.raw_user_meta_data ->> 'nev', '')), 40);
  v_csoport text := new.raw_user_meta_data ->> 'csoport';
begin
  if char_length(v_nev) < 2 then
    v_nev := 'Névtelen';
  end if;

  insert into public.profilok (id, nev, csoport, szerep)
  values (
    new.id,
    v_nev,
    case when v_csoport in ('A', 'B') then v_csoport end,
    -- a legelső regisztráló az admin, mindenki más jóváhagyásra vár
    case when exists (select 1 from public.profilok) then 'varakozo' else 'admin' end
  );
  return new;
end;
$$;

drop trigger if exists uj_felhasznalo on auth.users;
create trigger uj_felhasznalo
  after insert on auth.users
  for each row execute function public.uj_felhasznalo();

-- ---------- 4. Admin műveletek ----------
create or replace function public.szerep_beallitas(kinek uuid, uj text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_e() then
    raise exception 'Csak admin állíthat szerepet.';
  end if;
  if uj not in ('varakozo', 'tag', 'szerkeszto', 'admin') then
    raise exception 'Ismeretlen szerep.';
  end if;
  if kinek = (select auth.uid()) then
    raise exception 'A saját szerepedet nem módosíthatod.';   -- így mindig marad admin
  end if;
  update public.profilok set szerep = uj where id = kinek;
end;
$$;

create or replace function public.tag_torlese(kinek uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.admin_e() then
    raise exception 'Csak admin törölhet tagot.';
  end if;
  if kinek = (select auth.uid()) then
    raise exception 'Saját magadat nem törölheted.';
  end if;
  delete from auth.users where id = kinek;                    -- a profil vele törlődik
end;
$$;

revoke execute on function public.szerep_beallitas(uuid, text) from public, anon;
revoke execute on function public.tag_torlese(uuid) from public, anon;
grant execute on function public.szerep_beallitas(uuid, text) to authenticated;
grant execute on function public.tag_torlese(uuid) to authenticated;

-- ---------- 5. Sorszintű védelem (RLS) ----------
alter table public.profilok   enable row level security;
alter table public.esemenyek  enable row level security;
alter table public.hirdetesek enable row level security;
alter table public.orarend    enable row level security;

-- Belépés nélkül (anon) semmihez nincs hozzáférés; belépve a táblajogok
-- megvannak, de hogy melyik sorhoz, azt a lenti szabályok döntik el.
revoke all on public.profilok, public.esemenyek, public.hirdetesek, public.orarend from anon;
grant select on public.profilok to authenticated;
grant select, insert, update, delete
  on public.esemenyek, public.hirdetesek, public.orarend to authenticated;

-- Profil: a sajátját mindenki látja, a többiekét csak jóváhagyott tag.
-- Módosítani csak a saját nevet és csoportot lehet – a szerepet NEM
-- (azt csak a szerep_beallitas függvény írhatja).
revoke insert, update, delete on public.profilok from authenticated;
grant update (nev, csoport) on public.profilok to authenticated;

drop policy if exists profil_olvasas on public.profilok;
create policy profil_olvasas on public.profilok
  for select to authenticated
  using (id = (select auth.uid()) or public.tag_e());

drop policy if exists profil_sajat_modositas on public.profilok;
create policy profil_sajat_modositas on public.profilok
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Naptár, hirdetések, órarend: tag olvas, szerkesztő ír
drop policy if exists esemeny_olvasas on public.esemenyek;
create policy esemeny_olvasas on public.esemenyek
  for select to authenticated using (public.tag_e());
drop policy if exists esemeny_iras on public.esemenyek;
create policy esemeny_iras on public.esemenyek
  for all to authenticated
  using (public.szerkeszto_e()) with check (public.szerkeszto_e());

drop policy if exists hirdetes_olvasas on public.hirdetesek;
create policy hirdetes_olvasas on public.hirdetesek
  for select to authenticated using (public.tag_e());
drop policy if exists hirdetes_iras on public.hirdetesek;
create policy hirdetes_iras on public.hirdetesek
  for all to authenticated
  using (public.szerkeszto_e()) with check (public.szerkeszto_e());

drop policy if exists orarend_olvasas on public.orarend;
create policy orarend_olvasas on public.orarend
  for select to authenticated using (public.tag_e());
drop policy if exists orarend_iras on public.orarend;
create policy orarend_iras on public.orarend
  for all to authenticated
  using (public.szerkeszto_e()) with check (public.szerkeszto_e());

-- ---------- 6. Élő frissítés (Realtime) ----------
do $$
declare
  t text;
begin
  foreach t in array array['esemenyek', 'hirdetesek', 'orarend'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
