const { deploymentFixture } = require('./fixture');
const { getTokenBalance, bn, bnDecimal, bnDecimals, increaseTime } = require('../../scripts/helpers');
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
        await clr.connect(user1).deposit(0, amount);
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
        await clr.connect(user1).deposit(1, amount);
        let balance = await stakedToken.balanceOf(user1.address);

        let am = await clr.calculateAmountsMintedSingleToken(0, amount);
        let liquidityAmount = await clr.getLiquidityForAmounts(am.amount0Minted, am.amount1Minted);
        let positionLiquidity = await clr.getPositionLiquidity();

        const totalSupply = await clr.totalSupply();
        let calculatedBalance = bn(liquidityAmount).mul(totalSupply).div(positionLiquidity);

        expect(balance).to.eq(calculatedBalance);
    }),

    it('should be able to mint even if user sends more than his available balance', async () => {
        // This test case is for rare scenarios where user sends a mint transaction
        // But token ratios are changed before his tx is mined, and
        // he has to deposit more than his available balance
        let t0Balance = await token0.balanceOf(user1.address);
        let amount = t0Balance.add(t0Balance.div(10));
        await expect(clr.connect(user1).deposit(0, amount)).
          not.to.be.reverted;
    }),

    it('should transfer asset balance from user when minting', async () => {
        let balancetoken0Before = await token0.balanceOf(user1.address);
        let balancetoken1Before = await token1.balanceOf(user1.address)
        let amount = bnDecimals(1000000, token0Decimals);
        let am = await clr.calculateAmountsMintedSingleToken(0, amount);

        await clr.connect(user1).deposit(0, amount);
        let balancetoken0After = await token0.balanceOf(user1.address);
        let balancetoken1After = await token1.balanceOf(user1.address)

        expect(balancetoken0Before.sub(am.amount0Minted)).to.be.eq(balancetoken0After);
        expect(balancetoken1Before.sub(am.amount1Minted)).to.be.eq(balancetoken1After);
    }),

    it('should stake tokens in position when minting', async () => {
        let amount = bnDecimals(1000000, token0Decimals);
        let am = await clr.calculateAmountsMintedSingleToken(0, amount);
        let liquidity = await clr.getLiquidityForAmounts(
                              am.amount0Minted, am.amount1Minted)

        let positionLiquidityBefore = await clr.getPositionLiquidity();
        await clr.connect(user1).deposit(0, amount);
        let positionLiquidityAfter = await clr.getPositionLiquidity();

        expect(positionLiquidityBefore.add(liquidity)).to.be.eq(positionLiquidityAfter);
    }),

    it('shouldn\'t allow user to mint if he has no token balance', async () => {
      let mintAmount = bnDecimals(10000, token0Decimals);
      expect(await token0.balanceOf(user4.address)).to.equal(0);
      await expect(clr.connect(user4).deposit(0, mintAmount)).to.be.reverted;
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
      await clr.connect(user1).deposit(0, mintAmount);
      await increaseTime(300);

      let balanceBefore = await stakedToken.balanceOf(user1.address);
      await clr.connect(user1).withdraw(burnAmount)
      let balanceAfter = await stakedToken.balanceOf(user1.address);

      expect(balanceBefore.sub(burnAmount)).to.eq(balanceAfter);
    }),

    it('should transfer asset balance back to user when burning', async () => {
      // mint so as to be able to burn
      let mintAmount = bnDecimals(1000000, token0Decimals);
      let burnAmount = bnDecimal(1);
      await clr.connect(user1).deposit(0, mintAmount);
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
      await clr.connect(user1).withdraw(burnAmount)
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
        await clr.connect(user1).deposit(0, mintAmount);
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
        await clr.connect(user1).withdraw(burnAmount)
        const positionLiquidityAfter = await clr.getPositionLiquidity();

        expect(positionLiquidityBefore.sub(liquidityUnstaked)).to.be.eq(positionLiquidityAfter);
    })

    it('shouldn\'t allow user to burn if he hasn\'t minted', async () => {
      let burnAmount = bnDecimals(10000, token0Decimals);
      expect(await clr.balanceOf(user2.address)).to.equal(0);
      await expect(clr.connect(user1).withdraw(burnAmount)).to.be.reverted;
    }),

    it('shouldn\'t allow user to burn with 0 amount', async () => {
      await expect(clr.withdraw(0)).to.be.reverted;
    }),

    it('should revert if burn amount exceeds available liquidity', async () => {
      let poolTotalLiquidity = await clr.getPositionLiquidity();
      let burnAmount = poolTotalLiquidity.add(1);
      await expect(clr.withdraw(burnAmount)).to.be.reverted;
    })
  })
})
