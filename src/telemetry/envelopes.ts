/**
 * Maps OpenTelemetry spans and log records onto Application Insights envelopes
 * (the JSON the ingestion `track` endpoint accepts), so the site reports into
 * the same resource as the API without an OpenTelemetry Collector in between.
 *
 * - client spans (fetch)        → RemoteDependency (type "Fetch")
 * - other spans                 → RemoteDependency (type "InProc")
 * - span "exception" events     → Exception
 * - log records with exception.* → Exception
 * - other log records           → Message (trace)
 */
import { isSpanContextValid, SpanKind, SpanStatusCode, type Attributes, type HrTime, type SpanContext } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';
import type { ReadableLogRecord } from '@opentelemetry/sdk-logs';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

/** Firebase uid of the signed-in user, captured when the span starts or the record is emitted. */
export const ATTR_USER_ID = 'enduser.id';
/** Route the user was on, captured when the span starts or the record is emitted. */
export const ATTR_PAGE_PATH = 'page.path';

const ATTR_EXCEPTION_TYPE = 'exception.type';
const ATTR_EXCEPTION_MESSAGE = 'exception.message';
const ATTR_EXCEPTION_STACKTRACE = 'exception.stacktrace';

/** Attributes surfaced as envelope fields or tags, so they are not repeated in customDimensions. */
const MAPPED_ATTRIBUTES = new Set([
  ATTR_USER_ID,
  ATTR_PAGE_PATH,
  ATTR_EXCEPTION_TYPE,
  ATTR_EXCEPTION_MESSAGE,
  ATTR_EXCEPTION_STACKTRACE,
]);

const MAX_PROPERTY_LENGTH = 8192;
const SDK_VERSION = 'otel-web:perfect-toss';

/** Values that identify the page session, the same for every envelope it sends. */
export interface EnvelopeContext {
  instrumentationKey: string;
  sessionId: string;
  anonymousUserId: string;
}

export interface Envelope {
  name: string;
  time: string;
  iKey: string;
  tags: Record<string, string>;
  data: { baseType: string; baseData: Record<string, unknown> };
}

/** Application Insights severity: Verbose 0, Information 1, Warning 2, Error 3, Critical 4. */
export function toSeverityLevel(severity: SeverityNumber | undefined): number {
  if (severity === undefined) return 1;
  if (severity < SeverityNumber.INFO) return 0;
  if (severity < SeverityNumber.WARN) return 1;
  if (severity < SeverityNumber.ERROR) return 2;
  if (severity < SeverityNumber.FATAL) return 3;
  return 4;
}

const hrTimeToMs = ([seconds, nanos]: HrTime): number => seconds * 1000 + nanos / 1e6;

/** Milliseconds as a .NET TimeSpan string (`d.hh:mm:ss.fff`), the format App Insights expects. */
export function toTimeSpan(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor(total / 3_600_000) % 24;
  const minutes = Math.floor(total / 60_000) % 60;
  const seconds = Math.floor(total / 1000) % 60;
  const millis = total % 1000;
  const time = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
  return days > 0 ? `${days}.${time}` : time;
}

const SENSITIVE_QUERY_KEY = /sig|signature|token|key|code|secret|password|credential|auth/i;

/** The URL with the values of credential-like query parameters (SAS signatures, tokens) removed. */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY.test(key)) parsed.searchParams.set(key, 'REDACTED');
    }
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}

const asString = (value: unknown): string | undefined =>
  value === undefined || value === null ? undefined : String(value);

function toProperties(attributes: Attributes, extra: Record<string, string | undefined> = {}): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) properties[key] = value;
  }
  for (const [key, value] of Object.entries(attributes)) {
    if (MAPPED_ATTRIBUTES.has(key) || value === undefined || value === null) continue;
    const text = Array.isArray(value) ? value.join(',') : String(value);
    properties[key] = text.length > MAX_PROPERTY_LENGTH ? text.slice(0, MAX_PROPERTY_LENGTH) : text;
  }
  return properties;
}

interface TagSource {
  resource: Attributes;
  attributes: Attributes;
  spanContext?: SpanContext;
  parentSpanId?: string;
}

function buildTags(context: EnvelopeContext, source: TagSource): Record<string, string> {
  const tags: Record<string, string> = {
    'ai.session.id': context.sessionId,
    'ai.user.id': context.anonymousUserId,
    'ai.device.type': 'Browser',
    'ai.internal.sdkVersion': SDK_VERSION,
  };
  const role = asString(source.resource['service.name']);
  if (role) tags['ai.cloud.role'] = role;
  const version = asString(source.resource['service.version']);
  if (version) tags['ai.application.ver'] = version;
  const userId = asString(source.attributes[ATTR_USER_ID]);
  if (userId) tags['ai.user.authUserId'] = userId;
  const pagePath = asString(source.attributes[ATTR_PAGE_PATH]);
  if (pagePath) tags['ai.operation.name'] = pagePath;
  if (source.spanContext && isSpanContextValid(source.spanContext)) {
    tags['ai.operation.id'] = source.spanContext.traceId;
    tags['ai.operation.parentId'] = source.parentSpanId ?? source.spanContext.spanId;
  }
  return tags;
}

function envelope(
  context: EnvelopeContext,
  type: 'RemoteDependency' | 'Exception' | 'Message',
  baseType: string,
  time: HrTime,
  tags: Record<string, string>,
  baseData: Record<string, unknown>,
): Envelope {
  return {
    name: `Microsoft.ApplicationInsights.${context.instrumentationKey.replace(/-/g, '')}.${type}`,
    time: new Date(hrTimeToMs(time)).toISOString(),
    iKey: context.instrumentationKey,
    tags,
    data: { baseType, baseData: { ver: 2, ...baseData } },
  };
}

function exceptionData(
  typeName: string,
  message: string,
  stack: string | undefined,
  severityLevel: number,
  properties: Record<string, string>,
): Record<string, unknown> {
  return {
    exceptions: [{ typeName, message, hasFullStack: Boolean(stack), stack: stack ?? '' }],
    severityLevel,
    properties,
  };
}

const environmentOf = (resource: Attributes) => ({
  'deployment.environment': asString(resource['deployment.environment.name']),
});

/** Envelopes for one finished span: the dependency, plus an exception per recorded exception event. */
export function spanToEnvelopes(span: ReadableSpan, context: EnvelopeContext): Envelope[] {
  const resource = span.resource.attributes;
  const { attributes } = span;
  const spanContext = span.spanContext();
  const properties = toProperties(attributes, environmentOf(resource));

  const url = asString(attributes['url.full'] ?? attributes['http.url']);
  const method = asString(attributes['http.request.method'] ?? attributes['http.method']);
  const statusCode = Number(attributes['http.response.status_code'] ?? attributes['http.status_code'] ?? 0);
  const failed = span.status.code === SpanStatusCode.ERROR;

  let dependency: Record<string, unknown>;
  if (url) {
    const redacted = redactUrl(url);
    let target = '';
    let path = redacted;
    try {
      const parsed = new URL(redacted);
      target = parsed.host;
      path = parsed.pathname;
    } catch {
      // keep the redacted text
    }
    dependency = {
      name: method ? `${method} ${path}` : path,
      data: redacted,
      target,
      type: 'Fetch',
      // 0: the request never got a response (network error, CORS, abort).
      resultCode: String(statusCode),
      success: !failed && statusCode > 0 && statusCode < 400,
    };
  } else {
    dependency = {
      name: span.name,
      data: span.name,
      target: span.instrumentationScope.name,
      type: span.kind === SpanKind.CLIENT ? 'Http' : 'InProc',
      resultCode: failed ? 'error' : 'ok',
      success: !failed,
    };
  }

  const tags = buildTags(context, {
    resource,
    attributes,
    spanContext,
    parentSpanId: span.parentSpanContext?.spanId,
  });

  const envelopes = [
    envelope(context, 'RemoteDependency', 'RemoteDependencyData', span.startTime, tags, {
      id: spanContext.spanId,
      duration: toTimeSpan(hrTimeToMs(span.duration)),
      properties,
      ...dependency,
    }),
  ];

  // Exceptions recorded on the span are children of it.
  const childTags = { ...tags, 'ai.operation.parentId': spanContext.spanId };
  for (const event of span.events) {
    if (event.name !== 'exception') continue;
    const eventAttributes = event.attributes ?? {};
    envelopes.push(
      envelope(
        context,
        'Exception',
        'ExceptionData',
        event.time,
        childTags,
        exceptionData(
          asString(eventAttributes[ATTR_EXCEPTION_TYPE]) ?? 'Error',
          asString(eventAttributes[ATTR_EXCEPTION_MESSAGE]) ?? span.name,
          asString(eventAttributes[ATTR_EXCEPTION_STACKTRACE]),
          3,
          { ...properties, ...toProperties(eventAttributes) },
        ),
      ),
    );
  }

  return envelopes;
}

/** One envelope per log record: an Exception when it carries exception.* attributes, else a Message. */
export function logToEnvelope(record: ReadableLogRecord, context: EnvelopeContext): Envelope {
  const resource = record.resource.attributes;
  const attributes = record.attributes as Attributes;
  const tags = buildTags(context, { resource, attributes, spanContext: record.spanContext });
  const severityLevel = toSeverityLevel(record.severityNumber);
  const properties = toProperties(attributes, environmentOf(resource));
  const body = typeof record.body === 'string' ? record.body : JSON.stringify(record.body ?? '');

  const exceptionType = asString(attributes[ATTR_EXCEPTION_TYPE]);
  const exceptionMessage = asString(attributes[ATTR_EXCEPTION_MESSAGE]);
  if (exceptionType || exceptionMessage) {
    // The record's body is what the app was doing; the exception's own text stays the message.
    if (body) properties['message'] = body;
    return envelope(
      context,
      'Exception',
      'ExceptionData',
      record.hrTime,
      tags,
      exceptionData(
        exceptionType ?? 'Error',
        exceptionMessage ?? body,
        asString(attributes[ATTR_EXCEPTION_STACKTRACE]),
        severityLevel,
        properties,
      ),
    );
  }

  return envelope(context, 'Message', 'MessageData', record.hrTime, tags, {
    message: body,
    severityLevel,
    properties,
  });
}
