CREATE TABLE administrators (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  administrator_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (administrator_id) REFERENCES administrators (id) ON DELETE CASCADE
);

CREATE INDEX sessions_administrator_id_idx ON sessions (administrator_id);
CREATE INDEX sessions_active_idx ON sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE galleries (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  cover_photo_id TEXT,
  share_token_hash TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX galleries_status_idx ON galleries (status);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL,
  original_key TEXT NOT NULL UNIQUE,
  thumbnail_key TEXT,
  display_key TEXT,
  mime_type TEXT NOT NULL,
  original_bytes INTEGER NOT NULL CHECK (original_bytes >= 0),
  width INTEGER,
  height INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
  processing_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (gallery_id) REFERENCES galleries (id) ON DELETE CASCADE
);

CREATE INDEX photos_gallery_position_idx ON photos (gallery_id, position, id);
CREATE INDEX photos_processing_status_idx ON photos (processing_status);

CREATE TABLE processing_jobs (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'complete', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TEXT NOT NULL,
  claimed_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
);

CREATE INDEX processing_jobs_ready_idx
  ON processing_jobs (status, available_at);
