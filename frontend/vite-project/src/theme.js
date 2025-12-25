import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: "#1E3A8A" },
    secondary: { main: "#F97316" },
    info: { main: '#0284C7' },
    success: { main: '#16A34A' },
    background: { default: '#f7fbff', paper: '#ffffff' }
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: false
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          transition: 'transform 180ms ease, box-shadow 180ms ease'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 6px 18px rgba(15,23,42,0.06)'
        }
      }
    }
  }
});

export default theme;
