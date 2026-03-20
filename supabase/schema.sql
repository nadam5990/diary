create table if not exists public.diary_entries (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    original_text text not null,
    ai_response text not null,
    created_at timestamptz not null default timezone('utc', now())
);

alter table public.diary_entries enable row level security;

create policy "Users can view their own diary entries"
on public.diary_entries
for select
using ((select auth.uid()) = user_id);

create policy "Users can insert their own diary entries"
on public.diary_entries
for insert
with check ((select auth.uid()) = user_id);
