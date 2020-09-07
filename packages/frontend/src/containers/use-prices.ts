import { createContainer } from "unstated-next";
import { useEffect, useState } from "react";

interface Prices {
  ethereum: {
    usd: Number;
  };
}

function usePrices() {
  const [prices, setPrices] = useState<null | Prices>(null);

  const getPrices = async () => {
    try {
      const gecko = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
        {
          referrer: "https://www.coingecko.com/",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "omit",
        }
      );
      const geckoData = await gecko.json();

      setPrices({
        ethereum: {
          usd: geckoData.ethereum.usd,
        },
      });
    } catch (e) {
      console.log("Failed to connect to coingecko API");
    }
  };

  useEffect(() => {
    getPrices();
    setInterval(getPrices, 300000);
  }, []);

  return {
    prices,
  };
}

export default createContainer(usePrices);
