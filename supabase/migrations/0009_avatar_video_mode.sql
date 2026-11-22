-- Allow canvas-generated Avatar videos to use their dedicated project mode.
do $$
declare
  cname text;
begin
  for cname in
    select conname
    from pg_constraint
    where conrelid = 'public.video_projects'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%mode%'
  loop
    execute format('alter table public.video_projects drop constraint %I', cname);
  end loop;
end $$;

alter table public.video_projects
  add constraint video_projects_mode_check
  check (mode in ('ads','link','talking','hook','slideshow','motion','image-ad','remake','studio','avatar-video'));
