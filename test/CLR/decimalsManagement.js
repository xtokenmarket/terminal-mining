const { expect } = require('chai');
const { bnDecimal, increaseTime, bnDecimals, swapToken0ForToken1Decimals, swapToken1ForToken0Decimals } = require('../../scripts/helpers');
const { fixture_12_6_decimals, fixture_6_12_decimals, fixture_6_8_decimals, 
        fixture_8_6_decimals, fixture_6_6_decimals, fixture_8_8_decimals, fixture_18_6_decimals, fixture_6_18_decimals } = require('./fixture');

// Management functions tests for CLR
// Tests management for tokens with different decimals
describe('Contract: CLR', async () => {
  let lmTerminal, token0, token1, router, admin, user1, user2, user3, user4;
  let token0Decimals, token1Decimals

  describe(`Management with token 0 decimals = 18 and token 1 decimals = 6`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_18_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
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

      await clr.adminStake(bufferBalanceBefore.amount0, bufferBalanceBefore.amount1.div(1e12));

      let bufferBalanceAfter = await clr.getBufferTokenBalance();
      let stakedBalanceAfter = await clr.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.reverted;
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

  describe(`Management with token 0 decimals = 6 and token 1 decimals = 18`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_6_18_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
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

      await clr.adminStake(bufferBalanceBefore.amount0.div(1e12), bufferBalanceBefore.amount1);

      let bufferBalanceAfter = await clr.getBufferTokenBalance();
      let stakedBalanceAfter = await clr.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.reverted;
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

  describe(`Management with token 0 decimals = 12 and token 1 decimals = 6`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_12_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
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

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.reverted;
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


  describe(`Management with token 0 decimals = 6 and token 1 decimals = 12`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_6_12_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(clr.collectAndReinvest()).not.to.be.reverted;
    }),

    it('should be able to stake without reinvesting', async () => {
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(100000));
      await clr.collect();
      let bufferBalanceBefore = await clr.getBufferTokenBalance();
      let stakedBalanceBefore = await clr.getStakedTokenBalance();

      await clr.adminStake(bufferBalanceBefore.amount0.div(1e12), bufferBalanceBefore.amount1.div(1e6));

      let bufferBalanceAfter = await clr.getBufferTokenBalance();
      let stakedBalanceAfter = await clr.getStakedTokenBalance();

      expect(bufferBalanceBefore.amount0).to.be.gt(bufferBalanceAfter.amount0);
      expect(bufferBalanceBefore.amount1).to.be.gt(bufferBalanceAfter.amount1);

      expect(stakedBalanceBefore.amount0).to.be.lt(stakedBalanceAfter.amount0);
      expect(stakedBalanceBefore.amount1).to.be.lt(stakedBalanceAfter.amount1);
    }),

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.reverted;
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
    })
  })

  describe(`Management with token 0 decimals = 6 and token 1 decimals = 8`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_6_8_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(clr.collectAndReinvest()).not.to.be.reverted;
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

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.reverted;
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
    })
  })

  describe(`Management with token 0 decimals = 8 and token 1 decimals = 6`, async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
            await fixture_8_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
        const amount = bnDecimals(1000000, token0Decimals);
        let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(1000000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(clr.collectAndReinvest()).not.to.be.reverted;
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

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.reverted;
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
    })
  })

  describe('Management with token 0 decimals = 6 and token 1 decimals = 6', async () => {
    beforeEach(async () => {
      ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
          await fixture_6_6_decimals());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(1000000, token0Decimals);
      let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
      await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
      await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(clr.collectAndReinvest()).not.to.be.reverted;
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

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.reverted;
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
    })
  })

  describe('Management with token 0 decimals = 8 and token 1 decimals = 8', async () => {
    beforeEach(async () => {
      ({ lmTerminal, token0, token1, clr, stakedToken, router, token0Decimals, token1Decimals } = 
          await fixture_8_8_decimals());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      const amount = bnDecimals(1000000, token0Decimals);
      let amounts = await clr.calculateAmountsMintedSingleToken(0, amount);
      await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
      await increaseTime(300);
    })

    it('should be able to reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await clr.collect();
        await expect(clr.reinvest()).not.to.be.reverted;
    }),

    it('should be able to collect and reinvest', async () => {
        let mintAmount = bnDecimals(1000000, token0Decimals)
        let mintAmount1 = bnDecimals(1000000, token1Decimals)
        let amounts = await clr.calculatePoolMintedAmounts(mintAmount, mintAmount1);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        await clr.deposit(amounts.amount0Minted, amounts.amount1Minted);
        await increaseTime(300);
        // Swap to collect some fees in buffer
        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(10000));
        await expect(clr.collectAndReinvest()).not.to.be.reverted;
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

    it('shouldn\'t be able to reinvest if there\'s no balance in buffer', async () => {
        await expect(clr.reinvest()).to.be.reverted;
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
    })
  })
})
