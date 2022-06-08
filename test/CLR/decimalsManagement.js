const assert = require('assert');
const { expect } = require('chai');
const { bnDecimal, increaseTime, bnDecimals, deployArgs, swapToken0ForToken1Decimals, swapToken1ForToken0Decimals, printPositionAndBufferBalance, decreaseTime } = require('../../scripts/helpers');
const { fixture_12_6_decimals } = require('./fixture');

// Management functions tests for CLR
// Tests management for tokens with different decimals
describe('Contract: CLR', async () => {
  let lmTerminal, token0, token1, router, admin, user1, user2, user3, user4;
  let token0Decimals, token1Decimals

  beforeEach(async () => {
      ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
          await fixture_12_6_decimals());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(1000000, token0Decimals);
      await clr.deposit(0, amount);
      await increaseTime(300);
  })

  describe(`Management with token 0 decimals = 12 and token 1 decimals = 6`, async () => {
    it('should be able to rebalance', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        await clr.deposit(0, mintAmount);
        await increaseTime(300);
        await clr.deposit(0, mintAmount2);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to pause and unpause the contract', async () => {
        await clr.pauseContract();
        let isPaused = await clr.paused();
        assert(isPaused == true);

        await clr.unpauseContract();
        isPaused = await clr.paused();
        assert(isPaused == false);
    }),

    it('should be able to stake without rebalancing', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await clr.collect();
      let bufferBalanceBefore = await clr.getBufferTokenBalance();
      let stakedBalanceBefore = await clr.getStakedTokenBalance();

      await clr.adminStake(bufferBalanceBefore.amount0.div(1e6), bufferBalanceBefore.amount1.div(1e12));

      let bufferBalanceAfter = await clr.getBufferTokenBalance();
      let stakedBalanceAfter = await clr.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('should be able to rebalance to new price range', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(-139080);
        expect(ticks.tick1).to.be.eq(-137460);

        let newLowerTick = -139680;
        let newUpperTick = -138060;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-139680);
        expect(ticks.tick1).to.be.eq(-138060);
        expect(tokenId).not.to.eq(newTokenId);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t0 staked = 0', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(-139080);
        expect(ticks.tick1).to.be.eq(-137460);

        expect(stakedBalance.amount0).not.to.be.eq(0);

        // new price range: 0.91 - 0.96
        let newLowerTick = -139680;
        let newUpperTick = -138600;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-139680);
        expect(ticks.tick1).to.be.eq(-138600);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount0).to.be.eq(0);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t1 staked = 0', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(-139080);
        expect(ticks.tick1).to.be.eq(-137460);

        expect(stakedBalance.amount1).not.to.be.eq(0);

        // new price range: 1.01 - 1.07
        let newLowerTick = -138060;
        let newUpperTick = -137460;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-138060);
        expect(ticks.tick1).to.be.eq(-137460);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount1).to.be.eq(0);
    }),

    it('should be able to rebalance to a very tight price range', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(-139080);
        expect(ticks.tick1).to.be.eq(-137460);

        // new price range: 1.01 - 1.07
        let newLowerTick = -138240;
        let newUpperTick = -138060;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-138240);
        expect(ticks.tick1).to.be.eq(-138060);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
    }),

    it('should be able to rebalance twice if more than 24 hours have passed', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        await clr.rebalance(-139680, -138060, 0, 0);

        await increaseTime(86400);

        await clr.rebalance(-140280, 138660, 0, 0);
    })

    it('shouldn\'t be able to rebalance to same price range', async () => {
        let ticks = await clr.getTicks();
        await expect(clr.rebalance(ticks.tick0, ticks.tick1, 0, 0)).to.be.revertedWith('Need to change ticks');
    }),

    it('shouldn\'t be able to rebalance if pool isn\'t whitelisted in terminal', async () => {
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(-139080);
        expect(ticks.tick1).to.be.eq(-137460);

        let newLowerTick = -139680;
        let newUpperTick = -138060;
        await expect(clr.rebalance(newLowerTick, newUpperTick, 0, 0)).
          to.be.revertedWith('Rebalance is not enabled for this pool');
    }),

    it('shouldn\'t be able to rebalance if the min staked amount is not enough', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let stakedBalance = await clr.getStakedTokenBalance();

        await expect(clr.rebalance(-139680, -138060, stakedBalance.amount0, stakedBalance.amount1)).
          to.be.revertedWith('Staked token amounts after rebalance are not enough')
    }),

    it('shouldn\'t be able to rebalance twice in less than 24 hours', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        await clr.rebalance(-139680, -138060, 0, 0);

        await increaseTime(86300);

        await expect(clr.rebalance(-140280, 138660, 0, 0)).
          to.be.revertedWith('Can only rebalance once per 24 hours')
    })

    it('should be able to swap token 0 for token 1 in clr', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await clr.collect();
      let balanceBefore = await clr.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await clr.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await clr.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in clr', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await clr.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await clr.collect();
      let balanceBefore = await clr.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await clr.adminSwap(balanceBefore.amount1.div(2), false);

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
    })
  })
})
