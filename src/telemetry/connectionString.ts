/** The parts of an Application Insights connection string the browser exporter needs. */
export interface AppInsightsTarget {
  instrumentationKey: string;
  /** Full URL of the ingestion `track` endpoint. */
  trackUrl: string;
}

const DEFAULT_INGESTION_ENDPOINT = 'https://dc.services.visualstudio.com';

/**
 * Parse an Application Insights connection string
 * (`InstrumentationKey=…;IngestionEndpoint=https://…/;…`). Returns null when it
 * is empty or carries no instrumentation key, so telemetry stays off.
 */
export function parseConnectionString(value: string | undefined): AppInsightsTarget | null {
  if (!value?.trim()) return null;

  const parts = new Map<string, string>();
  for (const segment of value.split(';')) {
    const index = segment.indexOf('=');
    if (index <= 0) continue;
    parts.set(segment.slice(0, index).trim().toLowerCase(), segment.slice(index + 1).trim());
  }

  const instrumentationKey = parts.get('instrumentationkey');
  if (!instrumentationKey) return null;

  const endpoint = (parts.get('ingestionendpoint') || DEFAULT_INGESTION_ENDPOINT).replace(/\/+$/, '');
  return { instrumentationKey, trackUrl: `${endpoint}/v2.1/track` };
}
