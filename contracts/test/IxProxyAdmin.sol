//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

interface IxProxyAdmin {
    /**
     * @dev Upgrade proxy to a new implementation
     */
    function upgrade(address proxy, address impl) external;
}
