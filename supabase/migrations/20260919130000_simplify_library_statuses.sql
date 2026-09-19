-- Mantém apenas os três estados que o AniCal oferece na biblioteca.
update public.user_anime_library
set status = 'planejando'
where status in ('pausado', 'abandonado');

alter table public.user_anime_library
  drop constraint if exists user_anime_library_status_check;

alter table public.user_anime_library
  add constraint user_anime_library_status_check
  check (status in ('planejando', 'assistindo', 'concluído'));
