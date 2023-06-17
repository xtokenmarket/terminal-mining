const { deploymentFixture } = require('./fixture');
const { getTokenBalance, bn, bnDecimal, bnDecimals, increaseTime } = require('../../scripts/helpers');
const { expect } = require('chai');

// Stake and unstake tests for SingleAssetPool
describe('Contract: SingleAssetPool', async () => {
  let lmTerminal, singleAssetPool, admin, user1, user2, user3, user4;
  let stakingToken, tokenDecimals, rewardToken

  beforeEach(async () => {
      ({ lmTerminal, rewardToken, singleAssetPool, stakingToken, tokenDecimals } = 
          await deploymentFixture());
      [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
  })

  describe('Stake and unstake', async () => {
    it('should increase user\'s staked balance on staking', async () => {
        let amount = bnDecimals(1000000, tokenDecimals);
        await singleAssetPool.connect(user1).stake(amount);
        const stakedBalance = await singleAssetPool.stakedBalanceOf(user1.address);

        // staked balance is precisely the amount staked
        expect(stakedBalance).to.be.eq(amount);
    }),

    it('should transfer asset balance from user when staking', async () => {
        let balanceBefore = await stakingToken.balanceOf(user1.address);
        let amount = bnDecimals(1000000, tokenDecimals);

        await singleAssetPool.connect(user1).stake(amount);

        let balanceAfter = await stakingToken.balanceOf(user1.address);
        let amountSent = balanceBefore.sub(balanceAfter);

        expect(amountSent).to.be.eq(amount);
    }),

    it('should transfer asset balance to contract when staking', async () => {
        let balanceBefore = await stakingToken.balanceOf(singleAssetPool.address);
        let amount = bnDecimals(1000000, tokenDecimals);

        await singleAssetPool.connect(user1).stake(amount);

        let balanceAfter = await stakingToken.balanceOf(singleAssetPool.address);
        let amountReceived = balanceAfter.sub(balanceBefore);

        expect(amountReceived).to.be.eq(amount);
    }),

    it('shouldn\'t allow user to stake if he has no token balance', async () => {
        let amount = bnDecimals(10000, tokenDecimals);
        expect(await stakingToken.balanceOf(user4.address)).to.equal(0);
        await expect(singleAssetPool.connect(user4).stake(amount)).to.be.reverted;
    }),

    it('shouldn\'t allow user to stake with 0 amount', async () => {
        await expect(singleAssetPool.stake(0)).to.be.revertedWith('Need to stake at least one token');
    }),

    it('shouldn\'t allow minting if contract is paused', async () => {
        await singleAssetPool.pauseContract();
        const amount = bnDecimals(10000, tokenDecimals);
        await expect(singleAssetPool.connect(user1).stake(amount)).
              to.be.revertedWith('Pausable: paused');
    }),

    it('should reduce user\'s staked balance when unstaking', async () => {
        let stakedBalance = await singleAssetPool.stakedBalanceOf(user1.address);
       // expect initial balance to be 0
        expect(stakedBalance).to.be.eq(0);
        let amount = bnDecimals(1000000, tokenDecimals);
        await singleAssetPool.connect(user1).stake(amount);

        await singleAssetPool.connect(user1).unstake(amount);

        stakedBalance = await singleAssetPool.stakedBalanceOf(user1.address);

        // expect final balance to be 0
        expect(stakedBalance).to.be.eq(0);
    }),

    it('should transfer asset balance back to user when unstaking', async () => {
       let amount = bnDecimals(1000000, tokenDecimals);
       await singleAssetPool.connect(user1).stake(amount);

       const balanceBefore = await stakingToken.balanceOf(user1.address);

       await singleAssetPool.connect(user1).unstake(amount);

       const balanceAfter = await stakingToken.balanceOf(user1.address);

       const balanceGain = balanceAfter.sub(balanceBefore);

       // expect user to gain exactly the amount unstaked
       expect(balanceGain).to.be.eq(amount);
    }),

    it('should reduce contract asset balance when unstaking', async () => {
        let amount = bnDecimals(1000000, tokenDecimals);
        await singleAssetPool.connect(user1).stake(amount);

        const balanceBefore = await stakingToken.balanceOf(singleAssetPool.address);

        await singleAssetPool.connect(user1).unstake(amount);

        const balanceAfter = await stakingToken.balanceOf(singleAssetPool.address);

        const balanceReduction = balanceBefore.sub(balanceAfter);

        // expect contract to send exactly the amount unstaked
        expect(balanceReduction).to.be.eq(amount);
    }),

    it('shouldn\'t allow user to burn above more than his staked balance', async () => {
        let amount = bnDecimals(1000000, tokenDecimals);
        await singleAssetPool.connect(user1).stake(amount);

        await expect(singleAssetPool.connect(user1).unstake(amount.add(1))).to.be.revertedWith('Not enough staked balance')
    }),

    it('shouldn\'t allow user to burn if he hasn\'t minted', async () => {
      let amount = bnDecimals(1000000, tokenDecimals);
      await expect(singleAssetPool.connect(user1).unstake(amount)).to.be.revertedWith('Not enough staked balance')
    }),

    it('shouldn\'t allow user to burn with 0 amount', async () => {
      await expect(singleAssetPool.unstake(0)).to.be.revertedWith('Need to unstake at least one token');
    })
  })
})
