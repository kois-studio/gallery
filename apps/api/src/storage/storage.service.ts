import { BadRequestException, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { ConfigService } from '@nestjs/config'
import type { GalleryConfiguration } from '../configuration.js'

@Injectable()
export class LocalStorageService {
    private readonly root: string

    constructor(config: ConfigService<GalleryConfiguration, true>) {
        this.root = resolve(config.get('STORAGE_PATH', { infer: true }))
    }

    async ensureRoot(): Promise<void> {
        await mkdir(this.root, { recursive: true })
    }

    async writeAtomically(key: string, contents: Uint8Array): Promise<void> {
        const destination = this.pathForKey(key)
        const temporary = `${destination}.tmp-${randomUUID()}`
        await mkdir(dirname(destination), { recursive: true })
        await this.assertNoSymlinkInPath(dirname(destination))

        try {
            await writeFile(temporary, contents, { flag: 'wx', mode: 0o600 })
            await rename(temporary, destination)
        } catch (error) {
            await rm(temporary, { force: true })
            throw error
        }
    }

    async remove(key: string): Promise<void> {
        await rm(this.pathForKey(key), { force: true })
    }

    async moveAtomically(sourcePath: string, key: string): Promise<void> {
        const destination = this.pathForKey(key)
        await mkdir(dirname(destination), { recursive: true })
        await this.assertNoSymlinkInPath(dirname(destination))
        await rename(sourcePath, destination)
    }

    async pathForRead(key: string): Promise<string> {
        const path = this.pathForKey(key)
        await this.assertNoSymlinkInPath(dirname(path))
        const metadata = await lstat(path)
        if (metadata.isSymbolicLink()) {
            throw new BadRequestException('Storage object cannot be a symbolic link')
        }
        return path
    }

    async read(key: string): Promise<Buffer> {
        return readFile(await this.pathForRead(key))
    }

    pathForKey(key: string): string {
        if (!isSafeStorageKey(key)) {
            throw new BadRequestException('Invalid storage key')
        }

        const path = resolve(this.root, key)
        const relativePath = relative(this.root, path)
        if (relativePath === '' || relativePath.startsWith('..') || isAbsolute(relativePath)) {
            throw new BadRequestException('Invalid storage key')
        }

        return path
    }

    private async assertNoSymlinkInPath(directory: string): Promise<void> {
        const relativeDirectory = relative(this.root, directory)
        let current = this.root

        for (const segment of relativeDirectory ? relativeDirectory.split('/') : []) {
            current = join(current, segment)
            const metadata = await lstat(current)
            if (metadata.isSymbolicLink()) {
                throw new BadRequestException('Storage path cannot contain symbolic links')
            }
        }
    }
}

export function isSafeStorageKey(key: string): boolean {
    return (
        key.length > 0 &&
        key.length <= 1024 &&
        !key.startsWith('/') &&
        !key.includes('\\') &&
        !key.split('/').some(segment => segment === '' || segment === '.' || segment === '..') &&
        /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(key)
    )
}
