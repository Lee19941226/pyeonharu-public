-- =============================================
-- 005: 의사 리뷰 시스템 (병원 상세에서 작성, 의사 탭에서 조회)
-- =============================================

-- 1) 의사 리뷰 — 병원 방문 시 의사 경험을 함께 남김
create table if not exists public.doctor_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hospital_name text not null,
  hospital_address text not null default '',
  doctor_name text not null,
  department text not null,
  disease_name text not null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  content text check (char_length(content) <= 500),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- 같은 사용자가 같은 병원의 같은 의사에게 1개 리뷰
  unique(user_id, hospital_name, doctor_name)
);

alter table public.doctor_reviews enable row level security;

create policy "doctor_reviews_select_all" on public.doctor_reviews
  for select using (true);
create policy "doctor_reviews_insert_auth" on public.doctor_reviews
  for insert with check (auth.uid() = user_id);
create policy "doctor_reviews_update_own" on public.doctor_reviews
  for update using (auth.uid() = user_id);
create policy "doctor_reviews_delete_own" on public.doctor_reviews
  for delete using (auth.uid() = user_id);

-- 2) 리뷰 신고 (중복 방지)
create table if not exists public.doctor_review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.doctor_reviews(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(review_id, reporter_id)
);

alter table public.doctor_review_reports enable row level security;

create policy "dr_reports_select_own" on public.doctor_review_reports
  for select using (auth.uid() = reporter_id);
create policy "dr_reports_insert_auth" on public.doctor_review_reports
  for insert with check (auth.uid() = reporter_id);

-- 인덱스: 검색 성능
create index if not exists idx_dr_reviews_doctor on public.doctor_reviews(doctor_name);
create index if not exists idx_dr_reviews_disease on public.doctor_reviews(disease_name);
create index if not exists idx_dr_reviews_hospital on public.doctor_reviews(hospital_name);
create index if not exists idx_dr_reviews_department on public.doctor_reviews(department);
create index if not exists idx_dr_reviews_user on public.doctor_reviews(user_id);
