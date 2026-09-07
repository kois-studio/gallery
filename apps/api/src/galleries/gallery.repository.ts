import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

export interface GalleryRecord {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_date: string | null;
  status: 'draft' | 'published';
  cover_photo_id: string | null;
  share_token_hash: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

@Injectable()
export class GalleryRepository {
  constructor(private readonly database: DatabaseService) {}

  create(input: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    eventDate: string | null;
    now: string;
  }): GalleryRecord {
    this.database.connection
      .prepare(
        `INSERT INTO galleries
          (id, slug, title, description, event_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.id,
        input.slug,
        input.title,
        input.description,
        input.eventDate,
        input.now,
        input.now,
      );

    return this.getById(input.id)!;
  }

  list(): GalleryRecord[] {
    return this.database.connection
      .prepare('SELECT * FROM galleries ORDER BY updated_at DESC, id DESC')
      .all() as GalleryRecord[];
  }

  getById(id: string): GalleryRecord | undefined {
    return this.database.connection
      .prepare('SELECT * FROM galleries WHERE id = ?')
      .get(id) as GalleryRecord | undefined;
  }

  updateDraft(input: {
    id: string;
    title: string;
    description: string | null;
    eventDate: string | null;
    now: string;
  }): number {
    return this.database.connection
      .prepare(
        `UPDATE galleries
         SET title = ?, description = ?, event_date = ?, updated_at = ?
         WHERE id = ? AND status = 'draft'`,
      )
      .run(input.title, input.description, input.eventDate, input.now, input.id).changes;
  }

  countPhotos(id: string): number {
    const row = this.database.connection
      .prepare('SELECT COUNT(*) AS count FROM photos WHERE gallery_id = ?')
      .get(id) as { count: number };
    return row.count;
  }

  deleteDraft(id: string): number {
    return this.database.connection
      .prepare("DELETE FROM galleries WHERE id = ? AND status = 'draft'")
      .run(id).changes;
  }

  slugExists(slug: string): boolean {
    return Boolean(
      this.database.connection.prepare('SELECT 1 FROM galleries WHERE slug = ?').get(slug),
    );
  }
}
