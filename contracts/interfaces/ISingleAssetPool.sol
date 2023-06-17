//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma abicoder v2;

import "./IStakingRewards.sol";

interface ISingleAssetPool is IStakingRewards {
    function stake(uint256 amount) external;

    function unstake(uint256 amount) external;

    function unstakeAndClaimReward(uint256 amount) external;

    function transferOwnership(address newOwner) external;

    function initialize(
        address _stakingToken,
        address _terminal,
        StakingDetails memory stakingParams
    ) external;

    struct StakingDetails {
        address[] rewardTokens;
        address rewardEscrow;
        bool rewardsAreEscrowed;
    }
}
