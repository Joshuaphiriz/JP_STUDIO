-- ============================================================================
-- JP Studio — auth trigger, RLS helpers, and row-level policies.
-- Apply AFTER the Drizzle migrations (supabase/migrations/*).
--
--   psql "$DIRECT_URL" -f supabase/migrations/0000_init.sql
--   psql "$DIRECT_URL" -f supabase/rls.sql
--
-- The app's own Drizzle connection uses a privileged role and bypasses RLS;
-- these policies constrain the browser (anon / authenticated) Supabase client,
-- which is defence-in-depth for multi-tenant isolation.
-- ============================================================================

-- ── Mirror auth.users -> public.users ──────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Membership helpers ─────────────────────────────────────────────────────
create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members
    where organization_id = org and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- ── Enable RLS ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'users','user_preferences','organizations','org_members','workspaces',
    'workspace_members','workspace_roles','workspace_themes','invitations',
    'social_accounts','social_account_tokens','platform_credentials','oauth_states',
    'jobs','notifications','push_subscriptions','audit_log'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
  end loop;
end $$;

-- ── Policies ───────────────────────────────────────────────────────────────
-- users: read self + co-members handled app-side; keep it simple here.
create policy users_self_rw on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy prefs_self_rw on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy orgs_member_read on public.organizations
  for select using (public.is_org_member(id));

create policy org_members_read on public.org_members
  for select using (public.is_org_member(organization_id));

create policy workspaces_member_read on public.workspaces
  for select using (public.is_workspace_member(id) or public.is_org_member(organization_id));

create policy workspace_members_read on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy workspace_roles_read on public.workspace_roles
  for select using (public.is_workspace_member(workspace_id));

create policy workspace_themes_rw on public.workspace_themes
  for all using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy social_accounts_read on public.social_accounts
  for select using (public.is_workspace_member(workspace_id));

create policy notifications_self_rw on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy push_subs_self_rw on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy audit_read on public.audit_log
  for select using (
    (workspace_id is not null and public.is_workspace_member(workspace_id))
    or (organization_id is not null and public.is_org_member(organization_id))
  );

-- Tables with NO anon/authenticated policy (tokens, credentials, oauth_states,
-- jobs, invitations) are reachable only via the service role by design.
