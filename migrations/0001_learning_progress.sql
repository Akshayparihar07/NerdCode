CREATE TABLE problem_progress (
  clerk_user_id TEXT NOT NULL,
  problem_slug TEXT NOT NULL,
  latest_code TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  solved_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (clerk_user_id, problem_slug)
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  problem_slug TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider = 'onecompiler'),
  status TEXT NOT NULL CHECK (
    status IN (
      'accepted',
      'wrong_answer',
      'syntax_error',
      'runtime_error',
      'time_limit_exceeded',
      'judge_error'
    )
  ),
  passed_count INTEGER NOT NULL CHECK (passed_count >= 0),
  test_count INTEGER NOT NULL CHECK (test_count >= 0),
  runtime_ms INTEGER CHECK (runtime_ms IS NULL OR runtime_ms >= 0),
  memory_kb INTEGER CHECK (memory_kb IS NULL OR memory_kb >= 0),
  diagnostic TEXT CHECK (
    diagnostic IS NULL OR length(CAST(diagnostic AS BLOB)) <= 4096
  ),
  created_at INTEGER NOT NULL,
  CHECK (passed_count <= test_count)
);

CREATE INDEX submissions_by_user_created_at
ON submissions (clerk_user_id, created_at DESC);

CREATE INDEX submissions_by_user_problem_created_at
ON submissions (clerk_user_id, problem_slug, created_at DESC);
