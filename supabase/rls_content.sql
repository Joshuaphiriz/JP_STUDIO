-- Phase 1 content tables — RLS. Apply after the content migration.
do $$
declare t text;
begin
  foreach t in array array[
    'media_assets','posts','platform_posts','post_versions','queues','time_slots'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

create policy media_ws on public.media_assets
  for select using (public.is_workspace_member(workspace_id));

create policy posts_ws on public.posts
  for select using (public.is_workspace_member(workspace_id));

create policy platform_posts_ws on public.platform_posts
  for select using (
    exists (select 1 from public.posts p
            where p.id = platform_posts.post_id
              and public.is_workspace_member(p.workspace_id))
  );

create policy post_versions_ws on public.post_versions
  for select using (
    exists (select 1 from public.posts p
            where p.id = post_versions.post_id
              and public.is_workspace_member(p.workspace_id))
  );

create policy queues_ws on public.queues
  for select using (public.is_workspace_member(workspace_id));

create policy time_slots_ws on public.time_slots
  for select using (public.is_workspace_member(workspace_id));
