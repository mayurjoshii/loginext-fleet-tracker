import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import { useFleetSummary } from '../../hooks/useFleetSummary';
import { formatAge, useFreshness } from '../../hooks/useFreshness';
import { formatTime } from '../../utils/format';

interface TileProps {
  icon: SvgIconComponent;
  value: string;
  label: string;
}

const Tile = ({ icon: Icon, value, label }: TileProps) => {
  return (
    <Paper variant="outlined" sx={{ p: 1.25, textAlign: 'center' }}>
      <Icon fontSize="small" color="primary" />
      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Typography>
    </Paper>
  );
};

/**
 * The left rail's statistics tiles. Every number comes from `useFleetSummary`,
 * the same derivation the status filter chips read, so the two panels can never
 * disagree — "Moving" here is by construction the En Route chip's count.
 */
export const FleetStatistics = () => {
  const summary = useFleetSummary();
  const secondsSinceUpdate = useFreshness(summary);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <AccessTimeOutlinedIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Fleet Statistics
        </Typography>
      </Stack>

      <Box
        role="group"
        aria-label="Fleet statistics"
        sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}
      >
        <Tile icon={GroupsOutlinedIcon} value={String(summary.total)} label="Total Fleet" />
        <Tile
          icon={TrendingUpOutlinedIcon}
          value={String(Math.round(summary.averageSpeed))}
          label="Avg Speed"
        />
        <Tile icon={MonitorHeartOutlinedIcon} value={String(summary.moving)} label="Moving" />
        <Tile
          icon={AccessTimeOutlinedIcon}
          value={summary.lastUpdate ? formatTime(summary.lastUpdate) : '—'}
          label="Last Update"
        />
      </Box>

      <Paper variant="outlined" sx={{ mt: 1, px: 1, py: 0.75, bgcolor: 'action.hover' }}>
        <Typography variant="caption" color="text.secondary">
          {`Updated ${formatAge(secondsSinceUpdate)} • Next update in ~3 minutes`}
        </Typography>
      </Paper>
    </Box>
  );
};
