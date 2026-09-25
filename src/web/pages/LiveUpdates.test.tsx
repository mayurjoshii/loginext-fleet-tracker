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
  mockedVehicleService.getById.mockImplementation(async (id) => {
    const match = VEHICLES.find((candidate) => candidate.id === id);
    if (!match) {
      throw new Error(`No vehicle ${id}`);
    }
    return match;
  });
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

describe('REST failure fallback to the retained socket snapshot', () => {
  it('still shows nothing when REST fails before any snapshot has arrived', async () => {
    mockedVehicleService.list.mockRejectedValue(new Error('Vehicle service unavailable'));

    renderMain();
    expect(await screen.findByText('Vehicle service unavailable')).toBeInTheDocument();
    expect(screen.getByText('Vehicles (0)')).toBeInTheDocument();

    // initial_data arrives, but is retained only — it never paints on its own.
    emitMessage({
      type: 'initial_data',
      data: VEHICLES,
      timestamp: '2026-09-24T10:00:00.000Z',
    });
    expect(screen.getByText('Vehicles (0)')).toBeInTheDocument();
  });

  it('falls back to the retained snapshot on a failed refetch, flagged as unconfirmed', async () => {
    renderMain();
    await screen.findByText('Vehicles (2)');

    // A push gives the context a whole-fleet snapshot to retain.
    pushVehicleUpdate(VEHICLES);

    // The next REST call — triggered by a filter change — fails.
    mockedVehicleService.listByStatus.mockRejectedValue(new Error('Gateway timeout'));
    await userEvent.click(screen.getByRole('button', { name: 'Delivered (1)' }));

    // Rather than an empty table, the snapshot shows, scoped to that filter.
    expect(await screen.findByText('Vehicles (1)')).toBeInTheDocument();
    expect(screen.getByText('FL-002')).toBeInTheDocument();
    expect(screen.queryByText('FL-001')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing the last live snapshot/)).toBeInTheDocument();
  });

  it('drops the fallback notice once REST succeeds again', async () => {
    renderMain();
    await screen.findByText('Vehicles (2)');
    pushVehicleUpdate(VEHICLES);

    mockedVehicleService.listByStatus.mockRejectedValue(new Error('Gateway timeout'));
    await userEvent.click(screen.getByRole('button', { name: 'Delivered (1)' }));
    await screen.findByText(/Showing the last live snapshot/);

    await userEvent.click(screen.getByRole('button', { name: 'All (2)' }));

    expect(await screen.findByText('Vehicles (2)')).toBeInTheDocument();
    expect(screen.queryByText(/Showing the last live snapshot/)).not.toBeInTheDocument();
  });

  it('derives statistics from the retained snapshot when /statistics fails', async () => {
    mockedStatisticsService.get.mockRejectedValue(new Error('Statistics unavailable'));

    renderMain();
    await screen.findByText('Vehicles (2)');
    pushVehicleUpdate([
      { ...VEHICLES[0], speed: 80, status: 'idle' },
      { ...VEHICLES[1], speed: 0 },
    ]);

    expect(chipNames()).toEqual(['All (2)', 'Idle (1)', 'En Route (0)', 'Delivered (1)']);
    expect(
      within(screen.getByRole('group', { name: 'Avg Speed' })).getByText('40')
    ).toBeInTheDocument();
  });
});

describe('Failure banner', () => {
  it('renders no banner at all on a healthy load', async () => {
    renderMain();
    await screen.findByText('Vehicles (2)');

    // Guards the precedence trap: an `error && cond ? a : b` here would render
    // an empty error alert on every successful load.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a single error banner when REST fails with no snapshot to fall back on', async () => {
    mockedVehicleService.list.mockRejectedValue(new Error('Vehicle service unavailable'));

    renderMain();
    await screen.findByText('Vehicle service unavailable');

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Vehicle service unavailable');
    expect(alerts[0]).not.toHaveTextContent(/Showing the last live snapshot/);
  });
});

describe('Open modal staleness signal', () => {
  const NEWER = {
    ...VEHICLES[0],
    speed: 15,
    batteryLevel: 31,
    lastUpdated: '2026-09-24T10:00:00.000Z',
  };

  async function openModal() {
    renderMain();
    await screen.findByText('Vehicles (2)');
    await userEvent.click(screen.getByText('FL-001'));
    return screen.findByRole('dialog');
  }

  it('flags newer data without changing the values on screen', async () => {
    const dialog = await openModal();
    expect(within(dialog).getByText('62 mph')).toBeInTheDocument();

    pushVehicleUpdate([NEWER, VEHICLES[1]]);

    // Signalled, not swapped — the dispatcher's reading position is preserved.
    expect(within(dialog).getByText('Newer data has arrived for this vehicle.')).toBeInTheDocument();
    expect(within(dialog).getByText('62 mph')).toBeInTheDocument();
    expect(within(dialog).getByText('59%')).toBeInTheDocument();
  });

  it('pulls the new values through getById when Refresh is clicked', async () => {
    const dialog = await openModal();
    pushVehicleUpdate([NEWER, VEHICLES[1]]);

    mockedVehicleService.getById.mockResolvedValueOnce(NEWER);
    await userEvent.click(within(dialog).getByRole('button', { name: /Refresh/ }));

    expect(await within(dialog).findByText('15 mph')).toBeInTheDocument();
    expect(within(dialog).getByText('31%')).toBeInTheDocument();
    // REST remains the source of truth for single-vehicle detail.
    expect(mockedVehicleService.getById).toHaveBeenCalledTimes(2);
    expect(mockedVehicleService.getById).toHaveBeenLastCalledWith('v-1');

    expect(
      within(dialog).queryByText('Newer data has arrived for this vehicle.')
    ).not.toBeInTheDocument();
  });

  it('stays quiet when a push carries no newer data for this vehicle', async () => {
    const dialog = await openModal();

    // FL-002 moves; FL-001 is unchanged.
    pushVehicleUpdate([
      VEHICLES[0],
      { ...VEHICLES[1], speed: 9, lastUpdated: '2026-09-24T10:00:00.000Z' },
    ]);

    expect(
      within(dialog).queryByText('Newer data has arrived for this vehicle.')
    ).not.toBeInTheDocument();
  });

  it('keeps the existing data visible when a refresh fails', async () => {
    const dialog = await openModal();
    pushVehicleUpdate([NEWER, VEHICLES[1]]);

    mockedVehicleService.getById.mockRejectedValueOnce(new Error('Gateway timeout'));
    await userEvent.click(within(dialog).getByRole('button', { name: /Refresh/ }));

    expect(await within(dialog).findByText(/Couldn't refresh: Gateway timeout/)).toBeInTheDocument();
    // The stale-but-real values are still there, and still flagged as stale.
    expect(within(dialog).getByText('62 mph')).toBeInTheDocument();
    expect(within(dialog).getByText('Newer data has arrived for this vehicle.')).toBeInTheDocument();
  });
});
