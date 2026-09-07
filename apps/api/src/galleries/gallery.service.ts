import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { GalleryRepository, type GalleryRecord } from './gallery.repository.js';

export interface GalleryInput {
  title: string;
  description: string | null;
  eventDate: string | null;
}

@Injectable()
export class GalleryService {
  constructor(private readonly galleries: GalleryRepository) {}

  create(input: GalleryInput): GalleryRecord {
    const now = new Date().toISOString();
    return this.galleries.create({
      id: randomUUID(),
      slug: this.uniqueSlug(input.title),
      title: input.title,
      description: input.description,
      eventDate: input.eventDate,
      now,
    });
  }

  list(): GalleryRecord[] {
    return this.galleries.list();
  }

  get(id: string): GalleryRecord {
    const gallery = this.galleries.getById(id);
    if (!gallery) {
      throw new NotFoundException('Gallery not found');
    }

    return gallery;
  }

  update(id: string, input: GalleryInput): GalleryRecord {
    const current = this.get(id);
    const changes = this.galleries.updateDraft({
      id,
      ...input,
      now: new Date().toISOString(),
    });

    if (changes === 0 && current.status !== 'draft') {
      throw new ConflictException('Published galleries cannot be edited in this slice');
    }

    return this.get(id);
  }

  delete(id: string): void {
    const current = this.get(id);
    if (current.status !== 'draft') {
      throw new ConflictException('Published galleries cannot be deleted in this slice');
    }
    if (this.galleries.countPhotos(id) > 0) {
      throw new ConflictException('Gallery with stored photos cannot be deleted in this slice');
    }

    if (this.galleries.deleteDraft(id) === 0) {
      throw new NotFoundException('Gallery not found');
    }
  }

  private uniqueSlug(title: string): string {
    const base = slugify(title);
    let candidate = base;
    let suffix = 2;
    while (this.galleries.slugExists(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'gallery';
}
