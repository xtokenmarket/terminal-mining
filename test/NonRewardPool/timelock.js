const { expect } = require('chai');
const { bnDecimal, bnDecimals, increaseTime, getPriceInX96 } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Time lock tests for NonRewardPool
describe('Contract: NonRewardPool', async () => {
    beforeEach(async () => {
          ({ token0, token1, token0Decimals, token1Decimals, nonRewardPool } = 
            await deploymentFixture());
          [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
    })

  describe('Mint, burn and transfer lock', async () => {
    it(`account shouldn\'t be able to call mint, burn and transfer 
            before 5 minutes have passed`, async () => {
        let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await expect(nonRewardPool.withdraw(bnDecimal(1), 0, 0)).
            to.be.reverted;
        await expect(nonRewardPool.transfer(user1.address, bnDecimal(10000))).
            to.be.reverted;
    }),

    it(`account shouldn\'t be able to call burn, mint and transfer 
            before 5 minutes have passed`, async () => {
        await nonRewardPool.withdraw(bnDecimal(1), 0, 0);
        let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
        await expect(nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted)).
            to.be.reverted;
        await expect(nonRewardPool.transfer(user1.address, bnDecimal(10000))).
            to.be.reverted;
    }),

    it(`no account should be able to call transferFrom from sender address
         which has called mint before 5 minutes have passed`, async () => {
        await nonRewardPool.approve(user1.address, bnDecimal(100000));
        await nonRewardPool.approve(user2.address, bnDecimal(100000));
        let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await expect(nonRewardPool.connect(user1).transferFrom(admin.address, user1.address, bnDecimal(10000))).
            to.be.reverted;
        await expect(nonRewardPool.connect(user2).transferFrom(admin.address, user1.address, bnDecimal(10000))).
            to.be.reverted;
    }),

    it(`no account should be able to call transferFrom from sender address
         which has called burn before 5 minutes have passed`, async () => {
        await nonRewardPool.approve(user1.address, bnDecimal(100000));
        await nonRewardPool.approve(user2.address, bnDecimal(100000));
        await nonRewardPool.withdraw(bnDecimal(1), 0, 0);
        await expect(nonRewardPool.connect(user1).transferFrom(admin.address, user1.address, bnDecimal(10000))).
            to.be.reverted;
        await expect(nonRewardPool.connect(user2).transferFrom(admin.address, user1.address, bnDecimal(10000))).
            to.be.reverted;
    }),

    it(`account should be able to call mint, burn, transfer or transferFrom 
            if more than 5 minutes have passed`, async () => {
        let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.withdraw(bnDecimal(1), 0, 0);
    }),

    it('other accounts should be able to call mint even if one is locked', async () => {
        let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await expect(nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted)).
            to.be.reverted;
        await nonRewardPool.connect(user1).deposit(amts.amount0Minted, amts.amount1Minted);
        await nonRewardPool.connect(user2).deposit(amts.amount0Minted, amts.amount1Minted);
    }),

    it('other accounts should be able to call burn even if one is locked', async () => {
        let amts = await nonRewardPool.calculateAmountsMintedSingleToken(0, bnDecimals(1000000, token0Decimals));
        await nonRewardPool.connect(user1).deposit(amts.amount0Minted, amts.amount1Minted);
        await nonRewardPool.connect(user2).deposit(amts.amount0Minted, amts.amount1Minted);
        await increaseTime(300);
        await nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted);
        await expect(nonRewardPool.deposit(amts.amount0Minted, amts.amount1Minted)).
            to.be.reverted;
        await nonRewardPool.connect(user1).withdraw(1, 0, 0);
        await nonRewardPool.connect(user2).withdraw(1, 0, 0);
    })
  })
})
