/**
 * Scope helpers for "view as" mode.
 *
 * A super user's token already returns everything, so what the emulated account
 * can see is narrowed here from its organization memberships. The API stays the
 * authority on access — these helpers only filter a super user's own result set.
 */

import type { Entity } from '../api/api.entities';
import type { Event } from '../api/api.events';
import type { Video } from '../api/api.videos';

/** The emulated account and the organizations it belongs to. */
export interface IViewAsScope {
  userId: string;
  entityIds: ReadonlySet<string>;
}

/** True when the organization is one the emulated account belongs to. */
export function organizationInScope(scope: IViewAsScope, organization: Entity): boolean {
  return scope.entityIds.has(organization.id);
}

/** True when the event belongs to an organization the emulated account belongs to. */
export function eventInScope(scope: IViewAsScope, event: Event): boolean {
  const organizationId = event.organizationId ?? event.organization?.id;
  return Boolean(organizationId && scope.entityIds.has(organizationId));
}

/**
 * True when the video is owned by the emulated account, coaches it, or is
 * associated with one of its organizations.
 *
 * Videos shared directly with a user are NOT visible here — access lists are
 * not part of the video list payload.
 */
export function videoInScope(scope: IViewAsScope, video: Video): boolean {
  if (video.ownerId === scope.userId) return true;
  if (video.coaches?.some((coach) => coach.id === scope.userId)) return true;
  return (video.associatedEntities ?? []).some((entity) => scope.entityIds.has(entity.id));
}
