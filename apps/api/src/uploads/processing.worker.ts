import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import sharp from 'sharp';
import { ProcessingRepository, type ProcessingWork } from './processing.repository.js';
import { LocalStorageService } from '../storage/storage.service.js';

const maximumDecodedPixels = 100_000_000;
const maximumConcurrency = 2;

@Injectable()
export class ProcessingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProcessingWorker.name);
  private readonly running = new Set<Promise<void>>();
  private timer?: NodeJS.Timeout;
  private stopping = false;

  constructor(
    private readonly jobs: ProcessingRepository,
    private readonly storage: LocalStorageService,
  ) {}

  onModuleInit(): void {
    const recovered = this.jobs.requeueInterrupted(new Date().toISOString());
    if (recovered > 0) {
      this.logger.log(`Requeued ${recovered} interrupted processing job(s)`);
    }
    this.timer = setInterval(() => void this.poll(), 250);
    void this.poll();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) {
      clearInterval(this.timer);
    }
    await Promise.all(this.running);
  }

  private async poll(): Promise<void> {
    if (this.stopping || this.running.size >= maximumConcurrency) {
      return;
    }

    const work = this.jobs.claimNext(new Date().toISOString());
    if (!work) {
      return;
    }

    const task = this.process(work).finally(() => this.running.delete(task));
    this.running.add(task);
    void task;
    if (this.running.size < maximumConcurrency) {
      await this.poll();
    }
  }

  private async process(work: ProcessingWork): Promise<void> {
    try {
      const originalPath = await this.storage.pathForRead(work.original_key);
      const image = sharp(originalPath, { limitInputPixels: maximumDecodedPixels });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Image dimensions could not be read');
      }
      if (metadata.width * metadata.height > maximumDecodedPixels) {
        throw new Error('Image exceeds the decoded-pixel limit');
      }

      const displayKey = `galleries/${work.gallery_id}/display/${work.id}.webp`;
      const thumbnailKey = `galleries/${work.gallery_id}/thumbnail/${work.id}.webp`;
      const display = await sharp(originalPath, { limitInputPixels: maximumDecodedPixels })
        .rotate()
        .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer();
      const thumbnail = await sharp(originalPath, { limitInputPixels: maximumDecodedPixels })
        .rotate()
        .resize({ width: 480, height: 480, fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();

      await this.storage.writeAtomically(displayKey, display);
      await this.storage.writeAtomically(thumbnailKey, thumbnail);
      this.jobs.markComplete({
        photoId: work.id,
        thumbnailKey,
        displayKey,
        width: metadata.width,
        height: metadata.height,
        now: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 240) : 'Processing failed';
      this.jobs.markFailed(work.id, work.attempts, message, new Date().toISOString());
      this.logger.warn(`Photo ${work.id} processing attempt ${work.attempts} failed: ${message}`);
    }
  }
}
