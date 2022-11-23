const { expect } = require('chai');
const { bnDecimals, bnDecimal, swapToken1ForToken0, swapToken0ForToken1 } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Events tests for NonRewardPool
describe('Contract: NonRewardPool', async () => {
  let nonRewardPool, router, token0, token1, admin, user1;

  beforeEach(async () => {
      ({ nonRewardPool, token0, token1, token0Decimals, router } = await deploymentFixture());
      [admin, user1, ...addrs] = await ethers.getSigners();
  })

  describe('Events', async () => {
    it('should emit event on reinvest', async () => {
        await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
        await nonRewardPool.collect();
        await expect(nonRewardPool.reinvest())
              .to.emit(nonRewardPool, 'Reinvest')
    }),

    it('should emit event on fee collection', async () => {
        await expect(nonRewardPool.collect())
              .to.emit(nonRewardPool, 'FeeCollected')
    }),

    it('should emit event on deposit', async () => {
        let amount0 = bnDecimals(1000, token0Decimals);
        let mint = await nonRewardPool.calculateAmountsMintedSingleToken(0, amount0);
        await expect(nonRewardPool.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted)).to.emit(nonRewardPool, 'Deposit');
    }),

    it('should emit event on withdraw', async () => {
        await expect(nonRewardPool.withdraw(bnDecimal(1), 0, 0)).to.emit(nonRewardPool, 'Withdraw');
    })
  })
})
