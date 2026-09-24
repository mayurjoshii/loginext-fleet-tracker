import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { Main } from '../main';
import { theme } from '../../theme/theme';
import { vehicleService } from '../../api/services/vehicleService';
import { statisticsService } from '../../api/services/statisticsService';
import type { Vehicle } from '../../types/vehicle';
import type { FleetStatistics } from '../../types/statistics';

function renderMain() {
  return render(
    <ThemeProvider theme={theme}>
      <Main />
    </ThemeProvider>
  );
}

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
    renderMain();

    expect(
      await screen.findByRole('heading', { name: 'Fleet Tracking Dashboard' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Real-time vehicle monitoring • LogiNext Case Study')
    ).toBeInTheDocument();
  });

  it('loads the fleet over REST and lists every column header', async () => {
    renderMain();

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
    renderMain();

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

    renderMain();

    expect(await screen.findByText('Vehicle service unavailable')).toBeInTheDocument();
  });
});

describe('Status filter and fleet statistics', () => {
  function statistics(): HTMLElement {
    return screen.getByRole('group', { name: 'Fleet statistics' });
  }

  function chipNames(): string[] {
    return within(screen.getByRole('group', { name: 'Filter by status' }))
      .getAllByRole('button')
      .map((chip) => chip.textContent ?? '');
  }

  it('renders a chip per status with fleet-wide counts', async () => {
    renderMain();

    await screen.findByText('Vehicles (2)');
    expect(chipNames()).toEqual(['All (2)', 'Idle (0)', 'En Route (1)', 'Delivered (1)']);
  });

  it('renders the statistics tiles from the same summary as the chips', async () => {
    renderMain();

    await screen.findByText('Vehicles (2)');

    const totalTile = screen.getByRole('group', { name: 'Total Fleet' });
    expect(within(totalTile).getByText('2')).toBeInTheDocument();

    const avgSpeedTile = screen.getByRole('group', { name: 'Avg Speed' });
    expect(within(avgSpeedTile).getByText('31')).toBeInTheDocument();

    // "Moving" is by construction the En Route chip's count.
    const movingTile = screen.getByRole('group', { name: 'Moving' });
    expect(within(movingTile).getByText('1')).toBeInTheDocument();

    expect(within(statistics()).getByText('Last Update')).toBeInTheDocument();
    expect(screen.getByText(/^Updated \d+s ago/)).toBeInTheDocument();
  });

  it('refetches by status on chip selection without changing the counts', async () => {
    mockedVehicleService.listByStatus.mockResolvedValue([VEHICLES[1]]);

    renderMain();
    await screen.findByText('Vehicles (2)');

    await userEvent.click(screen.getByRole('button', { name: 'Delivered (1)' }));

    expect(await screen.findByText('Vehicles (1)')).toBeInTheDocument();
    expect(mockedVehicleService.listByStatus).toHaveBeenCalledWith('delivered');
    expect(screen.getByText('FL-002')).toBeInTheDocument();
    expect(screen.queryByText('FL-001')).not.toBeInTheDocument();

    // Counts describe the whole fleet, so filtering must not move them.
    expect(chipNames()).toEqual(['All (2)', 'Idle (0)', 'En Route (1)', 'Delivered (1)']);
    const totalTile = screen.getByRole('group', { name: 'Total Fleet' });
    expect(within(totalTile).getByText('2')).toBeInTheDocument();
    const movingTile = screen.getByRole('group', { name: 'Moving' });
    expect(within(movingTile).getByText('1')).toBeInTheDocument();

    // Selecting "All" goes back to the unfiltered list endpoint.
    await userEvent.click(screen.getByRole('button', { name: 'All (2)' }));
    expect(await screen.findByText('Vehicles (2)')).toBeInTheDocument();
    expect(mockedVehicleService.list).toHaveBeenCalledTimes(2);
  });

  it('marks the active chip as pressed', async () => {
    mockedVehicleService.listByStatus.mockResolvedValue([]);

    renderMain();
    await screen.findByText('Vehicles (2)');

    expect(screen.getByRole('button', { name: 'All (2)' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Idle (0)' }));

    expect(screen.getByRole('button', { name: 'Idle (0)' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'All (2)' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
