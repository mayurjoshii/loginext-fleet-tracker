import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import BatteryFullOutlinedIcon from '@mui/icons-material/BatteryFullOutlined';
import CloseIcon from '@mui/icons-material/Close';
import LocalGasStationOutlinedIcon from '@mui/icons-material/LocalGasStationOutlined';
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
  const { selectedVehicleId, clearSelectedVehicle } = useFleet();
  const theme = useTheme();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = selectedVehicleId !== null;

  useEffect(() => {
    if (!selectedVehicleId) {
      return;
    }

    let cancelled = false;
    setVehicle(null);
    setError(null);
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

  return (
    <Modal
      open={open}
      onClose={clearSelectedVehicle}
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(3px)', bgcolor: 'rgba(0, 0, 0, 0.5)' },
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
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {vehicle ? vehicle.vehicleNumber : 'Vehicle details'}
          </Typography>
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

        {vehicle && !loading && !error && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <StatCard
              icon={<PlaceOutlinedIcon />}
              label="Status"
              value=""
              badge={{
                label: STATUS_LABELS[vehicle.status],
                color: theme.palette.vehicleStatus[STATUS_PALETTE_KEY[vehicle.status]],
              }}
            />
            <StatCard
              icon={<SpeedOutlinedIcon />}
              label="Current Speed"
              value={formatSpeed(vehicle.speed)}
            />
            <StatCard icon={<PersonOutlineIcon />} label="Driver" value={vehicle.driverName} />
            <StatCard
              icon={<PhoneOutlinedIcon />}
              label="Driver Phone"
              value={vehicle.driverPhone}
            />
            <StatCard
              icon={<LocationOnOutlinedIcon />}
              label="Destination"
              value={vehicle.destination}
            />
            <StatCard
              icon={<PlaceOutlinedIcon />}
              label="Location"
              value={formatCoordinates(vehicle.currentLocation.lat, vehicle.currentLocation.lng)}
            />
            <StatCard
              icon={<BatteryFullOutlinedIcon />}
              label="Battery Level"
              value={`${vehicle.batteryLevel}%`}
              progress={{
                value: vehicle.batteryLevel,
                color: severityForLevel(vehicle.batteryLevel),
              }}
            />
            <StatCard
              icon={<LocalGasStationOutlinedIcon />}
              label="Fuel Level"
              value={`${vehicle.fuelLevel}%`}
              progress={{ value: vehicle.fuelLevel, color: severityForLevel(vehicle.fuelLevel) }}
            />
            <StatCard
              icon={<UpdateOutlinedIcon />}
              label="Last Updated"
              value={formatDateTime(vehicle.lastUpdated)}
            />
          </Box>
        )}
      </Paper>
    </Modal>
  );
};
