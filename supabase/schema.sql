-- =====================================================================
--  Moderación automática de WhatsApp — Base de datos (Supabase)
--  Pegar TODO este archivo en Supabase → SQL Editor → Run.
--  Se puede volver a ejecutar sin romper nada (no borra datos).
--  Zona horaria de la comunidad: America/Santiago.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Utilidades
-- ---------------------------------------------------------------------

-- Mantiene la columna updated_at al día.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Fecha "de hoy" según la hora de Chile.
create or replace function public.today_santiago()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Santiago')::date;
$$;

-- ---------------------------------------------------------------------
-- 1. Administradores del panel (solo estos correos pueden ver datos)
-- ---------------------------------------------------------------------
create table if not exists public.app_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------
-- 2. Ajustes generales (una sola fila, id = 1)
--    Textos: se pueden usar {usuario} {motivo} {grupo} {faltas} {max_faltas}
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id                     smallint primary key default 1 check (id = 1),
  test_mode              boolean  not null default true,
  warning_expiry_days    integer  not null default 30 check (warning_expiry_days between 1 and 365),
  strikes_to_kick        integer  not null default 3  check (strikes_to_kick between 1 and 10),
  auto_blacklist_on_kick boolean  not null default false,
  owner_phone            text     check (owner_phone is null or owner_phone ~ '^[0-9]{8,15}$'),
  daily_summary_enabled  boolean  not null default true,
  daily_summary_time     time     not null default '21:30',
  action_delay_min_ms    integer  not null default 1500 check (action_delay_min_ms >= 0),
  action_delay_max_ms    integer  not null default 4000 check (action_delay_max_ms >= 0),
  msg_warning            text     not null default
    'Hola {usuario} 👋 Tu mensaje fue eliminado porque {motivo}. Te pedimos revisar las normas del grupo. ¡Gracias por tu comprensión! 🙏',
  msg_final_warning      text     not null default
    '⚠️ {usuario}, tu mensaje fue eliminado porque {motivo}. Esta es tu *última advertencia*: si vuelve a ocurrir serás removido del grupo.',
  msg_kick               text     not null default
    '{usuario} fue removido del grupo por no respetar las normas en reiteradas ocasiones.',
  timezone               text     not null default 'America/Santiago',
  updated_at             timestamptz not null default now(),
  constraint delay_range check (action_delay_max_ms >= action_delay_min_ms)
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. Estado del bot (una sola fila, id = 1). El bot la actualiza cada minuto.
--    wa_state: 'conectado' | 'conectando' | 'esperando_qr' | 'desconectado' | 'sesion_cerrada'
-- ---------------------------------------------------------------------
create table if not exists public.bot_status (
  id             smallint primary key default 1 check (id = 1),
  last_heartbeat timestamptz,
  wa_state       text not null default 'desconectado',
  wa_number      text,
  qr_code        text,
  started_at     timestamptz,
  bot_version    text,
  last_error     text,
  updated_at     timestamptz not null default now()
);

insert into public.bot_status (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 4. Plantillas de reglas (una por tipo de grupo)
--    Formato de "rules" (lo usan el bot y el panel):
--    {
--      "only_chile": { "enabled": true },
--      "no_links":   { "enabled": true, "reason": "..." },
--      "schedule":   { "enabled": true, "start": "08:00", "end": "21:00", "reason": "..." },
--      "max_photos": { "enabled": true, "max": 3, "album_window_seconds": 20, "reason": "..." },
--      "post_limit": { "enabled": true, "max_posts": 3, "window_days": 7,
--                      "no_consecutive_days": false, "reason": "..." }
--    }
--    (Más adelante se podrá sumar "ai_review" sin cambiar las tablas.)
-- ---------------------------------------------------------------------
create table if not exists public.rule_presets (
  key        text primary key,
  label      text not null,
  sort       integer not null default 0,
  rules      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.rule_presets (key, label, sort, rules) values
('ventas', 'Ventas zona oriente', 1, '{
  "only_chile": { "enabled": true },
  "no_links":   { "enabled": true, "reason": "no se permiten enlaces en este grupo" },
  "schedule":   { "enabled": true, "start": "08:00", "end": "21:00",
                  "reason": "solo se puede publicar entre las {start} y las {end} hrs" },
  "max_photos": { "enabled": true, "max": 3, "album_window_seconds": 20,
                  "reason": "se permiten máximo {max} fotos por publicación" },
  "post_limit": { "enabled": true, "max_posts": 3, "window_days": 7, "no_consecutive_days": false,
                  "reason": "se permiten máximo {max_posts} publicaciones cada {window_days} días" }
}'::jsonb),
('trabajos', 'Trabajos zona oriente', 2, '{
  "only_chile": { "enabled": true },
  "no_links":   { "enabled": true, "reason": "no se permiten enlaces en este grupo" },
  "schedule":   { "enabled": true, "start": "08:00", "end": "21:00",
                  "reason": "solo se puede publicar entre las {start} y las {end} hrs" },
  "max_photos": { "enabled": false, "max": 3, "album_window_seconds": 20,
                  "reason": "se permiten máximo {max} fotos por publicación" },
  "post_limit": { "enabled": false, "max_posts": 3, "window_days": 7, "no_consecutive_days": false,
                  "reason": "se permiten máximo {max_posts} publicaciones cada {window_days} días" }
}'::jsonb),
('servicios', 'Servicios zona oriente de Santiago', 3, '{
  "only_chile": { "enabled": true },
  "no_links":   { "enabled": true, "reason": "no se permiten enlaces en este grupo" },
  "schedule":   { "enabled": true, "start": "09:00", "end": "21:00",
                  "reason": "solo se puede publicar entre las {start} y las {end} hrs" },
  "max_photos": { "enabled": false, "max": 3, "album_window_seconds": 20,
                  "reason": "se permiten máximo {max} fotos por publicación" },
  "post_limit": { "enabled": true, "max_posts": 3, "window_days": 7, "no_consecutive_days": true,
                  "reason": "se permiten máximo {max_posts} publicaciones cada {window_days} días y no en días seguidos" }
}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 5. Grupos donde está el bot (los crea el bot al conectarse)
--    Un grupo solo se modera si enabled = true y tiene reglas.
-- ---------------------------------------------------------------------
create table if not exists public.groups (
  id                 uuid primary key default gen_random_uuid(),
  wa_jid             text not null unique,
  wa_name            text,
  preset             text references public.rule_presets(key) on update cascade on delete set null,
  enabled            boolean not null default false,
  rules              jsonb not null default '{}'::jsonb,
  bot_is_admin       boolean not null default false,
  participants_count integer,
  present            boolean not null default true,
  last_synced_at     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Al elegir (o cambiar) la plantilla de un grupo, se copian sus reglas.
create or replace function public.groups_apply_preset()
returns trigger
language plpgsql
as $$
begin
  if new.preset is not null
     and (tg_op = 'INSERT' or new.preset is distinct from old.preset)
     and (tg_op = 'INSERT' or new.rules is not distinct from old.rules) then
    select p.rules into new.rules from public.rule_presets p where p.key = new.preset;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Advertencias (se cuentan por grupo; vencen según settings.warning_expiry_days)
--    test_mode = true → advertencia "simulada" en modo prueba (no se mezcla con las reales).
-- ---------------------------------------------------------------------
create table if not exists public.warnings (
  id         bigint generated always as identity primary key,
  group_id   uuid not null references public.groups(id) on delete cascade,
  phone      text not null,
  rule       text not null,
  excerpt    text,
  test_mode  boolean not null default false,
  created_at timestamptz not null default now(),
  cleared_at timestamptz
);
create index if not exists warnings_lookup on public.warnings (group_id, phone, created_at desc);
create index if not exists warnings_phone  on public.warnings (phone);

-- Advertencias vigentes (no vencidas ni reseteadas).
create or replace view public.active_warnings
with (security_invoker = true)
as
  select w.*
  from public.warnings w
  cross join public.settings s
  where s.id = 1
    and w.cleared_at is null
    and w.created_at > now() - make_interval(days => s.warning_expiry_days);

-- ---------------------------------------------------------------------
-- 7. Publicaciones aceptadas (para límites por semana / días seguidos)
--    local_day = día en hora de Chile.
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id            bigint generated always as identity primary key,
  group_id      uuid not null references public.groups(id) on delete cascade,
  phone         text not null,
  wa_message_id text,
  kind          text not null default 'texto',
  photo_count   integer not null default 0,
  excerpt       text,
  local_day     date not null default public.today_santiago(),
  created_at    timestamptz not null default now()
);
create index if not exists posts_lookup on public.posts (group_id, phone, created_at desc);
create index if not exists posts_phone  on public.posts (phone);

-- ---------------------------------------------------------------------
-- 8. Registro de acciones
--    rule:   only_chile | no_links | schedule | max_photos | post_limit | blacklist | manual | system
--    action: delete | warn | final_warn | kick | review | blacklist_add | blacklist_remove
--            | reset | info | error
-- ---------------------------------------------------------------------
create table if not exists public.action_log (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  group_id        uuid references public.groups(id) on delete set null,
  group_name      text,
  phone           text,
  participant_jid text,
  rule            text,
  action          text not null,
  test_mode       boolean not null default false,
  success         boolean not null default true,
  excerpt         text,
  details         jsonb not null default '{}'::jsonb
);
create index if not exists action_log_created on public.action_log (created_at desc);
create index if not exists action_log_group   on public.action_log (group_id, created_at desc);
create index if not exists action_log_phone   on public.action_log (phone, created_at desc);

-- ---------------------------------------------------------------------
-- 9. Contador de mensajes revisados por día y grupo
-- ---------------------------------------------------------------------
create table if not exists public.daily_counters (
  day              date not null,
  group_id         uuid not null references public.groups(id) on delete cascade,
  messages_checked integer not null default 0,
  primary key (day, group_id)
);

create or replace function public.increment_messages_checked(p_group_id uuid, p_count integer default 1)
returns void
language sql
as $$
  insert into public.daily_counters as d (day, group_id, messages_checked)
  values (public.today_santiago(), p_group_id, p_count)
  on conflict (day, group_id)
  do update set messages_checked = d.messages_checked + excluded.messages_checked;
$$;

-- Resumen de un día (hora de Chile) por grupo. Excluye o incluye modo prueba según la acción registrada.
create or replace function public.daily_summary(p_day date default public.today_santiago())
returns table (
  group_id         uuid,
  group_name       text,
  messages_checked integer,
  deleted          integer,
  warnings         integer,
  kicks            integer,
  reviews          integer,
  simulated        integer
)
language sql
stable
security invoker
as $$
  with acts as (
    select a.*
    from public.action_log a
    where (a.created_at at time zone 'America/Santiago')::date = p_day
      and a.group_id is not null
  )
  select
    g.id,
    coalesce(g.wa_name, '(sin nombre)'),
    coalesce(dc.messages_checked, 0),
    (select count(*) from acts where acts.group_id = g.id and action = 'delete' and not test_mode)::int,
    (select count(*) from acts where acts.group_id = g.id and action in ('warn','final_warn') and not test_mode)::int,
    (select count(*) from acts where acts.group_id = g.id and action = 'kick' and not test_mode)::int,
    (select count(*) from acts where acts.group_id = g.id and action = 'review')::int,
    (select count(*) from acts where acts.group_id = g.id and test_mode)::int
  from public.groups g
  left join public.daily_counters dc on dc.group_id = g.id and dc.day = p_day
  where g.enabled
  order by g.wa_name;
$$;

-- ---------------------------------------------------------------------
-- 10. Lista negra (común a toda la comunidad)
--     source: panel | whatsapp | auto
-- ---------------------------------------------------------------------
create table if not exists public.blacklist (
  phone      text primary key check (phone ~ '^[0-9]{6,15}$'),
  reason     text,
  source     text not null default 'panel' check (source in ('panel','whatsapp','auto')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 11. Casos para revisar (lo que el bot no pudo decidir solo)
--     status: pending → (panel) kick_requested | ignored → (bot) done | failed
-- ---------------------------------------------------------------------
create table if not exists public.review_cases (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  group_id        uuid references public.groups(id) on delete cascade,
  participant_jid text not null,
  phone           text,
  reason          text not null,
  details         jsonb not null default '{}'::jsonb,
  status          text not null default 'pending'
                  check (status in ('pending','kick_requested','ignored','done','failed')),
  resolved_at     timestamptz,
  result          text
);
create index if not exists review_cases_status on public.review_cases (status, created_at desc);

-- ---------------------------------------------------------------------
-- 12. Equivalencias LID → número real (WhatsApp a veces oculta el número)
-- ---------------------------------------------------------------------
create table if not exists public.lid_map (
  lid        text primary key,
  phone      text not null check (phone ~ '^[0-9]{6,15}$'),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 13. Triggers updated_at / plantilla
-- ---------------------------------------------------------------------
drop trigger if exists trg_settings_updated     on public.settings;
drop trigger if exists trg_bot_status_updated   on public.bot_status;
drop trigger if exists trg_rule_presets_updated on public.rule_presets;
drop trigger if exists trg_groups_updated       on public.groups;
drop trigger if exists trg_groups_preset        on public.groups;
drop trigger if exists trg_lid_map_updated      on public.lid_map;

create trigger trg_settings_updated     before update on public.settings     for each row execute function public.set_updated_at();
create trigger trg_bot_status_updated   before update on public.bot_status   for each row execute function public.set_updated_at();
create trigger trg_rule_presets_updated before update on public.rule_presets for each row execute function public.set_updated_at();
create trigger trg_groups_updated       before update on public.groups       for each row execute function public.set_updated_at();
create trigger trg_groups_preset        before insert or update on public.groups for each row execute function public.groups_apply_preset();
create trigger trg_lid_map_updated      before update on public.lid_map      for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 14. Seguridad: Row Level Security
--     - Navegador sin login (anon): no ve nada.
--     - Usuario logueado: solo si su correo está en app_admins.
--     - El bot y el servidor del panel usan la clave secreta (service_role),
--       que salta RLS y NUNCA se expone en el navegador.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_admins','settings','bot_status','rule_presets','groups','warnings',
    'posts','action_log','daily_counters','blacklist','review_cases','lid_map'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists admin_all on public.%I', t);
    if t <> 'app_admins' then
      execute format(
        'create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        t);
    end if;
  end loop;
end;
$$;

-- Un admin solo puede ver su propia fila en app_admins (y no puede agregarse a otros).
drop policy if exists admin_self_read on public.app_admins;
create policy admin_self_read on public.app_admins
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

revoke all on public.active_warnings from anon;
revoke execute on function public.increment_messages_checked(uuid, integer) from public, anon, authenticated;
revoke execute on function public.daily_summary(date) from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.daily_summary(date) to authenticated;

-- ---------------------------------------------------------------------
-- 15. Realtime: el bot recibe al instante los cambios hechos en el panel
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['settings','groups','rule_presets','blacklist','review_cases','bot_status'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;

-- Listo ✅
select 'Base de datos lista' as resultado;
