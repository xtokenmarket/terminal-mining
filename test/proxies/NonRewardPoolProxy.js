const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bnDecimal, increaseTime, getPriceInX96, deploy, deployAndLink } = require('../../scripts/helpers');
const { deploymentFixture } = require('../fixture');

// Tests for NonRewardPool Proxy
describe('Contract: CLRProxy', async () => {
    let lmTerminal, token0, token1, NonRewardPoolDeployer, admin, user1, user2, user3;
    let rewardProgramDuration, nonRewardPool, nonRewardPoolProxy, token0Decimals;
    let proxyAdmin;
  
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, NonRewardPoolDeployer, proxyAdmin } = await deploymentFixture());
        [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
        token0Decimals = await token0.decimals();
        const poolPrice = await getPriceInX96(1);
        await lmTerminal.deployUniswapPool(token0.address, token1.address, 3000, poolPrice)

        rewardProgramDuration = '7257600'; // 12 week program duration
        // Deploy Pool with 1 reward token and no vesting
        let tx = await lmTerminal.deployNonIncentivizedPool(
            'wETH-XTK-NonRewardPool',
            { lowerTick: -600, upperTick: 600 },
            { fee: 3000, token0: token0.address, token1: token1.address,
                amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
            { value: lmTerminal.deploymentFee() });
        await increaseTime(300);

        let receipt = await tx.wait();
        let poolDeployment = receipt.events.filter(e => e.event == 'DeployedNonIncentivizedPool');

        let nonRewardPoolAddress = poolDeployment[0].args.poolInstance;
        nonRewardPool = await ethers.getContractAt('NonRewardPool', nonRewardPoolAddress);
        nonRewardPoolProxy = await ethers.getContractAt('NonRewardPoolProxy', nonRewardPoolAddress);
        
        await increaseTime(300);
    })

  describe('NonRewardPool proxy upgrade', async () => {
    it(`admin should only be able to upgrade NonRewardPool proxy to latest implementation using upgrade`, async () => {
        const uniLib = await deploy('UniswapLibrary');
        const newNonRewardPoolImplementation = await deployAndLink('NonRewardPool', 'UniswapLibrary', uniLib.address);

        // Attempt to upgrade without changing latest NonRewardPool implementation in NonRewardPool Deployer
        await expect(proxyAdmin.connect(admin).upgrade(nonRewardPoolProxy.address, newNonRewardPoolImplementation.address)).
            to.be.revertedWith('Can only upgrade to latest NonRewardPool implementation');

        await NonRewardPoolDeployer.setNonRewardPoolImplementation(newNonRewardPoolImplementation.address);

        // Upgrade after changing latest NonRewardPool implementation in NonRewardPool Deployer
        await expect(proxyAdmin.connect(admin).upgrade(nonRewardPoolProxy.address, newNonRewardPoolImplementation.address)).
            not.to.be.revertedWith('Can only upgrade to latest NonRewardPool implementation');
    }),

    it(`admin should only be able to upgrade NonRewardPool proxy to latest implementation using upgradeAndCall`, async () => {
        const uniLib = await deploy('UniswapLibrary');
        const newNonRewardPoolImplementation = await deployAndLink('NonRewardPool', 'UniswapLibrary', uniLib.address);

        // Attempt to upgrade without changing latest NonRewardPool implementation in NonRewardPool Deployer
        await expect(proxyAdmin.connect(admin).upgradeAndCall(nonRewardPoolProxy.address, newNonRewardPoolImplementation.address, '0x00')).
            to.be.revertedWith('Can only upgrade to latest NonRewardPool implementation');

        await NonRewardPoolDeployer.setNonRewardPoolImplementation(newNonRewardPoolImplementation.address);

        // Upgrade after changing latest NonRewardPool implementation in NonRewardPool Deployer
        await expect(proxyAdmin.connect(admin).upgradeAndCall(nonRewardPoolProxy.address, newNonRewardPoolImplementation.address, '0x00')).
            not.to.be.revertedWith('Can only upgrade to latest NonRewardPool implementation');
    })
  })
})
