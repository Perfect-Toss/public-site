import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';

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
  it('draws the color as a ring at the avatar\'s edge, not inside it', () => {
    const { container } = render(<UserAvatar user={{ ...withPhoto, colorHex: '#E05353' }} size={40} />);

    const root = container.querySelector('.user-avatar') as HTMLElement;
    const photo = container.querySelector('.user-avatar-img') as HTMLElement;

    // The colour is a ring AROUND the avatar…
    expect(root.style.boxShadow).toContain('#E05353');
    // …and the image itself is untouched.
    expect(root.style.width).toBe('40px');
    expect(photo.style.width).toBe('40px');
  });

  it('scales the ring with the avatar, hairline at the small end', () => {
    const shadow = (size: number) =>
      (render(<UserAvatar user={{ ...withPhoto, colorHex: '#E05353' }} size={size} />).container.querySelector(
        '.user-avatar',
      ) as HTMLElement).style.boxShadow;

    // A 3px ring looked like a heavy border on a small avatar.
    expect(shadow(24)).toContain('0 0 0 1px');
    expect(shadow(32)).toContain('0 0 0 1px');
    expect(shadow(72)).toContain('0 0 0 2px');
    // The large avatar keeps the full ring.
    expect(shadow(88)).toContain('0 0 0 3px');
  });

  it('leaves a photo unringed when the user has no color', () => {
    const { container } = render(<UserAvatar user={withPhoto} size={40} />);

    const root = container.querySelector('.user-avatar') as HTMLElement;
    expect(root.style.boxShadow).toBe('');
    expect((container.querySelector('.user-avatar-img') as HTMLElement).style.width).toBe('40px');
  });

  it('falls back to initials when the photo fails to load', () => {
    const { container } = render(
      <UserAvatar user={{ ...withPhoto, colorHex: '#E05353' }} size={40} />,
    );

    const photo = container.querySelector('.user-avatar-img') as HTMLImageElement;
    expect(photo).not.toBeNull();

    // A dead thumbnail (expired token) must not paint its alt text in the ring.
    fireEvent.error(photo);

    expect(container.querySelector('.user-avatar-img')).toBeNull();
    expect(container.querySelector('.user-avatar-initials')?.textContent).toBe('AL');
  });

  it('draws the same ring when there is no photo', () => {
    const { container } = render(
      <UserAvatar user={{ ...withPhoto, thumbnailUrl: null, colorHex: '#E05353' }} size={40} />,
    );

    const root = container.querySelector('.user-avatar') as HTMLElement;
    const disc = container.querySelector('.user-avatar-initials') as HTMLElement;
    expect(container.querySelector('.user-avatar-img')).toBeNull();
    // The colour is the ring, exactly as it is around a photo…
    expect(root.style.boxShadow).toContain('#E05353');
    // …so the initials sit on their own disc instead of being filled with it.
    expect(disc.textContent).toBe('AL');
    expect(disc.style.width).toBe('40px');
    expect(disc.style.backgroundColor).not.toContain('rgb(224, 83, 83)');
  });
});
