import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useFleet } from '../../context/FleetContext';
import {
  formatCoordinates,
  formatDateTime,
  formatOptionalDateTime,
  formatSpeed,
} from '../../utils/format';
import type { VehicleStatus } from '../../types/vehicle';

const COLUMNS = [
  'Vehicle',
  'Driver',
  'Status',
  'Speed',
  'Destination',
  'ETA',
  'Last Update',
  'Location',
];

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

/**
 * The fleet table: a fixed title row and column headers, with the body
 * scrolling independently underneath.
 */
function VehicleTable() {
  const { vehicles, loading, error } = useFleet();

  return (
    <Paper
      variant="outlined"
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {`Vehicles (${vehicles.length})`}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
          {error}
        </Alert>
      )}

      <TableContainer sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableCell key={column} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id} hover>
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
                      color: theme.palette.getContrastText(
                        theme.palette.vehicleStatus[STATUS_PALETTE_KEY[vehicle.status]]
                      ),
                    })}
                  />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatSpeed(vehicle.speed)}</TableCell>
                <TableCell>{vehicle.destination}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatOptionalDateTime(vehicle.estimatedArrival)}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatDateTime(vehicle.lastUpdated)}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatCoordinates(vehicle.currentLocation.lat, vehicle.currentLocation.lng)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} aria-label="Loading vehicles" />
          </Box>
        )}

        {!loading && !error && vehicles.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No vehicles to show.
          </Typography>
        )}
      </TableContainer>
    </Paper>
  );
}

export default VehicleTable;
