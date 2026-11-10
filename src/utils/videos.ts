import type { Video, VideoAccessLevel } from '../api/api.videos';

import type { Entity } from '../api/api.entities';
import { Role } from './roles';
import type { Tag } from '../api/api.tags';
import type { User } from '../api/api.users';
import { getDisplayName } from './user';
import videoPlaceholder from '../assets/video-placeholder.svg';

/** Access levels from weakest to strongest. */
const ACCESS_LEVEL_RANK: Record<VideoAccessLevel, number> = {
  ReadOnly: 0,
  Review: 1,
  Edit: 2,
};

/**
 * The strongest of the levels an account holds on a video — grants stack, so a
 * weak direct grant never caps a stronger organization grant.
 */
export function highestAccessLevel(levels: VideoAccessLevel[]): VideoAccessLevel {
  return levels.reduce<VideoAccessLevel>(
    (strongest, level) =>
      ACCESS_LEVEL_RANK[level] > ACCESS_LEVEL_RANK[strongest] ? level : strongest,
    'ReadOnly',
  );
}

/** Organization roles that carry a video shared with the organization. Athletes are not included. */
const VIDEO_ORGANIZATION_ROLES: Role[] = [Role.Coach, Role.EntityAdmin, Role.OrganizationAdmin];

/**
 * Whether the roles held on an organization reach the videos shared with it —
 * only its coaches and admins do, an athlete membership does not.
 */
export function isVideoOrganizationStaff(roles?: readonly string[] | null): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => VIDEO_ORGANIZATION_ROLES.includes(role as Role));
}

/** A direct URL to the video's thumbnail image, or a bundled default placeholder when the video has none. */
export function thumbnailSrc(video: Video): string {
  return video.thumbnailUrl ?? videoPlaceholder;
}

/**
 * The API returns a direct URL to the video's filmstrip sprite (or null when
 * the video was uploaded by an older build without one).
 */
export function filmstripSrc(video: Video): string | null {
  return video.filmstripUrl ?? null;
}

export function ownerDisplayName(video: Video): string {
  const owner = video.owner;
  if (!owner) return '';
  const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim();
  return name || owner.email || '';
}

export function formatEntityNames(entities?: Entity[] | null): string {
  if (!entities || entities.length === 0) return '—';
  return entities.map((e) => e.name || 'Untitled entity').join(', ');
}

export function formatUserNames(users?: User[] | null): string {
  if (!users || users.length === 0) return '—';
  return users.map(getDisplayName).join(', ');
}

export function formatTagNames(tags?: Tag[] | null): string {
  if (!tags || tags.length === 0) return '—';
  const names = tags.map((t) => t.name).filter(Boolean);
  return names.length > 0 ? names.join(', ') : '—';
}
