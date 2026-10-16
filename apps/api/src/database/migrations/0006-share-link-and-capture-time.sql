ALTER TABLE galleries ADD COLUMN share_token TEXT;
ALTER TABLE photos ADD COLUMN captured_at TEXT;

CREATE INDEX photos_gallery_capture_idx ON photos (gallery_id, captured_at, position);
