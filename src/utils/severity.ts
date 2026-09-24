/** MUI color keys usable for both a `LinearProgress`'s `color` and text emphasis. */
export type SeverityColor = 'error' | 'warning' | 'success';

/**
 * Maps a 0-100 level (battery/fuel) to a severity color.
 * <=20 is critical, <=50 is a caution, above that is healthy.
 */
export function severityForLevel(value: number): SeverityColor {
  if (value <= 20) {
    return 'error';
  }
  if (value <= 50) {
    return 'warning';
  }
  return 'success';
}
