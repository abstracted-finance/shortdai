import Head from "next/head";
import { AppProps } from "next/app";
import { useState, useEffect } from "react";
import { CssBaseline, ZeitProvider, useTheme } from "@zeit-ui/react";

import ContractsContainer from "../containers/web3/use-contracts";
import Web3Container from "../containers/web3/use-web3";

function App({ Component, pageProps }: AppProps) {
  const theme = useTheme();
  const [customTheme, setCustomTheme] = useState(theme);
  const themeChangeHandler = (theme) => {
    setCustomTheme(theme);
  };

  useEffect(() => {
    const theme = window.localStorage.getItem("theme");
    if (theme !== "dark") return;
    themeChangeHandler({ type: "dark" });
  }, []);

  // Cleans DOM
  useEffect(() => {
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
  }, []);

  return (
    <ZeitProvider theme={customTheme}>
      <CssBaseline>
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
            <Component {...pageProps} />
          </ContractsContainer.Provider>
        </Web3Container.Provider>
      </CssBaseline>
    </ZeitProvider>
  );
}

export default App;
