-- Mercado Casa: tablas para compartir los datos de un hogar entre varias cuentas.
-- Ejecuta este archivo completo en Supabase › SQL Editor › New query › Run.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi casa',
  invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users on delete set null
);

create table if not exists public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Una persona pertenece a un solo hogar.
create unique index if not exists household_members_one_per_user on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function public.is_household_member(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from household_members where household_id = h and user_id = auth.uid());
$$;

drop policy if exists "miembros leen su hogar" on public.households;
create policy "miembros leen su hogar" on public.households
  for select using (public.is_household_member(id));

drop policy if exists "miembros actualizan su hogar" on public.households;
create policy "miembros actualizan su hogar" on public.households
  for update using (public.is_household_member(id)) with check (public.is_household_member(id));

drop policy if exists "miembros ven a los demás miembros" on public.household_members;
create policy "miembros ven a los demás miembros" on public.household_members
  for select using (public.is_household_member(household_id));

drop policy if exists "cada quien cambia su nombre" on public.household_members;
create policy "cada quien cambia su nombre" on public.household_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Marca quién y cuándo hizo el último cambio.
create or replace function public.touch_household()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists households_touch on public.households;
create trigger households_touch before update on public.households
  for each row execute function public.touch_household();

-- Crear un hogar con los datos de este celular.
create or replace function public.create_household(p_name text, p_display_name text, p_data jsonb)
returns public.households language plpgsql security definer set search_path = public as $$
declare h households;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
  end if;
  insert into households (name, data, updated_by) values (coalesce(nullif(trim(p_name), ''), 'Mi casa'), p_data, auth.uid())
    returning * into h;
  insert into household_members (household_id, user_id, display_name) values (h.id, auth.uid(), coalesce(p_display_name, ''));
  return h;
end $$;

-- Unirse a un hogar con su código de invitación.
create or replace function public.join_household(p_code text, p_display_name text)
returns public.households language plpgsql security definer set search_path = public as $$
declare h households;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
  end if;
  select * into h from households where invite_code = upper(trim(p_code));
  if h.id is null then raise exception 'invalid_code'; end if;
  insert into household_members (household_id, user_id, display_name) values (h.id, auth.uid(), coalesce(p_display_name, ''));
  return h;
end $$;

-- Salir del hogar (si era el último miembro, el hogar se borra).
create or replace function public.leave_household()
returns void language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  delete from household_members where user_id = auth.uid() returning household_id into h;
  if h is not null and not exists (select 1 from household_members where household_id = h) then
    delete from households where id = h;
  end if;
end $$;

revoke all on function public.create_household(text, text, jsonb) from anon;
revoke all on function public.join_household(text, text) from anon;
revoke all on function public.leave_household() from anon;

-- Cambios en tiempo real entre los celulares del hogar.
do $$ begin
  alter publication supabase_realtime add table public.households;
exception when duplicate_object then null; end $$;
