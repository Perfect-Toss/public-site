import { describe, expect, it } from 'vitest';

import { parseConnectionString } from './connectionString';

describe('parseConnectionString', () => {
  it('reads the key and builds the track URL from the ingestion endpoint', () => {
    expect(
      parseConnectionString(
        'InstrumentationKey=abc-123;IngestionEndpoint=https://eastus2-3.in.applicationinsights.azure.com/;LiveEndpoint=https://x/',
      ),
    ).toEqual({
      instrumentationKey: 'abc-123',
      trackUrl: 'https://eastus2-3.in.applicationinsights.azure.com/v2.1/track',
    });
  });

  it('falls back to the global endpoint and ignores key case', () => {
    expect(parseConnectionString('instrumentationkey=abc')).toEqual({
      instrumentationKey: 'abc',
      trackUrl: 'https://dc.services.visualstudio.com/v2.1/track',
    });
  });

  it.each([undefined, '', '   ', 'IngestionEndpoint=https://x/'])('returns null for %j', (value) => {
    expect(parseConnectionString(value)).toBeNull();
  });
});
