import './UserAvatar.css';

import { useEffect, useState } from 'react';
import { colorFor, tintColor } from '../../utils/color';
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

/** Share of the ring colour that carries into the initials disc. */
const DISC_TINT = 0.12;

/** Initials colour over the neutral disc. */
const INITIALS_TEXT = '#1a1f24';

/*
 * Ring width for a given avatar size: a 3px ring read as a heavy border on a
 * 24–32px avatar, so it stays slim at the small end — 2px up to 40px,
 * 3px up to 72px, 4px beyond.
 */
function ringWidth(size: number): number {
  return Math.max(2, Math.round(size / 32) + 1);
}
/**
 * Initials size for a given avatar size. Wide pairs (MW, WH) set the ceiling:
 * at this size the widest realistic pair still leaves a margin inside the disc,
 * while every avatar keeps the same glyph height.
 */
function initialsFontSize(size: number): number {
  return Math.max(9, Math.round(size * 0.35));
}
export function UserAvatar({ user, size = 32, className, alt }: UserAvatarProps) {
  // The colour is the RING around the disc, drawn OUTSIDE it so the photo (or the
  // initials) keeps its full size and the colour never shows through the image.
  // Without a chosen colour the ring keeps a stable name-derived colour.
  const ringColor = user.colorHex ?? colorFor(getDisplayName(user));
  const discColor = tintColor(ringColor, DISC_TINT);
  const ring = ringWidth(size);
  const thumbnailSrc = resolveThumbnailSrc(user);
  const initials = getInitials(user);

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
        boxShadow: `0 0 0 ${ring}px ${ringColor}`,
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
            fontSize: initialsFontSize(size),
            background: discColor,
            color: INITIALS_TEXT,
          }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

export default UserAvatar;
