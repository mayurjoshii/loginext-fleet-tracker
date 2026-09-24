import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import { useFleet } from '../../context/FleetContext';
import { useFleetSummary, type FleetSummary } from '../../hooks/useFleetSummary';
import type { StatusFilter as StatusFilterValue } from '../../types/vehicle';

interface FilterOption {
  value: StatusFilterValue;
  label: string;
  /** Which summary field supplies the chip's count. */
  countKey: keyof Pick<FleetSummary, 'total' | 'idle' | 'enRoute' | 'delivered'>;
  /** `undefined` renders the neutral gray dot used by "All". */
  paletteKey?: 'enRoute' | 'idle' | 'delivered';
}

const OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All', countKey: 'total' },
  { value: 'idle', label: 'Idle', countKey: 'idle', paletteKey: 'idle' },
  { value: 'en_route', label: 'En Route', countKey: 'enRoute', paletteKey: 'enRoute' },
  { value: 'delivered', label: 'Delivered', countKey: 'delivered', paletteKey: 'delivered' },
];

/**
 * The left rail's status filter: one chip per status, each showing a live
 * fleet-wide count. Counts come from `useFleetSummary` (i.e. the whole fleet),
 * never from the currently filtered `vehicles` array, so switching filters
 * never makes a count shrink or disappear.
 */
export const StatusFilter = () => {
  const { statusFilter, setStatusFilter } = useFleet();
  const summary = useFleetSummary();

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <MonitorHeartOutlinedIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Filter by Status
        </Typography>
      </Stack>

      <Box
        role="group"
        aria-label="Filter by status"
        sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}
      >
        {OPTIONS.map((option) => {
          const selected = statusFilter === option.value;

          return (
            <ButtonBase
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              aria-pressed={selected}
              sx={(theme) => ({
                justifyContent: 'flex-start',
                gap: 0.75,
                px: 1,
                py: 0.75,
                borderRadius: 1,
                border: '1px solid',
                borderColor: selected ? 'primary.main' : theme.palette.divider,
                bgcolor: selected ? 'action.selected' : 'transparent',
                color: selected ? 'primary.main' : 'text.primary',
                fontWeight: selected ? 700 : 500,
              })}
            >
              <Box
                aria-hidden
                sx={(theme) => ({
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  flexShrink: 0,
                  bgcolor: option.paletteKey
                    ? theme.palette.vehicleStatus[option.paletteKey]
                    : theme.palette.grey[500],
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                })}
              />
              <Typography variant="caption" sx={{ fontWeight: 'inherit', whiteSpace: 'nowrap' }}>
                {`${option.label} (${summary[option.countKey]})`}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
};
