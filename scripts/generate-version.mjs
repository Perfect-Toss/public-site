/**
 * Generates `public/version.json` with build metadata so the deployed
 * version can be inspected at runtime (e.g. GET /version.json) and polled
 * by the app's new-version checker.
 *
 * - version:      from package.json
 * - sha:          VITE_GIT_SHA / GITHUB_SHA env, else short git HEAD
 * - environment:  VITE_ENVIRONMENT env, else 'development'
 * - buildTime:    ISO timestamp of the build
 */

import { dirname, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { version } = JSON.parse(
  readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'),
);

function gitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: projectRoot })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const sha = process.env.VITE_GIT_SHA || process.env.GITHUB_SHA || gitShortSha();

const payload = {
  version,
  sha,
  environment: process.env.VITE_ENVIRONMENT || 'development',
  buildTime: new Date().toISOString(),
};

const publicDir = resolve(projectRoot, 'public');
mkdirSync(publicDir, { recursive: true });
writeFileSync(
  resolve(publicDir, 'version.json'),
  `${JSON.stringify(payload, null, 2)}\n`,
);

console.log(
  `[generate:version] wrote public/version.json: v${version} (${sha}) ${payload.environment}`,
);
