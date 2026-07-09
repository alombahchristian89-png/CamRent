create table if not exists activity_logs (
  id bigserial primary key,
  actor_user_id bigint,
  target_user_id bigint,
  action_type text not null,
  entity_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_created_at on activity_logs (created_at desc);
create index if not exists idx_activity_logs_actor_user_id on activity_logs (actor_user_id);
create index if not exists idx_activity_logs_target_user_id on activity_logs (target_user_id);
