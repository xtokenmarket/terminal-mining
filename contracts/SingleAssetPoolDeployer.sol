// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.7.6;

import "./proxies/SingleAssetPoolProxy.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * Manages deployment of staking pool Proxies
 * Deploys proxies pointing to staking pool implementation
 */
contract SingleAssetPoolDeployer is Ownable {
    address public singleAssetPoolImplementation;

    constructor(address _singleAssetPoolImplementation) {
        singleAssetPoolImplementation = _singleAssetPoolImplementation;
        emit SingleAssetPoolImplementationSet(_singleAssetPoolImplementation);
    }

    function deploySingleAssetPool(address _proxyAdmin)
        external
        returns (address pool)
    {
        SingleAssetPoolProxy poolInstance = new SingleAssetPoolProxy(
            singleAssetPoolImplementation,
            _proxyAdmin,
            address(this)
        );
        return address(poolInstance);
    }

    function setSingleAssetPoolImplementation(address _poolImplementation)
        external
        onlyOwner
    {
        singleAssetPoolImplementation = _poolImplementation;
        emit SingleAssetPoolImplementationSet(_poolImplementation);
    }

    // Events
    event SingleAssetPoolImplementationSet(address indexed poolImplementation);
}
