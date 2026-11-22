import { SpanKind, SpanStatusCode, TraceFlags, type Attributes } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';
import type { ReadableLogRecord } from '@opentelemetry/sdk-logs';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { describe, expect, it } from 'vitest';

import { logToEnvelope, redactUrl, spanToEnvelopes, toSeverityLevel, toTimeSpan, type EnvelopeContext } from './envelopes';

const context: EnvelopeContext = {
  instrumentationKey: 'aaaa-bbbb',
  sessionId: 'session-1',
  anonymousUserId: 'anon-1',
};

const resource = {
  attributes: {
    'service.name': 'perfect-toss-web',
    'service.version': '1.2.3',
    'deployment.environment.name': 'development',
  } as Attributes,
};

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';
const SPAN_ID = 'b7ad6b7169203331';
const PARENT_ID = '00f067aa0ba902b7';

function span(overrides: Partial<ReadableSpan>): ReadableSpan {
  return {
    name: 'HTTP POST',
    kind: SpanKind.CLIENT,
    spanContext: () => ({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: TraceFlags.SAMPLED }),
    parentSpanContext: undefined,
    startTime: [1_700_000_000, 0],
    endTime: [1_700_000_000, 250_000_000],
    duration: [0, 250_000_000],
    status: { code: SpanStatusCode.UNSET },
    attributes: {},
    links: [],
    events: [],
    ended: true,
    resource,
    instrumentationScope: { name: '@opentelemetry/instrumentation-fetch' },
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
    ...overrides,
  } as unknown as ReadableSpan;
}

function logRecord(overrides: Partial<ReadableLogRecord>): ReadableLogRecord {
  return {
    hrTime: [1_700_000_000, 0],
    hrTimeObserved: [1_700_000_000, 0],
    severityNumber: SeverityNumber.ERROR,
    severityText: 'ERROR',
    body: 'Apple sign-in failed',
    resource,
    instrumentationScope: { name: 'perfect-toss-web' },
    attributes: {},
    droppedAttributesCount: 0,
    ...overrides,
  } as unknown as ReadableLogRecord;
}

describe('toTimeSpan', () => {
  it.each([
    [0, '00:00:00.000'],
    [250, '00:00:00.250'],
    [3_723_004, '01:02:03.004'],
    [90_000_000, '1.01:00:00.000'],
  ])('%d ms → %s', (ms, expected) => {
    expect(toTimeSpan(ms)).toBe(expected);
  });
});

describe('toSeverityLevel', () => {
  it('maps OTel severities onto App Insights levels', () => {
    expect(toSeverityLevel(SeverityNumber.DEBUG)).toBe(0);
    expect(toSeverityLevel(SeverityNumber.INFO)).toBe(1);
    expect(toSeverityLevel(SeverityNumber.WARN)).toBe(2);
    expect(toSeverityLevel(SeverityNumber.ERROR)).toBe(3);
    expect(toSeverityLevel(SeverityNumber.FATAL)).toBe(4);
  });
});

describe('redactUrl', () => {
  it('removes credential-like query values and keeps the rest', () => {
    const redacted = new URL(redactUrl('https://store.blob.core.windows.net/v/a.mp4?sv=2024&sig=SECRET&page=2'));
    expect(redacted.searchParams.get('sig')).toBe('REDACTED');
    expect(redacted.searchParams.get('sv')).toBe('2024');
    expect(redacted.searchParams.get('page')).toBe('2');
  });
});

describe('spanToEnvelopes', () => {
  it('turns a failed fetch into a dependency correlated with the trace', () => {
    const [dependency] = spanToEnvelopes(
      span({
        parentSpanContext: { traceId: TRACE_ID, spanId: PARENT_ID, traceFlags: TraceFlags.SAMPLED },
        attributes: {
          'http.method': 'POST',
          'http.url': 'https://dev-api.perfect-toss.com/api/v1/auth/session?token=abc',
          'http.status_code': 409,
          'enduser.id': 'firebase-uid',
          'page.path': '/login',
        },
      }),
      context,
    );

    expect(dependency.name).toBe('Microsoft.ApplicationInsights.aaaabbbb.RemoteDependency');
    expect(dependency.iKey).toBe('aaaa-bbbb');
    expect(dependency.time).toBe('2023-11-14T22:13:20.000Z');
    expect(dependency.tags).toMatchObject({
      'ai.operation.id': TRACE_ID,
      'ai.operation.parentId': PARENT_ID,
      'ai.operation.name': '/login',
      'ai.user.authUserId': 'firebase-uid',
      'ai.user.id': 'anon-1',
      'ai.session.id': 'session-1',
      'ai.cloud.role': 'perfect-toss-web',
      'ai.application.ver': '1.2.3',
    });
    expect(dependency.data.baseType).toBe('RemoteDependencyData');
    expect(dependency.data.baseData).toMatchObject({
      ver: 2,
      id: SPAN_ID,
      name: 'POST /api/v1/auth/session',
      target: 'dev-api.perfect-toss.com',
      type: 'Fetch',
      resultCode: '409',
      success: false,
      duration: '00:00:00.250',
    });
    expect(dependency.data.baseData.data).toContain('token=REDACTED');
    const properties = dependency.data.baseData.properties as Record<string, string>;
    expect(properties['deployment.environment']).toBe('development');
    expect(properties['enduser.id']).toBeUndefined();
  });

  it('reads the stable HTTP semantic conventions too', () => {
    const [dependency] = spanToEnvelopes(
      span({
        attributes: {
          'http.request.method': 'GET',
          'url.full': 'https://identitytoolkit.googleapis.com/v1/accounts:lookup',
          'http.response.status_code': 200,
        },
      }),
      context,
    );
    expect(dependency.data.baseData).toMatchObject({
      name: 'GET /v1/accounts:lookup',
      resultCode: '200',
      success: true,
    });
  });

  it('treats a fetch with no response as failed', () => {
    const [dependency] = spanToEnvelopes(
      span({ attributes: { 'http.method': 'GET', 'http.url': 'https://x.test/a', 'http.status_code': 0 } }),
      context,
    );
    expect(dependency.data.baseData.success).toBe(false);
  });

  it('adds an exception for each recorded exception event', () => {
    const envelopes = spanToEnvelopes(
      span({
        kind: SpanKind.INTERNAL,
        name: 'work',
        status: { code: SpanStatusCode.ERROR },
        events: [
          {
            name: 'exception',
            time: [1_700_000_000, 100_000_000],
            attributes: { 'exception.type': 'TypeError', 'exception.message': 'boom', 'exception.stacktrace': 'at x' },
          },
        ],
      }),
      context,
    );
    expect(envelopes).toHaveLength(2);
    expect(envelopes[0].data.baseData).toMatchObject({ type: 'InProc', success: false });
    expect(envelopes[1].data.baseType).toBe('ExceptionData');
    expect(envelopes[1].tags['ai.operation.parentId']).toBe(SPAN_ID);
    expect(envelopes[1].data.baseData.exceptions).toEqual([
      { typeName: 'TypeError', message: 'boom', hasFullStack: true, stack: 'at x' },
    ]);
  });
});

describe('logToEnvelope', () => {
  it('turns a record with exception attributes into an exception', () => {
    const envelope = logToEnvelope(
      logRecord({
        attributes: {
          'exception.type': 'FirebaseError',
          'exception.message': 'Firebase: Error (auth/invalid-credential).',
          'exception.stacktrace': 'FirebaseError: …',
          'error.code': 'auth/invalid-credential',
          'auth.provider': 'apple.com',
          'auth.step': 'popup',
          'enduser.id': 'firebase-uid',
        },
      }),
      context,
    );

    expect(envelope.name).toBe('Microsoft.ApplicationInsights.aaaabbbb.Exception');
    expect(envelope.data.baseType).toBe('ExceptionData');
    expect(envelope.tags['ai.user.authUserId']).toBe('firebase-uid');
    expect(envelope.tags['ai.operation.id']).toBeUndefined();
    expect(envelope.data.baseData).toMatchObject({
      severityLevel: 3,
      exceptions: [
        {
          typeName: 'FirebaseError',
          message: 'Firebase: Error (auth/invalid-credential).',
          hasFullStack: true,
          stack: 'FirebaseError: …',
        },
      ],
      properties: {
        message: 'Apple sign-in failed',
        'error.code': 'auth/invalid-credential',
        'auth.provider': 'apple.com',
        'auth.step': 'popup',
        'deployment.environment': 'development',
      },
    });
  });

  it('turns a plain record into a trace message, correlated when emitted inside a span', () => {
    const envelope = logToEnvelope(
      logRecord({
        severityNumber: SeverityNumber.WARN,
        body: 'Sign-in rejected: no shareable email',
        spanContext: { traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: TraceFlags.SAMPLED },
        attributes: { 'auth.email_kind': 'apple-private-relay' },
      }),
      context,
    );

    expect(envelope.data.baseType).toBe('MessageData');
    expect(envelope.tags['ai.operation.id']).toBe(TRACE_ID);
    expect(envelope.data.baseData).toMatchObject({
      message: 'Sign-in rejected: no shareable email',
      severityLevel: 2,
      properties: { 'auth.email_kind': 'apple-private-relay' },
    });
  });
});
