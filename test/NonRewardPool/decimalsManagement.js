const { expect } = require('chai');
const { bnDecimal, increaseTime, bnDecimals, swapToken0ForToken1Decimals, swapToken1ForToken0Decimals } = require('../../scripts/helpers');
const { fixture_12_6_decimals, fixture_6_12_decimals, fixture_6_8_decimals, 
        fixture_8_6_decimals, fixture_6_6_decimals, fixture_8_8_decimals, fixture_18_6_decimals, fixture_6_18_decimals } = require('./fixture');

// Management functions tests for nonRewardPool
// Tests management for tokens with different decimals
describe('Contract: nonRewardPool', async () => {
  let lmTerminal, token0, token1, router, admin, user1, user2, user3, user4;
  let token0Decimals, token1Decimals

  describe(`Management with token 0 decimals = 18 and token 1 decimals = 6`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, nonRewardPool, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_18_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0, bufferBalanceBefore.amount1.div(1e12));

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.reverted;
    })

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await nonRewardPool.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await nonRewardPool.adminSwap(balanceBefore.amount1.div(2), false);

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

  describe(`Management with token 0 decimals = 6 and token 1 decimals = 18`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, nonRewardPool, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_6_18_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0.div(1e12), bufferBalanceBefore.amount1);

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.reverted;
    })

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await nonRewardPool.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await nonRewardPool.adminSwap(balanceBefore.amount1.div(2), false);

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

  describe(`Management with token 0 decimals = 12 and token 1 decimals = 6`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, nonRewardPool, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_12_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0.div(1e6), bufferBalanceBefore.amount1.div(1e12));

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.reverted;
    })

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await nonRewardPool.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await nonRewardPool.adminSwap(balanceBefore.amount1.div(2), false);

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


  describe(`Management with token 0 decimals = 6 and token 1 decimals = 12`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, nonRewardPool, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_6_12_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(nonRewardPool.collectAndReinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0.div(1e12), bufferBalanceBefore.amount1.div(1e6));

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.reverted;
    })

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await nonRewardPool.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await nonRewardPool.adminSwap(balanceBefore.amount1.div(2), false);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.gt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.lt(balanceBefore.amount1);
    })
  })

  describe(`Management with token 0 decimals = 6 and token 1 decimals = 8`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, nonRewardPool, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_6_8_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(nonRewardPool.collectAndReinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0.div(1e6), bufferBalanceBefore.amount1.div(1e12));

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.reverted;
    })

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await nonRewardPool.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await nonRewardPool.adminSwap(balanceBefore.amount1.div(2), false);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.gt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.lt(balanceBefore.amount1);
    })
  })

  describe(`Management with token 0 decimals = 8 and token 1 decimals = 6`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, nonRewardPool, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_8_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(nonRewardPool.collectAndReinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0.div(1e6), bufferBalanceBefore.amount1.div(1e12));

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.reverted;
    })

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await nonRewardPool.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await nonRewardPool.adminSwap(balanceBefore.amount1.div(2), false);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.gt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.lt(balanceBefore.amount1);
    })
  })

  describe('Management with token 0 decimals = 6 and token 1 decimals = 6', async () => {
    beforeEach(async () => {
      ({ lmTerminal, token0, token1, nonRewardPool, stakedToken, router, token0Decimals, token1Decimals } = 
          await fixture_6_6_decimals());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(1000000, token0Decimals);
      let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
      await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
      await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(nonRewardPool.collectAndReinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0.div(1e6), bufferBalanceBefore.amount1.div(1e12));

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.reverted;
    })

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await nonRewardPool.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await nonRewardPool.adminSwap(balanceBefore.amount1.div(2), false);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.gt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.lt(balanceBefore.amount1);
    })
  })

  describe('Management with token 0 decimals = 8 and token 1 decimals = 8', async () => {
    beforeEach(async () => {
      ({ lmTerminal, token0, token1, nonRewardPool, stakedToken, router, token0Decimals, token1Decimals } = 
          await fixture_8_8_decimals());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(1000000, token0Decimals);
      let amounts = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount);
      await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
      await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await nonRewardPool.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(nonRewardPool.collectAndReinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let bufferBalanceBefore = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceBefore = await nonRewardPool.getStakedTokenBalance();

      await nonRewardPool.adminStake(bufferBalanceBefore.amount0.div(1e6), bufferBalanceBefore.amount1.div(1e12));

      let bufferBalanceAfter = await nonRewardPool.getBufferTokenBalance();
      let stakedBalanceAfter = await nonRewardPool.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(nonRewardPool.reinvest()).to.be.reverted;
    })

    it('should be able to swap token 0 for token 1 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // true - swap token 0 for token 1
      await nonRewardPool.adminSwap(balanceBefore.amount0.div(2), true);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.lt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.gt(balanceBefore.amount1);
    }),

    it('should be able to swap token 1 for token 0 in nonRewardPool', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await nonRewardPool.collect();
      let balanceBefore = await nonRewardPool.getBufferTokenBalance();

      // false - swap token 1 for token 0
      await nonRewardPool.adminSwap(balanceBefore.amount1.div(2), false);

      let balanceAfter = await nonRewardPool.getBufferTokenBalance();

      expect(balanceAfter.amount0).to.be.gt(balanceBefore.amount0);
      expect(balanceAfter.amount1).to.be.lt(balanceBefore.amount1);
    })
  })
})
