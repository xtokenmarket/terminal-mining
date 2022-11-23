const { expect } = require('chai');
const { bnDecimals } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// View function tests for NonRewardPool
describe('Contract: NonRewardPool', async () => {
  let nonRewardPool, token0Decimals, token1Decimals, admin;

  beforeEach(async () => {
      ({ nonRewardPool, token0Decimals, token1Decimals } = await deploymentFixture());
      [admin, ...addrs] = await ethers.getSigners();
  })

  describe('View functions', async () => {
    it('should be able to get position liquidity', async () => {
        let positionLiquidity = await nonRewardPool.getPositionLiquidity();
        expect(positionLiquidity).not.to.be.eq(0);
    }),

    it('should be able to get buffer balances individually', async () => {
        let buffer = await nonRewardPool.getBufferTokenBalance();
        let buffer0 = await nonRewardPool.getBufferToken0Balance();
        let buffer1 = await nonRewardPool.getBufferToken1Balance();
        expect(buffer.amount0).to.be.eq(buffer0);
        expect(buffer.amount1).to.be.eq(buffer1);
    }),

    it('should be able to get position token balances individually', async () => {
        let position = await nonRewardPool.getStakedTokenBalance();
        expect(position.amount0).not.to.be.eq(0);
        expect(position.amount1).not.to.be.eq(0);
    }),

    it('should be able to get the withdraw amounts for nonRewardPool balance', async () => {
        await expect(nonRewardPool.calculateWithdrawAmounts(1000)).not.to.be.reverted;
    })
  })
})
