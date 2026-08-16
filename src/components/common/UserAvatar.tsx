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

export function UserAvatar({ user, size = 32, className, alt }: UserAvatarProps) {
  const dimensionStyle = {
    width: size,
    height: size,
    fontSize: Math.max(11, Math.round(size * 0.4)),
  };

  const thumbnailSrc = resolveThumbnailSrc(user);
  if (thumbnailSrc) {
    return (
      <img
        className={['user-avatar', 'user-avatar-img', className].filter(Boolean).join(' ')}
        src={thumbnailSrc}
        alt={alt ?? getDisplayName(user)}
        style={dimensionStyle}
      />
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
