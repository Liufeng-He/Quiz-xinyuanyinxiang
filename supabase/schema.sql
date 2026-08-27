create table if not exists public.survey_responses (
  id uuid primary key,
  created_at timestamptz not null default now(),
  college text not null,
  grade text not null,
  identity text not null,
  answers jsonb not null,
  result_code text not null,
  affinity smallint not null check (affinity between 0 and 100),
  presence smallint not null check (presence between 0 and 100),
  orientation text not null check (orientation in ('E', 'C')),
  cp_score smallint not null check (cp_score between 0 and 100),
  keywords jsonb not null default '[]'::jsonb,
  public_cloud_consent boolean not null default true,
  message_to_xinyuan text not null default ''
);

alter table public.survey_responses add column if not exists message_to_xinyuan text not null default '';

create index if not exists survey_responses_created_at_idx on public.survey_responses (created_at desc);
create index if not exists survey_responses_result_code_idx on public.survey_responses (result_code);
create index if not exists survey_responses_college_idx on public.survey_responses (college);

alter table public.survey_responses enable row level security;

-- 不创建 anon/authenticated 策略：浏览器不能直连答卷表。
-- 只有服务端保存的 service_role key 可以绕过 RLS 读写。
