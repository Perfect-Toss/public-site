import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import { SeverityNumber } from '@opentelemetry/api-logs';
import type { ReadableLogRecord } from '@opentelemetry/sdk-logs';
import { describe, expect, it, vi } from 'vitest';

import { AppInsightsLogExporter, type Transport } from './exporters';

const target = { instrumentationKey: 'key', trackUrl: 'https://ingest.test/v2.1/track' };
const context = { instrumentationKey: 'key', sessionId: 's', anonymousUserId: 'u' };

const record = {
  hrTime: [1_700_000_000, 0],
  hrTimeObserved: [1_700_000_000, 0],
  severityNumber: SeverityNumber.INFO,
  body: 'hello',
  resource: { attributes: {} },
  instrumentationScope: { name: 'test' },
  attributes: {},
  droppedAttributesCount: 0,
} as unknown as ReadableLogRecord;

const exportOnce = (exporter: AppInsightsLogExporter, records: ReadableLogRecord[]) =>
  new Promise<ExportResult>((resolve) => exporter.export(records, resolve));

describe('AppInsightsLogExporter', () => {
  it('posts one JSON array per batch to the track URL', async () => {
    const transport = vi.fn<Transport>().mockResolvedValue(true);
    const result = await exportOnce(new AppInsightsLogExporter(target, context, transport), [record, record]);

    expect(result.code).toBe(ExportResultCode.SUCCESS);
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, body] = transport.mock.calls[0];
    expect(url).toBe(target.trackUrl);
    const envelopes = JSON.parse(body);
    expect(envelopes).toHaveLength(2);
    expect(envelopes[0].data.baseData.message).toBe('hello');
  });

  it('reports a rejected batch as failed', async () => {
    const transport = vi.fn<Transport>().mockResolvedValue(false);
    const result = await exportOnce(new AppInsightsLogExporter(target, context, transport), [record]);
    expect(result.code).toBe(ExportResultCode.FAILED);
  });

  it('sends nothing after shutdown', async () => {
    const transport = vi.fn<Transport>().mockResolvedValue(true);
    const exporter = new AppInsightsLogExporter(target, context, transport);
    await exporter.shutdown();
    const result = await exportOnce(exporter, [record]);
    expect(result.code).toBe(ExportResultCode.SUCCESS);
    expect(transport).not.toHaveBeenCalled();
  });
});
