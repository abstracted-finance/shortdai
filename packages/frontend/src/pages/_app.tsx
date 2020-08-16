import { CssBaseline, ThemeProvider } from "@material-ui/core";
import { AppProps } from "next/app";
import Head from "next/head";
import ContractsContainer from "../containers/web3/use-contracts";
import Web3Container from "../containers/web3/use-web3";
import ProxyContainer from "../containers/web3/use-proxy";
import { theme } from "./theme";

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline>
        <Web3Container.Provider>
          <ContractsContainer.Provider>
            <ProxyContainer.Provider>
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
                <title>Short DAI</title>
              </Head>

              <Component {...pageProps} />
            </ProxyContainer.Provider>
          </ContractsContainer.Provider>
        </Web3Container.Provider>
      </CssBaseline>
    </ThemeProvider>
  );
}

export default App;
