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
    struct CSDParams {
        uint256 cdpId; // CdpId to close
        address curvePool; // Which curve pool to use
        uint256 flashloanAmount; // Amount of DAI flashloaned
        uint256 withdrawAmount; // Amount of USDC to withdraw from vault
    }

    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public override {
        CSDParams memory csdp = abi.decode(data, (CSDParams));

        // Step 1.
        // Use flashloaned DAI to repay entire vault and withdraw USDC
        _wipeAll(csdp.cdpId);
        _freeGem(csdp.cdpId, csdp.withdrawAmount);

        // Step 2.
        // Converts USDC to DAI on CurveFi (To repay loan)
        // DAI = 0 index, USDC = 1 index
        require(
            IERC20(Constants.USDC).approve(csdp.curvePool, csdp.withdrawAmount),
            "erc20-approve-curvepool-failed"
        );
        ICurveFiCurve(csdp.curvePool).exchange_underlying(
            int128(1),
            int128(0),
            csdp.withdrawAmount,
            0
        );
    }

    function flashloanAndClose(
        address _sender,
        address _solo,
        address _curvePool,
        uint256 _cdpId
    ) external {
        ISoloMargin solo = ISoloMargin(_solo);

        uint256 marketId = _getMarketIdFromTokenAddress(_solo, Constants.DAI);

        //
        (
            uint256 withdrawAmount,
            uint256 flashloanAmount
        ) = _getSuppliedAndBorrow(_cdpId);

        uint256 repayAmount = flashloanAmount.add(_getRepaymentAmount());
        IERC20(Constants.DAI).approve(_solo, repayAmount);

        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, flashloanAmount);
        operations[1] = _getCallAction(
            abi.encode(
                CSDParams({
                    flashloanAmount: flashloanAmount,
                    withdrawAmount: withdrawAmount,
                    cdpId: _cdpId,
                    curvePool: _curvePool
                })
            )
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);

        // Refund leftovers
        IERC20(Constants.DAI).transfer(
            _sender,
            IERC20(Constants.DAI).balanceOf(address(this))
        );
        IERC20(Constants.USDC).transfer(
            _sender,
            IERC20(Constants.USDC).balanceOf(address(this))
        );
    }
}
