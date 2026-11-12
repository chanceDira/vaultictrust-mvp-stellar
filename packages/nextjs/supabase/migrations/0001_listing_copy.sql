-- Availability copy. Chain and IPFS stay canonical.
-- Run once in the Supabase SQL editor. Safe to run again.

create table if not exists public.listings (
  asset_id integer primary key,
  asset_code text not null default '',
  asset_name text not null default '',
  asset_category text not null default '',
  state text not null default '',
  model text not null default '',
  owner text not null default '',
  issuer text,
  valuation text not null default '0',
  total_shares text not null default '0',
  sold_shares text not null default '0',
  price_per_share text not null default '0',
  metadata_uri text not null default '',
  registered_at text not null default '0',
  synced_at timestamptz not null default now()
);

create table if not exists public.listing_media (
  metadata_cid text primary key,
  description text not null default '',
  location text not null default '',
  image_cid text,
  documents jsonb not null default '[]'::jsonb,
  copied_at timestamptz not null default now()
);

create table if not exists public.public_files (
  cid text primary key,
  mime text not null,
  byte_size integer not null,
  kind text not null check (kind in ('image', 'document')),
  copied_at timestamptz not null default now()
);

create table if not exists public.encrypted_records (
  cid text primary key,
  ciphertext text not null,
  iv text not null,
  encrypted_key text not null,
  copied_at timestamptz not null default now()
);

alter table public.listings enable row level security;
alter table public.listing_media enable row level security;
alter table public.public_files enable row level security;
alter table public.encrypted_records enable row level security;

revoke all on table public.encrypted_records from anon, authenticated;

drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings
  for select to anon, authenticated
  using (true);

drop policy if exists listing_media_public_read on public.listing_media;
create policy listing_media_public_read on public.listing_media
  for select to anon, authenticated
  using (true);

drop policy if exists public_files_public_read on public.public_files;
create policy public_files_public_read on public.public_files
  for select to anon, authenticated
  using (true);

insert into storage.buckets (id, name, public)
values ('listing-files', 'listing-files', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists listing_files_public_read on storage.objects;
create policy listing_files_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'listing-files');
