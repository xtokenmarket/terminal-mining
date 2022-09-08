const assert = require('assert');
const { expect } = require('chai');
const { deploymentFixture } = require('./fixture');

// Ownership functions tests for NonRewardPool
describe('Contract: NonRewardPool', async () => {
  let nonRewardPool, xTokenManager, admin, user1, user2, user3;

  beforeEach(async () => {
      ({ nonRewardPool, xTokenManager } = await deploymentFixture());
      [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
  })

  describe('Ownership', async () => {
    it('should allow admin to set other managers', async () => {
        await nonRewardPool.addManager(user1.address);
        assert(true);
    }),
    it('should allow new managers to call management functions', async () => {
        await nonRewardPool.addManager(user1.address);
        await nonRewardPool.connect(user1).pauseContract();
        assert(true);
    }),
    it('shouldn\'t allow non-managers to call management functions', async () => {
        await expect(nonRewardPool.connect(user1).reinvest()).to.be.reverted;
        await expect(nonRewardPool.connect(user1).collectAndReinvest()).to.be.reverted;
        await expect(nonRewardPool.connect(user1).pauseContract()).to.be.reverted;
    })
  })
})
