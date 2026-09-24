import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { Main } from '../main';
import { theme } from '../../theme/theme';
import { vehicleService } from '../../api/services/vehicleService';
import { statisticsService } from '../../api/services/statisticsService';
import { socketManager, type ConnectionStatus } from '../../sockets/SocketManager';
import type { Vehicle } from '../../types/vehicle';
import type { FleetStatistics } from '../../types/statistics';

jest.mock('../../api/services/vehicleService');
jest.mock('../../api/services/statisticsService');
jest.mock('../../sockets/SocketManager');

const mockedVehicleService = vehicleService as jest.Mocked<typeof vehicleService>;
const mockedStatisticsService = statisticsService as jest.Mocked<typeof statisticsService>;
/**
 * The manual mock in `sockets/__mocks__` adds emitters so a test can push
 * frames at the app exactly as the server would.
 */
const mockedSocketManager = socketManager as unknown as {
  connect: jest.Mock;
  __emitMessage: (data: unknown) => void;
  __emitStatus: (status: ConnectionStatus) => void;
};

function emitMessage(message: unknown) {
  act(() => mockedSocketManager.__emitMessage(message));
}

/** Simulates a `vehicle_update` frame arriving on the socket. */
function pushVehicleUpdate(data: Vehicle[], timestamp = '2026-09-24T10:00:00.000Z') {
  emitMessage({ type: 'vehicle_update', data, timestamp, message: 'Fleet data updated' });
}

function emitConnectionStatus(status: ConnectionStatus) {
  act(() => mockedSocketManager.__emitStatus(status));
}

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

function renderMain() {
  return render(
    <ThemeProvider theme={theme}>
      <Main />
    </ThemeProvider>
  );
}

function chipNames(): string[] {
  return within(screen.getByRole('group', { name: 'Filter by status' }))
    .getAllByRole('button')
    .map((chip) => chip.textContent ?? '');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedVehicleService.list.mockResolvedValue(VEHICLES);
  mockedStatisticsService.get.mockResolvedValue(STATISTICS);
});

describe('Live WebSocket updates', () => {
  it('subscribes to the socket and ignores initial_data, leaving the REST load alone', async () => {
    renderMain();
    await screen.findByText('Vehicles (2)');

    expect(mockedSocketManager.connect).toHaveBeenCalled();

    emitMessage({
      type: 'initial_data',
      data: [{ ...VEHICLES[0], speed: 999 }],
      timestamp: '2026-09-24T10:00:00.000Z',
    });

    // REST owns the initial load, so the snapshot on screen is untouched.
    expect(screen.getByText('Vehicles (2)')).toBeInTheDocument();
    const row = screen.getByText('FL-001').closest('tr') as HTMLElement;
    expect(within(row).getByText('62 mph')).toBeInTheDocument();
  });

  it('merges a vehicle_update into the table, chip counts, and statistics without a refetch', async () => {
    renderMain();
    await screen.findByText('Vehicles (2)');

    pushVehicleUpdate([
      { ...VEHICLES[0], speed: 80, status: 'idle' },
      { ...VEHICLES[1], speed: 0 },
    ]);

    const updatedRow = screen.getByText('FL-001').closest('tr') as HTMLElement;
    expect(within(updatedRow).getByText('80 mph')).toBeInTheDocument();
    expect(within(updatedRow).getByText('IDLE')).toBeInTheDocument();

    // Counts and averages re-derive from the push itself.
    expect(chipNames()).toEqual(['All (2)', 'Idle (1)', 'En Route (0)', 'Delivered (1)']);
    expect(
      within(screen.getByRole('group', { name: 'Avg Speed' })).getByText('40')
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Moving' })).getByText('0')
    ).toBeInTheDocument();

    // No page refresh and no extra REST traffic of any kind.
    expect(mockedVehicleService.list).toHaveBeenCalledTimes(1);
    expect(mockedStatisticsService.get).toHaveBeenCalledTimes(1);
  });

  it("leaves a filtered view's visible rows untouched by vehicles outside the filter", async () => {
    mockedVehicleService.listByStatus.mockResolvedValue([VEHICLES[1]]);

    renderMain();
    await screen.findByText('Vehicles (2)');
    await userEvent.click(screen.getByRole('button', { name: 'Delivered (1)' }));
    await screen.findByText('Vehicles (1)');

    pushVehicleUpdate([
      { ...VEHICLES[0], speed: 80 },
      { ...VEHICLES[1], speed: 7 },
    ]);

    // The out-of-filter vehicle is never reintroduced...
    expect(screen.getByText('Vehicles (1)')).toBeInTheDocument();
    expect(screen.queryByText('FL-001')).not.toBeInTheDocument();
    // ...while the visible one still takes its update.
    const visibleRow = screen.getByText('FL-002').closest('tr') as HTMLElement;
    expect(within(visibleRow).getByText('7 mph')).toBeInTheDocument();
    expect(mockedVehicleService.listByStatus).toHaveBeenCalledTimes(1);
  });

  it('reflects the socket connection state in the rail indicator and the table badge', async () => {
    renderMain();
    await screen.findByText('Vehicles (2)');

    emitConnectionStatus('open');
    expect(screen.getByRole('status')).toHaveTextContent('Live Updates Active');
    expect(screen.getByText('Live')).toBeInTheDocument();

    emitConnectionStatus('connecting');
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting…');
    expect(screen.getByText('Reconnecting')).toBeInTheDocument();

    emitConnectionStatus('closed');
    expect(screen.getByRole('status')).toHaveTextContent('Offline — data may be stale');
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});
