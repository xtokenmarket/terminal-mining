const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bnDecimal, getPriceInX96, getBalance, deploy, 
        swapToken0ForToken1, swapToken1ForToken0 } = require('../../scripts/helpers');
const { deploymentFixture } = require('../fixture');

// Fee tests
describe('Contract: LMTerminal', async () => {
  let lmTerminal, token0, token1, rewardToken, swapRouter;
  let admin, user1, user2, user3;
  let rewardProgramDuration, clr, stakedToken;

  beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, swapRouter } = await deploymentFixture());
        [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
        const poolPrice = await getPriceInX96(1);
        await lmTerminal.deployUniswapPool(token0.address, token1.address, 3000, poolPrice)

        rewardProgramDuration = '7257600'; // 12 week program duration
        // Deploy Pool with 1 reward token and no vesting
        await lmTerminal.deployIncentivizedPool(
            'wETH-XTK-CLR',
            { lowerTick: -600, upperTick: 600 }, 
            { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
            { fee: 3000, token0: token0.address, token1: token1.address,
                amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
            { value: lmTerminal.deploymentFee() });

        const clrPoolAddress = await lmTerminal.deployedCLRPools(0);
        clr = await ethers.getContractAt('CLR', clrPoolAddress);
        const stakedTokenAddress = await clr.stakedToken();
        stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);
        const rewardTokenAmount = bnDecimal(1000000);
        // Initialize reward program
        await lmTerminal.initiateRewardsProgram(clrPoolAddress, [rewardTokenAmount], rewardProgramDuration);

        await token0.approve(clr.address, bnDecimal(100000000000));
        await token1.approve(clr.address, bnDecimal(100000000000));
  })

  describe('Fee collection', async () => {
        it('should be able to claim reward token and deployment fees', async () => {
            let ethBalanceBefore = await getBalance(admin);
            let rewardTokenBalanceBefore = await rewardToken.balanceOf(admin.address);
            await lmTerminal.withdrawFees(rewardToken.address);

            let ethBalanceAfter = await getBalance(admin);
            let rewardTokenBalanceAfter = await rewardToken.balanceOf(admin.address);
            expect(ethBalanceAfter).to.be.gt(ethBalanceBefore);
            expect(rewardTokenBalanceAfter).to.be.gt(rewardTokenBalanceBefore);

            // additional test for 0 eth balance case
            await lmTerminal.withdrawFees(rewardToken.address);
        }),

        it('should be able to claim trade fees from clr pool', async () => {
            // Approve swap router
            await token0.approve(swapRouter.address, bnDecimal(100000000000));
            await token1.approve(swapRouter.address, bnDecimal(100000000000));

            // Swap tokens to collect some fees in both
            await swapToken0ForToken1(swapRouter, token0, token1, admin.address, bnDecimal(80000));
            await swapToken1ForToken0(swapRouter, token0, token1, admin.address, bnDecimal(80000));

            // Collect fees from pool
            await clr.collect();

            let t0bb = await token0.balanceOf(admin.address);
            let t1bb = await token1.balanceOf(admin.address);

            // Withdraw the collected fees
            await lmTerminal.withdrawFees(token0.address);
            await lmTerminal.withdrawFees(token1.address);

            // Check admin for t0 and t1 balance gain
            // Admin is the Revenue Controller for these tests
            let t0ba = await token0.balanceOf(admin.address);
            let t1ba = await token1.balanceOf(admin.address);

            let t0gain = t0ba.sub(t0bb);
            let t1gain = t1ba.sub(t1bb);

            expect(t0gain).to.be.gt(0);
            expect(t1gain).to.be.gt(0);
        }),

        it('should be able to set custom deployment fee for an address', async () => {
            let newFee = 1000;
            await lmTerminal.enableCustomDeploymentFee(user1.address, newFee);
            let enabled = await lmTerminal.customDeploymentFeeEnabled(user1.address);
            let fee = await lmTerminal.customDeploymentFee(user1.address);
            expect(enabled).to.be.eq(true);
            expect(fee).to.be.eq(newFee);

            await expect(lmTerminal.connect(user1).deployIncentivizedPool(
                'wETH-XTK-CLR',
                { lowerTick: -600, upperTick: 600 }, 
                { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
                { fee: 3000, token0: token0.address, token1: token1.address,
                    amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
                { value: newFee })).not.to.be.revertedWith('Need to send ETH for CLR pool deployment');
        }),

        it('should be able to disable custom deployment fee for an address', async () => {
            let newFee = 1000;
            await lmTerminal.enableCustomDeploymentFee(user1.address, newFee);
            let enabled = await lmTerminal.customDeploymentFeeEnabled(user1.address);
            expect(enabled).to.be.eq(true);
            await lmTerminal.disableCustomDeploymentFee(user1.address);
            enabled = await lmTerminal.customDeploymentFeeEnabled(user1.address);
            expect(enabled).to.be.eq(false);
        }),

        it(`only owner should be able to enable custom deployment fee`, async () => {
            await expect(lmTerminal.connect(user1).enableCustomDeploymentFee(user1.address, 1000)).
                to.be.revertedWith('Ownable: caller is not the owner');
            await expect(lmTerminal.connect(user1).disableCustomDeploymentFee(user1.address)).
                to.be.revertedWith('Ownable: caller is not the owner');
        }),

        it(`shouldn't be able to set custom fee higher than current deployment fee`, async () => {
            let deploymentFee = await lmTerminal.deploymentFee();
            await expect(lmTerminal.enableCustomDeploymentFee(user1.address, deploymentFee.add(1))).
                to.be.revertedWith('Custom fee should be less than flat deployment fee')
        })

        it(`shouldn't be able to claim fees from address other than revenue controller`, async () => {
            await expect(lmTerminal.connect(user1).withdrawFees(token0.address)).
                to.be.revertedWith('Callable only by Revenue Controller')
        }),

        it(`shouldn't be able to claim eth fees if Revenue Controller doesn't accept eth`, async () => {
            const mockRevenueController = await deploy('MockRevenueController');

            // Upgrade xtk manager to set revenue controller again
            let xtkManagerAddress = await lmTerminal.xTokenManager();
            let managerProxy = await ethers.getContractAt('xTokenManagerProxy', xtkManagerAddress);
            let newXtkManager = await deploy('MockxTokenManager');
            await managerProxy.connect(user3).upgradeTo(newXtkManager.address);
            let xTokenManager = await ethers.getContractAt('xTokenManager', xtkManagerAddress);

            await xTokenManager.setRevenueController(mockRevenueController.address);

            await expect(mockRevenueController.withdrawFees(lmTerminal.address, token0.address)).
                not.to.emit(lmTerminal, 'EthFeeWithdraw');
        })
    })
});