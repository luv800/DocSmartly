CREATE TABLE IF NOT EXISTS users (
  id    TEXT PRIMARY KEY,
  mob   TEXT UNIQUE NOT NULL,
  mail  TEXT UNIQUE NOT NULL,
  token TEXT,
  data  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
