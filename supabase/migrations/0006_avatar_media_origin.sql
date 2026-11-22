-- Keep video generations started in Avatar separate from the Projects workspace.
alter table public.video_projects
  add column if not exists origin text not null default 'projects';
alter table public.video_projects
  add column if not exists media_type text not null default 'video';

alter table public.video_projects
  drop constraint if exists video_projects_origin_check;

alter table public.video_projects
  add constraint video_projects_origin_check check (origin in ('projects', 'avatar'));

alter table public.video_projects
  drop constraint if exists video_projects_media_type_check;
alter table public.video_projects
  add constraint video_projects_media_type_check check (media_type in ('video', 'motion'));

create index if not exists video_projects_origin_user_idx
  on public.video_projects(origin, user_id, created_at desc);
