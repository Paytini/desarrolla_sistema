import { createTheme } from "@mui/material/styles"

export const muiTheme = createTheme({
  palette: {
    primary:    { main: '#F5853F', dark: '#D96B20', light: '#FBAE6B', contrastText: '#FFFFFF' },
    secondary:  { main: '#8B5CF6', dark: '#6D28D9', light: '#A78BFA', contrastText: '#FFFFFF' },
    error:      { main: '#EF4444' },
    success:    { main: '#34D399' },
    warning:    { main: '#FBBF24' },
    info:       { main: '#F472B6' },
    background: { default: '#FFFDF5', paper: '#FFFFFF' },
    text:       { primary: '#1E293B', secondary: '#64748B' },
    divider:    '#E2E8F0',
    action:     { hover: 'rgba(139,92,246,0.06)', selected: 'rgba(139,92,246,0.10)' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'var(--font-plus-jakarta-sans, "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif)',
    h1: { fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)', fontWeight: 800, fontSize: '1.75rem', lineHeight: 1.2 },
    h2: { fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)', fontWeight: 700, fontSize: '1.375rem', lineHeight: 1.25 },
    h3: { fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)', fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.3 },
    h4: { fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)', fontWeight: 700, fontSize: '1rem', lineHeight: 1.35 },
    h5: { fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)', fontWeight: 700, fontSize: '0.9rem' },
    h6: { fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)', fontWeight: 700, fontSize: '0.875rem' },
    subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 600, letterSpacing: '-0.01em' },
    body1:    { fontSize: '0.9375rem', letterSpacing: '-0.01em' },
    body2:    { fontSize: '0.8125rem', letterSpacing: '-0.01em' },
    caption:  { fontSize: '0.6875rem', letterSpacing: '0.04em' },
    button:   { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
    overline: { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { backgroundColor: '#FFFDF5' } },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontWeight: 700,
          boxShadow: 'none',
          border: '2px solid #1E293B',
          transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms cubic-bezier(0.34,1.56,0.64,1)',
          '&:hover':  { boxShadow: 'none', transform: 'translate(-2px,-2px)' },
          '&:active': { boxShadow: 'none', transform: 'translate(2px,2px)' },
        },
        contained: {
          boxShadow: '4px 4px 0px 0px #1E293B',
          '&:hover':  { boxShadow: '6px 6px 0px 0px #1E293B' },
          '&:active': { boxShadow: '2px 2px 0px 0px #1E293B' },
        },
        outlined: {
          backgroundColor: 'transparent',
          borderColor: '#1E293B',
          color: '#1E293B',
          '&:hover': { backgroundColor: '#FBBF24', borderColor: '#1E293B' },
        },
        text: {
          border: 'none',
          '&:hover': { backgroundColor: 'rgba(139,92,246,0.08)', transform: 'none' },
          '&:active': { transform: 'none' },
        },
        sizeSmall:  { fontSize: '0.8125rem', padding: '5px 16px' },
        sizeMedium: { fontSize: '0.875rem',  padding: '8px 22px' },
        sizeLarge:  { fontSize: '0.9375rem', padding: '10px 28px' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root:    { backgroundImage: 'none' },
        rounded: { borderRadius: '16px' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '2px solid #1E293B',
          borderRadius: '16px',
          backgroundImage: 'none',
          boxShadow: '5px 5px 0px 0px #1E293B',
          transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms cubic-bezier(0.34,1.56,0.64,1)',
          '&:hover': { transform: 'rotate(-0.5deg) scale(1.01)', boxShadow: '7px 7px 0px 0px #1E293B' },
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
      styleOverrides: { root: { borderColor: '#E2E8F0' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '0 9999px 9999px 0',
          transition: 'background-color 0.15s ease, color 0.15s ease',
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': { borderColor: '#CBD5E1', borderWidth: '2px' },
            '&:hover fieldset': { borderColor: '#8B5CF6', borderWidth: '2px' },
            '&.Mui-focused fieldset': {
              borderColor: '#8B5CF6',
              borderWidth: '2px',
              boxShadow: '3px 3px 0px 0px #8B5CF6',
            },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: { root: { fontSize: '0.875rem' } },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.75rem',
          border: '2px solid #1E293B',
        },
        colorDefault: { backgroundColor: '#F8F4EC' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          border: '2px solid currentColor',
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
            color: '#64748B',
            backgroundColor: '#F8F4EC',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: '#E2E8F0', fontSize: '0.875rem' } },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { backgroundColor: '#FAFAF8' } },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          borderRadius: '8px',
          padding: '5px 10px',
          backgroundColor: '#1E293B',
          border: '1.5px solid #1E293B',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: '16px', border: '2px solid #1E293B', boxShadow: '8px 8px 0px 0px #1E293B' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
          fontWeight: 700,
          fontSize: '1.125rem',
          paddingBottom: '8px',
        },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: '#F5853F' } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          '&.Mui-selected': { color: '#F5853F', fontWeight: 700 },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
          fontWeight: 700,
          border: '2px solid #1E293B',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: '9999px', backgroundColor: '#E2E8F0' },
        bar:  { borderRadius: '9999px' },
      },
    },
  },
})
