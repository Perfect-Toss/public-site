import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { UserAvatar } from './UserAvatar';

// Vitest globals are off, so testing-library's automatic cleanup is not registered.
afterEach(cleanup);

const withPhoto = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  thumbnailUrl: 'https://img/ada.png',
};

describe('UserAvatar', () => {
  it('draws the color as a ring inside the avatar footprint', () => {
    const { container } = render(<UserAvatar user={{ ...withPhoto, colorHex: '#E05353' }} size={40} />);

    const root = container.querySelector('.user-avatar') as HTMLElement;
    const photo = container.querySelector('.user-avatar-img') as HTMLElement;

    // The ring never changes the avatar's size — it only insets the photo.
    expect(root.style.width).toBe('40px');
    expect(root.style.padding).toBe('3px');
    expect(root.style.backgroundColor).toContain('rgb(224, 83, 83)');
    expect(photo.style.width).toBe('34px');
  });

  it('uses the same ring width at every size', () => {
    const padding = (size: number) =>
      (render(<UserAvatar user={{ ...withPhoto, colorHex: '#E05353' }} size={size} />).container.querySelector(
        '.user-avatar',
      ) as HTMLElement).style.padding;

    expect(padding(24)).toBe('3px');
    expect(padding(88)).toBe('3px');
  });

  it('leaves a photo unringed when the user has no color', () => {
    const { container } = render(<UserAvatar user={withPhoto} size={40} />);

    const root = container.querySelector('.user-avatar') as HTMLElement;
    expect(root.style.padding).toBe('0px');
    expect(root.style.backgroundColor).toBe('');
    expect((container.querySelector('.user-avatar-img') as HTMLElement).style.width).toBe('40px');
  });

  it('fills the avatar with the color when there is no photo', () => {
    const { container } = render(
      <UserAvatar user={{ ...withPhoto, thumbnailUrl: null, colorHex: '#E05353' }} size={40} />,
    );

    const root = container.querySelector('.user-avatar') as HTMLElement;
    expect(container.querySelector('.user-avatar-img')).toBeNull();
    expect(root.textContent).toBe('AL');
    expect(root.style.backgroundColor).toContain('rgb(224, 83, 83)');
  });
});
