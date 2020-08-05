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

contract OpenShortDAI is ICallee, DydxFlashloanBase, DssActionsBase {
    // LeveragedShortDAI Params
    struct OSDParams {
        address sender;
        uint256 repayAmount; // Amount of USDC needed to repay flashloan
        uint256 cdpId; // CDP Id to leverage
        uint256 initialMargin; // Initial amount of USD
        uint256 flashloanAmount; // Amount of USDC flashloaned
        uint256 borrowAmount; // Amount of DAI to borrow
        address curvePool;
    }

    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public override {
        OSDParams memory osdp = abi.decode(data, (OSDParams));

        // Amount of USDC to locked up
        uint256 lockUpAmount = osdp.initialMargin.add(osdp.flashloanAmount);

        // Locks up USDC and borrows DAI
        _lockGemAndDraw(osdp.cdpId, lockUpAmount, osdp.borrowAmount);

        // Converts DAI to USDC on CurveFi
        // DAI = 0 index, USDC = 1 index
        require(
            IERC20(Constants.DAI).approve(osdp.curvePool, osdp.borrowAmount),
            "erc20-approve-curvepool-failed"
        );

        uint256 swappedUsdcAmount = ICurveFiCurve(osdp.curvePool)
            .get_dy_underlying(int128(0), int128(1), osdp.borrowAmount);
        swappedUsdcAmount = swappedUsdcAmount.sub(1); // Not sure why but w/e
        ICurveFiCurve(osdp.curvePool).exchange_underlying(
            int128(0),
            int128(1),
            osdp.borrowAmount,
            swappedUsdcAmount
        );

        // Refunds msg sender
        uint256 senderRefundAmount = swappedUsdcAmount.sub(osdp.repayAmount);
        require(
            IERC20(Constants.USDC).transfer(osdp.sender, senderRefundAmount),
            "refund-sender-failed"
        );
    }

    function flashloanAndShort(
        address _sender,
        address _solo,
        address _curvePool,
        uint256 _flashloanAmount,
        uint256 _cdpId,
        uint256 _initialMargin,
        uint256 _borrowAmount
    ) external {
        ISoloMargin solo = ISoloMargin(_solo);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(_solo, Constants.USDC);

        // Calculate repay amount (_flashloanAmount + (2 wei))
        // Approve transfer from
        uint256 repayAmount = _flashloanAmount.add(
            _getRepaymentAmount(_flashloanAmount)
        );
        IERC20(Constants.USDC).approve(_solo, repayAmount);

        // 1. Withdraw $
        // 2. Call callFunction(...)
        // 3. Deposit back $
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _flashloanAmount);
        operations[1] = _getCallAction(
            // Encode OSDParams for callFunction
            abi.encode(
                OSDParams({
                    borrowAmount: _borrowAmount,
                    initialMargin: _initialMargin,
                    flashloanAmount: _flashloanAmount,
                    repayAmount: repayAmount,
                    cdpId: _cdpId,
                    sender: _sender,
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

contract OpenShortDAIActions {
    using SafeMath for uint256;

    function _openUSDCACdp() internal returns (uint256) {
        return
            IDssCdpManager(Constants.CDP_MANAGER).open(
                bytes32("USDC-A"),
                address(this)
            );
    }

    // Entry point for proxy contracts
    function flashloanAndShort(
        address _lsd,
        address _solo,
        address _curvePool,
        uint256 _initialMargin, // Initial amount of USDC
        uint256 _flashloanAmount, // Amount of USDC to flashloan
        uint256 _borrowAmount, // Amount of DAI to Borrow
        uint256 _cdpId // Set 0 for new vault
    ) external {
        // Tries and get USDC from msg.sender to proxy
        require(
            IERC20(Constants.USDC).transferFrom(
                msg.sender,
                address(this),
                _initialMargin
            ),
            "initial-margin-transferFrom-failed"
        );

        uint256 cdpId = _cdpId;

        // Opens a new USDC vault for the user if unspecified
        if (cdpId == 0) {
            cdpId = _openUSDCACdp();
        }

        // Allows LSD contract to manage vault on behalf of user
        IDssCdpManager(Constants.CDP_MANAGER).cdpAllow(cdpId, _lsd, 1);

        // Transfers the initial margin (in USDC) to lsd contract
        require(
            IERC20(Constants.USDC).transfer(_lsd, _initialMargin),
            "initial-margin-transfer-failed"
        );
        // Flashloan and shorts DAI
        OpenShortDAI(_lsd).flashloanAndShort(
            msg.sender,
            _solo,
            _curvePool,
            _flashloanAmount,
            cdpId,
            _initialMargin,
            _borrowAmount
        );

        // Forbids LSD contract to manage vault on behalf of user
        IDssCdpManager(Constants.CDP_MANAGER).cdpAllow(cdpId, _lsd, 0);
    }
}
