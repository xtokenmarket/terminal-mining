const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bnDecimal, getPriceInX96, deployArgs, getBalance, increaseTime, deploy, deployAndLink } = require('../../scripts/helpers');
const { deploymentFixture } = require('../fixture');

// Uniswap and CLR Pool deployment tests
describe('Contract: LMTerminal', async () => {
  let lmTerminal, token0, token1, rewardToken, admin, user1, user2, user3;

  before(async () => {
      ({ lmTerminal, token0, token1, rewardToken, CLRDeployer } = await deploymentFixture());
      [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
  })

  describe('Pool deployment', async () => {
        it('should be able to deploy a uniswap pool', async () => {
            let poolPrice = await getPriceInX96(1);
            await lmTerminal.deployUniswapPool(token0.address, token1.address, 3000, poolPrice)
            let poolAddress = await lmTerminal.getPool(token0.address, token1.address, 3000);
            expect(poolAddress).not.to.be.eq(ethers.constants.AddressZero);
        }),

        it('should be able to deploy a uniswap pool with reversed token order', async () => {
            let poolPrice = await getPriceInX96(1);
            await lmTerminal.deployUniswapPool(token1.address, token0.address, 500, poolPrice)
            let poolAddress = await lmTerminal.getPool(token0.address, token1.address, 500);
            expect(poolAddress).not.to.be.eq(ethers.constants.AddressZero);
        }),

        it('should be able to deploy an incentivized pool with one reward token', async () => {
            let rewardProgramDuration = '7257600'; // 12 week program duration

            await lmTerminal.deployIncentivizedPool(
                'wETH-XTK-CLR',
                { lowerTick: -600, upperTick: 600 }, 
                { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
                { fee: 3000, token0: token0.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
                { value: lmTerminal.deploymentFee() });
            await increaseTime(300);
        
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let stakedTokenAddress = await clr.stakedToken();
            let rewardTokenAddress = await clr.rewardTokens(0);
            let clrOwner = await clr.owner();

            expect(clrPoolAddress).not.to.be.eq(ethers.constants.AddressZero);
            expect(stakedTokenAddress).not.to.be.eq(ethers.constants.AddressZero);
            expect(rewardTokenAddress).to.be.eq(rewardToken.address);
            expect(clrOwner).to.be.eq(admin.address);
        }),

        it('should be able to deploy an incentivized pool with vesting period', async () => {
            let rewardProgramDuration = '7257600';
            let sixWeeksVesting = '3628800' // Vesting period in seconds

            await lmTerminal.deployIncentivizedPool(
                'wETH-XTK-CLR',
                { lowerTick: -600, upperTick: 600 }, 
                { rewardTokens: [rewardToken.address], 
                    vestingPeriod: sixWeeksVesting }, 
                { fee: 3000, token0: token0.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
                { value: lmTerminal.deploymentFee() });
            await increaseTime(300);
        
            let clrPoolAddress = await lmTerminal.deployedCLRPools(1);  
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);      
            let stakedTokenAddress = await clr.stakedToken();
            let rewardTokenAddress = await clr.rewardTokens(0);

            expect(clrPoolAddress).not.to.be.eq(ethers.constants.AddressZero);
            expect(stakedTokenAddress).not.to.be.eq(ethers.constants.AddressZero);
            expect(rewardTokenAddress).to.be.eq(rewardToken.address);
        }),

        it('should be able to deploy an incentivized pool with two reward tokens', async () => {
            let rewardProgramDuration = '7257600';

            let rewardToken2 = await deployArgs('ERC20Basic', 'wBTC', 'wBTC');
            await lmTerminal.deployIncentivizedPool(
                'wETH-XTK-CLR',
                { lowerTick: -600, upperTick: 600 },
                { rewardTokens: [rewardToken.address, rewardToken2.address], 
                    vestingPeriod: 0 }, 
                { fee: 3000, token0: token0.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
                { value: lmTerminal.deploymentFee() });
            await increaseTime(300);
        
            let clrPoolAddress = await lmTerminal.deployedCLRPools(2);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let stakedTokenAddress = await clr.stakedToken();
            let rewardTokens = await clr.getRewardTokens();

            expect(clrPoolAddress).not.to.be.eq(ethers.constants.AddressZero);
            expect(stakedTokenAddress).not.to.be.eq(ethers.constants.AddressZero);
            expect(rewardTokens[0]).to.be.eq(rewardToken.address);
            expect(rewardTokens[1]).to.be.eq(rewardToken2.address);
        }),

        it('should be able to deploy an incentivized pool with reversed token order', async () => {
            let rewardProgramDuration = '7257600';

            await lmTerminal.deployIncentivizedPool(
                'wETH-XTK-CLR',
                { lowerTick: -600, upperTick: 600 }, 
                { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
                { fee: 3000, token0: token1.address, token1: token0.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
                { value: lmTerminal.deploymentFee() });
            await increaseTime(300);
        
            let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
            let clr = await ethers.getContractAt('CLR', clrPoolAddress);
            let stakedTokenAddress = await clr.stakedToken();
            let rewardTokenAddress = await clr.rewardTokens(0);
            let clrOwner = await clr.owner();

            let token0Address = await clr.token0();
            let token1Address = await clr.token1();
            expect(token0Address).to.be.eq(token0.address);
            expect(token1Address).to.be.eq(token1.address);

            expect(clrPoolAddress).not.to.be.eq(ethers.constants.AddressZero);
            expect(stakedTokenAddress).not.to.be.eq(ethers.constants.AddressZero);
            expect(rewardTokenAddress).to.be.eq(rewardToken.address);
            expect(clrOwner).to.be.eq(admin.address);
        }),

        it('should be able to get fees on incentivized pool deployment', async () => {
            let ethInTerminalBefore = await getBalance(lmTerminal);
            let rewardProgramDuration = '7257600';

            await lmTerminal.deployIncentivizedPool(
                'wETH-XTK-CLR',
                { lowerTick: -600, upperTick: 600 }, 
                { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
                { fee: 3000, token0: token0.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
                { value: await lmTerminal.deploymentFee() });
            await increaseTime(300);

            let ethInTerminalAfter = await getBalance(lmTerminal);
            let ethGained = ethInTerminalAfter.sub(ethInTerminalBefore);
            let deploymentFee = await lmTerminal.deploymentFee();

            expect(ethGained).to.be.eq(deploymentFee);
        }),

        it(`shouldn't be able to deploy incentivized pool without sending eth`, async () => {
            let rewardProgramDuration = '7257600';
            await expect(lmTerminal.deployIncentivizedPool(
                'wETH-XTK-CLR',
                { lowerTick: -600, upperTick: 600 }, 
                { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
                { fee: 3000, token0: token0.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}
                )).
                    to.be.revertedWith('Need to send ETH for CLR pool deployment');
        }),

        it(`shouldn't be able to deploy incentivized pool with LP tokens more than 18 decimals`, async () => {
            let newToken = await deployArgs('ERC20Decimals', 'Test', 'Test', '19'); // token with 19 decimals
            await expect(lmTerminal.deployIncentivizedPool(
                'TEST-XTK-CLR',
                { lowerTick: -600, upperTick: 600 }, 
                { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
                { fee: 3000, token0: newToken.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
                  { value: await lmTerminal.deploymentFee() }
                )).
                    to.be.revertedWith('Only tokens with <= 18 decimals are supported');
        })

        it(`owner should be able to change implementation of clr and staked token`, async () => {
            let uniLib = await deploy('UniswapLibrary');
            let CLR = await deployAndLink('CLR', 'UniswapLibrary', uniLib.address);
            let StakedCLRToken = await deploy('StakedCLRToken');

            await CLRDeployer.setCLRImplementation(CLR.address);
            await CLRDeployer.setsCLRTokenImplementation(StakedCLRToken.address);

            let clrImplAddress = await CLRDeployer.clrImplementation();
            let stakedTokenAddress = await CLRDeployer.sCLRTokenImplementation();
            expect(clrImplAddress).to.be.eq(CLR.address);
            expect(stakedTokenAddress).to.be.eq(StakedCLRToken.address);
        })
    })
});