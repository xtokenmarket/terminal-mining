const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bnDecimal, increaseTime, getPriceInX96, deploy, deployAndLink } = require('../../scripts/helpers');
const { deploymentFixture } = require('../fixture');

// Tests for CLR Proxy
describe('Contract: CLRProxy', async () => {
    let lmTerminal, token0, token1, rewardToken, CLRDeployer, admin, user1, user2, user3;
    let rewardProgramDuration, clr, stakedToken, clrProxy, stakedTokenProxy, token0Decimals;
    let proxyAdmin;
  
    beforeEach(async () => {
          ({ lmTerminal, token0, token1, rewardToken, CLRDeployer, proxyAdmin } = await deploymentFixture());
          [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
          token0Decimals = await token0.decimals();
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
        await increaseTime(300);
  
        const clrPoolAddress = await lmTerminal.deployedCLRPools(0);
        clr = await ethers.getContractAt('CLR', clrPoolAddress);
        clrProxy = await ethers.getContractAt('CLRProxy', clrPoolAddress);
        const stakedTokenAddress = await clr.stakedToken();
        stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);
        stakedTokenProxy = await ethers.getContractAt('StakedCLRTokenProxy', stakedTokenAddress);
        await increaseTime(300);
    })

  describe('CLR proxy upgrade', async () => {
    it(`admin should only be able to upgrade CLR proxy to latest implementation using upgrade`, async () => {
        const uniLib = await deploy('UniswapLibrary');
        const newCLRImplementation = await deployAndLink('CLR', 'UniswapLibrary', uniLib.address);

        // Attempt to upgrade without changing latest CLR implementation in CLR Deployer
        await expect(proxyAdmin.connect(admin).upgrade(clrProxy.address, newCLRImplementation.address)).
            to.be.revertedWith('Can only upgrade to latest CLR implementation');

        await CLRDeployer.setCLRImplementation(newCLRImplementation.address);

        // Upgrade after changing latest CLR implementation in CLR Deployer
        await expect(proxyAdmin.connect(admin).upgrade(clrProxy.address, newCLRImplementation.address)).
            not.to.be.revertedWith('Can only upgrade to latest CLR implementation');
    }),

    it(`admin should only be able to upgrade CLR proxy to latest implementation using upgradeAndCall`, async () => {
        const uniLib = await deploy('UniswapLibrary');
        const newCLRImplementation = await deployAndLink('CLR', 'UniswapLibrary', uniLib.address);

        // Attempt to upgrade without changing latest CLR implementation in CLR Deployer
        await expect(proxyAdmin.connect(admin).upgradeAndCall(clrProxy.address, newCLRImplementation.address, '0x00')).
            to.be.revertedWith('Can only upgrade to latest CLR implementation');

        await CLRDeployer.setCLRImplementation(newCLRImplementation.address);

        // Upgrade after changing latest CLR implementation in CLR Deployer
        await expect(proxyAdmin.connect(admin).upgradeAndCall(clrProxy.address, newCLRImplementation.address, '0x00')).
            not.to.be.revertedWith('Can only upgrade to latest CLR implementation');
    })
  })
})
