import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import type { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';

import type { AppInsightsTarget } from './connectionString';
import { logToEnvelope, spanToEnvelopes, type Envelope, type EnvelopeContext } from './envelopes';

/** Sends one JSON batch; resolves true when the ingestion endpoint accepted it. */
export type Transport = (url: string, body: string) => Promise<boolean>;

// Captured when this module loads, before fetch instrumentation patches
// `window.fetch`, so posting telemetry never produces telemetry of its own.
const nativeFetch: typeof fetch | undefined =
  typeof fetch === 'function' ? fetch.bind(globalThis) : undefined;

// Browsers cap the bodies of all in-flight keepalive requests at 64 KiB.
const KEEPALIVE_LIMIT_BYTES = 60_000;

export const fetchTransport: Transport = async (url, body) => {
  if (!nativeFetch) return false;
  try {
    const response = await nativeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'omit',
      // keepalive lets a batch flushed as the page is hidden or closed still arrive.
      keepalive: new TextEncoder().encode(body).length < KEEPALIVE_LIMIT_BYTES,
    });
    // 206: some envelopes were rejected, the rest were stored.
    return response.ok || response.status === 206;
  } catch {
    return false;
  }
};

/** Posts OTel batches to the Application Insights ingestion endpoint. Failed batches are dropped, not retried. */
class AppInsightsExporter<T> {
  private stopped = false;

  constructor(
    private readonly target: AppInsightsTarget,
    private readonly context: EnvelopeContext,
    private readonly toEnvelopes: (item: T, context: EnvelopeContext) => Envelope[],
    private readonly transport: Transport,
  ) {}

  export(items: T[], resultCallback: (result: ExportResult) => void): void {
    if (this.stopped || items.length === 0) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    let body: string;
    try {
      body = JSON.stringify(items.flatMap((item) => this.toEnvelopes(item, this.context)));
    } catch (error) {
      resultCallback({ code: ExportResultCode.FAILED, error: error as Error });
      return;
    }

    void this.transport(this.target.trackUrl, body).then((accepted) =>
      resultCallback(
        accepted
          ? { code: ExportResultCode.SUCCESS }
          : { code: ExportResultCode.FAILED, error: new Error('Application Insights did not accept the telemetry batch') },
      ),
    );
  }

  shutdown(): Promise<void> {
    this.stopped = true;
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

export class AppInsightsSpanExporter extends AppInsightsExporter<ReadableSpan> implements SpanExporter {
  constructor(target: AppInsightsTarget, context: EnvelopeContext, transport: Transport = fetchTransport) {
    super(target, context, spanToEnvelopes, transport);
  }
}

export class AppInsightsLogExporter extends AppInsightsExporter<ReadableLogRecord> implements LogRecordExporter {
  constructor(target: AppInsightsTarget, context: EnvelopeContext, transport: Transport = fetchTransport) {
    super(target, context, (record, context) => [logToEnvelope(record, context)], transport);
  }
}
