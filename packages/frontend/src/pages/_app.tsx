import { CssBaseline, ThemeProvider } from "@material-ui/core";
import { AppProps } from "next/app";
import Head from "next/head";

import ContractsContainer from "../containers/use-contracts";
import Web3Container from "../containers/use-web3";
import ProxyContainer from "../containers/use-proxy";
import UsdcContainer from "../containers/use-usdc";
import ShortDaiStateContainer from "../containers/use-shortdai-state";
import OpenShortContainer from "../containers/use-open-short";
import CloseShortContainer from "../containers/use-close-short";
import CdpsContainer from "../containers/use-cdps";
import MakerStatsContainer from "../containers/use-maker-stats";
import SelectedCdpContainer from "../containers/use-selected-cdp";

import { theme } from "../components/theme";

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <Web3Container.Provider>
          <ContractsContainer.Provider>
            <MakerStatsContainer.Provider>
              <ProxyContainer.Provider>
                <UsdcContainer.Provider>
                  <CdpsContainer.Provider>
                    <SelectedCdpContainer.Provider>
                      <ShortDaiStateContainer.Provider>
                        <OpenShortContainer.Provider>
                          <CloseShortContainer.Provider>
                            <Head>
                              <meta
                                name="description"
                                content="DAI trading at a premium? Open a short position. DAI back to peg? Close short position."
                              />
                              <link rel="shortcut icon" href="/favicon.ico" />
                              <meta
                                name="viewport"
                                content="width=device-width, initial-scale=1.0"
                              />
                              <title>SHORT DAI</title>
                            </Head>

                            <Component {...pageProps} />
                          </CloseShortContainer.Provider>
                        </OpenShortContainer.Provider>
                      </ShortDaiStateContainer.Provider>
                    </SelectedCdpContainer.Provider>
                  </CdpsContainer.Provider>
                </UsdcContainer.Provider>
              </ProxyContainer.Provider>
            </MakerStatsContainer.Provider>
          </ContractsContainer.Provider>
        </Web3Container.Provider>
      </CssBaseline>
    </ThemeProvider>
  );
}

export default App;
