const assert = require('assert');
const { expect } = require('chai');
const { increaseTime, bnDecimals, swapToken0ForToken1, swapToken1ForToken0, bnDecimal } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Management functions tests for NonRewardPool
describe('Contract: NonRewardPool', async () => {
  let lmTerminal, nonRewardPool, token0, token1, rewardToken, admin, user1, user2, user3, user4;
  let router, token0Decimals, token1Decimals

  beforeEach(async () => {
      ({ lmTerminal, token0, token1, rewardToken, nonRewardPool, stakedToken, router,
          xTokenManager, token0Decimals, token1Decimals } = 
          await deploymentFixture());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(100000, token0Decimals);
      let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
      await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
      await increaseTime(300);
  })

  describe('Rebalances', async () => {
    it('should be able to rebalance with less token 0 balance', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, mintAmount);
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await increaseTime(300);
        amts = await nonRewardPool.calculateAmountsMintedSingleToken(1, mintAmount2);
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(100000));
        await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(100000));
        await nonRewardPool.collect();
        let buffer = await nonRewardPool.getBufferTokenBalance();
        await nonRewardPool.adminSwap(buffer.amount0.div(2), true);

        buffer = await nonRewardPool.getBufferTokenBalance();
        expect(buffer.amount0).to.be.lt(buffer.amount1);
        
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to rebalance with less token 1 balance', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, mintAmount);
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await increaseTime(300);
        amts = await nonRewardPool.calculateAmountsMintedSingleToken(1, mintAmount2);
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(100000));
        await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(100000));
        await nonRewardPool.collect();
        let buffer = await nonRewardPool.getBufferTokenBalance();
        await nonRewardPool.adminSwap(buffer.amount1.div(2), false);

        buffer = await nonRewardPool.getBufferTokenBalance();
        expect(buffer.amount1).to.be.lt(buffer.amount0);

        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    })
  })
})
