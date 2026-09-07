import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { PhotoRecord } from './photo.repository.js';

export interface ProcessingWork extends PhotoRecord {
  attempts: number;
}

const maximumAttempts = 3;

@Injectable()
export class ProcessingRepository {
  constructor(private readonly database: DatabaseService) {}

  requeueInterrupted(now: string): number {
    const recover = this.database.connection.transaction(() => {
      const jobs = this.database.connection
        .prepare(
          `UPDATE processing_jobs
           SET status = 'queued', available_at = ?, claimed_at = NULL, updated_at = ?
           WHERE status = 'processing'`,
        )
        .run(now, now).changes;
      this.database.connection
        .prepare(
          `UPDATE photos
           SET processing_status = 'pending', updated_at = ?
           WHERE processing_status = 'processing'`,
        )
        .run(now);
      return jobs;
    });

    return recover();
  }

  claimNext(now: string): ProcessingWork | undefined {
    const claim = this.database.connection.transaction(() => {
      const work = this.database.connection
        .prepare(
          `SELECT p.*, j.attempts
           FROM photos p
           INNER JOIN processing_jobs j ON j.photo_id = p.id
           WHERE j.status = 'queued' AND j.available_at <= ?
           ORDER BY j.available_at ASC, j.created_at ASC
           LIMIT 1`,
        )
        .get(now) as ProcessingWork | undefined;

      if (!work) {
        return undefined;
      }

      this.database.connection
        .prepare(
          `UPDATE processing_jobs
           SET status = 'processing', attempts = attempts + 1, claimed_at = ?, updated_at = ?
           WHERE photo_id = ? AND status = 'queued'`,
        )
        .run(now, now, work.id);
      this.database.connection
        .prepare('UPDATE photos SET processing_status = \'processing\', updated_at = ? WHERE id = ?')
        .run(now, work.id);

      return { ...work, attempts: work.attempts + 1 };
    });

    return claim();
  }

  markComplete(input: {
    photoId: string;
    thumbnailKey: string;
    displayKey: string;
    width: number;
    height: number;
    now: string;
  }): void {
    const complete = this.database.connection.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE photos
           SET thumbnail_key = ?, display_key = ?, width = ?, height = ?,
               processing_status = 'ready', processing_error = NULL, updated_at = ?
           WHERE id = ?`,
        )
        .run(
          input.thumbnailKey,
          input.displayKey,
          input.width,
          input.height,
          input.now,
          input.photoId,
        );
      this.database.connection
        .prepare(
          `UPDATE processing_jobs
           SET status = 'complete', claimed_at = NULL, last_error = NULL, updated_at = ?
           WHERE photo_id = ?`,
        )
        .run(input.now, input.photoId);
    });

    complete();
  }

  markFailed(photoId: string, attempts: number, error: string, now: string): void {
    const terminal = attempts >= maximumAttempts;
    const retryAt = new Date(Date.now() + 2 ** attempts * 1000).toISOString();
    const fail = this.database.connection.transaction(() => {
      this.database.connection
        .prepare(
          `UPDATE processing_jobs
           SET status = ?, available_at = ?, claimed_at = NULL, last_error = ?, updated_at = ?
           WHERE photo_id = ?`,
        )
        .run(terminal ? 'failed' : 'queued', terminal ? now : retryAt, error, now, photoId);
      this.database.connection
        .prepare(
          `UPDATE photos
           SET processing_status = ?, processing_error = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(terminal ? 'failed' : 'pending', error, now, photoId);
    });

    fail();
  }
}
