import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Header from '../components/Header';
import VehicleTable from '../components/VehicleTable';

/**
 * The app's single route: header above a two-column body — a left rail
 * (live status, filter, statistics; filled in by later tickets) beside the
 * fleet table.
 */
function Dashboard() {
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
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              Live status, status filter, and fleet statistics land here.
            </Typography>
          </Paper>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <VehicleTable />
        </Box>
      </Box>
    </Box>
  );
}

export default Dashboard;
