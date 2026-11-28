-- Persist the deterministic Storage path for optimized avatar cards.
-- Keep signed URLs ephemeral and derive them in the API for both private and
-- community galleries. Existing thumbnails are backfilled only when present.
alter table public.avatars
  add column if not exists thumbnail_path text;

update public.avatars as avatar
set thumbnail_path = case
  when avatar.storage_path ~ '[.][^.]+$'
    then regexp_replace(avatar.storage_path, '[.][^.]+$', '.thumb.webp')
  else avatar.storage_path || '.thumb.webp'
end
where avatar.thumbnail_path is null
  and exists (
    select 1
    from storage.objects as object
    where object.bucket_id = 'avatars'
      and object.name = case
        when avatar.storage_path ~ '[.][^.]+$'
          then regexp_replace(avatar.storage_path, '[.][^.]+$', '.thumb.webp')
        else avatar.storage_path || '.thumb.webp'
      end
  );
