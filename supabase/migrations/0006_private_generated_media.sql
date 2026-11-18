-- Mantém os arquivos gerados privados; o backend entrega URLs assinadas de curta duração.
update storage.buckets
set public = false
where id in ('videos', 'avatars');
