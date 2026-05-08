import { createTheme, alpha } from '@mui/material/styles';

// Base theme configuration
const baseConfig = {
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          borderRadius: 8,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }
        }
      }
    }
  }
};

// Light theme
const lightTheme = createTheme({
  ...baseConfig,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f57c00',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    actions: {
      add: '#4caf50',
      edit: '#ff9800',
      delete: '#f44336',
      update: '#2196f3',
      print: '#607d8b',
      pdf: '#e91e63',
      excel: '#4caf50',
      import: '#9c27b0',
      calendar: '#00bcd4',
    },
    divider: alpha('#000', 0.12),
    text: {
      primary: alpha('#000', 0.87),
      secondary: alpha('#000', 0.6),
    }
  },
});

// Dark theme
const darkTheme = createTheme({
  ...baseConfig,
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#ffb74d',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    actions: {
      add: '#66bb6a',
      edit: '#ffa726',
      delete: '#ef5350',
      update: '#42a5f5',
      print: '#78909c',
      pdf: '#ec407a',
      excel: '#66bb6a',
      import: '#ab47bc',
      calendar: '#26c6da',
    },
    divider: alpha('#fff', 0.12),
    text: {
      primary: alpha('#fff', 0.87),
      secondary: alpha('#fff', 0.6),
    }
  },
});

export { lightTheme, darkTheme };
export default lightTheme;

