import { dirname, resolve } from 'node:path'

import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// https://vite.dev/config/

const projectRoot = dirname(fileURLToPath(import.meta.url))

function resolveGitSha(): string {
  if (process.env.VITE_GIT_SHA) {
    return process.env.VITE_GIT_SHA
  }
  try {
    return execSync('git rev-parse --short HEAD', { cwd: projectRoot })
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}

const packageJson = JSON.parse(
  readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'),
) as { version: string }

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_SHA__: JSON.stringify(resolveGitSha()),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    __BUILD_ENVIRONMENT__: JSON.stringify(
      process.env.VITE_ENVIRONMENT ?? 'development',
    ),
  },
})
