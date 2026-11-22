-- Atualiza somente o cartão alterado na tela Projetos, sem polling da página.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'video_projects'
  ) then
    alter publication supabase_realtime add table public.video_projects;
  end if;
end $$;
