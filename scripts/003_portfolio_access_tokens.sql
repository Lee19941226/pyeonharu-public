-- 포트폴리오 토큰 기반 접근 제어 테이블
CREATE TABLE portfolio_access_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token VARCHAR(32) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0
);

-- RLS 활성화 (정책 없음 → service_role만 접근 가능)
ALTER TABLE portfolio_access_tokens ENABLE ROW LEVEL SECURITY;

-- 토큰 조회 성능을 위한 인덱스
CREATE INDEX idx_portfolio_tokens_token ON portfolio_access_tokens(token);
