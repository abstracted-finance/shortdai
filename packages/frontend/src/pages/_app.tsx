import { CssBaseline, ThemeProvider } from "@material-ui/core";
import { AppProps } from "next/app";
import Head from "next/head";
import ContractsContainer from "../containers/web3/use-contracts";
import Web3Container from "../containers/web3/use-web3";
import { theme } from "./theme";

function App({ Component, pageProps }: AppProps) {
  return (
    <Web3Container.Provider>
      <ContractsContainer.Provider>
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

        <ThemeProvider theme={theme}>
          <CssBaseline>
            <Component {...pageProps} />
          </CssBaseline>
        </ThemeProvider>
      </ContractsContainer.Provider>
    </Web3Container.Provider>
  );
}

export default App;
