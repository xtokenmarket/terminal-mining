const { expect } = require('chai');
const { bnDecimals } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// View function tests for SingleAssetPool
describe('Contract: SingleAssetPool', async () => {
  let singleAssetPool, tokenDecimals, rewardToken, admin;

  beforeEach(async () => {
      ({ singleAssetPool, tokenDecimals, rewardToken } = await deploymentFixture());
      [admin, user1, ...addrs] = await ethers.getSigners();
  })

  describe('View functions', async () => {
    it('should be able to get staked balance of user', async () => {
        let amount = bnDecimals(1000, tokenDecimals);
        await singleAssetPool.connect(user1).stake(amount);
        const stakedBalance = await singleAssetPool.stakedBalanceOf(user1.address);
        expect(stakedBalance).to.be.eq(amount);
    }),

    it('should be able to get total supply staked', async () => {
        let amount = bnDecimals(1000, tokenDecimals);
        await singleAssetPool.connect(user1).stake(amount);
        const stakedBalance = await singleAssetPool.stakedTotalSupply();
        expect(stakedBalance).to.be.eq(amount);
    })

    it('should be able to get reward tokens', async () => {
        const _rewardToken = await singleAssetPool.rewardTokens(0);
        expect(_rewardToken).to.be.eq(rewardToken.address);
    })
  })
})
