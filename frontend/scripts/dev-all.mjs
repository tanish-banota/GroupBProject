import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'

const frontendDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const backendDir = resolve(frontendDir, '..', 'backend')
const python = join(backendDir, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')

if (!existsSync(python)) {
  console.error(`Backend environment missing at ${python}`)
  console.error('Create it and install backend/requirements.txt before running dev:all.')
  process.exit(1)
}

const api = spawn(python, ['-m', 'uvicorn', 'api:app', '--host', '127.0.0.1', '--port', '8000'], {
  cwd: backendDir,
  stdio: 'inherit',
})
const vite = spawn(process.execPath, [join(frontendDir, 'node_modules/vite/bin/vite.js'), '--port', '5173', '--strictPort'], {
  cwd: frontendDir,
  stdio: 'inherit',
})

let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  api.kill()
  vite.kill()
  process.exitCode = code
}

for (const child of [api, vite]) {
  child.on('error', (error) => {
    console.error(error)
    stop(1)
  })
  child.on('exit', (code) => {
    if (!stopping) stop(code || 1)
  })
}

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
