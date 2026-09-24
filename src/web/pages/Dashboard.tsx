import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { FleetStatistics } from '../components/FleetStatistics';
import { Header } from '../components/Header';
import { VehicleDetailModal } from '../components/VehicleDetailModal';
import { StatusFilter } from '../components/StatusFilter';
import { VehicleTable } from '../components/VehicleTable';

/**
 * The app's single route: header above a two-column body — a left rail
 * (live status, filter, statistics; filled in by later tickets) beside the
 * fleet table.
 */
export const Dashboard = () => {
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 3, gap: 2 }}>
      <Header />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box sx={{ width: { xs: '100%', md: '20%' }, flexShrink: 0 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Stack spacing={2} divider={<Divider flexItem />}>
              <StatusFilter />
              <FleetStatistics />
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <VehicleTable />
        </Box>
      </Box>
      <VehicleDetailModal />
    </Box>
  );
};
