-- Create table for storing PHCorner usernames
create table if not exists public.phcorner_usernames (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  token_hash text,
  user_ip text,
  user_agent text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.phcorner_usernames enable row level security;

-- Create policies for public access (since this is for anonymous users)
create policy "Allow anyone to insert usernames"
  on public.phcorner_usernames for insert
  with check (true);

create policy "Allow anyone to select usernames"
  on public.phcorner_usernames for select
  using (true);

-- Create index for better performance
create index if not exists idx_phcorner_usernames_token_hash on public.phcorner_usernames(token_hash);
create index if not exists idx_phcorner_usernames_created_at on public.phcorner_usernames(created_at);
