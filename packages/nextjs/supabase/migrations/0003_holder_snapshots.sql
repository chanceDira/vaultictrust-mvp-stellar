-- One holder count per share asset per day. The listing chart reads this table.

create table if not exists public.holder_snapshots (
  network text not null,
  asset_id integer not null,
  captured_on date not null,
  holder_count integer not null check (holder_count >= 0),
  captured_at timestamptz not null default now(),
  primary key (network, asset_id, captured_on)
);

create index if not exists holder_snapshots_asset_day
  on public.holder_snapshots (network, asset_id, captured_on);

alter table public.holder_snapshots enable row level security;

drop policy if exists holder_snapshots_public_read on public.holder_snapshots;
create policy holder_snapshots_public_read on public.holder_snapshots
  for select to anon, authenticated
  using (true);
