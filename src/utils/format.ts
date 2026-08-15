export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Format an ISO timestamp as a localized date + time, e.g. "Aug 14, 2026, 3:42 PM". */
export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function formatBoolean(value?: boolean | null): string {
  if (value === undefined || value === null) return '—';
  return value ? 'Yes' : 'No';
}

/** Format an enum value through its label map, falling back to a placeholder. */
export function formatEnum<T extends string>(
  labels: Record<T, string>,
  value?: T | null,
): string {
  if (!value || !labels[value]) return '—';
  return labels[value];
}

/** Format an aspect ratio as a friendly ratio (e.g. "16:9"), falling back to the decimal. */
export function formatAspectRatio(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  const ratio = Math.round(value * 100) / 100;
  if (Math.abs(ratio - 16 / 9) < 0.01) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.01) return '4:3';
  if (Math.abs(ratio - 9 / 16) < 0.01) return '9:16';
  return value.toFixed(2);
}

/** Format a length in seconds as human-readable text, e.g. "1 hour 1 minute 1 second". */
export function formatDuration(lengthInSeconds?: number): string {
  if (lengthInSeconds === undefined || lengthInSeconds == null || lengthInSeconds < 0) {
    return '—';
  }
  const total = Math.round(lengthInSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);

  return parts.join(' ');
}

export function formatBytes(sizeInBytes?: number): string {
  if (sizeInBytes === undefined || sizeInBytes == null || sizeInBytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = sizeInBytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
}
