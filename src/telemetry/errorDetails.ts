/**
 * Everything useful for diagnosing a failure, flattened into telemetry
 * attributes: the exception itself, its cause chain, any extra properties
 * (Firebase `code`/`customData`, API status and correlation id), and the
 * browser it happened in.
 *
 * Credentials never leave the browser: Firebase's token responses are reduced
 * to an allowlist of descriptive fields, and anything that looks like a JWT or
 * an OAuth token is masked wherever it appears.
 */

export type AttributeValue = string | number | boolean | null | undefined;
export type TelemetryAttributes = Record<string, AttributeValue>;

const JWT = /eyJ[\w-]{6,}\.[\w-]{6,}\.[\w-]*/g;
// oobCode: the one-time code in a magic link. apiKey/key: Firebase's public key, but noise.
const TOKEN_PARAM = /\b((?:id|access|refresh|oauth)_?token|oobCode|code|secret|password|sig|apiKey|key)=([^&\s"',]+)/gi;
const BEARER = /\bBearer\s+[\w.~+/-]+=*/gi;

/** Text with JWTs, bearer tokens and token-valued URL parameters masked. */
export function redactSecrets(text: string): string {
  return text.replace(JWT, '[jwt]').replace(BEARER, 'Bearer [redacted]').replace(TOKEN_PARAM, '$1=[redacted]');
}

const redact = (value: AttributeValue): AttributeValue => (typeof value === 'string' ? redactSecrets(value) : value);

/**
 * Descriptive fields Firebase puts on `customData`, `_tokenResponse` and
 * `_serverResponse`. Those objects also hold ID, refresh and OAuth tokens,
 * which is why this is an allowlist.
 */
const FIREBASE_SAFE_FIELDS = [
  'appName',
  'email',
  'phoneNumber',
  'tenantId',
  'providerId',
  'operationType',
  'errorMessage',
  'needConfirmation',
  'emailVerified',
  'verifiedProvider',
  'federatedId',
  'localId',
  'isNewUser',
  'kind',
];

function firebaseCustomData(customData: unknown): TelemetryAttributes {
  if (!customData || typeof customData !== 'object') return {};
  const attributes: TelemetryAttributes = {};
  const sources: Array<[string, unknown]> = [
    ['firebase', customData],
    ['firebase.token_response', (customData as Record<string, unknown>)._tokenResponse],
    ['firebase.server_response', (customData as Record<string, unknown>)._serverResponse],
  ];
  for (const [prefix, source] of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const field of FIREBASE_SAFE_FIELDS) {
      const value = (source as Record<string, unknown>)[field];
      if (value === undefined || value === null || typeof value === 'object') continue;
      attributes[`${prefix}.${field}`] = redact(value as AttributeValue);
    }
  }
  return attributes;
}

/** Properties every Error has, described by the exception.* attributes instead. */
const STANDARD_ERROR_FIELDS = new Set(['name', 'message', 'stack', 'cause', 'customData']);

/** Own primitive properties an error carries beyond the standard ones (`code`, `status`, …). */
function extraProperties(error: object): TelemetryAttributes {
  const attributes: TelemetryAttributes = {};
  for (const [key, value] of Object.entries(error)) {
    if (STANDARD_ERROR_FIELDS.has(key)) continue;
    if (['string', 'number', 'boolean'].includes(typeof value)) {
      attributes[`error.${key}`] = redact(value as AttributeValue);
    }
  }
  return attributes;
}

// `Error.cause` is ES2022; the project's lib predates it.
const causeOf = (error: Error): unknown => (error as { cause?: unknown }).cause;

function causeChain(error: Error): string | undefined {
  const causes: string[] = [];
  let cause: unknown = causeOf(error);
  while (cause !== undefined && cause !== null && causes.length < 5) {
    causes.push(cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause));
    cause = cause instanceof Error ? causeOf(cause) : undefined;
  }
  return causes.length ? redactSecrets(causes.join(' <- ')) : undefined;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Semantic-convention exception attributes plus everything else the error carries. */
export function describeError(error: unknown): TelemetryAttributes {
  if (!(error instanceof Error)) {
    return {
      'exception.type': error === null || error === undefined ? 'NoError' : typeof error === 'object' ? 'NonErrorObject' : 'NonError',
      'exception.message': redactSecrets(stringify(error)),
    };
  }
  return {
    'exception.type': error.name || error.constructor?.name || 'Error',
    'exception.message': redactSecrets(error.message),
    'exception.stacktrace': error.stack ? redactSecrets(error.stack) : undefined,
    'exception.cause': causeChain(error),
    ...extraProperties(error),
    ...firebaseCustomData((error as { customData?: unknown }).customData),
  };
}

/** Embedded browsers (social apps, Google app) that commonly break sign-in popups. */
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Twitter|TikTok|musical_ly|Snapchat|Line\/|MicroMessenger|GSA\/|Pinterest|; wv\)/i;

function canUseStorage(storage: () => Storage): boolean {
  try {
    const key = '__pt_probe__';
    storage().setItem(key, '1');
    storage().removeItem(key);
    return true;
  } catch {
    return false;
  }
}

interface NavigatorExtras {
  userAgentData?: { platform?: string; mobile?: boolean; brands?: Array<{ brand: string; version: string }> };
  connection?: { effectiveType?: string; saveData?: boolean };
  standalone?: boolean;
}

/** The browser and page state at the moment of a failure. */
export function browserContext(): TelemetryAttributes {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};
  const nav = navigator as Navigator & NavigatorExtras;
  const userAgent = nav.userAgent;
  const standalone =
    nav.standalone === true || (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches);

  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // unavailable
  }

  return {
    'browser.user_agent': userAgent,
    'browser.platform': nav.userAgentData?.platform ?? nav.platform,
    'browser.mobile': nav.userAgentData?.mobile,
    'browser.brands': nav.userAgentData?.brands?.map((b) => `${b.brand} ${b.version}`).join(', '),
    'browser.in_app': IN_APP_BROWSER.test(userAgent),
    'browser.standalone': standalone,
    'browser.language': nav.language,
    'browser.timezone': timeZone,
    'browser.online': nav.onLine,
    'browser.cookies_enabled': nav.cookieEnabled,
    'browser.local_storage': canUseStorage(() => window.localStorage),
    'browser.session_storage': canUseStorage(() => window.sessionStorage),
    'browser.connection': nav.connection?.effectiveType,
    'browser.save_data': nav.connection?.saveData,
    'browser.viewport': `${window.innerWidth}x${window.innerHeight}`,
    'browser.screen': window.screen ? `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}` : undefined,
    'page.url': redactSecrets(window.location.href),
    'page.referrer': document.referrer ? redactSecrets(document.referrer) : undefined,
    'page.visibility': document.visibilityState,
    'page.has_opener': window.opener !== null,
    'page.uptime_ms': Math.round(performance.now()),
  };
}
