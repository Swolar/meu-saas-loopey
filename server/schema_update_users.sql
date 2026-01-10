create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table users enable row level security;

-- Allow public access for login/register for simplicity in this demo
drop policy if exists "Public users access" on users;
create policy "Public users access" on users for select using (true);

drop policy if exists "Public users insert" on users;
create policy "Public users insert" on users for insert with check (true);
