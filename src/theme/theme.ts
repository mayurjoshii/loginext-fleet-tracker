import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    vehicleStatus: {
      enRoute: string;
      idle: string;
      delivered: string;
    };
  }
  interface PaletteOptions {
    vehicleStatus?: {
      enRoute: string;
      idle: string;
      delivered: string;
    };
  }
}

export const theme = createTheme({
  palette: {
    primary: {
      main: "#1565c0",
    },
    secondary: {
      main: "#a9d0ab",
    },
    vehicleStatus: {
      enRoute: "#1565c0",
      idle: "#e8e8e8",
      delivered: "#d0ffd3",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*::-webkit-scrollbar": {
          width: 4,
          height: 4,
        },
        "*::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: "#d5d5d5",
          borderRadius: 8,
        },
        "*::-webkit-scrollbar-thumb:hover": {
          backgroundColor: "#bdbdbd",
        },
      },
    },
  },
});
