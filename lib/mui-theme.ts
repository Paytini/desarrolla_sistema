import { createTheme } from "@mui/material/styles"

// Palette values mirror brand tokens in app/globals.css (--brand, --brand-warm, --brand-ink,
// --destructive, --background, --card, --foreground, --muted-foreground, --border).
// Keep in sync if those tokens change.

const headingFontFamily = 'var(--font-bricolage), "Bricolage Grotesque", sans-serif'

export const muiTheme = createTheme({
  palette: {
    primary: {
      main: "#F5853F",
      dark: "#D96B20",
      contrastText: "#000022",
    },
    secondary: {
      main: "#000022",
    },
    error: {
      main: "#EF4444",
    },
    background: {
      default: "#FAF8F6",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#130303",
      secondary: "#858382",
    },
    divider: "#E8E4DF",
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'var(--font-dm-sans), "DM Sans", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: headingFontFamily, fontWeight: 700 },
    h2: { fontFamily: headingFontFamily, fontWeight: 700 },
    h3: { fontFamily: headingFontFamily, fontWeight: 700 },
    h4: { fontFamily: headingFontFamily, fontWeight: 700 },
    h5: { fontFamily: headingFontFamily, fontWeight: 700 },
    h6: { fontFamily: headingFontFamily, fontWeight: 700 },
  },
})
