const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bnDecimal, getPriceInX96, increaseTime } = require('../../scripts/helpers');
const { deploymentFixture } = require('../fixture');

// Deposit and withdraw tests
describe('Contract: LMTerminal', async () => {
  let lmTerminal, token0, token1, rewardToken, rewardToken2, admin, user1, user2, user3;
  let rewardProgramDuration, clr, stakedToken;

  beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken } = await deploymentFixture());
        [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
        const poolPrice = await getPriceInX96(1);
        await lmTerminal.deployUniswapPool(token0.address, token1.address, 3000, poolPrice)

        rewardProgramDuration = '7257600'; // 12 week program duration
        // Deploy Pool with 1 reward token and no vesting
        await lmTerminal.deployIncentivizedPool(
            'wETH-XTK-CLR',
            { lowerTick: -600, upperTick: 600 }, 
            { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
            { fee: 3000, token0: token0.address, token1: token1.address,
                amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
            { value: lmTerminal.deploymentFee() });
        await increaseTime(300);

        const clrPoolAddress = await lmTerminal.deployedCLRPools(0);
        clr = await ethers.getContractAt('CLR', clrPoolAddress);
        const stakedTokenAddress = await clr.stakedToken();
        stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);
        const rewardTokenAmount = bnDecimal(1000000);
        // Initialize reward program
        await lmTerminal.initiateRewardsProgram(clrPoolAddress, [rewardTokenAmount], rewardProgramDuration);

        await token0.approve(clr.address, bnDecimal(100000000000));
        await token1.approve(clr.address, bnDecimal(100000000000));
        await token0.connect(user1).approve(clr.address, bnDecimal(100000000000));
        await token1.connect(user1).approve(clr.address, bnDecimal(100000000000));
  })

  describe('Liquidity provision and removal', async () => {
        it('should get receipt tokens on liquidity provision', async () => {
            let balanceBefore = await stakedToken.balanceOf(admin.address);
            let liquidityAmount = bnDecimal(10000);
            let amts = await clr.calculateAmountsMintedSingleToken(0, liquidityAmount);
            await clr.deposit(amts.amount0Minted, amts.amount1Minted);
            let balanceAfter = await stakedToken.balanceOf(admin.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
        }),

        it('should burn receipt tokens on liquidity removal', async () => {
            // mint first to receive tokens
            let liquidityAmount = bnDecimal(10000);
            let amts = await clr.calculateAmountsMintedSingleToken(0, liquidityAmount);
            await clr.connect(user1).deposit(amts.amount0Minted, amts.amount1Minted);
            // Address gets locked by blocklock, so mine a few blocks
            await increaseTime(300);

            // burn
            let balanceBefore = await stakedToken.balanceOf(user1.address);
            await clr.connect(user1).withdraw(balanceBefore, 0, 0);
            let balanceAfter = await stakedToken.balanceOf(user1.address);
            expect(balanceAfter).to.be.eq(0);
        }),

        it(`shouldn't be able to provide 0 liquidity`, async () => {
            let liquidityAmount = 0;
            await expect(clr.deposit(liquidityAmount, liquidityAmount)).to.be.reverted;
        }),

        it(`shouldn't be able to remove 0 liquidity`, async () => {
            // mint first to receive tokens
            let liquidityAmount = bnDecimal(10000);
            let amts = await clr.calculateAmountsMintedSingleToken(0, liquidityAmount);
            await clr.deposit(amts.amount0Minted, amts.amount1Minted);
            // Address gets locked by blocklock, so mine a few blocks
            await increaseTime(300);

            liquidityAmount = 0;
            await expect(clr.withdraw(liquidityAmount, 0, 0)).to.be.reverted;
        }),

        it('should be able to claim rewards', async () => {
            // mint first to receive tokens
            let liquidityAmount = bnDecimal(10000);
            let amts = await clr.calculateAmountsMintedSingleToken(0, liquidityAmount);
            await clr.deposit(amts.amount0Minted, amts.amount1Minted);
            // Address gets locked by blocklock, so mine a few blocks
            await increaseTime(300);
            // Increase time to accumulate rewards
            await increaseTime(10000);

            // claim
            let balanceBefore = await rewardToken.balanceOf(admin.address);
            await clr.claimReward();
            let balanceAfter = await rewardToken.balanceOf(admin.address);
            expect(balanceAfter).to.be.gt(balanceBefore);
        }),

        it('should be able to claim rewards and remove liquidity', async () => {
            // mint first to receive tokens
            let liquidityAmount = bnDecimal(10000);
            let amts = await clr.calculateAmountsMintedSingleToken(0, liquidityAmount);
            await clr.connect(user1).deposit(amts.amount0Minted, amts.amount1Minted);
            // Address gets locked by blocklock, so mine a few blocks
            await increaseTime(300);
            // Increase time to accumulate rewards
            await increaseTime(10000);

            let stakedBalanceBefore = await stakedToken.balanceOf(user1.address);
            let rewardBalanceBefore = await rewardToken.balanceOf(user1.address);

            // burn and claim
            await clr.connect(user1).withdrawAndClaimReward(stakedBalanceBefore, 0, 0);

            let stakedBalanceAfter = await stakedToken.balanceOf(user1.address);
            let rewardBalanceAfter = await rewardToken.balanceOf(user1.address);
            expect(rewardBalanceAfter).to.be.gt(rewardBalanceBefore);
            expect(stakedBalanceAfter).to.be.lt(stakedBalanceBefore);
        })
    })
});