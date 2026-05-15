-- Zipplan initial schema
--
-- Tenancy: Organization -> Events. Volunteers/Locations/etc. live under Events.
-- Reusable per-Org catalogs: resource_catalog_items, skills.
-- All tables have RLS enabled; policies land in a follow-up migration.

create extension if not exists pgcrypto;

-- =========================================================================
-- enums
-- =========================================================================

create type field_kind as enum (
  'text', 'multiline', 'number', 'phone', 'email', 'url',
  'date', 'datetime', 'what3words', 'select', 'multiselect'
);

create type procurement as enum ('owned', 'rented');

create type assignment_status as enum ('tentative', 'confirmed', 'declined');

create type event_status as enum ('draft', 'active', 'archived');

-- =========================================================================
-- helpers
-- =========================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- organizations + memberships
-- =========================================================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

-- Membership = "this user can administer this org." Volunteers are NOT
-- members; they live per-event in the `volunteers` table. A `role` column
-- will land here when we need to distinguish admin tiers (e.g. owner/billing).
create table memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index memberships_user_idx on memberships(user_id);

-- =========================================================================
-- events
-- =========================================================================

create table events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  starts_on date not null,
  ends_on date not null,
  timezone text not null default 'America/New_York',
  status event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  check (ends_on >= starts_on)
);

create index events_org_idx on events(organization_id);

create trigger events_updated_at
  before update on events
  for each row execute function set_updated_at();

-- =========================================================================
-- per-org catalogs: resource_catalog_items, skills
-- =========================================================================

create table resource_catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'each',
  procurement procurement not null,
  -- only meaningful when procurement = 'owned'; null = "we source per event"
  owned_quantity integer,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (procurement = 'rented' or owned_quantity is not null),
  unique (organization_id, name)
);

create index resource_catalog_org_idx on resource_catalog_items(organization_id);

create trigger resource_catalog_updated_at
  before update on resource_catalog_items
  for each row execute function set_updated_at();

create table skills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index skills_org_idx on skills(organization_id);

-- =========================================================================
-- per-event schema config: location_types + field_definitions
-- =========================================================================

create table location_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create index location_types_event_idx on location_types(event_id);

create table field_definitions (
  id uuid primary key default gen_random_uuid(),
  location_type_id uuid not null references location_types(id) on delete cascade,
  -- json key under locations.attributes (e.g. "contact_phone")
  key text not null,
  label text not null,
  kind field_kind not null,
  required boolean not null default false,
  position integer not null default 0,
  help_text text,
  -- for select/multiselect: array of {value, label}
  options jsonb,
  created_at timestamptz not null default now(),
  unique (location_type_id, key)
);

create index field_definitions_type_idx on field_definitions(location_type_id);

-- =========================================================================
-- locations
-- =========================================================================

create table locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  -- restrict so we don't lose all locations if a type is deleted by mistake
  location_type_id uuid not null references location_types(id) on delete restrict,
  name text not null,
  address text,
  -- {lat, lng} or {what3words: "..."} or {plus_code: "..."}; flexible
  geo jsonb,
  -- values keyed by field_definitions.key for this type
  attributes jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index locations_event_idx on locations(event_id);
create index locations_type_idx on locations(location_type_id);

create trigger locations_updated_at
  before update on locations
  for each row execute function set_updated_at();

-- =========================================================================
-- supply needs (per location, references org-level catalog)
-- =========================================================================

create table supply_needs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  catalog_item_id uuid not null references resource_catalog_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  -- null = applies all days the location is active
  applies_on_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index supply_needs_location_idx on supply_needs(location_id);
create index supply_needs_catalog_idx on supply_needs(catalog_item_id);
create index supply_needs_date_idx on supply_needs(applies_on_date)
  where applies_on_date is not null;

-- =========================================================================
-- shifts
-- =========================================================================

create table shifts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  -- e.g. "Hydration", "Setup", "Course Marshal" — null is fine
  role_label text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null default 1 check (capacity >= 1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index shifts_location_idx on shifts(location_id);
create index shifts_starts_at_idx on shifts(starts_at);

create trigger shifts_updated_at
  before update on shifts
  for each row execute function set_updated_at();

-- =========================================================================
-- volunteer categories (per-event, admin-defined labels — parallel to
-- location_types). Pure label/grouping; behavioral semantics live on the
-- volunteers row itself (see is_floater below).
-- =========================================================================

create table volunteer_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create index volunteer_categories_event_idx on volunteer_categories(event_id);

-- =========================================================================
-- volunteers
-- =========================================================================

create table volunteers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  -- linked when the volunteer first signs in via magic link (matched by email)
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  -- admin-defined label (e.g. "Course Marshal", "Stage Crew"); null = uncategorized
  category_id uuid references volunteer_categories(id) on delete set null,
  -- true = available to be assigned to any shift across the event (multi-day
  -- "floater"). false = pre-committed to specific shifts (typical signup-form
  -- volunteer). This is the only behavioral distinction the system needs.
  is_floater boolean not null default false,
  notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, email)
);

create index volunteers_event_idx on volunteers(event_id);
create index volunteers_user_idx on volunteers(user_id) where user_id is not null;
create index volunteers_category_idx on volunteers(category_id) where category_id is not null;

create trigger volunteers_updated_at
  before update on volunteers
  for each row execute function set_updated_at();

-- =========================================================================
-- assignments (volunteer x shift)
-- =========================================================================

create table assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  status assignment_status not null default 'confirmed',
  is_lead boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, volunteer_id)
);

create index assignments_shift_idx on assignments(shift_id);
create index assignments_volunteer_idx on assignments(volunteer_id);

-- at most one lead per shift
create unique index assignments_one_lead_per_shift_idx
  on assignments(shift_id) where is_lead;

create trigger assignments_updated_at
  before update on assignments
  for each row execute function set_updated_at();

-- =========================================================================
-- volunteer skills (volunteer x skill)
-- =========================================================================

create table volunteer_skills (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references volunteers(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  -- e.g. "yes, but back surgery — under 30 lbs preferred"
  notes text,
  created_at timestamptz not null default now(),
  unique (volunteer_id, skill_id)
);

create index volunteer_skills_volunteer_idx on volunteer_skills(volunteer_id);
create index volunteer_skills_skill_idx on volunteer_skills(skill_id);

-- =========================================================================
-- enable RLS on everything (no policies = locked from anon/authed API;
-- service_role bypasses RLS, so admin tooling still works.
-- Policies will land in a follow-up migration.)
-- =========================================================================

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table events enable row level security;
alter table resource_catalog_items enable row level security;
alter table skills enable row level security;
alter table location_types enable row level security;
alter table field_definitions enable row level security;
alter table locations enable row level security;
alter table supply_needs enable row level security;
alter table shifts enable row level security;
alter table volunteer_categories enable row level security;
alter table volunteers enable row level security;
alter table assignments enable row level security;
alter table volunteer_skills enable row level security;
