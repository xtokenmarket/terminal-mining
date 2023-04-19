//SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "../TimeLock.sol";

interface INonRewardPool {
    function depositFromStrategy(
        uint256 amount0,
        uint256 amount1
    ) external returns (uint256);

    function withdrawToStrategy(
        uint256 amount,
        uint256 minReceivedAmount0,
        uint256 minReceivedAmount1
    ) external returns (uint256, uint256);

    function collectToStrategy() external returns (uint256, uint256);

    function token0() external view returns(IERC20);
    
    function token1() external view returns(IERC20);

    function calculatePoolMintedAmounts(uint256 amount0, uint256 amount1) external view returns(uint256, uint256);
}

contract MockStrategy is TimeLock {
    INonRewardPool nrp;
    IERC20 token0;
    IERC20 token1;

    mapping(address => uint256) nrpBals;

    constructor(address _nonRewardPool) {
        nrp = INonRewardPool(_nonRewardPool);
        token0 = nrp.token0();
        token0.approve(_nonRewardPool, type(uint256).max);
        token1 = nrp.token1();
        token1.approve(_nonRewardPool, type(uint256).max);
    }

    function deposit(
        uint256 amount0,
        uint256 amount1
    ) external notLocked(msg.sender) returns (uint256 mintedAmount) {
        lock(msg.sender);
        (uint256 amount0ToMint, uint256 amount1ToMint) = nrp.calculatePoolMintedAmounts(amount0, amount1);
        // extra frontrunning check
        require(
            amount0ToMint >= (amount0 * 99 / 100) &&
                amount1ToMint >= (amount1 * 99 / 100),
            "Price slippage check"
        );
        token0.transferFrom(msg.sender, address(this), amount0ToMint);
        token1.transferFrom(msg.sender, address(this), amount1ToMint);
        mintedAmount = nrp.depositFromStrategy(amount0ToMint, amount1ToMint);
        nrpBals[msg.sender] += mintedAmount;
    }

    function withdraw(
        uint256 amount,
        uint256 minReceivedAmount0,
        uint256 minReceivedAmount1
    ) external notLocked(msg.sender) returns (uint256 unstakedAmount0, uint256 unstakedAmount1) {
        lock(msg.sender);
        (unstakedAmount0, unstakedAmount1) = nrp.withdrawToStrategy(
            amount,
            minReceivedAmount0,
            minReceivedAmount1
        );
        nrpBals[msg.sender] -= amount;
        token0.transfer(msg.sender, unstakedAmount0);
        token1.transfer(msg.sender, unstakedAmount1);
    }

    function collect() external returns (uint256 collected0, uint256 collected1) {
        (collected0, collected1) = nrp.collectToStrategy();
    }

    function getBal(address user) public view returns(uint256) {
        return nrpBals[user];
    }
}
