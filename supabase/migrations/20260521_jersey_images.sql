-- Add image columns to jersey_sets
alter table jersey_sets
  add column if not exists jersey_image_url text,
  add column if not exists shorts_image_url text,
  add column if not exists socks_image_url text;

-- Create public storage bucket for jersey images
insert into storage.buckets (id, name, public)
values ('jersey-images', 'jersey-images', true)
on conflict (id) do nothing;

-- Open storage policies
create policy if not exists "jersey-images public read"
  on storage.objects for select using (bucket_id = 'jersey-images');

create policy if not exists "jersey-images public insert"
  on storage.objects for insert with check (bucket_id = 'jersey-images');

create policy if not exists "jersey-images public update"
  on storage.objects for update using (bucket_id = 'jersey-images');

create policy if not exists "jersey-images public delete"
  on storage.objects for delete using (bucket_id = 'jersey-images');
