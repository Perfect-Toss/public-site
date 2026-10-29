import type { Entity } from '../api/api.entities';
import type { Event } from '../api/api.events';
import type { Video } from '../api/api.videos';
import { eventInScope, organizationInScope, videoInScope, type IViewAsScope } from './viewAs';
import { describe, expect, it } from 'vitest';

const scope: IViewAsScope = {
  userId: 'user-1',
  entityIds: new Set(['org-1']),
};

const org = (id: string) => ({ id, name: id }) as Entity;
const video = (fields: Partial<Video>) => ({ id: 'video-1', ...fields }) as Video;
const event = (fields: Partial<Event>) => ({ id: 'event-1', ...fields }) as Event;

describe('organizationInScope', () => {
  it('accepts a member organization', () => {
    expect(organizationInScope(scope, org('org-1'))).toBe(true);
  });

  it('rejects any other organization', () => {
    expect(organizationInScope(scope, org('org-2'))).toBe(false);
  });
});

describe('eventInScope', () => {
  it('accepts an event in a member organization', () => {
    expect(eventInScope(scope, event({ organizationId: 'org-1' }))).toBe(true);
  });

  it('falls back to the embedded organization', () => {
    expect(eventInScope(scope, event({ organization: org('org-1') }))).toBe(true);
  });

  it('rejects an event without an organization', () => {
    expect(eventInScope(scope, event({}))).toBe(false);
  });

  it('rejects an event in another organization', () => {
    expect(eventInScope(scope, event({ organizationId: 'org-2' }))).toBe(false);
  });
});

describe('videoInScope', () => {
  it('accepts a video the account owns', () => {
    expect(videoInScope(scope, video({ ownerId: 'user-1' }))).toBe(true);
  });

  it('accepts a video the account coaches', () => {
    expect(videoInScope(scope, video({ coaches: [{ id: 'user-1', email: null }] }))).toBe(true);
  });

  it('accepts a video associated with a member organization', () => {
    expect(videoInScope(scope, video({ associatedEntities: [org('org-1')] }))).toBe(true);
  });

  it('rejects a video belonging to someone else', () => {
    expect(
      videoInScope(
        scope,
        video({
          ownerId: 'user-2',
          coaches: [{ id: 'user-2', email: null }],
          associatedEntities: [org('org-2')],
        }),
      ),
    ).toBe(false);
  });
});
