const { expect } = require('chai');
const { bnDecimal, increaseTime, bnDecimals, swapToken0ForToken1Decimals, swapToken1ForToken0Decimals } = require('../../scripts/helpers');
const { fixture_12_6_decimals, fixture_6_12_decimals, fixture_6_8_decimals, 
        fixture_8_6_decimals, fixture_6_6_decimals, fixture_8_8_decimals } = require('./fixture');

// Management functions tests for CLR
// Tests management for tokens with different decimals
describe('Contract: CLR', async () => {
  let lmTerminal, token0, token1, router, admin, user1, user2, user3, user4;
  let token0Decimals, token1Decimals

  describe(`Management with token 0 decimals = 12 and token 1 decimals = 6`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_12_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        await clr.deposit(0, amount);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
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

    it('should be able to stake without reinvesting', async () => {
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
  })


  describe(`Management with token 0 decimals = 6 and token 1 decimals = 12`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_6_12_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        await clr.deposit(0, amount);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
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

    it('should be able to stake without reinvesting', async () => {
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
        expect(ticks.tick0).to.be.eq(137220);
        expect(ticks.tick1).to.be.eq(138840);

        let newLowerTick = 138240;
        let newUpperTick = 139440;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(138240);
        expect(ticks.tick1).to.be.eq(139440);
        expect(tokenId).not.to.eq(newTokenId);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t0 staked = 0', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(137220);
        expect(ticks.tick1).to.be.eq(138840);

        expect(stakedBalance.amount0).not.to.be.eq(0);

        // new price range: 0.91 - 0.96
        let newLowerTick = 137220;
        let newUpperTick = 137760;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(137220);
        expect(ticks.tick1).to.be.eq(137760);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount0).to.be.eq(0);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t1 staked = 0', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(137220);
        expect(ticks.tick1).to.be.eq(138840);

        expect(stakedBalance.amount1).not.to.be.eq(0);

        // new price range: 1.01 - 1.07
        let newLowerTick = 138240;
        let newUpperTick = 138840;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(138240);
        expect(ticks.tick1).to.be.eq(138840);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount1).to.be.eq(0);
    }),

    it('should be able to rebalance to a very tight price range', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(137220);
        expect(ticks.tick1).to.be.eq(138840);

        // new price range: 0.99 - 1.01
        let newLowerTick = 138060;
        let newUpperTick = 138240;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(138060);
        expect(ticks.tick1).to.be.eq(138240);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
    }),

    it('should be able to rebalance twice if more than 24 hours have passed', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        let newLowerTick = 138240;
        let newUpperTick = 139440;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        await increaseTime(86400);

        await clr.rebalance(newLowerTick - 60, newUpperTick + 60, 0, 0);
    })

    it('shouldn\'t be able to rebalance to same price range', async () => {
        let ticks = await clr.getTicks();
        await expect(clr.rebalance(ticks.tick0, ticks.tick1, 0, 0)).to.be.revertedWith('Need to change ticks');
    }),

    it('shouldn\'t be able to rebalance if pool isn\'t whitelisted in terminal', async () => {
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(137220);
        expect(ticks.tick1).to.be.eq(138840);

        let newLowerTick = 138240;
        let newUpperTick = 139440;
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

        let newLowerTick = 138240;
        let newUpperTick = 139440;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        await increaseTime(86300);

        await expect(clr.rebalance(newLowerTick - 60, newUpperTick + 60, 0, 0)).
          to.be.revertedWith('Can only rebalance once per 24 hours')
    })
  })

  describe(`Management with token 0 decimals = 6 and token 1 decimals = 8`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_6_8_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        await clr.deposit(0, amount);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        await clr.deposit(0, mintAmount);
        await increaseTime(300);
        await clr.deposit(1, mintAmount2);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
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
        expect(ticks.tick0).to.be.eq(45120);
        expect(ticks.tick1).to.be.eq(46740);

        let newLowerTick = 45060;
        let newUpperTick = 46800;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(45060);
        expect(ticks.tick1).to.be.eq(46800);
        expect(tokenId).not.to.eq(newTokenId);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t0 staked = 0', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(45120);
        expect(ticks.tick1).to.be.eq(46740);

        expect(stakedBalance.amount0).not.to.be.eq(0);

        // new price range: 0.91 - 0.96
        let newLowerTick = 45120;
        let newUpperTick = 45660;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(45120);
        expect(ticks.tick1).to.be.eq(45660);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount0).to.be.eq(0);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t1 staked = 0', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(45120);
        expect(ticks.tick1).to.be.eq(46740);

        expect(stakedBalance.amount1).not.to.be.eq(0);

        // new price range: 1.01 - 1.07
        let newLowerTick = 46140;
        let newUpperTick = 46740;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(46140);
        expect(ticks.tick1).to.be.eq(46740);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount1).to.be.eq(0);
    }),

    it('should be able to rebalance to a very tight price range', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(45120);
        expect(ticks.tick1).to.be.eq(46740);

        // new price range: 0.99 - 1.01
        let newLowerTick = 45960;
        let newUpperTick = 46140;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(45960);
        expect(ticks.tick1).to.be.eq(46140);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
    }),

    it('should be able to rebalance twice if more than 24 hours have passed', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        let newLowerTick = 45960;
        let newUpperTick = 46140;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        await increaseTime(86400);

        await clr.rebalance(newLowerTick - 60, newUpperTick + 60, 0, 0);
    })

    it('shouldn\'t be able to rebalance to same price range', async () => {
        let ticks = await clr.getTicks();
        await expect(clr.rebalance(ticks.tick0, ticks.tick1, 0, 0)).to.be.revertedWith('Need to change ticks');
    }),

    it('shouldn\'t be able to rebalance if pool isn\'t whitelisted in terminal', async () => {
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(45120);
        expect(ticks.tick1).to.be.eq(46740);

        let newLowerTick = 45960;
        let newUpperTick = 46140;
        await expect(clr.rebalance(newLowerTick, newUpperTick, 0, 0)).
          to.be.revertedWith('Rebalance is not enabled for this pool');
    }),

    it('shouldn\'t be able to rebalance if the min staked amount is not enough', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let stakedBalance = await clr.getStakedTokenBalance();

        await expect(clr.rebalance(45960, 46140, stakedBalance.amount0, stakedBalance.amount1)).
          to.be.revertedWith('Staked token amounts after rebalance are not enough')
    }),

    it('shouldn\'t be able to rebalance twice in less than 24 hours', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        let newLowerTick = 45960;
        let newUpperTick = 46140;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        await increaseTime(86300);

        await expect(clr.rebalance(newLowerTick - 60, newUpperTick + 60, 0, 0)).
          to.be.revertedWith('Can only rebalance once per 24 hours')
    })
  })

  describe(`Management with token 0 decimals = 8 and token 1 decimals = 6`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_8_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        await clr.deposit(0, amount);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        await clr.deposit(0, mintAmount);
        await increaseTime(300);
        await clr.deposit(1, mintAmount2);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
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
        expect(ticks.tick0).to.be.eq(-46980);
        expect(ticks.tick1).to.be.eq(-45360);

        let newLowerTick = -46920;
        let newUpperTick = -45420;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-46920);
        expect(ticks.tick1).to.be.eq(-45420);
        expect(tokenId).not.to.eq(newTokenId);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t0 staked = 0', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(-46980);
        expect(ticks.tick1).to.be.eq(-45360);

        expect(stakedBalance.amount0).not.to.be.eq(0);

        // new price range: 0.91 - 0.96
        let newLowerTick = -46980;
        let newUpperTick = -46440;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-46980);
        expect(ticks.tick1).to.be.eq(-46440);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount0).to.be.eq(0);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t1 staked = 0', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(ticks.tick0).to.be.eq(-46980);
        expect(ticks.tick1).to.be.eq(-45360);

        expect(stakedBalance.amount1).not.to.be.eq(0);

        // new price range: 1.01 - 1.07
        let newLowerTick = -45960;
        let newUpperTick = -45360;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-45960);
        expect(ticks.tick1).to.be.eq(-45360);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount1).to.be.eq(0);
    }),

    it('should be able to rebalance to a very tight price range', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(-46980);
        expect(ticks.tick1).to.be.eq(-45360);

        // new price range: 0.99 - 1.01
        let newLowerTick = -46140;
        let newUpperTick = -45960;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-46140);
        expect(ticks.tick1).to.be.eq(-45960);
        expect(tokenId).not.to.eq(newTokenId);

        stakedBalance = await clr.getStakedTokenBalance();
    }),

    it('should be able to rebalance twice if more than 24 hours have passed', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        let newLowerTick = -46920;
        let newUpperTick = -45420;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        await increaseTime(86400);

        await clr.rebalance(newLowerTick - 60, newUpperTick + 60, 0, 0);
    })

    it('shouldn\'t be able to rebalance to same price range', async () => {
        let ticks = await clr.getTicks();
        await expect(clr.rebalance(ticks.tick0, ticks.tick1, 0, 0)).to.be.revertedWith('Need to change ticks');
    }),

    it('shouldn\'t be able to rebalance if pool isn\'t whitelisted in terminal', async () => {
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(-46980);
        expect(ticks.tick1).to.be.eq(-45360);

        let newLowerTick = -46920;
        let newUpperTick = -45420;
        await expect(clr.rebalance(newLowerTick, newUpperTick, 0, 0)).
          to.be.revertedWith('Rebalance is not enabled for this pool');
    }),

    it('shouldn\'t be able to rebalance if the min staked amount is not enough', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let stakedBalance = await clr.getStakedTokenBalance();

        await expect(clr.rebalance(-46920, -45420, stakedBalance.amount0, stakedBalance.amount1)).
          to.be.revertedWith('Staked token amounts after rebalance are not enough')
    }),

    it('shouldn\'t be able to rebalance twice in less than 24 hours', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        let newLowerTick = -46920;
        let newUpperTick = -45420;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        await increaseTime(86300);

        await expect(clr.rebalance(newLowerTick - 60, newUpperTick + 60, 0, 0)).
          to.be.revertedWith('Can only rebalance once per 24 hours')
    })

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

  describe('Management with token 0 decimals = 6 and token 1 decimals = 6', async () => {
    beforeEach(async () => {
      ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
          await fixture_6_6_decimals());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(1000000, token0Decimals);
      await clr.deposit(0, amount);
      await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        await clr.deposit(0, mintAmount);
        await increaseTime(300);
        await clr.deposit(0, mintAmount2);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        await clr.deposit(0, mintAmount);
        await increaseTime(300);
        await clr.deposit(0, mintAmount2);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(clr.collectAndReinvest()).not.to.be.reverted;
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.revertedWith('Reinvest amounts are 0');
    })

    it('should be able to rebalance to new price range', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(-600);
        expect(ticks.tick1).to.be.eq(600);

        let newLowerTick = -1200;
        let newUpperTick = 1200;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-1200);
        expect(ticks.tick1).to.be.eq(1200);
        expect(tokenId).not.to.eq(newTokenId);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t0 staked = 0', async () => {
      await lmTerminal.enableRebalanceForPool(clr.address);
      let tokenId = await clr.tokenId();
      let ticks = await clr.getTicks();
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(ticks.tick0).to.be.eq(-600);
      expect(ticks.tick1).to.be.eq(600);

      expect(stakedBalance.amount0).not.to.be.eq(0);

      // new price range: 0.94 - 0.99
      let newLowerTick = -600;
      let newUpperTick = -120;
      await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

      ticks = await clr.getTicks();
      let newTokenId = await clr.tokenId();
      expect(ticks.tick0).to.be.eq(-600);
      expect(ticks.tick1).to.be.eq(-120);
      expect(tokenId).not.to.eq(newTokenId);

      stakedBalance = await clr.getStakedTokenBalance();
      expect(stakedBalance.amount0).to.be.eq(0);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t1 staked = 0', async () => {
      await lmTerminal.enableRebalanceForPool(clr.address);
      let tokenId = await clr.tokenId();
      let ticks = await clr.getTicks();
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(ticks.tick0).to.be.eq(-600);
      expect(ticks.tick1).to.be.eq(600);

      expect(stakedBalance.amount1).not.to.be.eq(0);

      // new price range: 1.01 - 1.06
      let newLowerTick = 120;
      let newUpperTick = 600;
      await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

      ticks = await clr.getTicks();
      let newTokenId = await clr.tokenId();
      expect(ticks.tick0).to.be.eq(120);
      expect(ticks.tick1).to.be.eq(600);
      expect(tokenId).not.to.eq(newTokenId);

      stakedBalance = await clr.getStakedTokenBalance();

      expect(stakedBalance.amount1).to.be.eq(0);
    }),

    it('should be able to rebalance to a very tight price range', async () => {
      await lmTerminal.enableRebalanceForPool(clr.address);
      let tokenId = await clr.tokenId();
      let ticks = await clr.getTicks();
      expect(ticks.tick0).to.be.eq(-600);
      expect(ticks.tick1).to.be.eq(600);

      // new price range: 0.99 - 1.01
      let newLowerTick = -120;
      let newUpperTick = 120;
      await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

      ticks = await clr.getTicks();
      let newTokenId = await clr.tokenId();
      expect(ticks.tick0).to.be.eq(-120);
      expect(ticks.tick1).to.be.eq(120);
      expect(tokenId).not.to.eq(newTokenId);

      stakedBalance = await clr.getStakedTokenBalance();
    }),

    it('should be able to rebalance twice if more than 24 hours have passed', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        await clr.rebalance(-1200, 1200, 0, 0);

        await increaseTime(86400);

        await clr.rebalance(-6000, 6000, 0, 0);
    })

    it('shouldn\'t be able to rebalance to same price range', async () => {
        let ticks = await clr.getTicks();
        await expect(clr.rebalance(ticks.tick0, ticks.tick1, 0, 0)).to.be.revertedWith('Need to change ticks');
    }),

    it('shouldn\'t be able to rebalance if pool isn\'t whitelisted in terminal', async () => {
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(-600);
        expect(ticks.tick1).to.be.eq(600);

        let newLowerTick = -1200;
        let newUpperTick = 1200;
        await expect(clr.rebalance(newLowerTick, newUpperTick, 0, 0)).
          to.be.revertedWith('Rebalance is not enabled for this pool');
    }),

    it('shouldn\'t be able to rebalance if the min staked amount is not enough', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let stakedBalance = await clr.getStakedTokenBalance();

        await expect(clr.rebalance(-1200, 1200, stakedBalance.amount0, stakedBalance.amount1)).
          to.be.revertedWith('Staked token amounts after rebalance are not enough')
    }),

    it('shouldn\'t be able to rebalance twice in less than 24 hours', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        await clr.rebalance(-1200, 1200, 0, 0);

        await increaseTime(86300);

        await expect(clr.rebalance(-6000, 6000, 0, 0)).
          to.be.revertedWith('Can only rebalance once per 24 hours')
    })
  })

  describe('Management with token 0 decimals = 8 and token 1 decimals = 8', async () => {
    beforeEach(async () => {
      ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
          await fixture_8_8_decimals());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(1000000, token0Decimals);
      await clr.deposit(0, amount);
      await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        await clr.deposit(0, mintAmount);
        await increaseTime(300);
        await clr.deposit(0, mintAmount2);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount2 = bnDecimals(1000000, token1Decimals)
        await clr.deposit(0, mintAmount);
        await increaseTime(300);
        await clr.deposit(0, mintAmount2);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(clr.collectAndReinvest()).not.to.be.reverted;
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.revertedWith('Reinvest amounts are 0');
    })

    it('should be able to rebalance to new price range', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let tokenId = await clr.tokenId();
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(-600);
        expect(ticks.tick1).to.be.eq(600);

        let newLowerTick = -1200;
        let newUpperTick = 1200;
        await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

        ticks = await clr.getTicks();
        let newTokenId = await clr.tokenId();
        expect(ticks.tick0).to.be.eq(-1200);
        expect(ticks.tick1).to.be.eq(1200);
        expect(tokenId).not.to.eq(newTokenId);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t0 staked = 0', async () => {
      await lmTerminal.enableRebalanceForPool(clr.address);
      let tokenId = await clr.tokenId();
      let ticks = await clr.getTicks();
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(ticks.tick0).to.be.eq(-600);
      expect(ticks.tick1).to.be.eq(600);

      expect(stakedBalance.amount0).not.to.be.eq(0);

      // new price range: 0.94 - 0.99
      let newLowerTick = -600;
      let newUpperTick = -120;
      await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

      ticks = await clr.getTicks();
      let newTokenId = await clr.tokenId();
      expect(ticks.tick0).to.be.eq(-600);
      expect(ticks.tick1).to.be.eq(-120);
      expect(tokenId).not.to.eq(newTokenId);

      stakedBalance = await clr.getStakedTokenBalance();
      expect(stakedBalance.amount0).to.be.eq(0);
    }),

    it('should be able to rebalance to a tighter price range outside the current price with t1 staked = 0', async () => {
      await lmTerminal.enableRebalanceForPool(clr.address);
      let tokenId = await clr.tokenId();
      let ticks = await clr.getTicks();
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(ticks.tick0).to.be.eq(-600);
      expect(ticks.tick1).to.be.eq(600);

      expect(stakedBalance.amount1).not.to.be.eq(0);

      // new price range: 1.01 - 1.06
      let newLowerTick = 120;
      let newUpperTick = 600;
      await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

      ticks = await clr.getTicks();
      let newTokenId = await clr.tokenId();
      expect(ticks.tick0).to.be.eq(120);
      expect(ticks.tick1).to.be.eq(600);
      expect(tokenId).not.to.eq(newTokenId);

      stakedBalance = await clr.getStakedTokenBalance();

      expect(stakedBalance.amount1).to.be.eq(0);
    }),

    it('should be able to rebalance to a very tight price range', async () => {
      await lmTerminal.enableRebalanceForPool(clr.address);
      let tokenId = await clr.tokenId();
      let ticks = await clr.getTicks();
      expect(ticks.tick0).to.be.eq(-600);
      expect(ticks.tick1).to.be.eq(600);

      // new price range: 0.99 - 1.01
      let newLowerTick = -120;
      let newUpperTick = 120;
      await clr.rebalance(newLowerTick, newUpperTick, 0, 0);

      ticks = await clr.getTicks();
      let newTokenId = await clr.tokenId();
      expect(ticks.tick0).to.be.eq(-120);
      expect(ticks.tick1).to.be.eq(120);
      expect(tokenId).not.to.eq(newTokenId);

      stakedBalance = await clr.getStakedTokenBalance();
    }),

    it('should be able to rebalance twice if more than 24 hours have passed', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        await clr.rebalance(-1200, 1200, 0, 0);

        await increaseTime(86400);

        await clr.rebalance(-6000, 6000, 0, 0);
    })

    it('shouldn\'t be able to rebalance to same price range', async () => {
        let ticks = await clr.getTicks();
        await expect(clr.rebalance(ticks.tick0, ticks.tick1, 0, 0)).to.be.revertedWith('Need to change ticks');
    }),

    it('shouldn\'t be able to rebalance if pool isn\'t whitelisted in terminal', async () => {
        let ticks = await clr.getTicks();
        expect(ticks.tick0).to.be.eq(-600);
        expect(ticks.tick1).to.be.eq(600);

        let newLowerTick = -1200;
        let newUpperTick = 1200;
        await expect(clr.rebalance(newLowerTick, newUpperTick, 0, 0)).
          to.be.revertedWith('Rebalance is not enabled for this pool');
    }),

    it('shouldn\'t be able to rebalance if the min staked amount is not enough', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);
        let stakedBalance = await clr.getStakedTokenBalance();

        await expect(clr.rebalance(-1200, 1200, stakedBalance.amount0, stakedBalance.amount1)).
          to.be.revertedWith('Staked token amounts after rebalance are not enough')
    }),

    it('shouldn\'t be able to rebalance twice in less than 24 hours', async () => {
        await lmTerminal.enableRebalanceForPool(clr.address);

        await clr.rebalance(-1200, 1200, 0, 0);

        await increaseTime(86300);

        await expect(clr.rebalance(-6000, 6000, 0, 0)).
          to.be.revertedWith('Can only rebalance once per 24 hours')
    })
  })
})
