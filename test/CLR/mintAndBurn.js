const { deploymentFixture } = require('./fixture');
const { getTokenBalance, bn, bnDecimal, bnDecimals, increaseTime, swapToken0ForToken1, swapToken0ForToken1Decimals, swapToken1ForToken0Decimals } = require('../../scripts/helpers');
const { expect } = require('chai');

// Mint and burn tests for CLR
describe('Contract: CLR', async () => {
  let lmTerminal, clr, token0, token1, rewardToken, admin, user1, user2, user3, user4;
  let router, token0Decimals, token1Decimals

  beforeEach(async () => {
      ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
          token0Decimals, token1Decimals } = 
          await deploymentFixture());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
  })

  describe('Mint and burn', async () => {
    it('should mint StakedCLR tokens to user with asset 0', async () => {
        let amount = bnDecimals(1000000, token0Decimals);
        let mint = await clr.calculateAmountsMintedSingleToken(0, amount);
        await clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted);
        let balance = await stakedToken.balanceOf(user1.address);

        let am = await clr.calculateAmountsMintedSingleToken(0, amount);
        let liquidityAmount = await clr.getLiquidityForAmounts(am.amount0Minted, am.amount1Minted);
        let positionLiquidity = await clr.getPositionLiquidity();

        const totalSupply = await clr.totalSupply();
        let calculatedBalance = bn(liquidityAmount).mul(totalSupply).div(positionLiquidity);

        expect(balance).to.eq(calculatedBalance);
    }),

    it('should mint StakedCLR tokens to user with asset 1', async () => {
        let amount = bnDecimals(1000000, token1Decimals);
        let mint = await clr.calculateAmountsMintedSingleToken(1, amount);
        await clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted);
        let balance = await stakedToken.balanceOf(user1.address);

        let am = await clr.calculateAmountsMintedSingleToken(0, amount);
        let liquidityAmount = await clr.getLiquidityForAmounts(am.amount0Minted, am.amount1Minted);
        let positionLiquidity = await clr.getPositionLiquidity();

        const totalSupply = await clr.totalSupply();
        let calculatedBalance = bn(liquidityAmount).mul(totalSupply).div(positionLiquidity);

        expect(balance).to.eq(calculatedBalance);
    }),

    it('should transfer asset balance from user when minting', async () => {
        let balancetoken0Before = await token0.balanceOf(user1.address);
        let balancetoken1Before = await token1.balanceOf(user1.address)
        let amount = bnDecimals(1000000, token0Decimals);
        let mint = await clr.calculateAmountsMintedSingleToken(0, amount);

        await clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted);
        let balancetoken0After = await token0.balanceOf(user1.address);
        let balancetoken1After = await token1.balanceOf(user1.address);

        expect(balancetoken0Before.sub(mint.amount0Minted)).to.be.closeTo(balancetoken0After, 1);
        expect(balancetoken1Before.sub(mint.amount1Minted)).to.be.closeTo(balancetoken1After, 1);
    }),

    it('should stake tokens in position when minting', async () => {
        let amount = bnDecimals(1000000, token0Decimals);
        let am = await clr.calculateAmountsMintedSingleToken(0, amount);
        let liquidity = await clr.getLiquidityForAmounts(
                              am.amount0Minted, am.amount1Minted)

        let positionLiquidityBefore = await clr.getPositionLiquidity();
        await clr.connect(user1).deposit(am.amount0Minted, am.amount1Minted);
        let positionLiquidityAfter = await clr.getPositionLiquidity();

        expect(positionLiquidityBefore.add(liquidity)).to.be.closeTo(positionLiquidityAfter, 100);
    }),

    it('should deposit in pool ratio if token 0\'s balance hasn\'t changed by more than 1%', async() => {
      let amount = bnDecimals(100000, token0Decimals);
      let mint = await clr.calculateAmountsMintedSingleToken(0, amount);

      let stakedBalanceBefore = await clr.getStakedTokenBalance();

      await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(50000))
      let stakedBalanceAfter = await clr.getStakedTokenBalance();

      expect(stakedBalanceAfter.amount0).to.be.gt(stakedBalanceBefore.amount0.mul(99).div(100));

      let expectedDepositAmounts = await clr.calculatePoolMintedAmounts(mint.amount0Minted, mint.amount1Minted);

      expect(expectedDepositAmounts.amount0Minted).not.to.be.eq(mint.amount0Minted);
      
      let bb0 = await token0.balanceOf(user1.address);
      let bb1 = await token1.balanceOf(user1.address);
      await expect(clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted)).
        not.to.be.revertedWith('Price slippage check');
      let ba0 = await token0.balanceOf(user1.address);
      let ba1 = await token1.balanceOf(user1.address);

      let sent0 = bb0.sub(ba0);
      let sent1 = bb1.sub(ba1);

      // expect t0 amount sent to be equal to the calculated pool minted amounts after swapping
      // and not the actual sent amounts - mint.amount0Minted and mint.amount1Minted
      expect(sent0).to.be.eq(expectedDepositAmounts.amount0Minted);
      expect(sent1).to.be.eq(expectedDepositAmounts.amount1Minted);
    })

    it('should deposit in pool ratio if token 1\'s balance hasn\'t changed by more than 1%', async() => {
      let amount = bnDecimals(100000, token0Decimals);
      let mint = await clr.calculateAmountsMintedSingleToken(0, amount);

      let stakedBalanceBefore = await clr.getStakedTokenBalance();
      await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(50000))
      let stakedBalanceAfter = await clr.getStakedTokenBalance();

      expect(stakedBalanceAfter.amount0).to.be.gt(stakedBalanceBefore.amount0.mul(99).div(100));

      let expectedDepositAmounts = await clr.calculatePoolMintedAmounts(mint.amount0Minted, mint.amount1Minted);

      expect(expectedDepositAmounts.amount0Minted).not.to.be.eq(mint.amount0Minted);
      
      let bb0 = await token0.balanceOf(user1.address);
      let bb1 = await token1.balanceOf(user1.address);
      await expect(clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted)).
        not.to.be.revertedWith('Price slippage check');
      let ba0 = await token0.balanceOf(user1.address);
      let ba1 = await token1.balanceOf(user1.address);

      let sent0 = bb0.sub(ba0);
      let sent1 = bb1.sub(ba1);

      // expect t0 amount sent to be equal to the calculated pool minted amounts after swapping
      // and not the actual sent amounts - mint.amount0Minted and mint.amount1Minted
      expect(sent0).to.be.eq(expectedDepositAmounts.amount0Minted);
      expect(sent1).to.be.eq(expectedDepositAmounts.amount1Minted);
    })

    it('shouldn\'t allow user to mint if token 0\'s staked balance has changed by more than 1%', async () => {
        let amount = bnDecimals(1000000, token0Decimals);
        let mint = await clr.calculateAmountsMintedSingleToken(0, amount);
        let stakedBalanceBefore = await clr.getStakedTokenBalance();

        await swapToken1ForToken0Decimals(router, token0, token1, admin.address, bnDecimal(110000))
        let stakedBalanceAfter = await clr.getStakedTokenBalance();
        
        // staked balance token 0 is changed by > 1%
        expect(stakedBalanceAfter.amount0).to.be.lte(stakedBalanceBefore.amount0.mul(99).div(100))

        await expect(clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted)).
          to.be.revertedWith('Price slippage check')
    }),

    it('shouldn\'t allow user to mint if token 1\'s staked balance has changed by more than 1%', async () => {
        let amount = bnDecimals(1000000, token0Decimals);
        let mint = await clr.calculateAmountsMintedSingleToken(0, amount);
        let stakedBalanceBefore = await clr.getStakedTokenBalance();

        await swapToken0ForToken1Decimals(router, token0, token1, admin.address, bnDecimal(110000))
        let stakedBalanceAfter = await clr.getStakedTokenBalance();
        
        // staked balance token 1 is changed by > 1%
        expect(stakedBalanceAfter.amount1).to.be.lte(stakedBalanceBefore.amount1.mul(99).div(100))

        await expect(clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted)).
          to.be.revertedWith('Price slippage check')
    }),

    it('shouldn\'t allow user to mint if he has no token balance', async () => {
      let mintAmount = bnDecimals(10000, token0Decimals);
      let mint = await clr.calculateAmountsMintedSingleToken(0, mintAmount);
      expect(await token0.balanceOf(user4.address)).to.equal(0);
      await expect(clr.connect(user4).deposit(mint.amount0Minted, mint.amount1Minted)).to.be.reverted;
    }),

    it('shouldn\'t allow user to mint with 0 amount', async () => {
      await expect(clr.deposit(0, 0)).to.be.reverted;
    }),

    it('shouldn\'t allow minting if contract is paused', async () => {
      await clr.pauseContract();
      let mintAmount = bnDecimals(10000, token0Decimals);
      await expect(clr.connect(user1).deposit(0, mintAmount)).
            to.be.revertedWith('Pausable: paused');
    }),

    it('should burn clr tokens from user when burning', async () => {
      let mintAmount = bnDecimals(1000000, token0Decimals);
      let burnAmount = bnDecimal(1);
      let mint = await clr.calculateAmountsMintedSingleToken(0, mintAmount);
      await clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted);
      await increaseTime(300);

      let balanceBefore = await stakedToken.balanceOf(user1.address);
      await clr.connect(user1).withdraw(burnAmount, 0, 0)
      let balanceAfter = await stakedToken.balanceOf(user1.address);

      expect(balanceBefore.sub(burnAmount)).to.eq(balanceAfter);
    }),

    it('should transfer asset balance back to user when burning', async () => {
      // mint so as to be able to burn
      let mintAmount = bnDecimals(1000000, token0Decimals);
      let burnAmount = bnDecimal(1);
      let mint = await clr.calculateAmountsMintedSingleToken(0, mintAmount);
      await clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted);
      await increaseTime(300);

      // calculate expected returned asset mount
      // both assets are returned to the user1 based on current pool price
      // liquidity share = burn amount * total liquidity / total supply
      const positionBalance = await clr.getStakedTokenBalance();
      const totalSupply = await clr.totalSupply();
      let amount0Expected = burnAmount.mul(positionBalance.amount0).div(totalSupply);
      let amount1Expected = burnAmount.mul(positionBalance.amount1).div(totalSupply);

      // burn
      let token0BalanceBefore = await token0.balanceOf(user1.address);
      let token1BalanceBefore = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(burnAmount, 0, 0)
      let token0BalanceAfter = await token0.balanceOf(user1.address);
      let token1BalanceAfter = await token0.balanceOf(user1.address);
      // Account for slippage during unstaking
      expect(token0BalanceBefore.add(amount0Expected)).to.be.closeTo(token0BalanceAfter, 1);
      expect(token1BalanceBefore.add(amount1Expected)).to.be.closeTo(token1BalanceAfter, 1);
    }),

    it('should unstake position liquidity on burn', async () => {
        // mint so as to be able to burn
        let mintAmount = bnDecimals(1000000, token0Decimals);
        let burnAmount = bnDecimal(1);
        let mint = await clr.calculateAmountsMintedSingleToken(0, mintAmount);
        await clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted);
        await increaseTime(300);

        // calculate expected returned asset mount
        // both assets are returned to the user based on current pool price
        // liquidity share = burn amount * total liquidity / total supply
        const positionLiquidity = await clr.getPositionLiquidity();
        const totalSupply = await clr.totalSupply();
        let proRataBalance = burnAmount.mul(positionLiquidity).div(totalSupply);

        let amountsExpected = await clr.getAmountsForLiquidity(proRataBalance);
        let amount0Expected = amountsExpected.amount0;
        let amount1Expected = amountsExpected.amount1;
        let liquidityUnstaked = await clr.getLiquidityForAmounts(amount0Expected, amount1Expected);

        const positionLiquidityBefore = await clr.getPositionLiquidity();
        await clr.connect(user1).withdraw(burnAmount, 0, 0)
        const positionLiquidityAfter = await clr.getPositionLiquidity();

        expect(positionLiquidityBefore.sub(liquidityUnstaked)).to.be.eq(positionLiquidityAfter);
    }),

    it('shouldn\'t allow user to burn above more than the expected withdrawable amounts', async () => {
      // mint to have balance to burn
      let mintAmount = bnDecimals(1000000, token0Decimals);
      let mint = await clr.calculateAmountsMintedSingleToken(0, mintAmount);
      await clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted);

      let burnAmount = bnDecimal(1);
      let amts = await clr.calculateWithdrawAmounts(burnAmount);

      // withdraw with 101% of the expected withdraw amounts should be reverted
      await expect(clr.withdraw(burnAmount, amts.amount0.mul(101).div(100), amts.amount1.mul(101).div(100))).
      to.be.reverted;

      // withdraw with 99% of the expected amounts shouldn't be reverted
      await expect(clr.withdraw(burnAmount, amts.amount0.mul(99).div(100), amts.amount1.mul(99).div(100))).
      not.to.be.reverted;
    }),

    it('shouldn\'t allow user to burn if he hasn\'t minted', async () => {
      let burnAmount = bnDecimals(10000, token0Decimals);
      expect(await clr.balanceOf(user2.address)).to.equal(0);
      await expect(clr.connect(user1).withdraw(burnAmount, 0, 0)).to.be.reverted;
    }),

    it('shouldn\'t allow user to burn with 0 amount', async () => {
      await expect(clr.withdraw(0, 0, 0)).to.be.reverted;
    }),

    it('should revert if burn amount exceeds available liquidity', async () => {
      let poolTotalLiquidity = await clr.getPositionLiquidity();
      let burnAmount = poolTotalLiquidity.add(1);
      await expect(clr.withdraw(burnAmount, 0, 0)).to.be.reverted;
    })
  })
})
