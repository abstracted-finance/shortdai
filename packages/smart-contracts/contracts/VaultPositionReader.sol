// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "./maker/IDssCdpManager.sol";
import "./maker/IDssProxyActions.sol";
import "./maker/DssActionsBase.sol";

import "./curve/ICurveFiCurve.sol";

import "./Constants.sol";

contract VaultPositionReader {
    using SafeMath for uint256;

    uint256 constant RAY = 10**27;

    function getWipeAllWad(
        address vat,
        address usr,
        address urn,
        bytes32 ilk
    ) public view returns (uint256 wad) {
        // Gets actual rate from the vat
        (, uint256 rate, , , ) = VatLike(vat).ilks(ilk);
        // Gets actual art value of the urn
        (, uint256 art) = VatLike(vat).urns(ilk, urn);
        // Gets actual dai amount in the urn
        uint256 dai = VatLike(vat).dai(usr);

        uint256 rad = art.mul(rate).sub(dai);
        wad = rad / RAY;

        // If the rad precision has some dust, it will need to request for 1 extra wad wei
        wad = wad.mul(RAY) < rad ? wad + 1 : wad;
    }

    function getVaultStats(uint256 cdp)
        public
        view
        returns (uint256 duty, uint256 debt)
    {
        IDssCdpManager manager = IDssCdpManager(Constants.CDP_MANAGER);

        address vat = manager.vat();
        address urn = manager.urns(cdp);
        bytes32 ilk = manager.ilks(cdp);
        address owner = manager.owns(cdp);

        // Get global stability fee
        (duty, ) = JugLike(Constants.MCD_JUG).ilks(ilk);

        debt = getWipeAllWad(vat, owner, urn, ilk);
    }
}
