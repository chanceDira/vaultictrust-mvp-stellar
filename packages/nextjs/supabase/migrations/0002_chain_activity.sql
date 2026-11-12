-- Ledger copy. One row per Soroban event, plus the current pool, holding, user, and fee records.

create table if not exists public.chain_cursors (
  network text primary key,
  cursor text,
  scan_ledger integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  network text not null,
  event_id text not null,
  ledger integer not null,
  ledger_closed_at timestamptz,
  tx_hash text not null,
  contract_id text not null,
  kind text not null,
  asset_id integer,
  account text,
  counterparty text,
  amount text,
  amount_secondary text,
  amount_tertiary text,
  payload jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  primary key (network, event_id)
);

create index if not exists activities_asset_ledger on public.activities (network, asset_id, ledger);
create index if not exists activities_account_ledger on public.activities (network, account, ledger);
create index if not exists activities_tx on public.activities (network, tx_hash);

create table if not exists public.pools (
  network text not null,
  asset_id integer not null,
  total_shares text not null,
  sold_shares text not null,
  price_per_share text not null,
  investor_cap text not null,
  rwa_issuer text,
  rwa_asset_code text not null default '',
  is_fully_subscribed boolean not null default false,
  proceeds_collected text not null default '0',
  proceeds_withdrawn text not null default '0',
  synced_at timestamptz not null default now(),
  primary key (network, asset_id)
);

create table if not exists public.holdings (
  network text not null,
  asset_id integer not null,
  account text not null,
  shares text not null,
  synced_at timestamptz not null default now(),
  primary key (network, asset_id, account)
);

create table if not exists public.users (
  network text not null,
  account text not null,
  status text not null,
  metadata_uri text not null default '',
  commitment text not null default '',
  updated_at text not null default '0',
  synced_at timestamptz not null default now(),
  primary key (network, account)
);

create table if not exists public.protocol (
  network text primary key,
  fee_bps text,
  fee_treasury text,
  accumulated_fees text,
  synced_at timestamptz not null default now()
);

alter table public.chain_cursors enable row level security;
alter table public.activities enable row level security;
alter table public.pools enable row level security;
alter table public.holdings enable row level security;
alter table public.users enable row level security;
alter table public.protocol enable row level security;

drop policy if exists activities_public_read on public.activities;
create policy activities_public_read on public.activities
  for select to anon, authenticated
  using (true);

drop policy if exists pools_public_read on public.pools;
create policy pools_public_read on public.pools
  for select to anon, authenticated
  using (true);

drop policy if exists holdings_public_read on public.holdings;
create policy holdings_public_read on public.holdings
  for select to anon, authenticated
  using (true);

drop policy if exists users_public_read on public.users;
create policy users_public_read on public.users
  for select to anon, authenticated
  using (true);

drop policy if exists protocol_public_read on public.protocol;
create policy protocol_public_read on public.protocol
  for select to anon, authenticated
  using (true);
