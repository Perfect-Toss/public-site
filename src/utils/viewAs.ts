/**
 * Scope helpers for "view as" mode.
 *
 * An admin's token returns more than the emulated account can reach, so what it
 * can see is narrowed here from its organization memberships. The API stays the
 * authority on access — these helpers only filter the signed-in admin's result set.
 */

import type { Entity } from '../api/api.entities';
import type { Event } from '../api/api.events';
import { Role } from './roles';
import type { Video } from '../api/api.videos';

/** The emulated account and the organizations it belongs to. */
export interface IViewAsScope {
  userId: string;
  entityIds: ReadonlySet<string>;
  /** Roles the emulated account holds on each organization it belongs to. */
  entityRoles: ReadonlyMap<string, ReadonlySet<string>>;
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
 * Organization roles that carry a video with the organization: its coaches and
 * its admins see the videos tagged to it, ordinary members do not.
 */
const ASSOCIATED_VIDEO_ROLES: Role[] = [Role.Coach, Role.EntityAdmin, Role.OrganizationAdmin];

/** True when the account is a coach or an admin of the organization. */
function managesOrganization(scope: IViewAsScope, organizationId: string): boolean {
  const roles = scope.entityRoles.get(organizationId);
  if (!roles) return false;
  return ASSOCIATED_VIDEO_ROLES.some((role) => roles.has(role));
}

/**
 * True when the emulated account can see the video: it owns it, coaches it, or
 * coaches or administers an organization the video is tagged to.
 *
 * Videos shared directly with an account are NOT visible here — access lists
 * are not part of the video list payload.
 */
export function videoInScope(scope: IViewAsScope, video: Video): boolean {
  if (video.ownerId === scope.userId) return true;
  if (video.coaches?.some((coach) => coach.id === scope.userId)) return true;
  return (video.associatedEntities ?? []).some((entity) =>
    managesOrganization(scope, entity.id),
  );
}
