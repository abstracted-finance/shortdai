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
        uint256 cdpId; // CDP Id to leverage
        uint256 initialMargin; // Initial amount of USDC
        uint256 flashloanAmount; // Amount of DAI flashloaned
        address curvePool;
    }

    function callFunction(
        address sender,
        Account.Info memory account,
        bytes memory data
    ) public override {
        OSDParams memory osdp = abi.decode(data, (OSDParams));

        // Step 1.
        // Converts Flashloaned DAI to USDC on CurveFi
        // DAI = 0 index, USDC = 1 index
        require(
            IERC20(Constants.DAI).approve(osdp.curvePool, osdp.flashloanAmount),
            "erc20-approve-curvepool-failed"
        );

        ICurveFiCurve(osdp.curvePool).exchange_underlying(
            int128(0),
            int128(1),
            osdp.flashloanAmount,
            0
        );

        // Lock up all USDC
        uint256 supplyAmount = IERC20(Constants.USDC).balanceOf(address(this));

        uint256 borrowAmount = osdp.flashloanAmount.add(_getRepaymentAmount());

        // Locks up USDC and borrow just enough DAI to repay flashloan
        _lockGemAndDraw(osdp.cdpId, supplyAmount, borrowAmount);
    }

    function flashloanAndOpen(
        address _sender,
        address _solo,
        address _curvePool,
        uint256 _cdpId,
        uint256 _initialMargin,
        uint256 _flashloanAmount
    ) external {
        ISoloMargin solo = ISoloMargin(_solo);

        // Get marketId from token address
        uint256 marketId = _getMarketIdFromTokenAddress(_solo, Constants.DAI);

        // Calculate repay amount (_flashloanAmount + (2 wei))
        // Approve transfer from
        uint256 repayAmount = _flashloanAmount.add(_getRepaymentAmount());
        IERC20(Constants.DAI).approve(_solo, repayAmount);

        // 1. Withdraw $
        // 2. Call callFunction(...)
        // 3. Deposit back $
        Actions.ActionArgs[] memory operations = new Actions.ActionArgs[](3);

        operations[0] = _getWithdrawAction(marketId, _flashloanAmount);
        operations[1] = _getCallAction(
            // Encode OSDParams for callFunction
            abi.encode(
                OSDParams({
                    initialMargin: _initialMargin,
                    flashloanAmount: _flashloanAmount,
                    cdpId: _cdpId,
                    curvePool: _curvePool
                })
            )
        );
        operations[2] = _getDepositAction(marketId, repayAmount);

        Account.Info[] memory accountInfos = new Account.Info[](1);
        accountInfos[0] = _getAccountInfo();

        solo.operate(accountInfos, operations);

        // Refund user any ERC20 leftover
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
    function flashloanAndOpen(
        address _osd,
        address _solo,
        address _curvePool,
        uint256 _cdpId, // Set 0 for new vault
        uint256 _initialMargin, // Initial amount of USDC
        uint256 _flashloanAmount // Amount of DAI to flashloan
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
        IDssCdpManager(Constants.CDP_MANAGER).cdpAllow(cdpId, _osd, 1);

        // Transfers the initial margin (in USDC) to lsd contract
        require(
            IERC20(Constants.USDC).transfer(_osd, _initialMargin),
            "initial-margin-transfer-failed"
        );
        // Flashloan and shorts DAI
        OpenShortDAI(_osd).flashloanAndOpen(
            msg.sender,
            _solo,
            _curvePool,
            cdpId,
            _initialMargin,
            _flashloanAmount
        );

        // Forbids LSD contract to manage vault on behalf of user
        IDssCdpManager(Constants.CDP_MANAGER).cdpAllow(cdpId, _osd, 0);
    }
}
