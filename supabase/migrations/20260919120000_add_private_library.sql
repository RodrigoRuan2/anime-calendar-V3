-- AniCal: biblioteca particular, vinculada ao Supabase Auth.
-- Execute esta migration no projeto rlppmkygztpdcytoeprl antes de publicar o frontend.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_anime_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anilist_id integer not null,
  title text not null,
  cover_image text,
  media_type text,
  status text not null default 'planejando' check (status in ('planejando', 'assistindo', 'concluído', 'pausado', 'abandonado')),
  is_favorite boolean not null default false,
  total_episodes integer check (total_episodes is null or total_episodes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, anilist_id)
);

create table if not exists public.user_episode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  library_id uuid not null references public.user_anime_library(id) on delete cascade,
  episode_number integer not null check (episode_number > 0),
  watched_at timestamptz not null default now(),
  unique (user_id, library_id, episode_number)
);

create index if not exists user_anime_library_user_status_idx on public.user_anime_library (user_id, status);
create index if not exists user_episode_progress_library_idx on public.user_episode_progress (library_id, episode_number);

alter table public.profiles enable row level security;
alter table public.user_anime_library enable row level security;
alter table public.user_episode_progress enable row level security;

-- Defesa em profundidade: visitantes não recebem nenhuma permissão de tabela,
-- mesmo que uma política seja adicionada incorretamente no futuro.
revoke all on public.profiles, public.user_anime_library, public.user_episode_progress from anon;
grant select, insert, update, delete on public.profiles, public.user_anime_library, public.user_episode_progress to authenticated;

create policy "Users manage their own profile" on public.profiles
  for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users manage their own library" on public.user_anime_library
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage their own episode progress" on public.user_episode_progress
  for all to authenticated using (
    (select auth.uid()) = user_id
    and exists (select 1 from public.user_anime_library library where library.id = library_id and library.user_id = (select auth.uid()))
  ) with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.user_anime_library library where library.id = library_id and library.user_id = (select auth.uid()))
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists user_anime_library_updated_at on public.user_anime_library;
create trigger user_anime_library_updated_at before update on public.user_anime_library for each row execute procedure public.set_updated_at();
