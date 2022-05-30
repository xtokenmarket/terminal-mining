const { ethers } = require('hardhat');
const { bnDecimal } = require('../helpers');


async function deployNewPool() {
    let deployment = require('../deployment_rinkeby.json');

    const terminal = await ethers.getContractAt('LMTerminal', deployment.Terminal);
    
    let t0 = await ethers.getContractAt('ERC20Basic', deployment.token0)
    let t1 = await ethers.getContractAt('ERC20Basic', deployment.token1)

    // Deploy a pool with no vesting period and reward token the same as token 0
    let tx = await terminal.deployIncentivizedPool(
        'token0-token1-CLR-3000', 
        { lowerTick: -600, upperTick: 600 }, 
        { rewardTokens: [t0.address], vestingPeriod: 0 }, 
        { fee: 3000, token0: t0.address, token1: t1.address, amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
        { value: terminal.deploymentFee() });
    await tx.wait();
    console.log('successfully deployed new pool');
}

deployNewPool()