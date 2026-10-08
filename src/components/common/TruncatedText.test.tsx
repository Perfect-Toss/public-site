import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { TruncatedText } from './TruncatedText';

// jsdom reports every box as 0×0, so the clip check is driven by stubbed metrics.
const originalScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
const originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

const defineWidth = (prop: 'scrollWidth' | 'clientWidth', value: number) =>
  Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => value });

afterEach(() => {
  cleanup();
  if (originalScrollWidth) {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
  } else {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
  }
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  } else {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  }
});

describe('TruncatedText', () => {
  it('has no tooltip while the text fits', () => {
    defineWidth('scrollWidth', 100);
    defineWidth('clientWidth', 200);

    render(<TruncatedText text="Ada Lovelace" className="up-name" />);

    expect(screen.getByText('Ada Lovelace').getAttribute('title')).toBeNull();
  });

  it('uses the full text as the tooltip once it is clipped', () => {
    defineWidth('scrollWidth', 200);
    defineWidth('clientWidth', 100);

    render(<TruncatedText text="ada@example.com" className="up-email" />);

    expect(screen.getByText('ada@example.com').getAttribute('title')).toBe('ada@example.com');
  });
});
