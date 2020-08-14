import { ethers } from "ethers";
import { getEthersContracts, CONSTANTS } from "@shortdai/smart-contracts";

import { getSettings } from "./src/settings";
import { askQuestion } from "./src/utils";
import * as logging from "./src/logging";

const { CONTRACT_ADDRESSES, ERC20_ADDRESSES, ERC20_DECIMALS } = CONSTANTS;
const {
  OPEN_SHORT_DAI_RATIO,
  CLOSE_SHORT_DAI_RATIO,
  CDP_ID,
  NETWORK,
  RPC_URL,
  PRIVATE_KEY,
  SHORT_DAI_LEVERAGE,
} = getSettings();

const network = NETWORK;
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const {
  IERC20,
  IDSProxy,
  ICurveFiCurve,
  OpenShortDAI,
  CloseShortDAI,
  ShortDAIActions,
  IDssCdpManager,
  IProxyRegistry,
  VatLike,
} = getEthersContracts(network, wallet);

// Use sUSD pool because less gasPrice
const ICurvePool = ICurveFiCurve.attach(CONTRACT_ADDRESSES.CurveFiSUSDv2);
const USDC = IERC20.attach(ERC20_ADDRESSES.USDC);
const DAI = IERC20.attach(ERC20_ADDRESSES.DAI);

// Some constants
const SZABO = ethers.BigNumber.from(Math.pow(10, 6));

// Setups proxy account
const setupProxy = async (): Promise<ethers.Contract> => {
  let proxyAddress = await IProxyRegistry.proxies(wallet.address);
  if (proxyAddress === ethers.constants.AddressZero) {
    logging.warn(`No proxy found, creating one...`);

    await IProxyRegistry["build(address)"](wallet.address);
    proxyAddress = await IProxyRegistry.proxies(wallet.address);
  }
  logging.info(`Proxy address found ${proxyAddress}`);

  return IDSProxy.attach(proxyAddress);
};

// Setups CDP
const setupCdp = async (proxy: ethers.Contract): Promise<number> => {
  // Only short via USDC
  const usdcAIlk = "USDC-A";

  let cdpId = CDP_ID;
  if (cdpId === 0) {
    logging.warn(`Env CDP_ID is set to 0, a new USDC-A CDP will be created.`);

    const answer = await askQuestion(`A new CDP will be created (y/n): `);
    if (answer.toLowerCase() !== "y") {
      logging.critical(`User rejected automated CDP creation. Exiting...`);
      process.exit(0);
    }

    await IDssCdpManager.open(
      ethers.utils.formatBytes32String(usdcAIlk),
      proxy.address
    );

    const cdpIdBN = await IDssCdpManager.last(proxy.address);
    cdpId = parseInt(cdpIdBN.toString());

    logging.success(`New CDP created, CDP_ID: ${cdpId}`);
  } else {
    const ilkRaw = await IDssCdpManager.ilks(cdpId);
    const ilk = ethers.utils.parseBytes32String(ilkRaw);

    // Is this a right type of vault
    if (ilk !== usdcAIlk) {
      logging.critical(
        `Supplied CDP_ID ${cdpId} has an ilk of ${ilk}, only accept ${usdcAIlk}`
      );
      process.exit(0);
    }

    const owner = await IDssCdpManager.owns(cdpId);
    const cdpCan = await IDssCdpManager.cdpCan(owner, cdpId, proxy.address);
    if (!cdpCan) {
      logging.critical(
        `User ${proxy.address} has no permissions for CDP_ID ${cdpId}`
      );
      process.exit(0);
    }
  }

  return cdpId;
};

// Gets stablecoin swap
// i.e. 1 DAI = X USDC
const getDaiUsdcRatio = async (
  hasOpenPosition: boolean,
  supplied18: ethers.BigNumber // How much user supplied in 18 decimals
): Promise<number> => {
  // If we have an option position, we would like to
  // check w/ amount of USDC in our vault
  let usdcAmountWei;

  if (hasOpenPosition) {
    // Vault returns in 18 decimals
    // USDC is 6 decimals
    // Divide by 10^12
    usdcAmountWei = supplied18.div(
      ethers.utils.parseUnits("1", 18 - ERC20_DECIMALS.USDC)
    );
  } else {
    // Balance of user's address, not proxy
    usdcAmountWei = await USDC.balanceOf(wallet.address);
  }

  // If < 10^6
  if (usdcAmountWei.lt(SZABO)) {
    usdcAmountWei = SZABO;
  }

  // Get ratio between USDC and DAI
  // DAI = 0 index, USDC = 1 index
  const daiReturnAmountWei = await ICurvePool[
    "get_dy_underlying(int128,int128,uint256)"
  ](1, 0, usdcAmountWei);

  // Note: USDC is 6 decimals, DAI is 18 decimals
  const usdcAmount = ethers.utils.formatUnits(
    usdcAmountWei,
    ERC20_DECIMALS.USDC
  );

  const daiReturned = ethers.utils.formatUnits(
    daiReturnAmountWei,
    ERC20_DECIMALS.DAI
  );

  const daiUsdcRatio = parseFloat(usdcAmount) / parseFloat(daiReturned);

  logging.info(
    `${usdcAmount} USDC <-> ${daiReturned} DAI, DAI/USDC = ${daiUsdcRatio}`
  );
  return daiUsdcRatio;
};

// Do we have an open position
const getHasOpenPosition = async (
  borrowed18: ethers.BigNumber, // Borrowed amount in 18 decimals
  supplied18: ethers.BigNumber
): Promise<boolean> => {
  // Our position is open if we have debt in it
  const borrowed = ethers.utils.formatEther(borrowed18);
  const supplied = ethers.utils.formatEther(supplied18);

  if (parseInt(borrowed, 10) > 0) {
    logging.info(`Vault is currently shorting DAI`);
    logging.info(`DAI borrowed: ${borrowed}, USDC supplied: ${supplied}`);
    return true;
  }

  logging.info(`Vault is currently NOT shorting DAI`);
  return false;
};

// Opens a position
const openShortDAIPosition = async (proxy: ethers.Contract, cdpId: number) => {
  logging.notset(`Attempting to open short DAI position.`);

  const initialUsdcMargin = await USDC.balanceOf(wallet.address);

  if (initialUsdcMargin.lt(SZABO)) {
    logging.critical(
      `Can't open short position with ${ethers.utils.formatUnits(
        initialUsdcMargin,
        ERC20_DECIMALS.USDC
      )} USDC`
    );
    logging.critical(`Please fund some USDC to address ${wallet.address}`);
    process.exit(0);
  }

  const proxyAllowance = await USDC.allowance(wallet.address, proxy.address);

  if (proxyAllowance.lt(initialUsdcMargin)) {
    logging.info(
      `Approving proxy ${proxy.address} to spend user ${wallet.address} USDC`
    );
    await USDC.approve(proxy.address, ethers.constants.MaxUint256);
  }

  // Assume 1 DAI = 1 USDC and leverage them
  const flashloanDaiAmount = initialUsdcMargin
    .mul(ethers.utils.parseUnits("1", 12))
    .mul(ethers.BigNumber.from(SHORT_DAI_LEVERAGE));

  const openCalldata = ShortDAIActions.interface.encodeFunctionData(
    "flashloanAndOpen",
    [
      OpenShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      cdpId,
      initialUsdcMargin,
      flashloanDaiAmount,
    ]
  );

  const tx = await proxy["execute(address,bytes)"](
    ShortDAIActions.address,
    openCalldata,
    { gasLimit: 1000000 }
  );
  const txRecp = await tx.wait();

  // Readable amount
  const daiAmount = ethers.utils.formatUnits(
    flashloanDaiAmount,
    ERC20_DECIMALS.DAI
  );
  const usdcAmount = ethers.utils.formatUnits(
    initialUsdcMargin,
    ERC20_DECIMALS.USDC
  );

  logging.success(
    `Succesfully opened short DAI position with ${usdcAmount} USDC and ${daiAmount} DAI at ${txRecp.transactionHash}`
  );
};

// Closes a position
const closeShortDAIPosition = async (proxy: ethers.Contract, cdpId: number) => {
  logging.notset(`Attempting to close short DAI position.`);

  const closeCalldata = ShortDAIActions.interface.encodeFunctionData(
    "flashloanAndClose",
    [
      CloseShortDAI.address,
      CONTRACT_ADDRESSES.ISoloMargin,
      CONTRACT_ADDRESSES.CurveFiSUSDv2,
      cdpId,
    ]
  );

  const tx = await proxy["execute(address,bytes)"](
    ShortDAIActions.address,
    closeCalldata,
    { gasLimit: 1000000 }
  );
  const txRecp = await tx.wait();

  logging.success(`Succesfully closed short DAI position at txHash ${txRecp.hash}`);
};

// Gets vault stats
const getVaultStates = async (
  cdpId: number
): Promise<{
  borrowed: ethers.BigNumber;
  supplied: ethers.BigNumber;
}> => {
  const vat = await IDssCdpManager.vat();
  const urn = await IDssCdpManager.urns(cdpId);
  const ilk = await IDssCdpManager.ilks(cdpId);
  const owner = await IDssCdpManager.owns(cdpId);

  const IVatLike = VatLike.attach(vat);

  const [_, rate] = await IVatLike.ilks(ilk);
  const [supplied, art] = await IVatLike.urns(ilk, urn);
  const dai = await IVatLike.dai(owner);

  const RAY = ethers.utils.parseUnits("1", 27);
  const rad = art.mul(rate).sub(dai);
  const wad = rad.div(RAY);

  const borrowed = wad.mul(RAY).lt(rad)
    ? wad.add(ethers.BigNumber.from(1))
    : wad;

  return {
    borrowed,
    supplied,
  };
};

// Bot logic
const runBot = async (proxy: ethers.Contract, cdpId: number) => {
  // Get vault stats
  const { borrowed, supplied } = await getVaultStates(cdpId);

  // Do we have an open position?
  const hasOpenPosition = await getHasOpenPosition(borrowed, supplied);

  // Whats the DAI <> USDC ratio
  const daiUsdcRatio = await getDaiUsdcRatio(
    hasOpenPosition,
    supplied as ethers.BigNumber
  );

  // Open position if we don't have one and if DAI is trading at a premium
  if (!hasOpenPosition && daiUsdcRatio >= OPEN_SHORT_DAI_RATIO) {
    await openShortDAIPosition(proxy, cdpId);
  }

  // Close position if we have one and if DAI is almost back to peg
  else if (hasOpenPosition && daiUsdcRatio <= CLOSE_SHORT_DAI_RATIO) {
    await closeShortDAIPosition(proxy, cdpId);
  }

  // Nothing
  else {
    if (hasOpenPosition) {
      logging.notset(`Vault ${cdpId} is currently shorting DAI`);
      logging.notset(
        `DAI borrowed: ${ethers.utils.formatEther(
          borrowed
        )}, USDC supplied: ${ethers.utils.formatEther(supplied)}`
      );
    } else {
      const usdcBalanceWei = await USDC.balanceOf(wallet.address);
      const usdcBalance = ethers.utils.formatUnits(
        usdcBalanceWei,
        ERC20_DECIMALS.USDC
      );

      const daiBalanceWei = await DAI.balanceOf(wallet.address);
      const daiBalance = ethers.utils.formatUnits(
        daiBalanceWei,
        ERC20_DECIMALS.DAI
      );

      logging.notset(`Vault ${cdpId} is not shorting DAI`);
      logging.notset(
        `USDC Balance: ${usdcBalance}, DAI Balance: ${daiBalance}`
      );
    }
  }
};

const main = async () => {
  // Get proxy + last cdpId
  const proxy = await setupProxy();
  const cdpId = await setupCdp(proxy);

  // Use sUSDv2 by default
  logging.info(
    `Using Curve contract ${ICurvePool.address} for stablecoin swaps`
  );

  // Event listener, listens every block
  provider.on("block", (blockNumber) => {
    logging.notset(`-----------------------------------------------`);
    logging.notset(`Executing bot on block ${blockNumber}`);

    runBot(proxy, cdpId).then(() =>
      logging.success(`runBot success for block ${blockNumber}`)
    );
    // .catch((err) =>
    //   logging.critical(
    //     `runBot errored ${err.toString()} at block ${blockNumber}`
    //   )
    // );
  });
};

main();
