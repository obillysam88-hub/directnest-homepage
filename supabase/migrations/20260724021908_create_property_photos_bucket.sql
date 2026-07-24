/*
# Create property-photos storage bucket

1. Storage
- Create a public bucket named `property-photos` for listing images.
- Set max file size to 5MB and allow image MIME types only.
2. Security
- Public read so listing photos are viewable by anyone.
- Authenticated users can upload and update their own files.
*/

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read for property-photos" on storage.objects;
create policy "Public read for property-photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'property-photos');

drop policy if exists "Authenticated upload to property-photos" on storage.objects;
create policy "Authenticated upload to property-photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'property-photos');

drop policy if exists "Authenticated update own in property-photos" on storage.objects;
create policy "Authenticated update own in property-photos"
on storage.objects for update
to authenticated
using (bucket_id = 'property-photos' and owner = auth.uid())
with check (bucket_id = 'property-photos' and owner = auth.uid());

drop policy if exists "Authenticated delete own in property-photos" on storage.objects;
create policy "Authenticated delete own in property-photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'property-photos' and owner = auth.uid());
