# Short DAI

Short DAI (with USDC) when DAI is trading at a premium. 0% fees.

## Description

When DAI is trading at a premium relative to USDC, it does:

1. Loan out DAI from Dydx (2 wei fee)
2. Convert DAI to USDC on Curve's sUSD pool (using sUSD pool so GAS costs are lower).
3. Combine existing USDC and converted USDC, and open a Maker Vault in USDC-A pool (0% interest as of writing).
4. Loan out DAI from Maker USDC-A pool.
5. Payback loan

When DAI is back on peg:

1. Loan out DAI from Dydx (2 wei fee)
2. Convert DAI to USDC on Curve's sUSD pool (using sUSD pool so GAS costs are lower).
3. Use existing USDC to free up DAI from Maker USDC-A Vault.
4. Payback loan
5. Retrieve USDC

## Addresses

OpenShortDAI - [0xDa61467Ecd8566c67eB6d85E248dD1a91F804C30](https://etherscan.io/address/0xDa61467Ecd8566c67eB6d85E248dD1a91F804C30)

CloseShortDAI - [0xd3522f3bEcf460DDCad3476fFc8539dD55664CEc](https://etherscan.io/address/0xd3522f3bEcf460DDCad3476fFc8539dD55664CEc)

ShortDAIActions - [0x7a241132bfBF2E3d5Ba3b6112166373B02B83892](https://etherscan.io/address/0x7a241132bfBF2E3d5Ba3b6112166373B02B83892)

VaultStats - [0x5101aE0715fC5b0fcd33c574A15D0047A8f6E1a1](https://etherscan.io/address/0x5101aE0715fC5b0fcd33c574A15D0047A8f6E1a1)