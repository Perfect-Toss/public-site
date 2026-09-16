/**
 * Client-minted ids.
 *
 * Parts of this API expect the *client* to mint the id and send it up, rather
 * than minting one server-side: an event's `schedule.id` (a required uuid — an
 * empty or absent value fails request deserialization) and the
 * `clientSessionId`/`clientRunId` a recording device gives a session and its
 * runs, so a client working offline can address them before they reach the
 * server.
 */

/** A random RFC 4122 version 4 UUID. */
export function newUuid(): string {
  // `crypto.randomUUID` requires a secure context, which a dev server reached
  // over a LAN IP is not — fall through to a hand-rolled v4 in that case.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
