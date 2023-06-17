//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "./IStakingRewards.sol";

interface IRewardPool is IStakingRewards {
    function owner() external view returns (address);

    function manager() external view returns (address);
}
