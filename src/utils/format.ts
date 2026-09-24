/** Formats an ISO timestamp as `DD/MM/YYYY, HH:mm:ss`. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Same as `formatDateTime`, but renders `—` for a null/missing timestamp. */
export function formatOptionalDateTime(iso: string | null | undefined): string {
  return iso ? formatDateTime(iso) : '—';
}

export function formatCoordinates(lat: number, lng: number, fractionDigits = 4): string {
  return `${lat.toFixed(fractionDigits)}, ${lng.toFixed(fractionDigits)}`;
}

export function formatSpeed(speed: number): string {
  return `${speed} mph`;
}
