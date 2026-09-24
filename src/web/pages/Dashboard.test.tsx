import { render, screen, within } from '@testing-library/react';
import Main from '../main';
import { vehicleService } from '../../api/services/vehicleService';
import { statisticsService } from '../../api/services/statisticsService';
import type { Vehicle } from '../../types/vehicle';
import type { FleetStatistics } from '../../types/statistics';

jest.mock('../../api/services/vehicleService');
jest.mock('../../api/services/statisticsService');

const mockedVehicleService = vehicleService as jest.Mocked<typeof vehicleService>;
const mockedStatisticsService = statisticsService as jest.Mocked<typeof statisticsService>;

const VEHICLES: Vehicle[] = [
  {
    id: 'v-1',
    vehicleNumber: 'FL-001',
    driverName: 'John Smith',
    driverPhone: '+15096750557',
    status: 'en_route',
    destination: 'Hotel Downtown',
    currentLocation: { lat: 37.677938, lng: -122.475393 },
    speed: 62,
    lastUpdated: '2026-09-24T09:49:41.516Z',
    estimatedArrival: '2026-09-24T10:05:08.476Z',
    batteryLevel: 59,
    fuelLevel: 61,
  },
  {
    id: 'v-2',
    vehicleNumber: 'FL-002',
    driverName: 'Maria Garcia',
    driverPhone: '+15850514313',
    status: 'delivered',
    destination: 'Residential Complex A',
    currentLocation: { lat: 37.824284, lng: -122.479992 },
    speed: 0,
    lastUpdated: '2026-09-24T09:49:41.516Z',
    estimatedArrival: null,
    batteryLevel: 85,
    fuelLevel: 62,
  },
];

const STATISTICS: FleetStatistics = {
  total: 2,
  idle: 0,
  en_route: 1,
  delivered: 1,
  average_speed: 31,
  timestamp: '2026-09-24T09:51:33.075Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedVehicleService.list.mockResolvedValue(VEHICLES);
  mockedStatisticsService.get.mockResolvedValue(STATISTICS);
});

describe('Dashboard', () => {
  it('renders the header', async () => {
    render(<Main />);

    expect(
      await screen.findByRole('heading', { name: 'Fleet Tracking Dashboard' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Real-time vehicle monitoring • LogiNext Case Study')
    ).toBeInTheDocument();
  });

  it('loads the fleet over REST and lists every column header', async () => {
    render(<Main />);

    expect(await screen.findByText('Vehicles (2)')).toBeInTheDocument();
    expect(mockedVehicleService.list).toHaveBeenCalledTimes(1);

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual([
      'Vehicle',
      'Driver',
      'Status',
      'Speed',
      'Destination',
      'ETA',
      'Last Update',
      'Location',
    ]);
  });

  it('renders a row per vehicle with every field formatted', async () => {
    render(<Main />);

    const enRouteRow = (await screen.findByText('FL-001')).closest('tr') as HTMLElement;
    expect(within(enRouteRow).getByText('John Smith')).toBeInTheDocument();
    expect(within(enRouteRow).getByText('EN ROUTE')).toBeInTheDocument();
    expect(within(enRouteRow).getByText('62 mph')).toBeInTheDocument();
    expect(within(enRouteRow).getByText('Hotel Downtown')).toBeInTheDocument();
    expect(within(enRouteRow).getByText('37.6779, -122.4754')).toBeInTheDocument();
    // ETA and Last Update are locale-formatted dates; assert the day is present.
    expect(within(enRouteRow).getAllByText(/24\/09\/2026/)).toHaveLength(2);

    const deliveredRow = screen.getByText('FL-002').closest('tr') as HTMLElement;
    expect(within(deliveredRow).getByText('Maria Garcia')).toBeInTheDocument();
    expect(within(deliveredRow).getByText('DELIVERED')).toBeInTheDocument();
    expect(within(deliveredRow).getByText('0 mph')).toBeInTheDocument();
    // A null estimatedArrival renders as an em dash.
    expect(within(deliveredRow).getByText('—')).toBeInTheDocument();
  });

  it('surfaces a failed fleet load as an error instead of an empty table', async () => {
    mockedVehicleService.list.mockRejectedValue(new Error('Vehicle service unavailable'));

    render(<Main />);

    expect(await screen.findByText('Vehicle service unavailable')).toBeInTheDocument();
  });
});
