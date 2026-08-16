import './UserAvatar.css';

import { getDisplayName, getInitials, isLightColor } from '../../utils/user';

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

  return (
    <div
      className={['user-avatar', className].filter(Boolean).join(' ')}
      style={{
        ...dimensionStyle,
        ...(user.colorHex
          ? { background: user.colorHex, color: isLightColor(user.colorHex) ? '#1a1f24' : '#fff' }
          : undefined),
      }}
    >
      {getInitials(user)}
    </div>
  );
}

export default UserAvatar;
