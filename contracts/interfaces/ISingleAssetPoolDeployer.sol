//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

interface ISingleAssetPoolDeployer {
    function singleAssetPoolImplementation() external view returns (address);

    function deploySingleAssetPool(address _proxyAdmin)
        external
        returns (address pool);

    function setSingleAssetPoolImplementation(address _poolImplementation)
        external;
}
