const { ethers } = require('hardhat');
const { bnDecimal, impersonate, bn, upgradeTerminal, swapToken0ForToken1Mainnet, bnDecimals } = require('../helpers');


/**
 * Deploys a new pool and swaps to reach a desired price
 */
async function deployNewPool() {
    let deployment = require('../deployment.json');

    const terminal = await ethers.getContractAt('LMTerminal', deployment.Terminal);

    let t0 = await ethers.getContractAt('ERC20Basic', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2') // weth
    let t1 = await ethers.getContractAt('ERC20Basic', '0xeBd707E7b27c6c14C98a327e332a0DF7C6C015b0') // cheeth

    if(bn(t0.address).gt(t1.address)) {
        console.log('addresses need to be reverted');
    }

    let t0Holder = await impersonate('0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0'); 
    let t1Holder = await impersonate('0xAAA3bFb53d5D5116FAeDc5Dd457531f8465f78af');

    let [admin] = await ethers.getSigners();

    await t0.connect(t0Holder).transfer(admin.address, bnDecimal(100000))
    await t1.connect(t1Holder).transfer(admin.address, bnDecimal(1000))

    await t0.approve(terminal.address, bnDecimal(1000000000))
    await t1.approve(terminal.address, bnDecimal(1000000000))

    // await upgradeTerminal('mainnet');
    // console.log('upgraded terminal')
    
    // Deploy a pool with no vesting period and reward token the same as token 0
    // let tx = await terminal.deployIncentivizedPool(
    //     'token0-token1-CLR-10000', 
    //     { lowerTick: -887200, upperTick: 887200 }, 
    //     { rewardTokens: [t0.address], vestingPeriod: 0 }, 
    //     { fee: 10000, token0: t0.address, token1: t1.address, amount0: bnDecimal(1000), amount1: bnDecimal(100)}, 
    //     { value: terminal.deploymentFee() });
    // await tx.wait();
    // console.log('successfully deployed new pool');

    let uniLib = await ethers.getContractAt('UniswapLibrary', deployment.UniswapLibrary);
    let price = await uniLib.getPoolPriceWithDecimals('0x8d2c8580Ebdf6c0D345a9795C25AA65470EA6E32')
    console.log('pool price now:', price.div(1e12).toString());

    let router = require('../uniswapAddresses.json').swapRouter;
    console.log('router addr:', router)
    await t0.approve(router, bnDecimal(1000000000))
    await t1.approve(router, bnDecimal(1000000000))

    // 377700000000000000 = 0.03777 eth
    // let swapAmt = '37770000000000000'

    let swapAmt = '1805000000000000'

    await swapToken0ForToken1Mainnet(t0, t1, admin.address, swapAmt);

    price = await uniLib.getPoolPriceWithDecimals('0x8d2c8580Ebdf6c0D345a9795C25AA65470EA6E32')
    console.log('pool price now:', price.div(1e12).toString());
}

deployNewPool()