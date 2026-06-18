import { createTheme } from "@mui/material/styles"

export const muiTheme = createTheme({
  palette: {
    primary: {
      main:         "#F5853F",
      dark:         "#D96B20",
      light:        "#FBAE6B",
      contrastText: "#FFFFFF",
    },
    secondary: {
      main:         "#000022",
      contrastText: "#FFFFFF",
    },
    error:   { main: "#EF4444" },
    success: { main: "#22C55E" },
    warning: { main: "#F59E0B" },
    info:    { main: "#2DD4BF" },
    background: {
      default: "#F5F5F9",
      paper:   "#FFFFFF",
    },
    text: {
      primary:   "#130303",
      secondary: "#858382",
    },
    divider: "#E8E4DF",
    action: {
      hover:    "rgba(245,133,63,0.06)",
      selected: "rgba(245,133,63,0.10)",
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Plus Jakarta Sans","Segoe UI","Helvetica Neue",Arial,sans-serif',
    h1: { fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 800 },
    h2: { fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 800 },
    h3: { fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700 },
    h5: { fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700 },
    h6: { fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700 },
    subtitle1: { fontWeight: 600, letterSpacing: "-0.01em" },
    subtitle2: { fontWeight: 600, letterSpacing: "-0.01em" },
    body1:  { fontSize: "0.9375rem", letterSpacing: "-0.01em" },
    body2:  { fontSize: "0.8125rem", letterSpacing: "-0.01em" },
    caption: { fontSize: "0.6875rem", letterSpacing: "0.04em" },
    button:  { textTransform: "none", fontWeight: 600, letterSpacing: "-0.01em" },
    overline: { fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.15em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { backgroundColor: "#F5F5F9" } },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          "&:hover":  { boxShadow: "none" },
          "&:active": { boxShadow: "none" },
        },
        sizeSmall:  { fontSize: "0.8125rem",  padding: "5px 14px" },
        sizeMedium: { fontSize: "0.875rem",   padding: "8px 20px" },
        sizeLarge:  { fontSize: "0.9375rem",  padding: "10px 28px" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: "1px solid #E8E4DF", borderRadius: 0, backgroundImage: "none" },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: "20px", "&:last-child": { paddingBottom: "20px" } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root:       { backgroundImage: "none" },
        rounded:    { borderRadius: 0 },
        elevation1: { boxShadow: "0 1px 4px rgba(0,0,34,0.06)" },
        elevation2: { boxShadow: "0 2px 8px rgba(0,0,34,0.08)" },
        elevation3: { boxShadow: "0 4px 16px rgba(0,0,34,0.10)" },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { border: "none", backgroundImage: "none" },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: "#E8E4DF" } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "background-color 0.15s ease, color 0.15s ease",
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            "& fieldset":       { borderColor: "#E8E4DF" },
            "&:hover fieldset": { borderColor: "#F5853F" },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: { root: { fontSize: "0.875rem" } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600, fontSize: "0.75rem" },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 700,
            fontSize: "0.6875rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#858382",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: "#E8E4DF", fontSize: "0.875rem" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: "0.75rem", borderRadius: 6, padding: "5px 10px" },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontSize: "0.875rem" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 0, border: "1px solid #E8E4DF" },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700, fontSize: "1rem", paddingBottom: 8 } },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          letterSpacing: "-0.01em",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { fontFamily: '"Plus Jakarta Sans",sans-serif', fontWeight: 700 },
      },
    },
  },
})
