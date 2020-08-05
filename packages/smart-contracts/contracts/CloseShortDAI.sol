// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "./dydx/DydxFlashloanBase.sol";
import "./dydx/IDydx.sol";

import "./maker/IDssCdpManager.sol";
import "./maker/IDssProxyActions.sol";
import "./maker/DssActionsBase.sol";

import "./curve/ICurveFiCurve.sol";

import "./Constants.sol";

contract CloseShortDAI is ICallee, DydxFlashloanBase, DssActionsBase {
    // LeveragedShortDAI Params
    struct CSDParams {
        address sender;
        uint256 repayAmount; // Amount of DAI needed to repay flashloan
        uint256 cdpId; // CDP Id to leverage
        uint256 flashloanAmount; // Amount of DAI flashloaned
        uint256 withdrawAmount; // Amount of USDC to withdraw from vault
        address curvePool;
    }

    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public override {
        CSDParams memory csdp = abi.decode(data, (CSDParams));

        // Use flashloaned DAI to repay vault and withdraw USDC
        _wipeAndFreeGem(csdp.cdpId, csdp.withdrawAmount, csdp.flashloanAmount);

        // Converts USDC to DAI on CurveFi
        // DAI = 0 index, USDC = 1 index
        require(
            IERC20(Constants.USDC).approve(csdp.curvePool, csdp.withdrawAmount),
            "erc20-approve-curvepool-failed"
        );

        uint256 swappedDaiAmount = ICurveFiCurve(csdp.curvePool)
            .get_dy_underlying(int128(1), int128(0), csdp.withdrawAmount);
        swappedDaiAmount = swappedDaiAmount.sub(1); // Not sure why but w/e
        ICurveFiCurve(csdp.curvePool).exchange_underlying(
            int128(1),
            int128(0),
            csdp.withdrawAmount,
            swappedDaiAmount
        );

        // Refunds msg sender
        uint256 senderRefundAmount = swappedDaiAmount.sub(csdp.repayAmount);
        require(
            IERC20(Constants.DAI).transfer(csdp.sender, senderRefundAmount),
            "refund-sender-failed"
        );
    }

    function flashloanAndClose(
        address _sender,
        address _solo,
        address _curvePool,
        uint256 _flashloanAmount,
        uint256 _withdrawAmount,
        uint256 _cdpId
    ) external {
        ISoloMargin solo = ISoloMargin(_solo);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(_solo, Constants.DAI);

        // Calculate repay amount (_flashloanAmount + (2 wei))
        // Approve transfer from
        uint256 repayAmount = _flashloanAmount.add(
            _getRepaymentAmount(_flashloanAmount)
        );
        IERC20(Constants.DAI).approve(_solo, repayAmount);

        // 1. Withdraw $
        // 2. Call callFunction(...)
        // 3. Deposit back $
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _flashloanAmount);
        operations[1] = _getCallAction(
            // Encode csdparams for callFunction
            abi.encode(
                CSDParams({
                    flashloanAmount: _flashloanAmount,
                    repayAmount: repayAmount,
                    cdpId: _cdpId,
                    sender: _sender,
                    withdrawAmount: _withdrawAmount,
                    curvePool: _curvePool
                })
            )
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);
    }
}

contract CloseShortDAIActions {
    using SafeMath for uint256;

    // Entry point for proxy contracts
    function flashloanAndClose(
        address _csd,
        address _solo,
        address _curvePool,
        uint256 _flashloanAmount, // Amount of DAI to flashloan (and pay)
        uint256 _withdrawAmount, // Amount of USDC to withdraw
        uint256 _cdpId // Set 0 for new vault
    ) external {
        // Allows CSD contract to manage vault on behalf of user
        IDssCdpManager(Constants.CDP_MANAGER).cdpAllow(_cdpId, _csd, 1);

        // Flashloan DAI and close USDC-A vault position
        CloseShortDAI(_csd).flashloanAndClose(
            msg.sender,
            _solo,
            _curvePool,
            _flashloanAmount,
            _withdrawAmount,
            _cdpId
        );

        // Forbids CSD contract to manage vault on behalf of user
        IDssCdpManager(Constants.CDP_MANAGER).cdpAllow(_cdpId, _csd, 0);
    }
}
