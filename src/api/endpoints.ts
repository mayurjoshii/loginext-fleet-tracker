import type { VehicleStatus } from '../types/vehicle';

export const endpoints = {
  vehicles: {
    list: '/api/vehicles',
    detail: (id: string) => `/api/vehicles/${id}`,
    byStatus: (status: VehicleStatus) => `/api/vehicles/status/${status}`,
  },
  statistics: {
    summary: '/api/statistics',
  },
};
