-- Cloudflare D1 Schema for Chat GPT Pro App (Auth + 1-1 Key + Device Binding + Admin + Cloud Sync)

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Người dùng',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  pwd_version INTEGER NOT NULL DEFAULT 1,
  active_key TEXT,
  plan_type TEXT,
  key_expires_at INTEGER,
  device_ids TEXT NOT NULL DEFAULT '[]',
  daily_msg_count INTEGER NOT NULL DEFAULT 0,
  daily_token_count INTEGER NOT NULL DEFAULT 0,
  last_usage_date TEXT,
  banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS license_keys (
  key_code TEXT PRIMARY KEY,
  plan_type TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  max_devices INTEGER NOT NULL DEFAULT 2,
  bound_email TEXT,
  status TEXT NOT NULL DEFAULT 'unused',
  activated_at INTEGER,
  expires_at INTEGER,
  note TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reset_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  key_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  new_temp_password TEXT,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS app_config (
  cfg_key TEXT PRIMARY KEY,
  cfg_value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_chats (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  title TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'chat',
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_chats_email ON user_chats(email, updated_at DESC);

CREATE TABLE IF NOT EXISTS user_memories (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_memories_email ON user_memories(email, created_at DESC);
