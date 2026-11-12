import { useEffect, useState } from 'react';

import { fetchUserById, type User } from '../api/api.users';

/** Profiles already loaded this session, keyed by user id. */
const profileCache = new Map<string, User>();
/** Requests in flight, so two cards for the same person share one call. */
const inFlight = new Map<string, Promise<User | null>>();

/**
 * The full profile for `userId`, fetched at most once per session.
 *
 * `enabled` keeps the request from firing for viewers who may not read another
 * account (`GET /api/v1/users/{id}` requires admin authorization); those callers
 * keep whatever user object they already hold.
 */
export function useUserProfile(userId: string | null | undefined, enabled: boolean): User | null {
  const [profile, setProfile] = useState<User | null>(() =>
    userId ? profileCache.get(userId) ?? null : null,
  );

  useEffect(() => {
    setProfile(userId ? profileCache.get(userId) ?? null : null);
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Another chip for the same person may have already loaded them; this
    // instance mounted before that happened, so take the cached copy now.
    const cached = profileCache.get(userId);
    if (cached) {
      setProfile(cached);
      return;
    }

    let cancelled = false;
    const pending = inFlight.get(userId) ?? fetchUserById(userId);
    inFlight.set(userId, pending);

    pending
      .then((user) => {
        if (user) profileCache.set(userId, user);
        if (!cancelled) setProfile(user);
      })
      // A failure just leaves the chip's own data in place.
      .catch(() => undefined)
      .finally(() => inFlight.delete(userId));

    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  return profile;
}
