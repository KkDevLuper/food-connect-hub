-- FOODLINK — Supabase schema (1:1 with the Convex schema used by this app).
-- Run in the Supabase SQL editor if your hackathon requires Supabase.

create type user_role as enum ('restaurant', 'ngo', 'admin');
create type donation_status as enum (
  'AVAILABLE', 'CLAIMED', 'PICKUP_CONFIRMED', 'DELIVERED', 'EXPIRED', 'CANCELLED'
);
create type claim_status as enum (
  'PENDING_CONFIRMATION', 'CONFIRMED', 'PICKED_UP', 'DELIVERED', 'REJECTED', 'CANCELLED'
);

-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role user_role not null default 'restaurant',
  created_at timestamptz not null default now()
);

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  address text not null,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create table ngos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  address text not null,
  lat double precision,
  lng double precision,
  capacity_meals int not null default 50,
  created_at timestamptz not null default now()
);

create table food_donations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  title text,
  food_name text not null,
  category text not null,
  quantity numeric not null,
  unit text not null,
  estimated_meals int not null,
  prepared_at timestamptz not null,
  pickup_deadline timestamptz not null,
  pickup_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  notes text,
  status donation_status not null default 'AVAILABLE',
  claimed_by_ngo_id uuid references ngos(id),
  created_at timestamptz not null default now()
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null unique
    references food_donations(id) on delete cascade,
  ngo_id uuid not null references ngos(id) on delete cascade,
  status claim_status not null default 'PENDING_CONFIRMATION',
  claimed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz
);

create table pickup_records (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  donation_id uuid not null references food_donations(id) on delete cascade,
  ngo_id uuid not null references ngos(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  meals_rescued int
);

create index food_donations_status_idx on food_donations(status);
create index food_donations_deadline_idx on food_donations(pickup_deadline);
create index claims_ngo_idx on claims(ngo_id);

-- Row Level Security sketches (align with the Convex-side checks):
alter table restaurants enable row level security;
create policy "own restaurant" on restaurants
  for all using (auth.uid() = user_id);
alter table ngos enable row level security;
create policy "own ngo" on ngos
  for all using (auth.uid() = user_id);
alter table food_donations enable row level security;
create policy "restaurants manage own donations" on food_donations
  for all using (
    exists (select 1 from restaurants r where r.id = restaurant_id and r.user_id = auth.uid())
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
alter table claims enable row level security;
create policy "ngos manage own claims" on claims
  for all using (
    exists (select 1 from ngos n where n.id = ngo_id and n.user_id = auth.uid())
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
