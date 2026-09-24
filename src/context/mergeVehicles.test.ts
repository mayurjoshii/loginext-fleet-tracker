import { deriveStatistics, mergeVehiclesById, parseFleetMessage } from './mergeVehicles';
import type { Vehicle } from '../types/vehicle';

function vehicle(overrides: Partial<Vehicle> & Pick<Vehicle, 'id'>): Vehicle {
  return {
    vehicleNumber: 'FL-000',
    driverName: 'Driver',
    driverPhone: '+10000000000',
    status: 'idle',
    destination: 'Depot',
    currentLocation: { lat: 37.7, lng: -122.4 },
    speed: 0,
    lastUpdated: '2026-09-24T09:49:41.516Z',
    estimatedArrival: null,
    batteryLevel: 50,
    fuelLevel: 50,
    ...overrides,
  };
}

describe('mergeVehiclesById', () => {
  it('replaces a visible vehicle whose data changed', () => {
    const current = [vehicle({ id: 'a', speed: 0 }), vehicle({ id: 'b', speed: 10 })];
    const merged = mergeVehiclesById(current, [vehicle({ id: 'a', speed: 45 })]);

    expect(merged.map((v) => v.speed)).toEqual([45, 10]);
  });

  it('never reintroduces a vehicle missing from a filtered subset', () => {
    // `current` is scoped to a status filter; the push carries the whole fleet.
    const current = [vehicle({ id: 'b', status: 'delivered' })];
    const push = [
      vehicle({ id: 'a', status: 'idle' }),
      vehicle({ id: 'b', status: 'delivered', speed: 3 }),
      vehicle({ id: 'c', status: 'en_route' }),
    ];

    const merged = mergeVehiclesById(current, push);

    expect(merged.map((v) => v.id)).toEqual(['b']);
    expect(merged[0].speed).toBe(3);
  });

  it('never removes a visible vehicle the push omits', () => {
    const current = [vehicle({ id: 'a' }), vehicle({ id: 'b' })];
    const merged = mergeVehiclesById(current, [vehicle({ id: 'a', speed: 20 })]);

    expect(merged.map((v) => v.id)).toEqual(['a', 'b']);
    expect(merged[1]).toBe(current[1]);
  });

  it('preserves object identity for unchanged rows', () => {
    const current = [vehicle({ id: 'a', speed: 0 }), vehicle({ id: 'b', speed: 10 })];
    const merged = mergeVehiclesById(current, [
      vehicle({ id: 'a', speed: 0 }),
      vehicle({ id: 'b', speed: 55 }),
    ]);

    // `a` is deep-equal to its push, so the original object survives untouched.
    expect(merged[0]).toBe(current[0]);
    expect(merged[1]).not.toBe(current[1]);
  });

  it('returns the original array when nothing changed at all', () => {
    const current = [vehicle({ id: 'a' }), vehicle({ id: 'b' })];
    const merged = mergeVehiclesById(current, [vehicle({ id: 'a' }), vehicle({ id: 'b' })]);

    expect(merged).toBe(current);
  });

  it('treats a nested location change as a change', () => {
    const current = [vehicle({ id: 'a', currentLocation: { lat: 1, lng: 2 } })];
    const merged = mergeVehiclesById(current, [
      vehicle({ id: 'a', currentLocation: { lat: 1, lng: 9 } }),
    ]);

    expect(merged[0].currentLocation.lng).toBe(9);
  });

  it('is a no-op for an empty push', () => {
    const current = [vehicle({ id: 'a' })];
    expect(mergeVehiclesById(current, [])).toBe(current);
  });
});

describe('deriveStatistics', () => {
  it('counts the whole pushed fleet and averages its speed', () => {
    const fleet = [
      vehicle({ id: 'a', status: 'en_route', speed: 60 }),
      vehicle({ id: 'b', status: 'en_route', speed: 20 }),
      vehicle({ id: 'c', status: 'idle', speed: 0 }),
      vehicle({ id: 'd', status: 'delivered', speed: 0 }),
    ];

    expect(deriveStatistics(fleet, '2026-09-24T10:00:00.000Z')).toEqual({
      total: 4,
      idle: 1,
      en_route: 2,
      delivered: 1,
      average_speed: 20,
      timestamp: '2026-09-24T10:00:00.000Z',
    });
  });

  it('reports a zero average for an empty fleet rather than NaN', () => {
    expect(deriveStatistics([], '2026-09-24T10:00:00.000Z').average_speed).toBe(0);
  });
});

describe('parseFleetMessage', () => {
  it('accepts the two known frame types', () => {
    expect(parseFleetMessage({ type: 'vehicle_update', data: [], timestamp: 't' })?.type).toBe(
      'vehicle_update'
    );
    expect(parseFleetMessage({ type: 'initial_data', data: [], timestamp: 't' })?.type).toBe(
      'initial_data'
    );
  });

  it('rejects anything else', () => {
    expect(parseFleetMessage(null)).toBeNull();
    expect(parseFleetMessage('ping')).toBeNull();
    expect(parseFleetMessage({ type: 'heartbeat', data: [] })).toBeNull();
    expect(parseFleetMessage({ type: 'vehicle_update', data: 'nope' })).toBeNull();
  });
});
