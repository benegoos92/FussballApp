-- Travel responses: who comes how to a game
create table travel_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  player_name text not null,
  travel_type text not null check (travel_type in ('car', 'direct', 'needs_ride')),
  car_seats smallint check (car_seats is null or car_seats >= 1),
  created_at timestamptz default now(),
  unique(event_id, player_name)
);
alter table travel_responses enable row level security;
create policy "open" on travel_responses for all using (true) with check (true);

-- Equipment items loaded into a specific car
create table car_equipment (
  id uuid primary key default gen_random_uuid(),
  travel_response_id uuid references travel_responses(id) on delete cascade not null,
  item text not null,
  unique(travel_response_id, item)
);
alter table car_equipment enable row level security;
create policy "open" on car_equipment for all using (true) with check (true);

-- Per-event checklist (seeded with defaults on first open)
create table event_checklist (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  item text not null,
  checked boolean not null default false,
  checked_by text,
  sort_order int not null default 0,
  unique(event_id, item)
);
alter table event_checklist enable row level security;
create policy "open" on event_checklist for all using (true) with check (true);
