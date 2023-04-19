const assert = require("assert");
const { expect } = require("chai");
const { deploymentFixture } = require("./fixture");
const {
  deployArgs,
  bnDecimals,
  swapToken1ForToken0,
  swapToken0ForToken1,
  bnDecimal,
  increaseTime,
} = require("../../scripts/helpers");

describe("Contract: NonRewardPool", async () => {
  let nonRewardPool,
    strategy,
    admin,
    user1,
    user2,
    user3,
    token0Decimals,
    token0,
    token1,
    amount,
    router
  beforeEach(async () => {
    ({ nonRewardPool, xTokenManager, token0Decimals, token0, token1, router } =
      await deploymentFixture());
    [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
    strategy = await deployArgs("MockStrategy", nonRewardPool.address);
    await nonRewardPool.addManager(strategy.address);

    amount = bnDecimals(10, token0Decimals);
    await token0.connect(user1).approve(strategy.address, amount.mul(100000));
    await token1.connect(user1).approve(strategy.address, amount.mul(100000));
  });

  describe("Strategy", async () => {
    it("should register the strategy contract as manager role", async () => {
      const manager = await nonRewardPool.manager();
      expect(manager).to.eq(strategy.address);
    });

    it("should successfully deposit from the strategy contract", async () => {
      let mint = await nonRewardPool.calculateAmountsMintedSingleToken(
        0,
        amount
      );
      await strategy
        .connect(user1)
        .deposit(mint.amount0Minted, mint.amount1Minted);
      let balance = await nonRewardPool.balanceOf(strategy.address);
      expect(balance).to.be.gt(0);
    });

    it("should successfully withdraw from the strategy contract", async () => {
      let mint = await nonRewardPool.calculateAmountsMintedSingleToken(
        0,
        amount
      );
      await strategy
        .connect(user1)
        .deposit(mint.amount0Minted, mint.amount1Minted);
      await increaseTime(10);
      const token0BalBefore = await token0.balanceOf(user1.address);
      const token1BalBefore = await token1.balanceOf(user1.address);
      const nrpBal = await strategy.getBal(user1.address);
      await strategy.connect(user1).withdraw(nrpBal, 0, 0);
      const token0BalAfter = await token0.balanceOf(user1.address);
      const token1BalAfter = await token1.balanceOf(user1.address);
      expect(token0BalAfter).to.be.gt(token0BalBefore);
      expect(token1BalAfter).to.be.gt(token1BalBefore);
    });

    it("should not allow a non owner/manager to call depositFromStrategy", async () => {
      let mint = await nonRewardPool.calculateAmountsMintedSingleToken(
        0,
        amount
      );
      await expect(
        nonRewardPool
          .connect(user1)
          .depositFromStrategy(mint.amount0Minted, mint.amount1Minted)
      ).to.be.revertedWith("Function may be called only by owner or manager");
    });

    it("should not allow a non owner/manager to call withdrawToStrategy", async () => {
      let mint = await nonRewardPool.calculateAmountsMintedSingleToken(
        0,
        amount
      );
      await strategy
        .connect(user1)
        .deposit(mint.amount0Minted, mint.amount1Minted);
      const nrpBal = await strategy.getBal(user1.address);
      await expect(
        nonRewardPool
          .connect(user1)
          .withdrawToStrategy(nrpBal, 0, 0)
      ).to.be.revertedWith("Function may be called only by owner or manager");
    });

    it("should not allow a non owner/manager to call collectToStrategy", async () => {
      await expect(
        nonRewardPool
          .connect(user1)
          .collectToStrategy()
      ).to.be.revertedWith("Function may be called only by owner or manager");
    });

    it("should not allow the deposit function to be called if paused", async () => {
      await nonRewardPool.pauseContract();
      let mint = await nonRewardPool.calculateAmountsMintedSingleToken(
        0,
        amount
      );
      await expect(
        nonRewardPool
          .connect(user1)
          .deposit(mint.amount0Minted, mint.amount1Minted)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("should allow the depositFromStrategy function to be called if paused", async () => {
      await nonRewardPool.pauseContract();
      let mint = await nonRewardPool.calculateAmountsMintedSingleToken(
        0,
        amount
      );
      // strategy.deposit() in mock calls nonRewardPool.depositFromStrategy()
      await strategy
        .connect(user1)
        .deposit(mint.amount0Minted, mint.amount1Minted);
    });

    it("should allow collectToStrategy to collect fees to the strategy", async () => {
      let mint = await nonRewardPool.calculateAmountsMintedSingleToken(
        0,
        amount
      );
      await strategy
        .connect(user1)
        .deposit(mint.amount0Minted, mint.amount1Minted);
       await swapToken0ForToken1(
         router,
         token0,
         token1,
         admin.address,
         bnDecimal(10000)
       ); 
       await swapToken1ForToken0(
         router,
         token0,
         token1,
         admin.address,
         bnDecimal(10000)
       );
       const token0BalBefore = await token0.balanceOf(strategy.address)
       const token1BalBefore = await token1.balanceOf(strategy.address)
       await strategy.collect()
       const token0BalAfter = await token0.balanceOf(strategy.address)
       const token1BalAfter = await token1.balanceOf(strategy.address)
       expect(token0BalAfter).to.be.gt(token0BalBefore);
       expect(token1BalAfter).to.be.gt(token1BalBefore);
    });
  });
});
