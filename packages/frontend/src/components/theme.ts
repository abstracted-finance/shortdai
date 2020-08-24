import { createMuiTheme, CssBaseline, ThemeProvider } from "@material-ui/core";

const defaultTheme = createMuiTheme({ palette: { type: "dark" } });
export const theme = createMuiTheme({
  palette: {
    type: "dark",
    primary: {
      main: "#2e7d32",
    },
    secondary: {
      main: defaultTheme.palette.error.main,
    },
    background: {
      paper: "rgb(33, 36, 41)",
    },
  },
  typography: {
    h6: {
      fontSize: "0.75rem",
      color: defaultTheme.palette.text.disabled,
    },
  },
  shape: {
    borderRadius: 15,
  },
  overrides: {
    MuiButton: {
      text: {
        paddingLeft: 14,
      },
      contained: {
        boxShadow: defaultTheme.shadows[0],
        "&:hover, &:active": {
          boxShadow: defaultTheme.shadows[0],
        },
      },
      containedSizeLarge: {
        height: 65,
      },
      outlinedSizeSmall: {
        padding: "2px 6px",
        minWidth: 0,
        borderRadius: 10,
      },
    },
    MuiInputBase: {
      input: {
        fontSize: 32,
        textOverflow: "ellipsis",
        padding: 0,
        verticalAlign: "middle",
      },
    },
  },
});
