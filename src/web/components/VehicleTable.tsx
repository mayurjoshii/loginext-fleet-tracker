import Alert, { type AlertColor } from '@mui/material/Alert';
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
import { liveStateFor } from './LiveStatusIndicator';
import { VehicleRow } from './VehicleRow';

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

interface FailureNotice {
  severity: AlertColor;
  text: string;
}

/**
 * The banner to show above the table, or `null` when there's nothing wrong.
 *
 * Written as statements rather than a conditional inside the JSX: the "no
 * error" case has to be unmistakably separate from the two error cases, so
 * that an empty banner can't render on a healthy load.
 */
function failureNotice(error: string | null, usingFallbackSnapshot: boolean): FailureNotice | null {
  if (!error) {
    return null;
  }
  if (usingFallbackSnapshot) {
    // Rows are showing, but they came off the socket rather than a confirmed
    // REST snapshot — say so rather than letting them pass for a normal load.
    return {
      severity: 'warning',
      text: `Showing the last live snapshot — couldn't reach the server. ${error}`,
    };
  }
  return { severity: 'error', text: error };
}

/**
 * The fleet table: a fixed title row and column headers, with the body
 * scrolling independently underneath.
 */
export const VehicleTable = () => {
  const { vehicles, loading, error, selectVehicle, connectionStatus, usingFallbackSnapshot } =
    useFleet();
  // Same mapping the left-rail indicator uses, so the badge here can never
  // claim the feed is live while the rail says otherwise.
  const live = liveStateFor(connectionStatus);
  const LiveIcon = live.icon;
  const notice = failureNotice(error, usingFallbackSnapshot);

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
        <Chip
          size="small"
          color={live.color}
          variant="filled"
          icon={<LiveIcon />}
          label={live.badge}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      {notice && (
        <Alert severity={notice.severity} sx={{ mx: 2, mb: 1 }}>
          {notice.text}
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
              <VehicleRow key={vehicle.id} vehicle={vehicle} onSelect={selectVehicle} />
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
};
