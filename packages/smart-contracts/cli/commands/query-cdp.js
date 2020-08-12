const { ethers } = require("ethers");
const chalk = require("chalk");

const { setupContract } = require("../utils/setup");

async function queryCdp({ cdpId, host }) {
  const provider = new ethers.providers.JsonRpcProvider(host);
  const IDssCdpManager = (
    await setupContract({ name: "IDssCdpManager" })
  ).connect(provider);

  const vat = await IDssCdpManager.vat();
  const urn = await IDssCdpManager.urns(cdpId);
  const ilk = await IDssCdpManager.ilks(cdpId);
  const owner = await IDssCdpManager.owns(cdpId);

  const IVatLike = (
    await setupContract({ address: vat, name: "VatLike" })
  ).connect(provider);

  const [_, rate] = await IVatLike.ilks(ilk);
  const [supplied, art] = await IVatLike.urns(ilk, urn);
  const dai = await IVatLike.dai(owner);

  const RAY = ethers.utils.parseUnits("1", 27);
  const rad = art.mul(rate).sub(dai);
  const wad = rad.div(RAY);

  const borrowed = wad.mul(RAY).lt(rad)
    ? wad.add(ethers.BigNumber.from(1))
    : wad;

  // MCD Jug
  const IJugLike = (
    await setupContract({
      address: "0x19c0976f590D67707E62397C87829d896Dc0f1F1",
      name: "JugLike",
    })
  ).connect(provider);

  const [duty] = await IJugLike.ilks(ilk);

  const r = parseFloat(duty) / parseFloat(RAY);
  const stabilityFee = Math.pow(r, 365 * 24 * 60 * 60);


  console.log(chalk.grey(`Host: ${host}`));
  console.log(
    chalk.yellowBright(
      `---- CDP ID ${cdpId} (${ethers.utils.parseBytes32String(ilk)}) ----`
    )
  );
  console.log(`Stability fee: ${(1.0 - stabilityFee) * 100}%`);
  console.log(`Supplied: ${ethers.utils.formatEther(supplied)}`);
  console.log(`Borrowed: ${ethers.utils.formatEther(borrowed)}`);
}

module.exports = {
  queryCdp,
  cmd: (program) =>
    program
      .command("query-cdp")
      .description("Swaps tokens on 1inch")
      .requiredOption("-i, --cdpId <value>", "CDP Id to query")
      .option(
        "-h, --host <value>",
        "JsonRpcURL hostname",
        "http://localhost:8545"
      )
      .action(queryCdp),
};
