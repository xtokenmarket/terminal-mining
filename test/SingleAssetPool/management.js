const assert = require('assert');
const { expect } = require('chai');
const { bnDecimal, increaseTime, bnDecimals, deployArgs, swapToken0ForToken1, swapToken1ForToken0, decreaseTime } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Management functions tests for SingleAssetPool
describe('Contract: SingleAssetPool', async () => {
  let lmTerminal, singleAssetPool, stakingToken, rewardToken, admin, user1, user2, user3, user4;

  beforeEach(async () => {
      ({ lmTerminal, rewardToken, stakingToken, singleAssetPool } = 
          await deploymentFixture());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
      await increaseTime(300);
  })

  describe('Management', async () => {
    it('should be able to pause and unpause the contract', async () => {
        await singleAssetPool.pauseContract();
        let isPaused = await singleAssetPool.paused();
        assert(isPaused == true);

        await singleAssetPool.unpauseContract();
        isPaused = await singleAssetPool.paused();
        assert(isPaused == false);
    }),

    it(`shouldn't be able to initialize rewards from singleAssetPool`, async () => {
        await expect(singleAssetPool.initializeReward(1000, rewardToken.address)).
            to.be.revertedWith('Function may be called only via Terminal')
    }),

    it(`shouldn't be able to set rewards duration from singleAssetPool`, async () => {
        await expect(singleAssetPool.setRewardsDuration(1000)).
            to.be.revertedWith('Function may be called only via Terminal')
        await decreaseTime(86400*10);
    })
  })
})
