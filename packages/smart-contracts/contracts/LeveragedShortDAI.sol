// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "./dydx/DydxFlashloanBase.sol";
import "./dydx/IDydx.sol";

// Note: Only allows USDC Leveraging (Short DAI)
//       USDC leveraging on existing vaults OR on create new vaults and leverage them

// New vault
// 2. Store USDC into vault
// 3. Borrow DAI from vault
// 4. Convert DAI to USDC on Curve

contract LeveragedShortDAI is ICallee, DydxFlashloanBase {
    // LeveragedShortDAI Params
    struct LSDParams {
        address msgSender;
        address token;
        uint256 repayAmount;
        uint256 cdpId;
    }

    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public override {
        LSDParams memory lsdp = abi.decode(data, (LSDParams));

        uint256 balOfLoanedToken = IERC20(lsdp.token).balanceOf(address(this));

        // Note that you can ignore the line below
        // if your dydx account (this contract in this case)
        // has deposited at least ~2 Wei of assets into the account
        // to balance out the collaterization ratio
        require(
            balOfLoanedToken >= lsdp.repayAmount,
            "Not enough funds to repay dydx loan!"
        );

        // TODO: Encode your logic here
        // E.g. arbitrage, liquidate accounts, etc
        // revert("Hello, you haven't encoded your logic");
    }

    function flashloanAndShort(
        address _solo,
        address _token,
        uint256 _amount,
        uint256 _cdpId // Set 0 for new vault
    ) external {
        ISoloMargin solo = ISoloMargin(_solo);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(_solo, _token);

        // Calculate repay amount (_amount + (2 wei))
        // Approve transfer from
        uint256 repayAmount = _amount.add(_getRepaymentAmount(_amount));
        IERC20(_token).approve(_solo, repayAmount);

        // 1. Withdraw $
        // 2. Call callFunction(...)
        // 3. Deposit back $
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _amount);
        operations[1] = _getCallAction(
            // Encode LSDParams for callFunction
            abi.encode(
                LSDParams({
                    msgSender: msg.sender,
                    token: _token,
                    repayAmount: repayAmount,
                    cdpId: _cdpId
                })
            )
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);
    }
}

contract LeveragedShortDAIActions {
    function flashloanAndShort(
        address _lsd,
        address _solo,
        address _token,
        uint256 _amount,
        uint256 _cdpId // Set 0 for new vault
    ) external {
        LeveragedShortDAI(_lsd).flashloanAndShort(
            _solo,
            _token,
            _amount,
            _cdpId
        );
    }
}
