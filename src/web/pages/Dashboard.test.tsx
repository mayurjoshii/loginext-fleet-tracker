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
  mockedVehicleService.getById.mockImplementation(async (id) => {
    const vehicle = VEHICLES.find((candidate) => candidate.id === id);
    if (!vehicle) {
      throw new Error(`No vehicle ${id}`);
    }
    return vehicle;
  });
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

describe('VehicleDetailModal', () => {
  it('opens with the selected vehicle fields on row click, and closes via the close button', async () => {
    renderMain();

    await userEvent.click(await screen.findByText('FL-001'));

    expect(mockedVehicleService.getById).toHaveBeenCalledWith('v-1');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('EN ROUTE')).toBeInTheDocument();
    expect(within(dialog).getByText('62 mph')).toBeInTheDocument();
    expect(within(dialog).getByText('John Smith')).toBeInTheDocument();
    expect(within(dialog).getByText('+15096750557')).toBeInTheDocument();
    expect(within(dialog).getByText('Hotel Downtown')).toBeInTheDocument();
    expect(within(dialog).getByText('37.6779, -122.4754')).toBeInTheDocument();
    expect(within(dialog).getByText('59%')).toBeInTheDocument();
    expect(within(dialog).getByText('61%')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Vehicles (2)')).toBeInTheDocument();
  });

  it('closes via a backdrop click', async () => {
    renderMain();

    await userEvent.click(await screen.findByText('FL-002'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('DELIVERED')).toBeInTheDocument();

    const backdrop = document.querySelector('.MuiBackdrop-root') as HTMLElement;
    await userEvent.click(backdrop);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders severity colors for battery/fuel progress bars at low and high levels', async () => {
    mockedVehicleService.getById.mockResolvedValueOnce({
      ...VEHICLES[0],
      batteryLevel: 10,
      fuelLevel: 90,
    });
    renderMain();

    await userEvent.click(await screen.findByText('FL-001'));
    const dialog = await screen.findByRole('dialog');

    const progressBars = within(dialog).getAllByRole('progressbar');
    expect(progressBars).toHaveLength(2);
    const [batteryBar, fuelBar] = progressBars;
    expect(batteryBar.className).toMatch(/colorError/);
    expect(fuelBar.className).toMatch(/colorSuccess/);
  });
});
