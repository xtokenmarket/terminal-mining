const { expect } = require('chai');
const { bnDecimals, bnDecimal, swapToken1ForToken0, swapToken0ForToken1 } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Events tests for SingleAssetPool
describe('Contract: SingleAssetPool', async () => {
  let singleAssetPool, tokenDecimals, stakingToken, admin, user1;

  beforeEach(async () => {
      ({ singleAssetPool, stakingToken, tokenDecimals, router } = await deploymentFixture());
      [admin, user1, ...addrs] = await ethers.getSigners();
  })

  describe('Events', async () => {
    it('should emit event on stake', async () => {
        let amount = bnDecimals(1000, tokenDecimals);
        await expect(singleAssetPool.connect(user1).stake(amount)).to.emit(singleAssetPool, 'Staked');
    }),

    it('should emit event on unstake', async () => {
        let amount = bnDecimals(1000, tokenDecimals);
        await singleAssetPool.connect(user1).stake(amount);
        await expect(singleAssetPool.connect(user1).unstake(amount)).to.emit(singleAssetPool, 'Withdrawn');
    }),

    it('should emit event on unstake and claim rewards', async () => {
        let amount = bnDecimals(1000, tokenDecimals);
        await singleAssetPool.connect(user1).stake(amount);
        await expect(singleAssetPool.connect(user1).unstakeAndClaimReward(amount)).to.emit(singleAssetPool, 'Withdrawn');
    })
  })
})
