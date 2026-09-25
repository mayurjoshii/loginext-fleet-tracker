import { memo } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import {
  formatCoordinates,
  formatDateTime,
  formatOptionalDateTime,
  formatSpeed,
} from '../../utils/format';
import type { Vehicle, VehicleStatus } from '../../types/vehicle';

const STATUS_LABELS: Record<VehicleStatus, string> = {
  en_route: 'EN ROUTE',
  idle: 'IDLE',
  delivered: 'DELIVERED',
};

const STATUS_PALETTE_KEY: Record<VehicleStatus, 'enRoute' | 'idle' | 'delivered'> = {
  en_route: 'enRoute',
  idle: 'idle',
  delivered: 'delivered',
};

interface VehicleRowProps {
  vehicle: Vehicle;
  onSelect: (id: string) => void;
}

/**
 * One table row, memoized on `vehicle` identity.
 *
 * A `vehicle_update` push merges by id and leaves untouched vehicles as the
 * exact same object (see `mergeVehiclesById`), so memoizing here is what turns
 * that stable identity into actually skipped re-renders: a push that changes
 * three vehicles re-renders three rows, not the whole fleet.
 */
export const VehicleRow = memo(({ vehicle, onSelect }: VehicleRowProps) => {
  return (
    <TableRow hover onClick={() => onSelect(vehicle.id)} sx={{ cursor: 'pointer' }}>
      <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>
        {vehicle.vehicleNumber}
      </TableCell>
      <TableCell>{vehicle.driverName}</TableCell>
      <TableCell>
        <Chip
          size="small"
          label={STATUS_LABELS[vehicle.status]}
          sx={(theme) => ({
            bgcolor: theme.palette.vehicleStatus[STATUS_PALETTE_KEY[vehicle.status]],
            color:
              vehicle.status === 'delivered'
                ? theme.palette.vehicleStatus.deliveredText
                : theme.palette.getContrastText(
                    theme.palette.vehicleStatus[STATUS_PALETTE_KEY[vehicle.status]]
                  ),
            fontWeight: 700,
          })}
        />
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Box
          component="span"
          sx={(theme) => ({
            display: 'inline-block',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            bgcolor: theme.palette.grey[200],
            fontWeight: 700,
          })}
        >
          {formatSpeed(vehicle.speed)}
        </Box>
      </TableCell>
      <TableCell>{vehicle.destination}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {formatOptionalDateTime(vehicle.estimatedArrival)}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(vehicle.lastUpdated)}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        {formatCoordinates(vehicle.currentLocation.lat, vehicle.currentLocation.lng)}
      </TableCell>
    </TableRow>
  );
});

VehicleRow.displayName = 'VehicleRow';
