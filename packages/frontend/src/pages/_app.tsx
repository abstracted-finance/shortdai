import { createMuiTheme, CssBaseline, ThemeProvider } from "@material-ui/core";
import { AppProps } from "next/app";
import Head from "next/head";

import ContractsContainer from "../containers/use-contracts";
import Web3Container from "../containers/use-web3";
import ProxyContainer from "../containers/use-proxy";
import UsdcContainer from "../containers/use-usdc";
import ShortDaiStateContainer from "../containers/use-shortdai-state";
import OpenShortContainer from "../containers/use-open-short";
import CdpsContainer from "../containers/use-cdps";

const defaultTheme = createMuiTheme({ palette: { type: "dark" } });
const theme = createMuiTheme({
  palette: {
    type: "dark",
    primary: {
      main: "#2e7d32",
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
      contained: {
        boxShadow: defaultTheme.shadows[0],
        "&:hover, &:active": {
          boxShadow: defaultTheme.shadows[0],
        },
      },
      containedSizeLarge: {
        height: 65,
      },
      containedSecondary: {
        "&> span": {
          letterSpacing: 5,
          fontWeight: "bold",
        },
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
      },
    },
  },
});

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <Web3Container.Provider>
          <ContractsContainer.Provider>
            <ProxyContainer.Provider>
              <UsdcContainer.Provider>
                <CdpsContainer.Provider>
                  <ShortDaiStateContainer.Provider>
                    <OpenShortContainer.Provider>
                      <Head>
                        <meta
                          name="theme-color"
                          content={theme.palette.primary.main}
                        />
                        <meta
                          name="description"
                          content="DAI trading at a premium? Open a short position. DAI back to peg? Close short position."
                        />
                        <link rel="shortcut icon" href="/favicon.ico" />
                        <meta
                          name="viewport"
                          content="width=device-width, initial-scale=1.0"
                        />
                        <title>Short DAI</title>
                      </Head>

                      <Component {...pageProps} />
                    </OpenShortContainer.Provider>
                  </ShortDaiStateContainer.Provider>
                </CdpsContainer.Provider>
              </UsdcContainer.Provider>
            </ProxyContainer.Provider>
          </ContractsContainer.Provider>
        </Web3Container.Provider>
      </CssBaseline>
    </ThemeProvider>
  );
}

export default App;
