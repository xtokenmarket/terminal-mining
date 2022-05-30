const { ethers } = require('hardhat');
const { bnDecimal, deployArgs, bnDecimals, upgradeTerminal, increaseTime, upgradeCLR, bn } = require('../helpers');


async function testDepositAmounts() {
    let deployment = require('../deployment.json');
    let [admin, user, user2] = await ethers.getSigners();

    const terminal = await ethers.getContractAt('LMTerminal', deployment.Terminal);

    await upgradeCLR('mainnet')
    await upgradeTerminal('mainnet')
    
    let t0 = await deployArgs('ERC20Decimals', 'DAI', 'DAI', 18);
    let t1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);

    if(t0.address > t1.address) {
        console.log("tokens need to be reversed")
        let tmp = t0;
        t0 = t1;
        t1 = tmp;
    }

    // let t0Decimals = await t0.decimals();
    // let t1Decimals = await t1.decimals();

    await t0.approve(terminal.address, bnDecimal(100000000));
    await t1.approve(terminal.address, bnDecimal(100000000));

    await terminal.deployUniswapPool(t0.address, t1.address, 500, '137222409682560176169624821881659186')

    let t0adminb = await t0.balanceOf(admin.address)
    let t1adminb = await t1.balanceOf(admin.address)

    // Deploy a pool with no vesting period and reward token the same as token 0
    let tx = await terminal.deployIncentivizedPool(
        'token0-token1-CLR-3000', 
        { lowerTick: -887200, upperTick: 887200 },
        { rewardTokens: [t0.address], vestingPeriod: 0 },
        { fee: 500, token0: t0.address, token1: t1.address, amount0: bnDecimals(33333, 6), amount1: bnDecimals(100000, 18)}, 
        { value: terminal.deploymentFee() });
    let receipt = await tx.wait();
    let deploymentEvent = await receipt.events.find((e) => e.event === "DeployedIncentivizedPool");
    let clrAddress = deploymentEvent.args.clrInstance;
    console.log('successfully deployed new pool:', clrAddress);

    let t0admina = await t0.balanceOf(admin.address)
    let t1admina = await t1.balanceOf(admin.address)

    let t0sent = t0adminb.sub(t0admina);
    let t1sent = t1adminb.sub(t1admina);

    console.log('admin t0 sent:', t0sent.toString());
    console.log('admin t1 sent:', t1sent.toString());

    let clr = await ethers.getContractAt('CLR', clrAddress);
    let stakedTokenAddress = await clr.stakedToken(); 
    let stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);

    let bufferTokenBalance = await clr.getBufferTokenBalance();
    let stakedTokenBalance = await clr.getStakedTokenBalance();
    console.log('staked token 0 balance in pool:', stakedTokenBalance.amount0.toString());
    console.log('staked token 1 balance in pool:', stakedTokenBalance.amount1.toString());

    let clrToken0B = await t0.balanceOf(clr.address)
    let clrToken1B = await t1.balanceOf(clr.address)

    console.log('buffer token 0 balance in pool:', clrToken0B.toString());
    console.log('buffer token 1 balance in pool:', clrToken1B.toString());

    let stakedTokenBalanceAdmin = await stakedToken.balanceOf(admin.address);
    console.log('staked token balance of admin:', stakedTokenBalanceAdmin.toString());
    let totalSupply = await clr.totalSupply();
    console.log('total supply of clr tokens before user deposits', totalSupply.toString());

    await t0.connect(user).approve(clrAddress, bnDecimal(1000000));
    await t1.connect(user).approve(clrAddress, bnDecimal(1000000));
    await t0.connect(user2).approve(clrAddress, bnDecimal(1000000));
    await t1.connect(user2).approve(clrAddress, bnDecimal(1000000));
    
    await t0.transfer(user.address, bnDecimals(1000000, 6));
    await t1.transfer(user.address, bnDecimals(1000000, 18));
    await t0.transfer(user2.address, bnDecimals(1000000, 6));
    await t1.transfer(user2.address, bnDecimals(1000000, 18));

    console.log('depositing')

    let t0b = await t0.balanceOf(user.address);
    let t1b = await t1.balanceOf(user.address);
    await clr.connect(user).deposit(0, bnDecimals(10000, 6));
    let t0a = await t0.balanceOf(user.address);
    let t1a = await t1.balanceOf(user.address);
    let t0diff = t0b.sub(t0a);
    let t1diff = t1b.sub(t1a);
    console.log('token 0 sent to clr:', t0diff.toString());
    console.log('token 1 sent to clr:', t1diff.toString());

    let stakedTokenBalUser1 = await stakedToken.balanceOf(user.address);
    console.log('user balance of staked token after deposit:', stakedTokenBalUser1.toString())
    await increaseTime(10000);

    totalSupply = await clr.totalSupply();
    console.log('total supply of clr tokens after user deposits', totalSupply.toString());

    t0b = await t0.balanceOf(user2.address);
    t1b = await t1.balanceOf(user2.address);
    await clr.connect(user2).deposit(0, bnDecimals(5000, 6));
    t0a = await t0.balanceOf(user2.address);
    t1a = await t1.balanceOf(user2.address);
    t0diff = t0b.sub(t0a);
    t1diff = t1b.sub(t1a);
    console.log('token 0 sent to clr from user 2:', t0diff.toString());
    console.log('token 1 sent to clr from user 2:', t1diff.toString());
    let bal2 = await stakedToken.balanceOf(user2.address);
    console.log('user 2 balance of staked token after deposit:', bal2.toString())

    totalSupply = await clr.totalSupply();
    let stakedAmts = await clr.getStakedTokenBalance();
    let claimableAmt0 = stakedTokenBalUser1.mul(stakedAmts.amount0).div(totalSupply)
    let claimableAmt1 = stakedTokenBalUser1.mul(stakedAmts.amount1).div(totalSupply)
    console.log('claimable amt 0 for user1:', claimableAmt0.toString())
    console.log('claimable amt 1 for user1:', claimableAmt1.toString())

    let bb0 = await t0.balanceOf(user.address);
    let bb1 = await t1.balanceOf(user.address);
    await clr.connect(user).withdrawAndClaimReward(stakedTokenBalUser1.div(4));
    let ba0 = await t0.balanceOf(user.address);
    let ba1 = await t1.balanceOf(user.address);
    let gain0 = ba0.sub(bb0);
    let gain1 = ba1.sub(bb1);
    console.log('token 0 balance gain after withdraw:', gain0.toString());
    console.log('token 1 balance gain after withdraw:', gain1.toString());
    stakedTokenBalUser1 = await stakedToken.balanceOf(user.address);
    console.log('user balance of staked token after deposit:', stakedTokenBalUser1.toString())
}

testDepositAmounts()