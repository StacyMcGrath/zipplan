-- Shifts extensions
--
-- 1. shift_roles: per-event admin-defined labels for the kind of work a
--    shift covers (e.g. "Rest Stop Crew", "Check-in", "Bike Storage").
--    Parallel to location_types and volunteer_categories. Field-level
--    customization (per-role custom fields) is deferred — for now just
--    name + description + a shared instructions blob.
-- 2. shifts.shift_role_id: nullable FK; on delete set null (don't lose
--    shifts if a role is removed).
-- 3. shifts.geo: nullable jsonb. Lets a shift override the location's
--    geo for the actual work spot — e.g. location.geo is the campus
--    arrival pin, shift.geo is the bike-storage area within campus.

create table shift_roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  instructions text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create index shift_roles_event_idx on shift_roles(event_id);

alter table shifts
  add column shift_role_id uuid references shift_roles(id) on delete set null,
  add column geo jsonb;

create index shifts_role_idx on shifts(shift_role_id) where shift_role_id is not null;

alter table shift_roles enable row level security;
