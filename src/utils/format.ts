export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
