import { createTheme } from "@mui/material/styles"
import type { Shadows } from "@mui/material/styles"

export const muiTheme = createTheme({
  palette: {
    primary:    { main: '#3B82F6', dark: '#2563EB', light: '#60A5FA', contrastText: '#FFFFFF' },
    secondary:  { main: '#10B981', dark: '#059669', light: '#34D399', contrastText: '#FFFFFF' },
    error:      { main: '#EF4444' },
    success:    { main: '#10B981' },
    warning:    { main: '#F59E0B' },
    info:       { main: '#3B82F6' },
    background: { default: '#F3F4F6', paper: '#FFFFFF' },
    text:       { primary: '#111827', secondary: '#6B7280' },
    divider:    '#E5E7EB',
    action:     { hover: 'rgba(59,130,246,0.06)', selected: 'rgba(59,130,246,0.10)' },
  },
  shadows: Array(25).fill('none') as Shadows,
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Outfit", system-ui, "Segoe UI", Arial, sans-serif',
    h1: { fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 700, fontSize: '1.375rem', lineHeight: 1.25, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.3 },
    h4: { fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 700, fontSize: '1rem', lineHeight: 1.35 },
    h5: { fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 700, fontSize: '0.9rem' },
    h6: { fontFamily: '"Outfit", system-ui, sans-serif', fontWeight: 700, fontSize: '0.875rem' },
    subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 600, letterSpacing: '-0.01em' },
    body1:     { fontSize: '0.9375rem' },
    body2:     { fontSize: '0.8125rem' },
    caption:   { fontSize: '0.6875rem', letterSpacing: '0.04em' },
    button:    { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    overline:  { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { backgroundColor: '#F3F4F6' } },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 600,
          boxShadow: 'none',
          border: 'none',
          transition: 'transform 200ms, background-color 200ms',
          '&:hover':  { boxShadow: 'none', transform: 'scale(1.05)' },
          '&:active': { boxShadow: 'none', transform: 'scale(0.98)' },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': { borderWidth: '2px' },
        },
        text: {
          '&:hover':  { transform: 'none' },
          '&:active': { transform: 'none' },
        },
        sizeSmall:  { fontSize: '0.8125rem', padding: '5px 16px' },
        sizeMedium: { fontSize: '0.875rem',  padding: '8px 22px' },
        sizeLarge:  { fontSize: '0.9375rem', padding: '10px 28px', height: '48px' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none', boxShadow: 'none' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: '8px',
          backgroundImage: 'none',
          boxShadow: 'none',
          transition: 'transform 200ms',
          '&:hover': { transform: 'scale(1.02)' },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: '20px', '&:last-child': { paddingBottom: '20px' } },
      },
    },
    MuiDrawer: {
      styleOverrides: { paper: { border: 'none', backgroundImage: 'none' } },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#E5E7EB' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          transition: 'background-color 200ms, color 200ms',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '6px',
            backgroundColor: '#F3F4F6',
            '& fieldset': { borderColor: 'transparent', borderWidth: '2px' },
            '&:hover fieldset': { borderColor: '#E5E7EB', borderWidth: '2px' },
            '&.Mui-focused': { backgroundColor: '#FFFFFF' },
            '&.Mui-focused fieldset': {
              borderColor: '#3B82F6',
              borderWidth: '2px',
              boxShadow: 'none',
            },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontSize: '0.875rem', backgroundColor: '#F3F4F6' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#6B7280',
          fontWeight: 600,
          '&.Mui-focused': { color: '#3B82F6' },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#6B7280',
          '&.Mui-focused': { color: '#3B82F6' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.75rem',
          border: 'none',
        },
        colorDefault: { backgroundColor: '#F3F4F6' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          border: 'none',
          fontSize: '0.875rem',
          boxShadow: 'none',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            fontSize: '0.6875rem',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: '#6B7280',
            backgroundColor: '#F3F4F6',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: '#E5E7EB', fontSize: '0.875rem' } },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: '#F9FAFB' } },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          borderRadius: '6px',
          padding: '5px 10px',
          backgroundColor: '#111827',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: '8px', border: 'none', boxShadow: 'none' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: '"Outfit", system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.125rem',
          paddingBottom: '8px',
        },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: '#3B82F6' } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          '&.Mui-selected': { color: '#3B82F6', fontWeight: 700 },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontFamily: '"Outfit", system-ui, sans-serif',
          fontWeight: 700,
          border: 'none',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: '9999px', backgroundColor: '#E5E7EB' },
        bar:  { borderRadius: '9999px' },
      },
    },
  },
})
