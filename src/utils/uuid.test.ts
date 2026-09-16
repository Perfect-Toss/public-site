import { describe, expect, it } from 'vitest';
import { newUuid } from './uuid';

const V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newUuid', () => {
  it('mints an RFC 4122 version 4 uuid', () => {
    expect(newUuid()).toMatch(V4_PATTERN);
  });

  it('mints a different id every time', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newUuid()));
    expect(ids.size).toBe(200);
  });

  it('falls back when the platform has no crypto.randomUUID', () => {
    const original = crypto.randomUUID;
    // A LAN-IP dev server is not a secure context, so randomUUID is absent there.
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(newUuid()).toMatch(V4_PATTERN);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
