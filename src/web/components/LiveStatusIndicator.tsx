import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import WifiOutlinedIcon from '@mui/icons-material/WifiOutlined';
import WifiOffOutlinedIcon from '@mui/icons-material/WifiOffOutlined';
import WifiFindOutlinedIcon from '@mui/icons-material/WifiFindOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import { useFleet } from '../../context/FleetContext';
import type { ConnectionStatus } from '../../sockets/SocketManager';

export interface LiveState {
  /** Long-form copy for the left rail. */
  label: string;
  /** Short-form copy for the table header's badge. */
  badge: string;
  icon: SvgIconComponent;
  /** MUI palette key, so the rail text and the table badge can never disagree. */
  color: 'success' | 'warning' | 'error';
}

const LIVE: LiveState = {
  label: 'Live Updates Active',
  badge: 'Live',
  icon: WifiOutlinedIcon,
  color: 'success',
};

const RECONNECTING: LiveState = {
  label: 'Reconnecting…',
  badge: 'Reconnecting',
  icon: WifiFindOutlinedIcon,
  color: 'warning',
};

const OFFLINE: LiveState = {
  label: 'Offline — data may be stale',
  badge: 'Offline',
  icon: WifiOffOutlinedIcon,
  color: 'error',
};

/**
 * The single mapping from raw socket status to what the dispatcher sees.
 * Both the left-rail indicator and the table header's badge read it, so the
 * two can never report different things about the same connection.
 */
export function liveStateFor(status: ConnectionStatus): LiveState {
  if (status === 'open') {
    return LIVE;
  }
  if (status === 'connecting') {
    return RECONNECTING;
  }
  return OFFLINE;
}

/**
 * Left-rail live-connection indicator. Only the connected state has a design
 * reference; reconnecting and offline follow the same icon+copy pattern in
 * amber and red.
 */
export const LiveStatusIndicator = () => {
  const { connectionStatus } = useFleet();
  const state = liveStateFor(connectionStatus);
  const Icon = state.icon;

  return (
    <Stack
      direction="row"
      spacing={1}
      role="status"
      aria-live="polite"
      sx={{ alignItems: 'center' }}
    >
      <Icon fontSize="small" color={state.color} />
      <Typography variant="subtitle2" color={`${state.color}.main`} sx={{ fontWeight: 700 }}>
        {state.label}
      </Typography>
    </Stack>
  );
};
