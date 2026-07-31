/**
 * Build-time metadata injected by Vite's `define` in `vite.config.ts`.
 * The globals (`__APP_VERSION__`, etc.) are declared in `vite-env.d.ts`.
 */

export interface AppVersion {
  version: string;
  sha: string;
  environment: string;
  buildTime: string;
}

export const APP_VERSION: AppVersion = {
  version: __APP_VERSION__,
  sha: __BUILD_SHA__,
  environment: __BUILD_ENVIRONMENT__,
  buildTime: __BUILD_TIMESTAMP__,
};

export const IS_PRODUCTION = APP_VERSION.environment === 'production';

/**
 * Formats the version for display.
 *
 * In production only the version number is shown — the git SHA and
 * environment are intentionally omitted. Non-production builds include the
 * short SHA and environment so you can tell at a glance which dev build is
 * running.
 */
export function formatVersion(info: AppVersion = APP_VERSION): string {
  const base = `v${info.version}`;
  if (info.environment === 'production') {
    return base;
  }
  const parts = [base];
  if (info.sha && info.sha !== 'unknown') {
    parts.push(info.sha.slice(0, 7));
  }
  if (info.environment) {
    parts.push(info.environment);
  }
  return parts.join(' · ');
}
