import './UserAvatar.css';

import { colorFor, isLightColor } from '../../utils/color';
import { getDisplayName, getInitials } from '../../utils/user';

export interface UserAvatarProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    colorHex?: string | null;
    /** Resolved full thumbnail URL. */
    thumbnailUrl?: string | null;
  };
  /** Avatar diameter in pixels. Defaults to 32. */
  size?: number;
  className?: string;
  alt?: string;
}

/** Resolve the thumbnail source for a user avatar. */
function resolveThumbnailSrc(user: UserAvatarProps['user']): string | null {
  return user.thumbnailUrl ?? null;
}

/** Ring drawn around a photo that carries the user's color. One width, every size. */
const AVATAR_RING_WIDTH = 3;

export function UserAvatar({ user, size = 32, className, alt }: UserAvatarProps) {
  const dimensionStyle = {
    width: size,
    height: size,
    fontSize: Math.max(11, Math.round(size * 0.4)),
  };

  const thumbnailSrc = resolveThumbnailSrc(user);
  if (thumbnailSrc) {
    // A photo plus a color draws the color as a ring around the photo. The ring
    // lives inside the avatar's footprint, so picking a color never changes the
    // avatar's size.
    const ring = user.colorHex ? AVATAR_RING_WIDTH : 0;

    return (
      <span
        className={['user-avatar', 'user-avatar-photo', className].filter(Boolean).join(' ')}
        style={{
          ...dimensionStyle,
          padding: ring,
          backgroundColor: user.colorHex ?? undefined,
        }}
      >
        <img
          className="user-avatar-img"
          src={thumbnailSrc}
          alt={alt ?? getDisplayName(user)}
          style={{ width: size - ring * 2, height: size - ring * 2 }}
        />
      </span>
    );
  }

  // Prefer the user's stored color; fall back to a deterministic color derived
  // from their display name so everyone gets a stable, unique-looking avatar.
  const avatarColor = user.colorHex ?? colorFor(getDisplayName(user));

  return (
    <div
      className={['user-avatar', className].filter(Boolean).join(' ')}
      style={{
        ...dimensionStyle,
        background: avatarColor,
        color: isLightColor(avatarColor) ? '#1a1f24' : '#fff',
      }}
    >
      {getInitials(user)}
    </div>
  );
}

export default UserAvatar;
