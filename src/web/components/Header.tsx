import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';

/** Static page header — title, subtitle, and the divider under them. */
function Header() {
  return (
    <Box component="header" sx={{ pb: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <LocalShippingOutlinedIcon color="primary" fontSize="large" />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Fleet Tracking Dashboard
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Real-time vehicle monitoring • LogiNext Case Study
      </Typography>
      <Divider sx={{ mt: 2 }} />
    </Box>
  );
}

export default Header;
