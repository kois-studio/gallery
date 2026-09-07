CREATE TABLE visitor_sessions (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (gallery_id) REFERENCES galleries (id) ON DELETE CASCADE
);

CREATE INDEX visitor_sessions_gallery_id_idx ON visitor_sessions (gallery_id);
CREATE INDEX visitor_sessions_active_idx ON visitor_sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;
