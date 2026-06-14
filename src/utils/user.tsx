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

export function isLightColor(hex?: string | null): boolean {
  if (!hex) return false;
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived brightness (W3C formula)
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
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
