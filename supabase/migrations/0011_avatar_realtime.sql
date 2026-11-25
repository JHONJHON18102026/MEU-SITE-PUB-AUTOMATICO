-- Publica mudanças nas imagens de avatar para a galeria receber resultados em tempo real.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'avatars'
  ) then
    alter publication supabase_realtime add table public.avatars;
  end if;
end $$;
