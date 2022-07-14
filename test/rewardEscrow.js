const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bnDecimal, bnDecimals, mineBlocks, getPriceInX96, 
        deploy, deployArgs, increaseTime, bn, getLastBlockTimestamp } = require('../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Tests for Reward Escrow
describe('Contract: RewardEscrow', async () => {
    let lmTerminal, token0, token1, rewardToken, rewardToken2, rewardToken3;
    let admin, user1, user2, user3;
    let rewardDuration1, rewardDuration2, vestingPeriod1, vestingPeriod2, token0Decimals;
    let pool1, pool2, stakedToken, stakedToken2, rewardEscrow;
  
    beforeEach(async () => {
          ({ lmTerminal, token0, token1, rewardToken } = await deploymentFixture());
          [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
          token0Decimals = await token0.decimals();
          const poolPrice = await getPriceInX96(1);
          await lmTerminal.deployUniswapPool(token0.address, token1.address, 3000, poolPrice)
  
          rewardDuration1 = '7257600'; // 12 week program duration
          vestingPeriod1 = '3628800' // Vesting period in seconds
          // Deploy Pool with 1 reward token and 6 week vesting period
          await lmTerminal.deployIncentivizedPool(
              'wETH-XTK-CLR',
              { lowerTick: -600, upperTick: 600 }, 
              { rewardTokens: [rewardToken.address], vestingPeriod: vestingPeriod1 }, 
              { fee: 3000, token0: token0.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
              { value: lmTerminal.deploymentFee() });

          await increaseTime(300);

          rewardDuration2 = '14515200'; // 24 week program duration
          vestingPeriod2 = '4838400' // Vesting period in seconds
          // Deploy Pool with 3 reward tokens and 8 week vesting period
          rewardToken2 = await deployArgs('ERC20Basic', 'wBTC', 'wBTC');
          rewardToken3 = await deployArgs('ERC20Basic', 'wETH', 'wETH');
          await lmTerminal.deployIncentivizedPool(
              'wETH-XTK-CLR',
              { lowerTick: -600, upperTick: 600 }, 
              { rewardTokens: [rewardToken.address, rewardToken2.address, rewardToken3.address], 
                vestingPeriod: vestingPeriod2 }, 
              { fee: 3000, token0: token0.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
              { value: lmTerminal.deploymentFee() });

          await increaseTime(300);

          let rewardEscrowAddress = await lmTerminal.rewardEscrow();
          rewardEscrow = await ethers.getContractAt('RewardEscrow', rewardEscrowAddress);

          let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
          pool1 = await ethers.getContractAt('CLR', clrPoolAddress);
          let stakedTokenAddress = await pool1.stakedToken();
          stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);
  
          clrPoolAddress = await lmTerminal.deployedCLRPools(1);
          pool2 = await ethers.getContractAt('CLR', clrPoolAddress);
          stakedTokenAddress = await pool2.stakedToken();
          stakedToken2 = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);

          // Approvals for reward tokens and pools

          await rewardToken.approve(lmTerminal.address, bnDecimal(100000000000));
          await rewardToken2.approve(lmTerminal.address, bnDecimal(100000000000));
          await rewardToken3.approve(lmTerminal.address, bnDecimal(100000000000));
  
          await token0.approve(pool1.address, bnDecimal(100000000000));
          await token1.approve(pool1.address, bnDecimal(100000000000));
          await token0.approve(pool2.address, bnDecimal(100000000000));
          await token1.approve(pool2.address, bnDecimal(100000000000));
          await token0.connect(user1).approve(pool2.address, bnDecimal(100000000000));
          await token1.connect(user1).approve(pool2.address, bnDecimal(100000000000));
          let amts1 = await pool1.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
          let amts2 = await pool1.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
          await pool1.deposit(amts1.amount0Minted, amts1.amount1Minted);
          await increaseTime(300);
          await pool2.deposit(amts2.amount0Minted, amts2.amount1Minted);
          await increaseTime(300);

          // Initiate reward programs
          let pool1Rewards = [bnDecimal(1000000)];
          await lmTerminal.initiateRewardsProgram(pool1.address, pool1Rewards, rewardDuration1);
          let pool2Rewards = [bnDecimal(1000000), bnDecimal(100), bnDecimal(1000)];
          await lmTerminal.initiateRewardsProgram(pool2.address, pool2Rewards, rewardDuration2);
    })

  describe('Reward Escrow', async () => {
      it('should have added the incentivized pools as reward contracts', async () => {
            let pool1IsReward = await rewardEscrow.isRewardContract(pool1.address);
            let pool2IsReward = await rewardEscrow.isRewardContract(pool2.address);
            expect(pool1IsReward).to.be.true;
            expect(pool2IsReward).to.be.true;
      }),

      it('should have set the vesting periods for all incentivized pools', async () => {
            let vestingPeriodPool1 = await rewardEscrow.clrPoolVestingPeriod(pool1.address);
            let vestingPeriodPool2 = await rewardEscrow.clrPoolVestingPeriod(pool2.address);
            expect(vestingPeriodPool1).to.be.eq(vestingPeriod1);
            expect(vestingPeriodPool2).to.be.eq(vestingPeriod2);
      }),

      it('should receive reward token on claim', async () => {
            await increaseTime(rewardDuration1 / 10);
            let bb = await rewardToken.balanceOf(rewardEscrow.address);
            await pool1.claimReward()
            let ba = await rewardToken.balanceOf(rewardEscrow.address);
            expect(ba).to.be.gt(bb);
      }),

      it('should append vesting entry for user on claim', async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            let timestamp = await getLastBlockTimestamp();
            let expectedVestingEndtime = bn(timestamp).add(vestingPeriod1);

            let vestingEntriesCount =
                await rewardEscrow.numVestingEntries(pool1.address, rewardToken.address, admin.address);
            expect(vestingEntriesCount).to.be.eq(1);

            let rewardToClaim = await rewardToken.balanceOf(rewardEscrow.address);

            let vestingTime = await rewardEscrow.getNextVestingTime(
                pool1.address, rewardToken.address, admin.address);
            let vestingQuantity = await rewardEscrow.getNextVestingQuantity(
                pool1.address, rewardToken.address, admin.address);

            expect(vestingTime).to.be.eq(expectedVestingEndtime);
            expect(vestingQuantity).to.be.eq(rewardToClaim);
      }),

      it('should increase user escrowed balance on claim', async () => {
            let escrowedBefore = await rewardEscrow.balanceOf(rewardToken.address, admin.address);
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            let escrowedAfter = await rewardEscrow.balanceOf(rewardToken.address, admin.address)
            expect(escrowedAfter).to.be.gt(escrowedBefore);
      }),

      it('should increase total escrowed balance on claim', async () => {
            let escrowedBefore = await rewardEscrow.totalSupply(rewardToken.address);
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            let escrowedAfter = await rewardEscrow.totalSupply(rewardToken.address)
            expect(escrowedAfter).to.be.gt(escrowedBefore);
      }),

      it('should be able to retrieve vesting time and quantity in two ways', async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()

            // Get vesting entry using index
            let i = await rewardEscrow.getNextVestingIndex(
                pool1.address, rewardToken.address, admin.address);
            let vestingTime = await rewardEscrow.getVestingTime(
                pool1.address, rewardToken.address, admin.address, i);
            let vestingQuantity = await rewardEscrow.getVestingQuantity(
                pool1.address, rewardToken.address, admin.address, i);
            let vestingEntry = await rewardEscrow.getVestingScheduleEntry(
                pool1.address, rewardToken.address, admin.address, i);

            expect(vestingEntry[0]).to.be.eq(vestingTime);
            expect(vestingEntry[1]).to.be.eq(vestingQuantity);

            // Get next vesting entry (most recent one)
            let nextVestingTime = await rewardEscrow.getNextVestingTime(
                pool1.address, rewardToken.address, admin.address);
            let nextVestingQuantity = await rewardEscrow.getNextVestingQuantity(
                pool1.address, rewardToken.address, admin.address);
            let nextVestingEntry = await rewardEscrow.getNextVestingEntry(
                pool1.address, rewardToken.address, admin.address);

            expect(nextVestingEntry[0]).to.be.eq(nextVestingTime);
            expect(nextVestingEntry[1]).to.be.eq(nextVestingQuantity);
            expect(nextVestingTime).to.be.eq(vestingTime);
            expect(nextVestingQuantity).to.be.eq(vestingQuantity);

            // Get vesting index and entry for an address which hasn't claimed
            i = await rewardEscrow.getNextVestingIndex(
                pool1.address, rewardToken.address, user1.address);
            nextVestingEntry = await rewardEscrow.getNextVestingEntry(
                pool1.address, rewardToken.address, user1.address);

            expect(i).to.be.eq(0);
            expect(nextVestingEntry[0]).to.be.eq(0);
            expect(nextVestingEntry[1]).to.be.eq(0);
      }),

      it('should be able to retrieve all vesting entries for an address', async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()

            // Get all vesting entries
            let entries = await rewardEscrow.checkAccountSchedule(pool1.address, rewardToken.address, admin.address);

            // Get next vesting entry
            let vestingTime = await rewardEscrow.getNextVestingTime(pool1.address, rewardToken.address, admin.address);
            let vestingQuantity = await rewardEscrow.getNextVestingQuantity(pool1.address, rewardToken.address, admin.address);

            expect(entries[0]).to.be.eq(vestingTime);
            expect(entries[1]).to.be.eq(vestingQuantity);
            expect(entries[2]).to.be.eq(0);
      }),

      it(`should append two vesting entries for user on claiming from pool twice
                for pool with one reward token`, async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()

            let vestingEntriesCount =
                await rewardEscrow.numVestingEntries(pool1.address, rewardToken.address, admin.address);
            expect(vestingEntriesCount).to.be.eq(2);
      }),

      it(`should append 2 vesting entries for user on claiming from two different pools 
                sharing the same reward tokens`, async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            await pool2.claimReward()

            let vestingEntriesCount =
                await rewardEscrow.numVestingEntries(pool1.address, rewardToken.address, admin.address);
            expect(vestingEntriesCount).to.be.eq(1);
            vestingEntriesCount =
                await rewardEscrow.numVestingEntries(pool2.address, rewardToken.address, admin.address);
            expect(vestingEntriesCount).to.be.eq(1);
      }),

      it(`should make 3 different vesting entries for each token for a pool
                with 3 reward tokens`, async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool2.claimReward()

            let vestingEntriesCount =
                await rewardEscrow.numVestingEntries(pool2.address, rewardToken.address, admin.address);
            expect(vestingEntriesCount).to.be.eq(1);
            vestingEntriesCount =
                await rewardEscrow.numVestingEntries(pool2.address, rewardToken2.address, admin.address);
            expect(vestingEntriesCount).to.be.eq(1);
            vestingEntriesCount =
                await rewardEscrow.numVestingEntries(pool2.address, rewardToken3.address, admin.address);
            expect(vestingEntriesCount).to.be.eq(1);
      }),

      it(`shouldn't be able to append a vesting entry if 
                calling from any address other than clr pool`, async () => {
            await expect(rewardEscrow.appendVestingEntry(rewardToken.address, admin.address, 
                                                        pool1.address, bnDecimal(10000))).
                to.be.revertedWith('Only reward contract can perform this action');
      }),

      it(`address should be able to vest after the given vesting period passes`, async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            
            let rewardQuantity = await rewardEscrow.getNextVestingQuantity(
                pool1.address, rewardToken.address, admin.address);
            await increaseTime(Number(vestingPeriod1));
            let bb = await rewardToken.balanceOf(admin.address);
            await rewardEscrow.vest(pool1.address, rewardToken.address);
            let ba = await rewardToken.balanceOf(admin.address);
            let gained = ba.sub(bb);
            expect(gained).to.be.eq(rewardQuantity);
      }),

      it(`address should be able to vest for multiple tokens after the given vesting period passes`, async () => {
            await increaseTime(rewardDuration2 / 10);
            await pool2.claimReward()
            
            let rewardQuantity1 = await rewardEscrow.getNextVestingQuantity(
                pool2.address, rewardToken.address, admin.address);
            let rewardQuantity2 = await rewardEscrow.getNextVestingQuantity(
                pool2.address, rewardToken2.address, admin.address);
            let rewardQuantity3 = await rewardEscrow.getNextVestingQuantity(
                pool2.address, rewardToken3.address, admin.address);
            await increaseTime(Number(vestingPeriod2));

            let bb = await rewardToken.balanceOf(admin.address);
            await rewardEscrow.vest(pool2.address, rewardToken.address);
            let ba = await rewardToken.balanceOf(admin.address);
            let gained1 = ba.sub(bb);

            let bb2 = await rewardToken2.balanceOf(admin.address);
            await rewardEscrow.vest(pool2.address, rewardToken2.address);
            let ba2 = await rewardToken2.balanceOf(admin.address);
            let gained2 = ba2.sub(bb2);

            let bb3 = await rewardToken3.balanceOf(admin.address);
            await rewardEscrow.vest(pool2.address, rewardToken3.address);
            let ba3 = await rewardToken3.balanceOf(admin.address);
            let gained3 = ba3.sub(bb3);

            expect(gained1).to.be.eq(rewardQuantity1);
            expect(gained2).to.be.eq(rewardQuantity2);
            expect(gained3).to.be.eq(rewardQuantity3);
      }),

      it(`address should be able to vest for multiple tokens using vestAll after the given vesting period passes`, async () => {
        await increaseTime(rewardDuration2 / 10);
        await pool2.claimReward()
        
        let rewardQuantity1 = await rewardEscrow.getNextVestingQuantity(
            pool2.address, rewardToken.address, admin.address);
        let rewardQuantity2 = await rewardEscrow.getNextVestingQuantity(
            pool2.address, rewardToken2.address, admin.address);
        let rewardQuantity3 = await rewardEscrow.getNextVestingQuantity(
            pool2.address, rewardToken3.address, admin.address);
        await increaseTime(Number(vestingPeriod2));

        let bb = await rewardToken.balanceOf(admin.address);
        let bb2 = await rewardToken2.balanceOf(admin.address);
        let bb3 = await rewardToken3.balanceOf(admin.address);
        await rewardEscrow.vestAll(pool2.address, [rewardToken.address, rewardToken2.address, rewardToken3.address]);
        let ba = await rewardToken.balanceOf(admin.address);
        let gained1 = ba.sub(bb);
        let ba2 = await rewardToken2.balanceOf(admin.address);
        let gained2 = ba2.sub(bb2);
        let ba3 = await rewardToken3.balanceOf(admin.address);
        let gained3 = ba3.sub(bb3);

        expect(gained1).to.be.eq(rewardQuantity1);
        expect(gained2).to.be.eq(rewardQuantity2);
        expect(gained3).to.be.eq(rewardQuantity3);
     }),

      it(`address shouldn't receive any tokens if he tries to vest before end of vesting period`, async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            
            await increaseTime(vestingPeriod1 / 2);
            let bb = await rewardToken.balanceOf(admin.address);
            await rewardEscrow.vest(pool1.address, rewardToken.address);
            let ba = await rewardToken.balanceOf(admin.address);
            let gained = ba.sub(bb);
            expect(gained).to.be.eq(0);
      }),

      it(`address should be able to get the next vesting entry after vesting`, async () => {
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            await increaseTime(rewardDuration1 / 10);
            await pool1.claimReward()
            
            // Vest
            await increaseTime(Number(vestingPeriod1) - rewardDuration1 / 10);
            await rewardEscrow.vest(pool1.address, rewardToken.address);

            // get vesting index
            let i = await rewardEscrow.getNextVestingIndex(pool1.address, rewardToken.address, admin.address);
            expect(i).not.to.eq(0);
            
            // vest again
            let bb = await rewardToken.balanceOf(admin.address);
            await increaseTime(rewardDuration1 / 10);
            await rewardEscrow.vest(pool1.address, rewardToken.address);
            let ba = await rewardToken.balanceOf(admin.address);
            let gained = ba.sub(bb);
            expect(gained).not.to.be.eq(0);
      }),

      it(`Adding and removing contracts multiple times in a row should emit only a single event`, async () => {
          let newRewardEscrow = await deploy('RewardEscrow');
          await newRewardEscrow.initialize();

          // Add rewards contract
          await newRewardEscrow.addRewardsContract(pool1.address);
          let pool1IsReward = await newRewardEscrow.isRewardContract(pool1.address);
          expect(pool1IsReward).to.be.eq(true);

          expect(await newRewardEscrow.addRewardsContract(pool1.address)).
            not.to.emit(newRewardEscrow, 'RewardContractAdded')

          // Remove rewards contract
          await newRewardEscrow.removeRewardsContract(pool1.address);
          pool1IsReward = await newRewardEscrow.isRewardContract(pool1.address);
          expect(pool1IsReward).to.be.eq(false);
          expect(await newRewardEscrow.removeRewardsContract(pool1.address)).
            not.to.emit(newRewardEscrow, 'RewardContractRemoved')
      }),

      it(`shouldn't be able to append entries without enough token balance`, async () => {
          let newRewardEscrow = await deploy('RewardEscrow');
          await newRewardEscrow.initialize();

          // Add rewards contract
          await newRewardEscrow.addRewardsContract(admin.address);
          let pool1IsReward = await newRewardEscrow.isRewardContract(admin.address);
          expect(pool1IsReward).to.be.eq(true);
          
          await expect(newRewardEscrow.appendVestingEntry(
            rewardToken.address, admin.address, pool1.address, bnDecimal(100000))).
            to.be.revertedWith('Not enough balance in the contract to provide for the vesting entry');
      }),

      it(`address shouldn't be able to append more than MAX_VESTING_ENTRIES limit`, async () => {
            const MAX_VESTING_ENTRIES = Number(await rewardEscrow.MAX_VESTING_ENTRIES());
            let timeInterval = MAX_VESTING_ENTRIES * 3;
            for(let i = 0 ; i < MAX_VESTING_ENTRIES + 1; ++i) {
                await increaseTime(rewardDuration1 / timeInterval);
                await pool1.claimReward()
            }
            let vestingEntriesCount =
                await rewardEscrow.numVestingEntries(pool1.address, rewardToken.address, admin.address);
            expect(vestingEntriesCount).to.be.eq(MAX_VESTING_ENTRIES + 1);
            await increaseTime(rewardDuration1 / timeInterval);
            await expect(pool1.claimReward()).
                to.be.revertedWith('Vesting schedule is too long');
      })
  })
})
