-- Storage buckets for JP Studio. Paths are namespaced as <workspace_id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 524288000,
   array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm']),
  ('branding', 'branding', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read (buckets are public); writes go through the service role from the
-- app, so no authenticated INSERT/UPDATE policy is needed.
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'media_public_read') then
    create policy media_public_read on storage.objects
      for select using (bucket_id in ('media','branding'));
  end if;
end $$;
