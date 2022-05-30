const assert = require('assert');
const { expect } = require('chai');
const { deploymentFixture } = require('./fixture');

// Ownership functions tests for CLR
describe('Contract: CLR', async () => {
  let clr, xTokenManager, admin, user1, user2, user3;

  beforeEach(async () => {
      ({ clr, xTokenManager } = await deploymentFixture());
      [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
  })

  describe('Ownership', async () => {
    it('should allow admin to set other managers', async () => {
        await clr.addManager(user1.address);
        assert(true);
    }),
    it('should allow new managers to call management functions', async () => {
        await clr.addManager(user1.address);
        await clr.connect(user1).pauseContract();
        assert(true);
    }),
    it('shouldn\'t allow non-managers to call management functions', async () => {
        await expect(clr.connect(user1).reinvest()).to.be.reverted;
        await expect(clr.connect(user1).collectAndReinvest()).to.be.reverted;
        await expect(clr.connect(user1).pauseContract()).to.be.reverted;
    })
  })
})
