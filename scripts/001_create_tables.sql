-- 편하루 데이터베이스 스키마
-- 사용자 프로필 테이블
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- 프로필 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', '편하루 사용자')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 병원 즐겨찾기 테이블
create table if not exists public.hospital_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hospital_id text not null,
  hospital_name text not null,
  hospital_address text,
  hospital_phone text,
  hospital_category text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, hospital_id)
);

alter table public.hospital_bookmarks enable row level security;

create policy "hospital_bookmarks_select_own" on public.hospital_bookmarks for select using (auth.uid() = user_id);
create policy "hospital_bookmarks_insert_own" on public.hospital_bookmarks for insert with check (auth.uid() = user_id);
create policy "hospital_bookmarks_delete_own" on public.hospital_bookmarks for delete using (auth.uid() = user_id);

-- 약국 즐겨찾기 테이블
create table if not exists public.pharmacy_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pharmacy_id text not null,
  pharmacy_name text not null,
  pharmacy_address text,
  pharmacy_phone text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, pharmacy_id)
);

alter table public.pharmacy_bookmarks enable row level security;

create policy "pharmacy_bookmarks_select_own" on public.pharmacy_bookmarks for select using (auth.uid() = user_id);
create policy "pharmacy_bookmarks_insert_own" on public.pharmacy_bookmarks for insert with check (auth.uid() = user_id);
create policy "pharmacy_bookmarks_delete_own" on public.pharmacy_bookmarks for delete using (auth.uid() = user_id);

-- 옷장 (옷 목록) 테이블
create table if not exists public.clothes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null, -- 상의, 하의, 아우터, 신발
  color text,
  season text[], -- 봄, 여름, 가을, 겨울
  style text[], -- 캐주얼, 포멀, 스포티 등
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clothes enable row level security;

create policy "clothes_select_own" on public.clothes for select using (auth.uid() = user_id);
create policy "clothes_insert_own" on public.clothes for insert with check (auth.uid() = user_id);
create policy "clothes_update_own" on public.clothes for update using (auth.uid() = user_id);
create policy "clothes_delete_own" on public.clothes for delete using (auth.uid() = user_id);

-- 코디 기록 테이블
create table if not exists public.outfit_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weather_temp integer,
  weather_condition text,
  top_id uuid references public.clothes(id) on delete set null,
  bottom_id uuid references public.clothes(id) on delete set null,
  outer_id uuid references public.clothes(id) on delete set null,
  shoes_id uuid references public.clothes(id) on delete set null,
  rating integer check (rating >= 1 and rating <= 5),
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

alter table public.outfit_history enable row level security;

create policy "outfit_history_select_own" on public.outfit_history for select using (auth.uid() = user_id);
create policy "outfit_history_insert_own" on public.outfit_history for insert with check (auth.uid() = user_id);
create policy "outfit_history_update_own" on public.outfit_history for update using (auth.uid() = user_id);
create policy "outfit_history_delete_own" on public.outfit_history for delete using (auth.uid() = user_id);

-- 스타일 설정 테이블
create table if not exists public.style_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  preferred_styles text[], -- 선호 스타일
  disliked_combinations text[], -- 싫어하는 조합
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.style_preferences enable row level security;

create policy "style_preferences_select_own" on public.style_preferences for select using (auth.uid() = user_id);
create policy "style_preferences_insert_own" on public.style_preferences for insert with check (auth.uid() = user_id);
create policy "style_preferences_update_own" on public.style_preferences for update using (auth.uid() = user_id);
create policy "style_preferences_delete_own" on public.style_preferences for delete using (auth.uid() = user_id);
