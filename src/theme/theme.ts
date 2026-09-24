import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1565c0',
    },
    secondary: {
      main: '#2e7d32',
    },
  },
  shape: {
    borderRadius: 8,
  },
});
