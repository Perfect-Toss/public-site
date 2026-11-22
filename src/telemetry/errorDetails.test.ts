import { FirebaseError } from 'firebase/app';
import { describe, expect, it } from 'vitest';

import { browserContext, describeError, redactSecrets } from './errorDetails';

const JWT = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlLXZhbHVl';

describe('redactSecrets', () => {
  it('masks JWTs, bearer tokens and token-valued parameters', () => {
    const text = `Invalid IdP response: http://localhost?id_token=${JWT}&state=x oobCode=abc123 Authorization: Bearer abc.def`;
    const redacted = redactSecrets(text);
    expect(redacted).not.toContain(JWT);
    expect(redacted).not.toContain('abc123');
    expect(redacted).not.toContain('abc.def');
    expect(redacted).toContain('state=x');
  });
});

describe('describeError', () => {
  it('keeps the Firebase code and safe customData, and drops tokens', () => {
    const error = new FirebaseError('auth/account-exists-with-different-credential', 'Firebase: Error (auth/account-exists-with-different-credential).', {
      appName: '[DEFAULT]',
      email: 'player@example.com',
      _tokenResponse: {
        providerId: 'apple.com',
        email: 'player@example.com',
        needConfirmation: true,
        verifiedProvider: ['google.com'],
        idToken: JWT,
        refreshToken: 'refresh-secret',
        oauthIdToken: JWT,
      },
    });

    const attributes = describeError(error);

    expect(attributes).toMatchObject({
      'exception.type': 'FirebaseError',
      'error.code': 'auth/account-exists-with-different-credential',
      'firebase.appName': '[DEFAULT]',
      'firebase.email': 'player@example.com',
      'firebase.token_response.providerId': 'apple.com',
      'firebase.token_response.needConfirmation': true,
    });
    const serialized = JSON.stringify(attributes);
    expect(serialized).not.toContain('refresh-secret');
    expect(serialized).not.toContain(JWT);
  });

  it('includes extra properties and the cause chain', () => {
    const error = new Error('Failed to create session');
    Object.defineProperty(error, 'cause', { value: new TypeError('Failed to fetch') });
    Object.assign(error, { status: 500, correlationId: 'abc' });
    expect(describeError(error)).toMatchObject({
      'exception.message': 'Failed to create session',
      'exception.cause': 'TypeError: Failed to fetch',
      'error.status': 500,
      'error.correlationId': 'abc',
    });
  });

  it('describes values that are not errors', () => {
    expect(describeError({ reason: 'nope' })).toEqual({
      'exception.type': 'NonErrorObject',
      'exception.message': '{"reason":"nope"}',
    });
  });
});

describe('browserContext', () => {
  it('describes the browser and page', () => {
    const context = browserContext();
    expect(context['browser.user_agent']).toBe(navigator.userAgent);
    expect(context['browser.in_app']).toBe(false);
    expect(context['browser.local_storage']).toBe(true);
    expect(typeof context['page.uptime_ms']).toBe('number');
  });
});
