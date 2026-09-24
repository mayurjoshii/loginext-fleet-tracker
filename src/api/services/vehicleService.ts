import { apiClient } from '../client';
import { endpoints } from '../endpoints';
import { unwrap } from '../unwrap';
import type { ApiListResponse, ApiResponse, ApiStatusListResponse } from '../../types/api';
import type { Vehicle, VehicleStatus } from '../../types/vehicle';

export const vehicleService = {
  list: async (limit?: number): Promise<Vehicle[]> => {
    const { data } = await apiClient.get<ApiListResponse<Vehicle>>(endpoints.vehicles.list, {
      params: limit === undefined ? undefined : { limit },
    });
    return unwrap(data);
  },

  getById: async (id: string): Promise<Vehicle> => {
    const { data } = await apiClient.get<ApiResponse<Vehicle>>(endpoints.vehicles.detail(id));
    return unwrap(data);
  },

  listByStatus: async (status: VehicleStatus): Promise<Vehicle[]> => {
    const { data } = await apiClient.get<ApiStatusListResponse<Vehicle>>(
      endpoints.vehicles.byStatus(status)
    );
    return unwrap(data);
  },
};
