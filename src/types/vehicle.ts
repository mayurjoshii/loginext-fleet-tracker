/** The three statuses the API can report. Confirmed exhaustive. */
export type VehicleStatus = 'en_route' | 'idle' | 'delivered';

/** Status filter selection — a concrete status, or the whole fleet. */
export type StatusFilter = VehicleStatus | 'all';

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Matches `GET /api/vehicles` and `GET /api/vehicles/:id` field-for-field. */
export interface Vehicle {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  status: VehicleStatus;
  destination: string;
  currentLocation: Coordinates;
  /** Current speed in mph. */
  speed: number;
  /** ISO timestamp of the last data refresh for this vehicle. */
  lastUpdated: string;
  /** ISO timestamp, or `null` when the vehicle isn't en route. */
  estimatedArrival: string | null;
  /** 0–100. */
  batteryLevel: number;
  /** 0–100. */
  fuelLevel: number;
}
