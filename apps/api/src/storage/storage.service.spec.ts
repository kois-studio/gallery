import { ConfigService } from '@nestjs/config';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LocalStorageService } from './storage.service.js';

describe('LocalStorageService', () => {
  it('writes atomically under the configured root and rejects traversal', async () => {
    const root = mkdtempSync(join(tmpdir(), 'gallery-storage-'));
    const config = { get: vi.fn().mockReturnValue(root) } as unknown as ConfigService;
    const storage = new LocalStorageService(config);

    try {
      await storage.writeAtomically('gallery/photo/original.jpg', Buffer.from('original'));
      expect(
        readFileSync(join(root, 'gallery/photo/original.jpg'), 'utf8'),
      ).toBe('original');
      expect(() => storage.pathForKey('../outside.jpg')).toThrow();
      expect(() => storage.pathForKey('/outside.jpg')).toThrow();
      expect(() => storage.pathForKey('gallery/../outside.jpg')).toThrow();
      expect(() => storage.pathForKey('gallery\\outside.jpg')).toThrow();

      mkdirSync(join(root, 'linked'), { recursive: true });
      symlinkSync(join(root, 'linked'), join(root, 'gallery', 'escape'));
      await expect(
        storage.writeAtomically('gallery/escape/file.jpg', Buffer.from('unsafe')),
      ).rejects.toThrow('symbolic links');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
