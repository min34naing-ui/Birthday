-- Run this in Supabase Dashboard > SQL Editor.
-- First create TWO users manually in Authentication > Users.
-- Copy each user's UUID, then replace the two UUID placeholders below.

create table if not exists public.birthday_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.birthday_members enable row level security;

-- A signed-in user can only check their own membership.
drop policy if exists "Members can read their own membership" on public.birthday_members;
create policy "Members can read their own membership"
on public.birthday_members
for select
to authenticated
using (user_id = (select auth.uid()));

-- No INSERT/UPDATE/DELETE policy is intentionally provided.
-- Manage the allowlist only from the Supabase SQL Editor/dashboard.

insert into public.birthday_members (user_id, display_name)
values
  ('REPLACE-WITH-FIRST-USER-UUID', 'You'),
  ('REPLACE-WITH-SECOND-USER-UUID', 'Birthday person')
on conflict (user_id) do update
set display_name = excluded.display_name;

-- Create a PRIVATE bucket named birthday-photos in Storage UI first.
-- Upload pictures into the "shared/" folder in that bucket.
-- Members can list/read objects in that folder. Only dashboard/admin uploads.
drop policy if exists "Approved members can read birthday photos" on storage.objects;
create policy "Approved members can read birthday photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'birthday-photos'
  and (storage.foldername(name))[1] = 'shared'
  and exists (
    select 1
    from public.birthday_members bm
    where bm.user_id = (select auth.uid())
  )
);

-- No anonymous, public, upload, update or delete policy is added.
-- This means only the two allowlisted accounts can list/read these photos.
