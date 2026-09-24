import { apiClient } from '../client';
import { endpoints } from '../endpoints';
import { unwrap } from '../unwrap';
import type { ApiResponse } from '../../types/api';
import type { FleetStatistics } from '../../types/statistics';

export const statisticsService = {
  get: async (): Promise<FleetStatistics> => {
    const { data } = await apiClient.get<ApiResponse<FleetStatistics>>(
      endpoints.statistics.summary
    );
    return unwrap(data);
  },
};
