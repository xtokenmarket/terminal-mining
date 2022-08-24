const { expect } = require('chai');
const { bnDecimals } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// View function tests for CLR
describe('Contract: CLR', async () => {
  let clr, token0Decimals, token1Decimals, admin;

  beforeEach(async () => {
      ({ clr, token0Decimals, token1Decimals } = await deploymentFixture());
      [admin, ...addrs] = await ethers.getSigners();
  })

  describe('View functions', async () => {
    it('should be able to get position liquidity', async () => {
        let positionLiquidity = await clr.getPositionLiquidity();
        expect(positionLiquidity).not.to.be.eq(0);
    }),

    it('should be able to get position token balances individually', async () => {
        let position = await clr.getStakedTokenBalance();
        expect(position.amount0).not.to.be.eq(0);
        expect(position.amount1).not.to.be.eq(0);
    }),

    it('should be able to get the NAV', async () => {
        let nav = await clr.getNAV();
        expect(nav).not.to.be.eq(0);
    }),

    it('should be able to get the withdraw amounts for clr balance', async () => {
        await expect(clr.calculateWithdrawAmounts(1000)).not.to.be.reverted;
    })
  })
})
