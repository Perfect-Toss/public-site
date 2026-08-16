import type { Entity } from '../api/api.entities';
import type { Tag } from '../api/api.tags';
import type { User } from '../api/api.users';
import type { Video } from '../api/api.videos';
import { getDisplayName } from './user';

/** The API returns a direct URL to the video's thumbnail image. */
export function thumbnailSrc(video: Video): string | null {
  return video.thumbnailUrl ?? null;
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
