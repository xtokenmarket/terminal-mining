const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bnDecimal, getPriceInX96, deployArgs, 
        increaseTime, mineBlocks, bn, setAutomine } = require('../../scripts/helpers');
const { deploymentFixture } = require('../fixture');

// Reward initialization tests
describe('Contract: LMTerminal', async () => {
  let lmTerminal, token0, token1, rewardToken, rewardToken2, stakingToken, admin, user1, user2, user3;
  let rewardProgramDuration, vestingPeriod;
  let singleAssetPools;

  before(async () => {
        ({ lmTerminal, token0, token1, rewardToken, stakingToken } = await deploymentFixture());
        [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
        let poolPrice = await getPriceInX96(1);
        await lmTerminal.deployUniswapPool(token0.address, token1.address, 3000, poolPrice)

        rewardProgramDuration = '7257600'; // 12 week program duration
        vestingPeriod = '3628800' // Vesting period in seconds
        singleAssetPools = [];

        // Deploy pools for various tests

        // Pool with 1 reward token and no vesting
        await lmTerminal.deployIncentivizedPool(
            'wETH-XTK-CLR',
            { lowerTick: -600, upperTick: 600 }, 
            { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
            { fee: 3000, token0: token0.address, token1: token1.address,
                amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
            { value: lmTerminal.deploymentFee() });
        await increaseTime(300);

        // Pool with 1 reward token and vesting
        await lmTerminal.deployIncentivizedPool(
            'wETH-XTK-CLR',
            { lowerTick: -600, upperTick: 600 }, 
            { rewardTokens: [rewardToken.address], 
                vestingPeriod: vestingPeriod }, 
            { fee: 3000, token0: token0.address, token1: token1.address,
            amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
            { value: lmTerminal.deploymentFee() });
        await increaseTime(300);

        // Pool with 2 reward tokens and no vesting
        rewardToken2 = await deployArgs('ERC20Basic', 'wBTC', 'wBTC');
        await rewardToken2.approve(lmTerminal.address, bnDecimal(100000000000))
        await lmTerminal.deployIncentivizedPool(
            'wETH-XTK-CLR',
            { lowerTick: -600, upperTick: 600 },
            { rewardTokens: [rewardToken.address, rewardToken2.address], 
                vestingPeriod: 0 }, 
            { fee: 3000, token0: token0.address, token1: token1.address,
                amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
            { value: lmTerminal.deploymentFee() });
        await increaseTime(300);

        // Pool with 2 reward tokens and vesting
        await lmTerminal.deployIncentivizedPool(
            'wETH-XTK-CLR',
            { lowerTick: -600, upperTick: 600 },
            { rewardTokens: [rewardToken.address, rewardToken2.address], 
                vestingPeriod: vestingPeriod }, 
            { fee: 3000, token0: token0.address, token1: token1.address,
                amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
            { value: lmTerminal.deploymentFee() });
        await increaseTime(300);

        // Deploy single asset pools for various tests

        // Deploy Pool with 1 reward token and no vesting
        let tx = await lmTerminal.deploySingleAssetPool(
            stakingToken.address,
            { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
            { value: lmTerminal.deploymentFee() }
        );

        let receipt = await tx.wait();
        let poolDeployment = receipt.events.filter(e => e.event == 'DeployedSingleAssetPool');

        let singleAssetPoolAddress = poolDeployment[0].args.poolInstance;
        let singleAssetPool = await ethers.getContractAt('SingleAssetPool', singleAssetPoolAddress);
        singleAssetPools.push(singleAssetPool);

        // Deploy Pool with 1 reward token and vesting
        tx = await lmTerminal.deploySingleAssetPool(
            stakingToken.address,
            { rewardTokens: [rewardToken.address], vestingPeriod: vestingPeriod }, 
            { value: lmTerminal.deploymentFee() }
        );

        receipt = await tx.wait();
        poolDeployment = receipt.events.filter(e => e.event == 'DeployedSingleAssetPool');

        singleAssetPoolAddress = poolDeployment[0].args.poolInstance;
        singleAssetPool = await ethers.getContractAt('SingleAssetPool', singleAssetPoolAddress);
        singleAssetPools.push(singleAssetPool);

        // Deploy Pool with 2 reward tokens and no vesting
        tx = await lmTerminal.deploySingleAssetPool(
            stakingToken.address,
            { rewardTokens: [rewardToken.address, rewardToken2.address], vestingPeriod: 0 }, 
            { value: lmTerminal.deploymentFee() }
        );

        receipt = await tx.wait();
        poolDeployment = receipt.events.filter(e => e.event == 'DeployedSingleAssetPool');

        singleAssetPoolAddress = poolDeployment[0].args.poolInstance;
        singleAssetPool = await ethers.getContractAt('SingleAssetPool', singleAssetPoolAddress);
        singleAssetPools.push(singleAssetPool);

        // Deploy Pool with 2 reward tokens and vesting
        tx = await lmTerminal.deploySingleAssetPool(
            stakingToken.address,
            { rewardTokens: [rewardToken.address, rewardToken2.address], vestingPeriod: vestingPeriod }, 
            { value: lmTerminal.deploymentFee() }
        );

        receipt = await tx.wait();
        poolDeployment = receipt.events.filter(e => e.event == 'DeployedSingleAssetPool');

        singleAssetPoolAddress = poolDeployment[0].args.poolInstance;
        singleAssetPool = await ethers.getContractAt('SingleAssetPool', singleAssetPoolAddress);
        singleAssetPools.push(singleAssetPool);
  })

  describe('Reward programs for CLR pools', async () => {
        it('should revert on attempt to initialize first rewards using initiateNewRewardsProgram', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let rewardTokenAmount = bnDecimal(1000000);
            await expect(lmTerminal.initiateNewRewardsProgram(
                clrPoolAddress, [rewardTokenAmount], rewardProgramDuration)).
                to.be.revertedWith('First program must be initialized using initiateRewardsProgram');
        }),

        it('should revert on attempt to initialize rewards program from address other than owner or manager', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let rewardTokenAmount = bnDecimal(1000000);
            await expect(lmTerminal.connect(user2).initiateRewardsProgram(
                clrPoolAddress, [rewardTokenAmount], rewardProgramDuration)).
                to.be.revertedWith('Only owner or manager can initiate the rewards program');
        }),

        it('should revert on attempt to initialize rewards program with 0 duration', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(3);
            let rewardTokenAmount = bnDecimal(1000000);
            await expect(lmTerminal.initiateRewardsProgram(
                clrPoolAddress, [rewardTokenAmount, rewardTokenAmount], 0)).
                to.be.revertedWith('Rewards duration should be longer than 0');
        })

        it('should initialize rewards for clr pool with one reward token and no vesting', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let rewardTokenAmount = bnDecimal(1000000);

            await lmTerminal.initiateRewardsProgram(clrPoolAddress, [rewardTokenAmount], rewardProgramDuration);

            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let rewardProgramInfo = await clr.rewardInfo(rewardToken.address);
            let totalRewardAmount = rewardProgramInfo.totalRewardAmount;
            let feeDivisor = await lmTerminal.rewardFee();

            let rewardTokens = await clr.getRewardTokens();
            let rewardsAreEscrowed = await clr.rewardsAreEscrowed();

            expect(rewardsAreEscrowed).to.be.eq(false);
            expect(rewardTokens[0]).to.be.eq(rewardToken.address);
            expect(totalRewardAmount).to.be.eq(rewardTokenAmount);
        }),

        it('should revert on attempt to initialize rewards a second time', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let rewardTokenAmount = bnDecimal(1000000);
            await expect(lmTerminal.initiateRewardsProgram(clrPoolAddress, [rewardTokenAmount], rewardProgramDuration)).
                to.be.revertedWith('Reward program has been initiated');
        }),

        it(`shouldn't be able to initialize new rewards program given that one is running`, async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let rewardTokenAmount = bnDecimal(1000000);
            await expect(lmTerminal.initiateNewRewardsProgram(
                clrPoolAddress, [rewardTokenAmount], rewardProgramDuration)).
                to.be.revertedWith('Previous program must finish before initializing a new one');
        }),

        it('should revert if sending wrong count of reward amounts', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(1);
            let rewardTokenAmount = bnDecimal(1000000);
            let rewardTokenAmount2 = bnDecimal(10000000);

            // Pool only has one reward token, we're trying to set two reward amounts
            await expect(lmTerminal.initiateRewardsProgram(
                clrPoolAddress, [rewardTokenAmount, rewardTokenAmount2], rewardProgramDuration)).
                to.be.revertedWith('Total reward amounts count should be the same as reward tokens count');
        })

        it('should initialize rewards for clr pool with one reward token and vesting', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(1);
            let rewardTokenAmount = bnDecimal(1000000);

            await lmTerminal.initiateRewardsProgram(clrPoolAddress, [rewardTokenAmount], rewardProgramDuration);

            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let rewardProgramInfo = await clr.rewardInfo(rewardToken.address);
            let totalRewardAmount = rewardProgramInfo.totalRewardAmount;
            let feeDivisor = await lmTerminal.rewardFee();

            let rewardTokens = await clr.getRewardTokens();
            let rewardsAreEscrowed = await clr.rewardsAreEscrowed();

            expect(rewardsAreEscrowed).to.be.eq(true);
            expect(rewardTokens[0]).to.be.eq(rewardToken.address);
            expect(totalRewardAmount).to.be.eq(rewardTokenAmount);
        }),

        it('should initialize rewards for clr pool with two reward tokens and no vesting', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(2);
            let rewardTokenAmount = bnDecimal(1000000);
            let rewardToken2Amount = bnDecimal(3000000);

            await lmTerminal.initiateRewardsProgram(clrPoolAddress, 
                [rewardTokenAmount, rewardToken2Amount], rewardProgramDuration);

            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let rewardProgramInfo1 = await clr.rewardInfo(rewardToken.address);
            let rewardProgramInfo2 = await clr.rewardInfo(rewardToken2.address);
            let totalRewardAmount1 = rewardProgramInfo1.totalRewardAmount;
            let totalRewardAmount2 = rewardProgramInfo2.totalRewardAmount;
            let feeDivisor = await lmTerminal.rewardFee();

            let rewardTokens = await clr.getRewardTokens();
            let rewardsAreEscrowed = await clr.rewardsAreEscrowed();

            expect(rewardsAreEscrowed).to.be.eq(false);
            expect(rewardTokens[0]).to.be.eq(rewardToken.address);
            expect(rewardTokens[1]).to.be.eq(rewardToken2.address);
            expect(totalRewardAmount1).to.be.eq(rewardTokenAmount);
            expect(totalRewardAmount2).to.be.eq(rewardToken2Amount);
        }),

        it('should initialize rewards for clr pool with two reward tokens and vesting', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(3);
            let rewardTokenAmount = bnDecimal(1000000);
            let rewardToken2Amount = bnDecimal(3000000);

            await lmTerminal.initiateRewardsProgram(clrPoolAddress, 
                [rewardTokenAmount, rewardToken2Amount], rewardProgramDuration);

            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let rewardProgramInfo1 = await clr.rewardInfo(rewardToken.address);
            let rewardProgramInfo2 = await clr.rewardInfo(rewardToken2.address);
            let totalRewardAmount1 = rewardProgramInfo1.totalRewardAmount;
            let totalRewardAmount2 = rewardProgramInfo2.totalRewardAmount;
            let feeDivisor = await lmTerminal.rewardFee();

            let rewardTokens = await clr.getRewardTokens();
            let rewardsAreEscrowed = await clr.rewardsAreEscrowed();

            expect(rewardsAreEscrowed).to.be.eq(true);
            expect(rewardTokens[0]).to.be.eq(rewardToken.address);
            expect(rewardTokens[1]).to.be.eq(rewardToken2.address);
            expect(totalRewardAmount1).to.be.eq(rewardTokenAmount);
            expect(totalRewardAmount2).to.be.eq(rewardToken2Amount);
        }),

        it('should send accumulated rewards to user directly if there is no vesting period', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            // approve clr
            await token0.approve(clr.address, bnDecimal(1000000));
            await token1.approve(clr.address, bnDecimal(1000000));
            let amts = await clr.calculateAmountsMintedSingleToken(0, bnDecimal(100000));
            await clr.deposit(amts.amount0Minted, amts.amount1Minted);
            await increaseTime(300);
            await increaseTime(rewardProgramDuration / 5); // get through 1/5 of program
            
            let balanceBefore = await rewardToken.balanceOf(admin.address);
            await clr.claimReward();
            let balanceAfter = await rewardToken.balanceOf(admin.address);
            let balanceReceived = balanceAfter.sub(balanceBefore);

            expect(balanceReceived).to.be.gt(bn(0));
        }),

        it(`should send accumulated rewards to reward escrow 
            after claiming them if there is a vesting period`, async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(1);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let rewardEscrow = await lmTerminal.rewardEscrow();

            // approve clr
            await token0.approve(clrPoolAddress, bnDecimal(1000000));
            await token1.approve(clrPoolAddress, bnDecimal(1000000));
            let amts = await clr.calculateAmountsMintedSingleToken(0, bnDecimal(100000));
            await clr.deposit(amts.amount0Minted, amts.amount1Minted);
            await increaseTime(rewardProgramDuration / 5); // get through 2/5 of program
            
            let balanceBefore = await rewardToken.balanceOf(rewardEscrow);
            await clr.claimReward();
            let balanceAfter = await rewardToken.balanceOf(rewardEscrow);
            let balanceReceived = balanceAfter.sub(balanceBefore);
            expect(balanceReceived).to.be.gt(bn(0));
        }),

        it(`should send two different accumulated rewards 
            if there are two reward tokens`, async () => {
            // Pool two has two reward tokens
            let clrPoolAddress = await lmTerminal.deployedCLRPools(2);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            await token0.connect(user1).approve(clr.address, bnDecimal(10000000000));
            await token1.connect(user1).approve(clr.address, bnDecimal(10000000000));
            // approve clr
            await token0.approve(clrPoolAddress, bnDecimal(1000000));
            await token1.approve(clrPoolAddress, bnDecimal(1000000));
            let amts = await clr.calculateAmountsMintedSingleToken(0, bnDecimal(100000));
            await clr.connect(user1).deposit(amts.amount0Minted, amts.amount1Minted);
            amts = await clr.calculateAmountsMintedSingleToken(0, bnDecimal(100000));
            await clr.deposit(amts.amount0Minted, amts.amount1Minted);
            await increaseTime(300);
            await increaseTime(rewardProgramDuration / 5); // get through 3/5 of program
            
            let balanceBefore = await rewardToken.balanceOf(user1.address);
            let balanceBefore2 = await rewardToken2.balanceOf(user1.address);
            await clr.connect(user1).claimReward();
            let balanceAfter = await rewardToken.balanceOf(user1.address);
            let balanceAfter2 = await rewardToken2.balanceOf(user1.address);
            let balanceReceived = balanceAfter.sub(balanceBefore);
            let balanceReceived2 = balanceAfter2.sub(balanceBefore2);

            // Second claim is for reward token amount = 0
            // Used to test all branches of StakingRewards 
            await setAutomine(false);
            await clr.connect(user1).claimReward();
            await clr.connect(user1).claimReward();
            await mineBlocks(1);
            await setAutomine(true);

            expect(balanceReceived).to.be.gt(bn(0));
            expect(balanceReceived2).to.be.gt(bn(0));
        }),

        it('should initialize new reward program after first has finished', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let rewardTokenAmount = bnDecimal(1000000);

            // Increase time to after first reward program has finished
            await increaseTime(rewardProgramDuration / 2);

            await lmTerminal.initiateNewRewardsProgram(
                clrPoolAddress, [rewardTokenAmount], rewardProgramDuration);

            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let rewardProgramInfo = await clr.rewardInfo(rewardToken.address);
            let totalRewardAmount = rewardProgramInfo.totalRewardAmount;
            let feeDivisor = await lmTerminal.rewardFee();

            let rewardTokens = await clr.getRewardTokens();
            let rewardsAreEscrowed = await clr.rewardsAreEscrowed();

            expect(rewardsAreEscrowed).to.be.eq(false);
            expect(rewardTokens[0]).to.be.eq(rewardToken.address);
            expect(totalRewardAmount).to.be.eq(rewardTokenAmount);
        }),

        it('should be able to get reward for duration', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let rewardToken = await clr.rewardTokens(0);
            let rewardForDuration = await clr.getRewardForDuration(rewardToken);
            expect(rewardForDuration).to.be.gt(0);
        }),

        it('should be able to get reward tokens count', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let rewardTokensCount = await clr.getRewardTokensCount();
            expect(rewardTokensCount).to.be.gt(0);
        }),

        it('should be able to get total staked supply', async () => {
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let stakedTotalSupply = await clr.stakedTotalSupply();
            expect(stakedTotalSupply).to.be.gt(0);
        })
    })

    describe('Reward programs for SingleAssetPools', async () => {
          it('should revert on attempt to initialize first rewards using initiateNewRewardsProgram', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
              await expect(lmTerminal.initiateNewRewardsProgram(
                  singleAssetPools[0].address, [rewardTokenAmount], rewardProgramDuration)).
                  to.be.revertedWith('First program must be initialized using initiateRewardsProgram');
          }),
  
          it('should revert on attempt to initialize rewards program from address other than owner or manager', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
              await expect(lmTerminal.connect(user2).initiateRewardsProgram(
                singleAssetPools[0].address, [rewardTokenAmount], rewardProgramDuration)).
                  to.be.revertedWith('Only owner or manager can initiate the rewards program');
          }),
  
          it('should revert on attempt to initialize rewards program with 0 duration', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
              await expect(lmTerminal.initiateRewardsProgram(
                singleAssetPools[0].address, [rewardTokenAmount, rewardTokenAmount], 0)).
                  to.be.revertedWith('Rewards duration should be longer than 0');
          }),
  
          it('should revert if sending wrong count of reward amounts', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
              let rewardTokenAmount2 = bnDecimal(10000000);
  
              // Pool only has one reward token, we're trying to set two reward amounts
              await expect(lmTerminal.initiateRewardsProgram(
                  singleAssetPools[0].address, [rewardTokenAmount, rewardTokenAmount2], rewardProgramDuration)).
                  to.be.revertedWith('Total reward amounts count should be the same as reward tokens count');
          }),
  
          it('should initialize rewards for single asset pool with one reward token and no vesting', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
  
              await lmTerminal.initiateRewardsProgram(singleAssetPools[0].address, [rewardTokenAmount], rewardProgramDuration);
  
              let rewardProgramInfo = await singleAssetPools[0].rewardInfo(rewardToken.address);
              let totalRewardAmount = rewardProgramInfo.totalRewardAmount;
              let feeDivisor = await lmTerminal.rewardFee();
  
              let rewardTokens = await singleAssetPools[0].getRewardTokens();
              let rewardsAreEscrowed = await singleAssetPools[0].rewardsAreEscrowed();
  
              expect(rewardsAreEscrowed).to.be.eq(false);
              expect(rewardTokens[0]).to.be.eq(rewardToken.address);
              expect(totalRewardAmount).to.be.eq(rewardTokenAmount);
          }),
  
          it('should revert on attempt to initialize rewards a second time', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
              await expect(lmTerminal.initiateRewardsProgram(singleAssetPools[0].address, [rewardTokenAmount], rewardProgramDuration)).
                  to.be.revertedWith('Reward program has been initiated');
          }),
  
          it(`shouldn't be able to initialize new rewards program given that one is running`, async () => {
              let rewardTokenAmount = bnDecimal(1000000);
              await expect(lmTerminal.initiateNewRewardsProgram(
                  singleAssetPools[0].address, [rewardTokenAmount], rewardProgramDuration)).
                  to.be.revertedWith('Previous program must finish before initializing a new one');
          }),
  
          it('should initialize rewards for pool with one reward token and vesting', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
  
              await lmTerminal.initiateRewardsProgram(singleAssetPools[1].address, [rewardTokenAmount], rewardProgramDuration);
  
              let rewardProgramInfo = await singleAssetPools[1].rewardInfo(rewardToken.address);
              let totalRewardAmount = rewardProgramInfo.totalRewardAmount;
              let feeDivisor = await lmTerminal.rewardFee();
  
              let rewardTokens = await singleAssetPools[1].getRewardTokens();
              let rewardsAreEscrowed = await singleAssetPools[1].rewardsAreEscrowed();
  
              expect(rewardsAreEscrowed).to.be.eq(true);
              expect(rewardTokens[0]).to.be.eq(rewardToken.address);
              expect(totalRewardAmount).to.be.eq(rewardTokenAmount);
          }),
  
          it('should initialize rewards for pool with two reward tokens and no vesting', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
              let rewardToken2Amount = bnDecimal(3000000);
  
              await lmTerminal.initiateRewardsProgram(singleAssetPools[2].address, 
                  [rewardTokenAmount, rewardToken2Amount], rewardProgramDuration);
  
              let rewardProgramInfo1 = await singleAssetPools[2].rewardInfo(rewardToken.address);
              let rewardProgramInfo2 = await singleAssetPools[2].rewardInfo(rewardToken2.address);
              let totalRewardAmount1 = rewardProgramInfo1.totalRewardAmount;
              let totalRewardAmount2 = rewardProgramInfo2.totalRewardAmount;
  
              let rewardTokens = await singleAssetPools[2].getRewardTokens();
              let rewardsAreEscrowed = await singleAssetPools[2].rewardsAreEscrowed();
  
              expect(rewardsAreEscrowed).to.be.eq(false);
              expect(rewardTokens[0]).to.be.eq(rewardToken.address);
              expect(rewardTokens[1]).to.be.eq(rewardToken2.address);
              expect(totalRewardAmount1).to.be.eq(rewardTokenAmount);
              expect(totalRewardAmount2).to.be.eq(rewardToken2Amount);
          }),
  
          it('should initialize rewards for pool with two reward tokens and vesting', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
              let rewardToken2Amount = bnDecimal(3000000);
  
              await lmTerminal.initiateRewardsProgram(singleAssetPools[3].address, 
                  [rewardTokenAmount, rewardToken2Amount], rewardProgramDuration);
  
              let rewardProgramInfo1 = await singleAssetPools[3].rewardInfo(rewardToken.address);
              let rewardProgramInfo2 = await singleAssetPools[3].rewardInfo(rewardToken2.address);
              let totalRewardAmount1 = rewardProgramInfo1.totalRewardAmount;
              let totalRewardAmount2 = rewardProgramInfo2.totalRewardAmount;
  
              let rewardTokens = await singleAssetPools[3].getRewardTokens();
              let rewardsAreEscrowed = await singleAssetPools[3].rewardsAreEscrowed();
  
              expect(rewardsAreEscrowed).to.be.eq(true);
              expect(rewardTokens[0]).to.be.eq(rewardToken.address);
              expect(rewardTokens[1]).to.be.eq(rewardToken2.address);
              expect(totalRewardAmount1).to.be.eq(rewardTokenAmount);
              expect(totalRewardAmount2).to.be.eq(rewardToken2Amount);
          }),
  
          it('should send accumulated rewards to user directly if there is no vesting period', async () => {
              // approve
              await stakingToken.approve(singleAssetPools[0].address, bnDecimal(1000000));
              await singleAssetPools[0].stake(bnDecimal(100000));
              await increaseTime(300);
              await increaseTime(rewardProgramDuration / 5); // get through 1/5 of program
              
              let balanceBefore = await rewardToken.balanceOf(admin.address);
              await singleAssetPools[0].claimReward();
              let balanceAfter = await rewardToken.balanceOf(admin.address);
              let balanceReceived = balanceAfter.sub(balanceBefore);
  
              expect(balanceReceived).to.be.gt(bn(0));
          }),
  
          it(`should send accumulated rewards to reward escrow 
              after claiming them if there is a vesting period`, async () => {
              let rewardEscrow = await lmTerminal.rewardEscrow();
  
              // approve
              await stakingToken.approve(singleAssetPools[1].address, bnDecimal(1000000));
              await singleAssetPools[1].stake(bnDecimal(100000));
              await increaseTime(rewardProgramDuration / 5); // get through 2/5 of program
              
              let balanceBefore = await rewardToken.balanceOf(rewardEscrow);
              await singleAssetPools[1].claimReward();
              let balanceAfter = await rewardToken.balanceOf(rewardEscrow);
              let balanceReceived = balanceAfter.sub(balanceBefore);
              expect(balanceReceived).to.be.gt(bn(0));
          }),
  
          it(`should send two different accumulated rewards 
              if there are two reward tokens`, async () => {
              // Pool two has two reward tokens
              await stakingToken.connect(user1).approve(singleAssetPools[2].address, bnDecimal(10000000000));
              // approve singleAssetPools[2]
              await stakingToken.approve(singleAssetPools[2].address, bnDecimal(1000000));
              await singleAssetPools[2].connect(user1).stake(bnDecimal(100000));
              await singleAssetPools[2].stake(bnDecimal(100000));
              await increaseTime(300);
              await increaseTime(rewardProgramDuration / 5); // get through 3/5 of program
              
              let balanceBefore = await rewardToken.balanceOf(user1.address);
              let balanceBefore2 = await rewardToken2.balanceOf(user1.address);
              await singleAssetPools[2].connect(user1).claimReward();
              let balanceAfter = await rewardToken.balanceOf(user1.address);
              let balanceAfter2 = await rewardToken2.balanceOf(user1.address);
              let balanceReceived = balanceAfter.sub(balanceBefore);
              let balanceReceived2 = balanceAfter2.sub(balanceBefore2);
  
              // Second claim is for reward token amount = 0
              // Used to test all branches of StakingRewards 
              await setAutomine(false);
              await singleAssetPools[2].connect(user1).claimReward();
              await singleAssetPools[2].connect(user1).claimReward();
              await mineBlocks(1);
              await setAutomine(true);
  
              expect(balanceReceived).to.be.gt(bn(0));
              expect(balanceReceived2).to.be.gt(bn(0));
          }),
  
          it('should initialize new reward program after first has finished', async () => {
              let rewardTokenAmount = bnDecimal(1000000);
  
              // Increase time to after first reward program has finished
              await increaseTime(rewardProgramDuration / 2);
  
              await lmTerminal.initiateNewRewardsProgram(
                  singleAssetPools[0].address, [rewardTokenAmount], rewardProgramDuration);
  
              let rewardProgramInfo = await singleAssetPools[0].rewardInfo(rewardToken.address);
              let totalRewardAmount = rewardProgramInfo.totalRewardAmount;
  
              let rewardTokens = await singleAssetPools[0].getRewardTokens();
              let rewardsAreEscrowed = await singleAssetPools[0].rewardsAreEscrowed();
  
              expect(rewardsAreEscrowed).to.be.eq(false);
              expect(rewardTokens[0]).to.be.eq(rewardToken.address);
              expect(totalRewardAmount).to.be.eq(rewardTokenAmount);
          }),
  
          it('should be able to get reward for duration', async () => {
              let rewardToken = await singleAssetPools[0].rewardTokens(0);
              let rewardForDuration = await singleAssetPools[0].getRewardForDuration(rewardToken);
              expect(rewardForDuration).to.be.gt(0);
          }),
  
          it('should be able to get reward tokens count', async () => {
              let rewardTokensCount = await singleAssetPools[0].getRewardTokensCount();
              expect(rewardTokensCount).to.be.gt(0);
          }),
  
          it('should be able to get total staked supply', async () => {
              let stakedTotalSupply = await singleAssetPools[0].stakedTotalSupply();
              expect(stakedTotalSupply).to.be.gt(0);
          })
      })
});