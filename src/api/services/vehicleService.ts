import { apiClient } from '../client';
import { endpoints } from '../endpoints';
import type { Vehicle } from '../../types/vehicle';

export const vehicleService = {
  list: async (): Promise<Vehicle[]> => {
    const { data } = await apiClient.get<Vehicle[]>(endpoints.vehicles.list);
    return data;
  },
  getById: async (id: string): Promise<Vehicle> => {
    const { data } = await apiClient.get<Vehicle>(endpoints.vehicles.detail(id));
    return data;
  },
};
