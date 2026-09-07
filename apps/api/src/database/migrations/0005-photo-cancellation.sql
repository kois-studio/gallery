ALTER TABLE photos ADD COLUMN cancelled_at TEXT;
ALTER TABLE processing_jobs ADD COLUMN cancelled_at TEXT;

CREATE INDEX photos_cancelled_idx ON photos (cancelled_at);
CREATE INDEX processing_jobs_cancelled_idx ON processing_jobs (cancelled_at);
