-- ═══════════════════════════════════════════════════════════════
-- 006. Privacy Scan 테이블 (ps_ 접두사)
-- 개인식별정보 검출/관리 솔루션
-- ═══════════════════════════════════════════════════════════════

-- 1. ps_patterns (패턴 - 기본/사용자 정규식)
CREATE TABLE IF NOT EXISTS ps_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  pattern_type text NOT NULL DEFAULT 'default' CHECK (pattern_type IN ('default', 'custom')),
  is_active boolean NOT NULL DEFAULT true,
  regex_pattern text NOT NULL,
  regex_string text,
  exclude_regex text,
  exclude_string text,
  validation_module text,
  masking_start int NOT NULL DEFAULT 0,
  masking_end int NOT NULL DEFAULT 0,
  masking_char text NOT NULL DEFAULT '*',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ps_patterns FOR ALL USING (true) WITH CHECK (true);

-- 2. ps_policies (정책)
CREATE TABLE IF NOT EXISTS ps_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamptz,
  valid_until timestamptz,
  scan_paths text[] DEFAULT '{}',
  exclude_paths text[] DEFAULT '{}',
  schedule_cron text,
  schedule_description text,
  rule_ids uuid[] DEFAULT '{}',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ps_policies FOR ALL USING (true) WITH CHECK (true);

-- 3. ps_rules (검출 규칙)
CREATE TABLE IF NOT EXISTS ps_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  file_extensions text[] DEFAULT '{}',
  check_metadata boolean NOT NULL DEFAULT false,
  pattern_ids uuid[] DEFAULT '{}',
  min_sensitive_count int NOT NULL DEFAULT 1,
  max_sensitive_count int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ps_rules FOR ALL USING (true) WITH CHECK (true);

-- 4. ps_agents (에이전트/장치)
CREATE TABLE IF NOT EXISTS ps_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name text NOT NULL,
  hostname text,
  ip_address text,
  mac_address text,
  os_type text CHECK (os_type IN ('windows', 'linux', 'unix')),
  os_version text,
  agent_version text,
  policy_id uuid REFERENCES ps_policies(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_policy_received_at timestamptz,
  last_heartbeat_at timestamptz,
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ps_agents FOR ALL USING (true) WITH CHECK (true);

-- 5. ps_scan_results (검사결과 - 서버별 집계)
CREATE TABLE IF NOT EXISTS ps_scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES ps_agents(id) ON DELETE CASCADE,
  scan_round int NOT NULL DEFAULT 1,
  policy_id uuid REFERENCES ps_policies(id) ON DELETE SET NULL,
  total_files int NOT NULL DEFAULT 0,
  detected_files int NOT NULL DEFAULT 0,
  detected_count int NOT NULL DEFAULT 0,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_scan_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ps_scan_results FOR ALL USING (true) WITH CHECK (true);

-- 6. ps_scan_files (파일별 검출 상세)
CREATE TABLE IF NOT EXISTS ps_scan_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_result_id uuid NOT NULL REFERENCES ps_scan_results(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  pattern_names text[] DEFAULT '{}',
  detected_patterns jsonb DEFAULT '[]',
  last_modified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_scan_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ps_scan_files FOR ALL USING (true) WITH CHECK (true);

-- 7. ps_admins (PS 전용 관리자)
CREATE TABLE IF NOT EXISTS ps_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  login_id text NOT NULL UNIQUE,
  department text,
  email text,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'manager', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ps_admins FOR ALL USING (true) WITH CHECK (true);

-- 8. ps_licenses (라이선스)
CREATE TABLE IF NOT EXISTS ps_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key text NOT NULL UNIQUE,
  site_id text,
  license_type text NOT NULL DEFAULT 'trial' CHECK (license_type IN ('trial', 'standard', 'enterprise')),
  max_agents int NOT NULL DEFAULT 10,
  valid_from timestamptz,
  valid_until timestamptz,
  issued_by text,
  issued_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ps_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON ps_licenses FOR ALL USING (true) WITH CHECK (true);

-- ═══ 인덱스 ═══
CREATE INDEX IF NOT EXISTS idx_ps_agents_policy ON ps_agents(policy_id);
CREATE INDEX IF NOT EXISTS idx_ps_agents_active ON ps_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_ps_agents_heartbeat ON ps_agents(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_ps_scan_results_agent ON ps_scan_results(agent_id);
CREATE INDEX IF NOT EXISTS idx_ps_scan_results_scanned ON ps_scan_results(scanned_at);
CREATE INDEX IF NOT EXISTS idx_ps_scan_files_result ON ps_scan_files(scan_result_id);
CREATE INDEX IF NOT EXISTS idx_ps_patterns_type ON ps_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ps_policies_active ON ps_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_ps_rules_active ON ps_rules(is_active);

-- ═══ 시드 데이터: 기본 4대 식별정보 패턴 ═══
INSERT INTO ps_patterns (name, description, pattern_type, is_active, regex_pattern, regex_string, validation_module, masking_start, masking_end, masking_char) VALUES
('주민등록번호', '대한민국 주민등록번호 (13자리)', 'default', true, '\d{6}[-]?\d{7}', '\d{6}[-]?\d{7}', 'resident_number', 7, 13, '*'),
('운전면허번호', '대한민국 운전면허번호', 'default', true, '\d{2}[-]?\d{6}[-]?\d{2}', '\d{2}[-]?\d{6}[-]?\d{2}', 'driver_license', 4, 12, '*'),
('여권번호', '대한민국 여권번호', 'default', true, '[A-Z]{1,2}\d{7,8}', '[A-Z]{1,2}\d{7,8}', 'passport', 2, 9, '*'),
('외국인등록번호', '외국인등록번호 (13자리)', 'default', true, '\d{6}[-]?\d{7}', '\d{6}[-]?\d{7}', 'alien_registration', 7, 13, '*')
ON CONFLICT DO NOTHING;
