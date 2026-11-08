import './UserAvatar.css';

import { useEffect, useState } from 'react';
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

/** Neutral disc behind the initials so the user's colour reads as the ring. */
const INITIALS_DISC = '#eef1f4';

/*
 * Ring width for a given avatar size: a 3px ring read as a heavy border on a
 * 24–32px avatar, so it stays a hairline at the small end — 1px up to 40px,
 * 2px up to 72px, 3px beyond.
 */
function ringWidth(size: number): number {
  return Math.max(1, Math.round(size / 32));
}

export function UserAvatar({ user, size = 32, className, alt }: UserAvatarProps) {
  // The colour is the RING around the disc, drawn OUTSIDE it so the photo (or the
  // initials) keeps its full size and the colour never shows through the image.
  const ring = user.colorHex ? ringWidth(size) : 0;
  // Without a chosen colour the disc keeps a stable name-derived colour.
  const discColor = user.colorHex ? INITIALS_DISC : colorFor(getDisplayName(user));
  const thumbnailSrc = resolveThumbnailSrc(user);

  // A photo that fails to load (expired token, deleted blob) would otherwise
  // paint its alt text inside the ring — fall back to the initials disc instead.
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [thumbnailSrc]);
  const showPhoto = Boolean(thumbnailSrc) && !photoFailed;

  return (
    <span
      className={['user-avatar', showPhoto ? 'user-avatar-photo' : null, className]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: size,
        height: size,
        boxShadow: user.colorHex ? `0 0 0 ${ring}px ${user.colorHex}` : undefined,
      }}
    >
      {showPhoto ? (
        <img
          className="user-avatar-img"
          src={thumbnailSrc ?? undefined}
          alt={alt ?? getDisplayName(user)}
          style={{ width: size, height: size }}
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <span
          className="user-avatar-initials"
          style={{
            width: size,
            height: size,
            fontSize: Math.max(11, Math.round(size * 0.4)),
            background: discColor,
            color: isLightColor(discColor) ? '#1a1f24' : '#fff',
          }}
        >
          {getInitials(user)}
        </span>
      )}
    </span>
  );
}

export default UserAvatar;
