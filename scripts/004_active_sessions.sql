-- 중복 로그인 방지를 위한 활성 세션 테이블
CREATE TABLE IF NOT EXISTS active_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session"
  ON active_sessions FOR SELECT
  USING (auth.uid() = user_id);
