-- PujoPulse social layer. Run once in Supabase → SQL editor (or via psql).
-- All access goes through the Next.js API routes using the service-role key;
-- RLS is enabled with NO policies so the public anon key can read/write nothing.

create extension if not exists pgcrypto;

create table if not exists pp_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null check (char_length(username) between 3 and 20),
  username_key  text not null unique,
  pass_hash     text not null,            -- scrypt(salt, password) — never the password itself
  avatar        text not null check (avatar in ('spy','thief','innocent','lady','baddie')),
  created_at    timestamptz not null default now()
);

create table if not exists pp_presence (
  user_id     uuid primary key references pp_users(id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  updated_at  timestamptz not null default now()
);
create index if not exists pp_presence_updated on pp_presence(updated_at desc);

create table if not exists pp_messages (
  id          bigint generated always as identity primary key,
  from_id     uuid not null references pp_users(id) on delete cascade,
  to_id       uuid references pp_users(id) on delete cascade,   -- null = "nearby" broadcast
  body        text not null check (char_length(body) between 1 and 100),
  lat         double precision,
  lng         double precision,
  created_at  timestamptz not null default now()
);
create index if not exists pp_messages_created on pp_messages(created_at desc);

alter table pp_users    enable row level security;
alter table pp_presence enable row level security;
alter table pp_messages enable row level security;
