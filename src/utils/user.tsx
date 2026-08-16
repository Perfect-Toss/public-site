import type { ReactNode } from 'react';

/* ─── Display Helpers ──────────────────────────────────────────── */

export function getInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  const f = first.charAt(0);
  const l = last.charAt(0);
  if (f && l) return `${f}${l}`.toUpperCase();
  if (f) return f.toUpperCase();
  return (user.email?.charAt(0) ?? '?').toUpperCase();
}

export function getDisplayName(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const first = user.firstName?.trim() ?? '';
  const last = user.lastName?.trim() ?? '';
  const full = [first, last].filter(Boolean).join(' ');
  return full || user.email || '-';
}

export function renderRoleBadges(roles?: string[] | null): ReactNode {
  if (!roles || roles.length === 0)
    return <span style={{ color: '#999', fontSize: 12 }}>—</span>;
  return roles.map((r) => (
    <span key={r} className={`role-badge ${r.toLowerCase()}`}>
      {r}
    </span>
  ));
}
