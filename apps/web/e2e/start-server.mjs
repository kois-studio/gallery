import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const dataDirectory = mkdtempSync(join(tmpdir(), 'kois-gallery-playwright-'))
const apiEntryPoint = resolve(scriptDirectory, '../../api/dist/main.js')
const child = spawn(process.execPath, [apiEntryPoint], {
    env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3400',
        DATABASE_PATH: join(dataDirectory, 'gallery.db'),
        STORAGE_PATH: join(dataDirectory, 'photos'),
        SETUP_TOKEN: 'playwright-test-setup-token-with-at-least-32-characters',
    },
    stdio: 'inherit',
})

let cleaned = false
function cleanup() {
    if (cleaned) return
    cleaned = true
    rmSync(dataDirectory, { recursive: true, force: true })
}

function stop() {
    child.kill('SIGTERM')
    cleanup()
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)
child.on('exit', (code) => {
    cleanup()
    process.exit(code ?? 0)
})
