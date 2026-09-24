/** Matches `GET /api/statistics` exactly. */
export interface FleetStatistics {
  total: number;
  idle: number;
  en_route: number;
  delivered: number;
  /** Fleet-wide average speed in mph. */
  average_speed: number;
  timestamp: string;
}
