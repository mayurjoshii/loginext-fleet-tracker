import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import BatteryFullOutlinedIcon from '@mui/icons-material/BatteryFullOutlined';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalGasStationOutlinedIcon from '@mui/icons-material/LocalGasStationOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import UpdateOutlinedIcon from '@mui/icons-material/UpdateOutlined';
import { useFleet } from '../../context/FleetContext';
import { vehicleService } from '../../api/services/vehicleService';
import { StatCard } from './StatCard';
import { formatCoordinates, formatDateTime, formatSpeed } from '../../utils/format';
import { severityForLevel } from '../../utils/severity';
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

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

/**
 * Shows the freshest snapshot for the selected vehicle over a blurred/dimmed
 * backdrop. Closes via its close button or by clicking the backdrop.
 */
export const VehicleDetailModal = () => {
  const { selectedVehicleId, clearSelectedVehicle, vehicles } = useFleet();
  const theme = useTheme();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Kept apart from `error`: a failed *refresh* must leave the data already on
  // screen in place, where a failed initial load has nothing to show instead.
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const open = selectedVehicleId !== null;

  const statusColor = vehicle
    ? vehicle.status === 'delivered'
      ? theme.palette.vehicleStatus.deliveredText
      : vehicle.status === 'idle'
        ? theme.palette.getContrastText(theme.palette.vehicleStatus.idle)
        : theme.palette.vehicleStatus[STATUS_PALETTE_KEY[vehicle.status]]
    : undefined;

  /**
   * Whether a socket push has carried newer data for this vehicle than the
   * snapshot on screen.
   *
   * The socket is only a *signal* here — it never supplies the modal's values.
   * REST stays the sole source of truth for single-vehicle detail, so noticing
   * staleness and resolving it are deliberately separate steps, and the second
   * one is the dispatcher's to take.
   *
   * ISO-8601 timestamps compare correctly as strings, the same assumption
   * `useFleetSummary` already relies on.
   */
  const liveVehicle = vehicles.find((candidate) => candidate.id === selectedVehicleId);
  const isStale = Boolean(
    vehicle && liveVehicle && liveVehicle.lastUpdated > vehicle.lastUpdated
  );

  useEffect(() => {
    if (!selectedVehicleId) {
      return;
    }

    let cancelled = false;
    setVehicle(null);
    setError(null);
    setRefreshError(null);
    setLoading(true);

    vehicleService
      .getById(selectedVehicleId)
      .then((next) => {
        if (!cancelled) {
          setVehicle(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(messageOf(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedVehicleId]);

  /**
   * Pulls a fresh snapshot on demand, via the same `getById` the modal opened
   * with. Deliberately does not blank the existing values while in flight —
   * the dispatcher asked for newer data, not for the panel to empty itself.
   */
  const handleRefresh = useCallback(async () => {
    const id = selectedVehicleId;
    if (!id) {
      return;
    }

    setRefreshing(true);
    setRefreshError(null);

    try {
      const next = await vehicleService.getById(id);
      // The selection may have moved on while this was in flight.
      setVehicle((current) => (current && current.id === id ? next : current));
    } catch (err) {
      setRefreshError(messageOf(err));
    } finally {
      setRefreshing(false);
    }
  }, [selectedVehicleId]);

  return (
    <Modal
      open={open}
      onClose={clearSelectedVehicle}
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(3px)',
            bgcolor: alpha(theme.palette.common.black, 0.5),
          },
        },
      }}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
    >
      <Paper
        role="dialog"
        aria-modal="true"
        aria-label={vehicle ? `${vehicle.vehicleNumber} details` : 'Vehicle details'}
        sx={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          overflowY: 'auto',
          p: 3,
          outline: 'none',
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LocalShippingOutlinedIcon fontSize="small" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {vehicle ? vehicle.vehicleNumber : 'Vehicle details'}
              </Typography>
            </Stack>
            {vehicle && (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                <PersonOutlineIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {vehicle.driverName}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  &bull;
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {STATUS_LABELS[vehicle.status]}
                </Typography>
              </Stack>
            )}
          </Stack>
          <IconButton aria-label="Close" onClick={clearSelectedVehicle} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} aria-label="Loading vehicle" />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {isStale && (
          <Alert
            severity="warning"
            sx={{ mb: 2 }}
            action={
              <Button
                size="small"
                color="inherit"
                onClick={handleRefresh}
                disabled={refreshing}
                startIcon={
                  refreshing ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />
                }
              >
                Refresh
              </Button>
            }
          >
            Newer data has arrived for this vehicle.
          </Alert>
        )}

        {refreshError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {`Couldn't refresh: ${refreshError}`}
          </Alert>
        )}

        {vehicle && !loading && !error && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            {(() => {
              return (
                <>
                  <StatCard
                    icon={<PlaceOutlinedIcon />}
                    label="Status"
                    value=""
                    borderColor={statusColor}
                    badge={{
                      label: STATUS_LABELS[vehicle.status],
                      color: theme.palette.vehicleStatus[STATUS_PALETTE_KEY[vehicle.status]],
                      textColor:
                        vehicle.status === 'delivered'
                          ? theme.palette.vehicleStatus.deliveredText
                          : undefined,
                    }}
                  />
                  <StatCard
                    icon={<SpeedOutlinedIcon />}
                    label="Current Speed"
                    value={formatSpeed(vehicle.speed)}
                    borderColor={statusColor}
                  />
                  <StatCard
                    icon={<PersonOutlineIcon />}
                    label="Driver"
                    value={vehicle.driverName}
                    borderColor={statusColor}
                  />
                  <StatCard
                    icon={<PhoneOutlinedIcon />}
                    label="Driver Phone"
                    value={vehicle.driverPhone}
                    borderColor={statusColor}
                  />
                  <StatCard
                    icon={<LocationOnOutlinedIcon />}
                    label="Destination"
                    value={vehicle.destination}
                    borderColor={statusColor}
                  />
                  <StatCard
                    icon={<PlaceOutlinedIcon />}
                    label="Location"
                    value={formatCoordinates(
                      vehicle.currentLocation.lat,
                      vehicle.currentLocation.lng
                    )}
                    borderColor={statusColor}
                  />
                  <StatCard
                    icon={<BatteryFullOutlinedIcon />}
                    label="Battery Level"
                    value={`${vehicle.batteryLevel}%`}
                    progress={{
                      value: vehicle.batteryLevel,
                      color: severityForLevel(vehicle.batteryLevel),
                    }}
                    borderColor={statusColor}
                  />
                  <StatCard
                    icon={<LocalGasStationOutlinedIcon />}
                    label="Fuel Level"
                    value={`${vehicle.fuelLevel}%`}
                    progress={{
                      value: vehicle.fuelLevel,
                      color: severityForLevel(vehicle.fuelLevel),
                    }}
                    borderColor={statusColor}
                  />
                  <StatCard
                    icon={<UpdateOutlinedIcon />}
                    label="Last Updated"
                    value={formatDateTime(vehicle.lastUpdated)}
                    borderColor={statusColor}
                  />
                </>
              );
            })()}
          </Box>
        )}
      </Paper>
    </Modal>
  );
};
