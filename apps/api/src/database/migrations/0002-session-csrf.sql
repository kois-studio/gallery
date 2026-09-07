ALTER TABLE sessions ADD COLUMN csrf_token_hash TEXT;

CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
