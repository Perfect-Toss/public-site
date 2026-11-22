/**
 * Browser telemetry: OpenTelemetry traces and logs, exported to the same
 * Application Insights resource as the API.
 *
 * - Every `fetch` (the API, Firebase Auth, storage) becomes a dependency. Calls
 *   to the API carry a W3C `traceparent`, so the API's request joins the same
 *   operation in App Insights.
 * - `reportError` / `reportEvent` record failures and notable outcomes with
 *   context (provider, step, Firebase error code).
 * - Uncaught errors and unhandled rejections are recorded automatically.
 *
 * With no connection string configured (local dev, tests) everything here is a
 * no-op.
 */
import { SeverityNumber, type Logger } from '@opentelemetry/api-logs';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { BatchSpanProcessor, type Span, type SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

import { API_BASE_URL } from '../api/client';
import { newUuid } from '../utils/uuid';
import { APP_VERSION } from '../version';
import { parseConnectionString } from './connectionString';
import { ATTR_PAGE_PATH, ATTR_USER_ID } from './envelopes';
import { browserContext, describeError, redactSecrets, type TelemetryAttributes } from './errorDetails';
import { AppInsightsLogExporter, AppInsightsSpanExporter } from './exporters';

export type { TelemetryAttributes } from './errorDetails';

const SERVICE_NAME = 'perfect-toss-web';

let logger: Logger | null = null;
let currentUserId: string | null = null;

/**
 * Attach the signed-in user's Firebase uid to everything recorded from now on
 * (App Insights "Auth user id"). Pass null on sign-out. Never an email.
 */
export function setTelemetryUser(uid: string | null): void {
  currentUserId = uid;
}

/** Attributes recorded with every span and log: where the user was, and who they were. */
function ambientAttributes(): TelemetryAttributes {
  return {
    [ATTR_PAGE_PATH]: typeof window === 'undefined' ? undefined : window.location.pathname,
    [ATTR_USER_ID]: currentUserId ?? undefined,
  };
}

function clean(attributes: TelemetryAttributes): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null) result[key] = value;
  }
  return result;
}

const SEVERITY = {
  info: [SeverityNumber.INFO, 'INFO'],
  warn: [SeverityNumber.WARN, 'WARN'],
  error: [SeverityNumber.ERROR, 'ERROR'],
} as const;

function emit(level: keyof typeof SEVERITY, message: string, attributes: TelemetryAttributes): void {
  if (!logger) return;
  const [severityNumber, severityText] = SEVERITY[level];
  try {
    logger.emit({
      severityNumber,
      severityText,
      body: message,
      attributes: clean({ ...ambientAttributes(), ...attributes }),
    });
  } catch {
    // Telemetry must never break the app.
  }
}

/** Caller attributes with any token-looking text masked. */
function redactAttributes(attributes: TelemetryAttributes): TelemetryAttributes {
  const result: TelemetryAttributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    result[key] = typeof value === 'string' ? redactSecrets(value) : value;
  }
  return result;
}

/**
 * Record a failure as an App Insights exception. `message` says what the app
 * was doing. The error's own details (code, status, correlation id, Firebase
 * data, cause chain) and the browser's state are added automatically.
 */
export function reportError(message: string, error: unknown, attributes: TelemetryAttributes = {}): void {
  if (!logger) return;
  emit('error', message, { ...browserContext(), ...describeError(error), ...redactAttributes(attributes) });
}

/**
 * Record a notable outcome that is not an exception (App Insights trace).
 * Warnings and errors also carry the browser's state.
 */
export function reportEvent(
  message: string,
  attributes: TelemetryAttributes = {},
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  if (!logger) return;
  emit(level, message, { ...(level === 'info' ? {} : browserContext()), ...redactAttributes(attributes) });
}

/** Stamps every span with the page and user at the moment it starts. */
class AmbientAttributesProcessor implements SpanProcessor {
  onStart(span: Span): void {
    span.setAttributes(clean(ambientAttributes()));
  }
  onEnd(): void {}
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

/** An id kept in browser storage, or a fresh one per page load when storage is unavailable. */
function storedId(storage: () => Storage, key: string): string {
  try {
    const existing = storage().getItem(key);
    if (existing) return existing;
    const created = newUuid().replace(/-/g, '');
    storage().setItem(key, created);
    return created;
  } catch {
    return newUuid().replace(/-/g, '');
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Browser noise that says nothing about the app. */
const IGNORED_ERROR_MESSAGES = [/ResizeObserver loop/i];

function installGlobalHandlers(): void {
  window.addEventListener('error', (event) => {
    const error: unknown = event.error ?? event.message;
    const text = error instanceof Error ? error.message : String(error);
    if (IGNORED_ERROR_MESSAGES.some((pattern) => pattern.test(text))) return;
    reportError('Uncaught error', error, {
      'code.filepath': event.filename || undefined,
      'code.lineno': event.lineno || undefined,
      'code.column': event.colno || undefined,
    });
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportError('Unhandled promise rejection', event.reason);
  });
}

let initialized = false;

/**
 * Start telemetry. Call once, before the app renders, so the fetch
 * instrumentation is in place for the first request. Returns false (and does
 * nothing) without a connection string.
 */
export function initTelemetry(
  connectionString: string | undefined = import.meta.env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING,
): boolean {
  if (initialized || typeof window === 'undefined') return initialized;
  const target = parseConnectionString(connectionString);
  if (!target) return false;

  try {
    const resource = resourceFromAttributes({
      'service.name': SERVICE_NAME,
      'service.version': APP_VERSION.version,
      'deployment.environment.name': APP_VERSION.environment,
    });
    const context = {
      instrumentationKey: target.instrumentationKey,
      sessionId: storedId(() => window.sessionStorage, 'pt.telemetry.session'),
      anonymousUserId: storedId(() => window.localStorage, 'pt.telemetry.user'),
    };

    const tracerProvider = new WebTracerProvider({
      resource,
      spanProcessors: [
        new AmbientAttributesProcessor(),
        new BatchSpanProcessor(new AppInsightsSpanExporter(target, context), { maxExportBatchSize: 50 }),
      ],
    });
    // Installs the W3C trace-context propagator and the default context manager.
    tracerProvider.register();

    registerInstrumentations({
      tracerProvider,
      instrumentations: [
        new FetchInstrumentation({
          // Only the API is sent a traceparent: other origins (Firebase, storage) would reject
          // the extra header in their CORS preflight.
          propagateTraceHeaderCorsUrls: [new RegExp(`^${escapeRegExp(new URL(API_BASE_URL).origin)}`)],
          ignoreUrls: [new RegExp(`^${escapeRegExp(new URL(target.trackUrl).origin)}`)],
          clearTimingResources: true,
        }),
      ],
    });

    const loggerProvider = new LoggerProvider({
      resource,
      processors: [
        new BatchLogRecordProcessor({ exporter: new AppInsightsLogExporter(target, context), maxExportBatchSize: 50 }),
      ],
    });
    logger = loggerProvider.getLogger(SERVICE_NAME, APP_VERSION.version);

    installGlobalHandlers();
    initialized = true;
  } catch (error) {
    console.warn('Telemetry could not be started:', error);
  }
  return initialized;
}
