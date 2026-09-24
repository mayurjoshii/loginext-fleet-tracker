import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

/**
 * Single-screen root for the app. Acts as the only route for now.
 * See decisions.md for the plan to split this into routed pages later.
 */
function Main() {
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Fleet Tracker
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Frontend scaffold ready — API, utils, and WebSocket layers are wired up in src/.
        </Typography>
      </Box>
    </Container>
  );
}

export default Main;
