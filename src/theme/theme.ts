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
    mode: "light",
    primary: {
      main: "#1565c0",
    },
    secondary: {
      main: "#a9d0ab",
    },
    vehicleStatus: {
      enRoute: "#1565c0",
      idle: "#e8e8e8",
      delivered: "#a3ffa8",
    },
  },
  shape: {
    borderRadius: 8,
  },
});
