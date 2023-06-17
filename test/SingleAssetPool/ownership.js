const assert = require('assert');
const { expect } = require('chai');
const { deploymentFixture } = require('./fixture');

// Ownership functions tests for SingleAssetPool
describe('Contract: SingleAssetPool', async () => {
  let singleAssetPool, admin, user1, user2, user3;

  beforeEach(async () => {
      ({ singleAssetPool } = await deploymentFixture());
      [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
  })

  describe('Ownership', async () => {
    it('should allow admin to set other managers', async () => {
        await singleAssetPool.addManager(user1.address);
        assert(true);
    }),

    it('should allow new managers to call management functions', async () => {
        await singleAssetPool.addManager(user1.address);
        await singleAssetPool.connect(user1).pauseContract();
        assert(true);
    }),
    
    it('shouldn\'t allow non-managers to call management functions', async () => {
        await expect(singleAssetPool.connect(user1).pauseContract()).to.be.reverted;
    })
  })
})
