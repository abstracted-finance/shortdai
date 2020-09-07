# Short DAI

---

| Package         |                                                                  Status                                                                   |
| --------------- | :---------------------------------------------------------------------------------------------------------------------------------------: |
| smart-contracts | [![CircleCI](https://circleci.com/gh/abstracted-finance/shortdai.svg?style=svg)](https://circleci.com/gh/abstracted-finance/shortdai) |


---

- [Frontend 1](http://shortdai.com/)
- [Frontend 2](https://shortdai.netlify.app/).

---

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

OpenShortDAI - [0x13B70f58f8e7Fce3811401fF65D2dF33AD5DC61D](https://etherscan.io/address/0x13B70f58f8e7Fce3811401fF65D2dF33AD5DC61D)

CloseShortDAI - [0x41624F34142C181BD3BeDd95867b62Ac94b4C265](https://etherscan.io/address/0x41624F34142C181BD3BeDd95867b62Ac94b4C265)

ShortDAIActions - [0x0728e0023699186D5693Bb8e7e762B9972B3852E](https://etherscan.io/address/0x0728e0023699186D5693Bb8e7e762B9972B3852E)

VaultStats - [0x5101aE0715fC5b0fcd33c574A15D0047A8f6E1a1](https://etherscan.io/address/0x5101aE0715fC5b0fcd33c574A15D0047A8f6E1a1)