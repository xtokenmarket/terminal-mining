const assert = require('assert');
const { expect } = require('chai');
const { bnDecimal, increaseTime, bnDecimals, deployArgs, swapToken0ForToken1, swapToken1ForToken0, decreaseTime } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Management functions tests for CLR
describe('Contract: CLR', async () => {
  let lmTerminal, clr, token0, token1, rewardToken, admin, user1, user2, user3, user4;
  let router, token0Decimals, token1Decimals

  beforeEach(async () => {
      ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
          xTokenManager, token0Decimals, token1Decimals } = 
          await deploymentFixture());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(100000, token0Decimals);
      let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
      await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
      await increaseTime(300);
  })

  describe('Management', async () => {
    it('should be able to rebalance', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculateAmountsMintedSingleToken(0, mintAmount);
        let amounts2 = await clr.calculateAmountsMintedSingleToken(1, mintAmount2)
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts2.amount0Minted, amounts2.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculateAmountsMintedSingleToken(0, mintAmount);
        let amounts2 = await clr.calculateAmountsMintedSingleToken(1, mintAmount2)
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts2.amount0Minted, amounts2.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(clr.collectAndReinvest()).not.to.be.reverted;
    }),

    it('shouldn\'t be able to rebalance if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.revertedWith('Rebalance amounts are 0');
    })

    it('should be able to pause and unpause the contract', async () => {
        await clr.pauseContract();
        let isPaused = await clr.paused();
        assert(isPaused == true);

        await clr.unpauseContract();
        isPaused = await clr.paused();
        assert(isPaused == false);
    }),

    it('shouldn\'t be able to mint initial if position has been initialized', async () => {
      let nftTokenId = await clr.tokenId();
      expect(nftTokenId).not.to.eq(0);
      await expect(clr.mintInitial(1, 1, admin.address)).to.be.reverted;
    }),

    it('shouldn\'t be able to mint initial with token amounts equal to 0', async () => {
      await expect(clr.mintInitial(0, 0, admin.address)).to.be.reverted;
    }),

    it('should be able to stake without rebalancing', async () => {
      // Swap to collect some fees in buffer
      await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
      await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
      await clr.collect();
      let bufferBalanceBefore = await clr.getBufferTokenBalance();
      let stakedBalanceBefore = await clr.getStakedTokenBalance();

      await clr.adminStake(bufferBalanceBefore.amount0, bufferBalanceBefore.amount1);

      let bufferBalanceAfter = await clr.getBufferTokenBalance();
      let stakedBalanceAfter = await clr.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('should be able to swap token 0 for token 1 in clr', async () => {
      // Swap to collect some fees in buffer
      await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
      await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
      await clr.collect();
      let balanceBefore = await clr.getBufferTokenBalance();

      // true - swap token 0 for token 1
      let swapAmount = balanceBefore.amount0.div(2);
      await clr.adminSwap(swapAmount, true);

      let balanceAfter = await clr.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in clr', async () => {
      // Swap to collect some fees in buffer
      await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
      await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
      await clr.collect();
      let balanceBefore = await clr.getBufferTokenBalance();

      // false - swap token 1 for token 0
      let swapAmount = balanceBefore.amount1.div(2);
      await clr.adminSwap(swapAmount, false);

      let balanceAfter = await clr.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.gt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.lt(balanceBefore.amount1);
    }),

    it(`shouldn\'t be able to swap token 0 for token 1 in clr 
        if there\'s not enough token 0 balance`, async () => {
        let balance = await clr.getBufferTokenBalance();
        let swapAmount = bnDecimal(10000);

        expect(balance.amount0).to.be.lt(swapAmount);
        await expect(clr.adminSwap(swapAmount, true)).
          to.be.revertedWith("Swap token 0 for token 1: not enough token 0 balance");
    }),

    it(`shouldn\'t be able to swap token 1 for token 0 in clr 
        if there\'s not enough token 1 balance`, async () => {
          let balance = await clr.getBufferTokenBalance();
          let swapAmount = bnDecimal(10000);

          expect(balance.amount1).to.be.lt(swapAmount);
          await expect(clr.adminSwap(swapAmount, false)).
            to.be.revertedWith("Swap token 1 for token 0: not enough token 1 balance");
    }),

    it(`shouldn't be able to initialize rewards from clr pool`, async () => {
        await expect(clr.initializeReward(1000, rewardToken.address)).
            to.be.revertedWith('Function may be called only via Terminal')
    }),

    it(`shouldn't be able to set rewards duration from clr pool`, async () => {
        await expect(clr.setRewardsDuration(1000)).
            to.be.revertedWith('Function may be called only via Terminal')
        await decreaseTime(86400*10);
    })
  })
})
