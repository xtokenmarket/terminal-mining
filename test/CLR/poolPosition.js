const { expect } = require('chai');
const { bnDecimals } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Pool Position initializing, migrating and checking
describe('Contract: CLR', async () => {
  let clr, router, token0, token1, token0Decimals, token1Decimals, admin, user1, user2, user3;

  before(async () => {
      ({ clr, token0, token1, token0Decimals, token1Decimals, router } = await deploymentFixture());
      [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
      // approve some tokens for swapping
      let approveAmount = bnDecimals(100000000, token0Decimals);
      let approveAmount2 = bnDecimals(100000000, token1Decimals);
      await token0.approve(router.address, approveAmount);
      await token1.approve(router.address, approveAmount2);
  })

  describe('Pool position', async () => {
    it('should revert on attempting to initialize position again', async () => {
        let mintAmount = bnDecimals(100000000, token0Decimals);
        let mintAmount2 = bnDecimals(100000000, token1Decimals);
        await expect(clr.mintInitial(mintAmount, mintAmount2)).
            to.be.reverted;
    }),

    it('should retrieve pool position lower and upper ticks', async () => {
        let ticks = await clr.getTicks();

        expect(ticks.tick0).to.equal(-600);
        expect(ticks.tick1).to.equal(600);
    }),

    it('should retrieve staked token balance in the pool position', async () => {
        let balance = await clr.getStakedTokenBalance();

        expect(balance.amount0).not.to.equal(0);
        expect(balance.amount1).not.to.equal(0);
    }),

    it('should retrieve pool position nft id', async () => {
        let tokenId = await clr.tokenId();

        expect(tokenId).not.to.equal(0);
    })
  })
})
