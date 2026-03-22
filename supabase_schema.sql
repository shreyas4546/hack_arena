-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create types
create type team_status as enum ('active', 'warning', 'inactive', 'disqualified');

-- Create tables
create table if not exists public.teams (
  id uuid primary key default uuid_generate_v4(),
  team_name text unique not null,
  repo_url text unique not null,
  deployment_url text,
  last_push timestamp with time zone default now(),
  status team_status default 'active',
  strike_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.settings (
  id integer primary key default 1,
  submissions_locked boolean default false,
  updated_at timestamp with time zone default now()
);

-- Initialize default settings
insert into public.settings (id, submissions_locked) values (1, false) on conflict (id) do nothing;

-- Set up Row Level Security (RLS)
alter table public.teams enable row level security;
alter table public.settings enable row level security;

-- Policies for anon/authenticated access (we allow anon to read, but insert/update are controlled)
-- Note: the actual cron job and server actions will use the Service Role key to bypass RLS.
create policy "Allow public read access on teams" on public.teams for select using (true);
create policy "Allow public read access on settings" on public.settings for select using (true);

-- Functions and Triggers
create or replace function update_modified_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_teams_modtime before update on public.teams for each row execute procedure update_modified_column();
create trigger update_settings_modtime before update on public.settings for each row execute procedure update_modified_column();
