const assert = require('assert');
const { expect } = require('chai');
const { bnDecimal, increaseTime, bnDecimals, deployArgs, swapToken0ForToken1, swapToken1ForToken0, decreaseTime } = require('../../scripts/helpers');
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
      let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
      await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
      await increaseTime(300);
  })

  describe('Management', async () => {
    it('should be able to rebalance', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, mintAmount);
        let amounts2 = await nonRewardPool.calculateAmountsMintedSingleToken(1, mintAmount2)
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts2.amount0Minted, amounts2.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, mintAmount);
        let amounts2 = await nonRewardPool.calculateAmountsMintedSingleToken(1, mintAmount2)
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts2.amount0Minted, amounts2.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(nonRewardPool.collectAndReinvest()).not.to.be.reverted;
    }),

    it('shouldn\'t be able to rebalance if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.revertedWith('Rebalance amounts are 0');
    })

    it('should be able to pause and unpause the contract', async () => {
        await nonRewardPool.pauseContract();
        let isPaused = await nonRewardPool.paused();
        assert(isPaused == true);

        await nonRewardPool.unpauseContract();
        isPaused = await nonRewardPool.paused();
        assert(isPaused == false);
    }),

    it('shouldn\'t be able to mint initial if position has been initialized', async () => {
      let nftTokenId = await nonRewardPool.tokenId();
      expect(nftTokenId).not.to.eq(0);
      await expect(nonRewardPool.mintInitial(1, 1, admin.address)).to.be.reverted;
    }),

    it('shouldn\'t be able to mint initial with token amounts equal to 0', async () => {
      await expect(nonRewardPool.mintInitial(0, 0, admin.address)).to.be.reverted;
    }),

    it('should be able to stake without rebalancing', async () => {
      // Swap to collect some fees in buffer
      await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
      await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0, bufferBalanceBefore.amount1);

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      // Swap to collect some fees in buffer
      await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
      await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      let swapAmount = balanceBefore.amount0.div(2);
      await nonRewardPool.adminSwap(swapAmount, true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      // Swap to collect some fees in buffer
      await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
      await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      let swapAmount = balanceBefore.amount1.div(2);
      await nonRewardPool.adminSwap(swapAmount, false);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.gt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.lt(balanceBefore.amount1);
    }),

    it(`shouldn\'t be able to swap token 0 for token 1 in nonRewardPool 
        if there\'s not enough token 0 balance`, async () => {
        let balance = await nonRewardPool.getBufferTokenBalance();
        let swapAmount = bnDecimal(10000);

        expect(balance.amount0).to.be.lt(swapAmount);
        await expect(nonRewardPool.adminSwap(swapAmount, true)).
          to.be.revertedWith("Swap token 0 for token 1: not enough token 0 balance");
    }),

    it(`shouldn\'t be able to swap token 1 for token 0 in nonRewardPool 
        if there\'s not enough token 1 balance`, async () => {
          let balance = await nonRewardPool.getBufferTokenBalance();
          let swapAmount = bnDecimal(10000);

          expect(balance.amount1).to.be.lt(swapAmount);
          await expect(nonRewardPool.adminSwap(swapAmount, false)).
            to.be.revertedWith("Swap token 1 for token 0: not enough token 1 balance");
    })
  })
})
