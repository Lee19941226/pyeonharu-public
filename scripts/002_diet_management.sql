-- =============================================
-- 편하루 식단관리 마이그레이션
-- scripts/002_diet_management.sql
-- =============================================

-- 1. profiles 테이블 확장 (기초대사량 관련 컬럼)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bmr integer,
  ADD COLUMN IF NOT EXISTS height real,
  ADD COLUMN IF NOT EXISTS weight real,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS gender text;

-- 2. diet_entries 테이블 생성
CREATE TABLE IF NOT EXISTS public.diet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  food_name text NOT NULL,
  estimated_cal integer NOT NULL,
  source text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
  ai_confidence real,
  emoji text DEFAULT '🍽️',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS 활성화
ALTER TABLE public.diet_entries ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
CREATE POLICY "diet_entries_select_own" ON public.diet_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "diet_entries_insert_own" ON public.diet_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "diet_entries_update_own" ON public.diet_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "diet_entries_delete_own" ON public.diet_entries
  FOR DELETE USING (auth.uid() = user_id);

-- 5. 인덱스
CREATE INDEX IF NOT EXISTS idx_diet_entries_user_date
  ON public.diet_entries (user_id, recorded_at DESC);
