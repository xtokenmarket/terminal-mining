const { ethers, network } = require('hardhat');
const { deploy, deployArgs, deployAndLink, getPriceInX96, bnDecimal, 
  getNumberNoDecimals, mineBlocks, gnnd, increaseTime, getBalance, getMainnetxTokenManager, 
  deployTokenManagerTest, swapToken0ForToken1Mainnet, swapToken1ForToken0Mainnet } = require('./helpers');

const uniswapAddresses = require('./uniswapAddresses.json');

async function deployTest() {
    const [admin, user1, user2, terminalAdmin] = await ethers.getSigners();

    // Deploy Reward Escrow
    let rewardEscrowImpl = await deploy('RewardEscrow');
    let rewardEscrowProxy = await deployArgs('RewardEscrowProxy', rewardEscrowImpl.address, terminalAdmin.address);
    let rewardEscrow = await ethers.getContractAt('RewardEscrow', rewardEscrowProxy.address);
    
    // Deploy CLR Proxy Admin
    let proxyAdmin = await deploy('ProxyAdmin');

    // Deploy CLR instance
    let uniLib = await deploy('UniswapLibrary');
    let CLRImplementation = await deployAndLink('CLR', 'UniswapLibrary', uniLib.address);
    let StakedCLRToken = await deploy('StakedCLRToken');

    // Deploy CLR Proxy factory
    const CLRDeployer = await deployArgs('CLRDeployer', CLRImplementation.address, StakedCLRToken.address);

    // Deploy Liquidity Mining Terminal
    let lmTerminalImpl = await deploy('LMTerminal');
    let lmTerminalProxy = await deployArgs('LMTerminalProxy', lmTerminalImpl.address, terminalAdmin.address);
    let lmTerminal = await ethers.getContractAt('LMTerminal', lmTerminalProxy.address);

    // Initialize Reward Escrow
    await rewardEscrow.initialize();

    await rewardEscrow.transferOwnership(lmTerminal.address);
    await proxyAdmin.transferOwnership(lmTerminal.address);

    // Deploy tokens
    let t0 = await deployArgs('ERC20Basic', 'Token0', 'Token0');
    let t1 = await deployArgs('ERC20Basic', 'Token1', 'Token1');
    if(t0.address > t1.address) {
        console.log('addresses need to be reversed');
        let tmp = t0;
        t0 = t1;
        t1 = tmp;
    }
    let midPrice = await getPriceInX96(1);

    let xTokenManager = await deployTokenManagerTest(lmTerminal.address);
    
    // Initialize LM Terminal
    await lmTerminal.initialize(xTokenManager.address, rewardEscrow.address,
      proxyAdmin.address, CLRDeployer.address, uniswapAddresses.v3CoreFactoryAddress,
      { router: uniswapAddresses.swapRouter, quoter: uniswapAddresses.quoterAddress, 
        positionManager: uniswapAddresses.nonfungibleTokenPositionManagerAddress
    }, 1, 100, 1000);

    // approve terminal
    await t0.approve(lmTerminal.address, bnDecimal(1000000000));
    await t1.approve(lmTerminal.address, bnDecimal(1000000000));

    // transfer tokens to other users
    await t0.transfer(user1.address, bnDecimal(1000000));
    await t1.transfer(user1.address, bnDecimal(1000000));
    await t0.transfer(user2.address, bnDecimal(1000000));
    await t1.transfer(user2.address, bnDecimal(1000000));

    // Deploy Uniswap Pool
    await lmTerminal.deployUniswapPool(t0.address, t1.address, 3000, midPrice);
    let poolAddress = await lmTerminal.getPool(t0.address, t1.address, 3000);
    console.log('deployed uni pool at address:', poolAddress);
    // Deploy Incentivized CLR pool
   let totalRewardAmount = bnDecimal(100000);
   await lmTerminal.deployIncentivizedPool(
    'token0-token1-CLR', 
    { lowerTick: -600, upperTick: 600 }, 
    { rewardTokens: [t0.address], vestingPeriod: 0 }, 
    { fee: 3000, token0: t0.address, token1: t1.address, amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
    { value: lmTerminal.deploymentFee() });

   console.log('deployed clr instance and setup staking program');
   let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
   console.log('clr pool address:', clrPoolAddress);
   let clr = await ethers.getContractAt('CLR', clrPoolAddress);
   let stakedTokenAddress = await clr.stakedToken();
   let stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);

   let rewardTokens = await clr.rewardTokens(0);
   console.log('reward token 0:', rewardTokens);

   await lmTerminal.initiateRewardsProgram(clrPoolAddress, [totalRewardAmount], 10000);
   
   await t0.approve(clrPoolAddress, bnDecimal(1e14));
   await t1.approve(clrPoolAddress, bnDecimal(1e14));
   await t0.connect(user1).approve(clrPoolAddress, bnDecimal(1e14));
   await t1.connect(user1).approve(clrPoolAddress, bnDecimal(1e14));
   await t0.connect(user2).approve(clrPoolAddress, bnDecimal(1e14));
   await t1.connect(user2).approve(clrPoolAddress, bnDecimal(1e14));

   // MINTING AND BURNING TESTS

   // provide liquidity
   await clr.deposit(0, bnDecimal(10000));
   console.log('mint success');
   let stakedBalance = await stakedToken.balanceOf(admin.address);
   console.log('address receipt balance:', getNumberNoDecimals(stakedBalance));
   await increaseTime(300);
   console.log('removing liquidity without other contributions to the pool');
   await clr.withdraw(stakedBalance);
   await increaseTime(300);
   await clr.deposit(0, bnDecimal(10000));
   console.log('mint success');

   clr = await ethers.getContractAt('CLR', clrPoolAddress);
   let totalSupply = await clr.totalSupply();
   console.log('clr total supply after mint 1:', gnnd(totalSupply));
   let liquidity = await clr.getPositionLiquidity();
   console.log('clr liquidity after mint 1:', gnnd(liquidity));

   await lmTerminal.connect(user1).provideLiquidity(clrPoolAddress, 0, bnDecimal(100000));
   totalSupply = await clr.totalSupply();
   console.log('clr total supply after mint 2:', gnnd(totalSupply));
   liquidity = await clr.getPositionLiquidity();
   console.log('clr liquidity after mint 2:', gnnd(liquidity));
   let stakedBalance2 = await stakedToken.balanceOf(user1.address);
   console.log('other user receipt balance:', getNumberNoDecimals(stakedBalance2));
   await lmTerminal.connect(user2).provideLiquidity(clrPoolAddress, 0, bnDecimal(100000));
   totalSupply = await clr.totalSupply();
   console.log('clr total supply after mint 3:', gnnd(totalSupply));
   liquidity = await clr.getPositionLiquidity();
   console.log('clr liquidity after mint 3:', gnnd(liquidity));
   await increaseTime(300);
   console.log('removing liquidity with other contributions to the pool');
   await clr.withdraw(stakedBalance);
   stakedBalance = await stakedToken.balanceOf(admin.address);
   console.log('address receipt balance:', getNumberNoDecimals(stakedBalance));
   await increaseTime(300);

   console.log('minting and burning in 3 times');
   
   await clr.deposit(0, bnDecimal(10000));
   await increaseTime(300);
   console.log('mint success');
   stakedBalance = await stakedToken.balanceOf(admin.address);
   await clr.withdraw(stakedBalance.div(3));
   await increaseTime(300);
   let stakedBalance3 = await stakedToken.balanceOf(admin.address);
   console.log('address receipt balance after first burn:', getNumberNoDecimals(stakedBalance3));
   await clr.withdraw(stakedBalance.div(3));
   await increaseTime(300);
   stakedBalance3 = await stakedToken.balanceOf(admin.address);
   console.log('address receipt balance after 2nd burn:', getNumberNoDecimals(stakedBalance3));
   await clr.withdraw(stakedBalance.div(3));
   await increaseTime(300);
   stakedBalance3 = await stakedToken.balanceOf(admin.address);
   console.log('address receipt balance after 3rd burn:', getNumberNoDecimals(stakedBalance3));

   // Claiming rewards

   console.log('claiming rewards');
   await clr.deposit(1, bnDecimal(10000));
   await increaseTime(300);
   let tokenBalanceBefore = await t0.balanceOf(admin.address);
   await increaseTime(2000);
   await lmTerminal.claimReward(clrPoolAddress);
   let tokenBalanceAfter = await t0.balanceOf(admin.address);
   let tokensGained = tokenBalanceAfter.sub(tokenBalanceBefore);
   console.log('tokens gained from claiming rewards after 2000 seconds:', gnnd(tokensGained));

   let receiptBalance = await stakedToken.balanceOf(admin.address);

   // Claiming rewards and exiting
   await increaseTime(2000);
   await clr.withdrawAndClaimReward(receiptBalance);
   let receiptBalanceAfterExit = await stakedToken.balanceOf(admin.address);
   console.log('claimed rewards and exited position, balance:', receiptBalanceAfterExit.toString());

   console.log('--- Starting a new rewards program for CLR ---');
   console.log('Now rewards will be escrowed for a given time');
   // Finish program and start a new one
   await increaseTime(10000);
   await lmTerminal.initiateNewRewardsProgram(clrPoolAddress, [100000], 6048000, true);
   await increaseTime(300);

   await clr.deposit(1, bnDecimal(10000));
   await increaseTime(300);
   tokenBalanceBefore = await t0.balanceOf(admin.address);
   await increaseTime(2000);
   await lmTerminal.claimReward(clrPoolAddress);
   tokenBalanceAfter = await t0.balanceOf(admin.address);
   tokensGained = tokenBalanceAfter.sub(tokenBalanceBefore);
   console.log('tokens gained from claiming rewards after 2000 seconds:', gnnd(tokensGained));

   await increaseTime(6048000);

   tokenBalanceBefore = await t0.balanceOf(admin.address);
   await rewardEscrow.vest(t0.address);
   tokenBalanceAfter = await t0.balanceOf(admin.address);
   tokensGained = tokenBalanceAfter.sub(tokenBalanceBefore);
   console.log('tokens gained from claiming rewards after vesting period is over:', gnnd(tokensGained));

   console.log('setting up another CLR incentivized pool');

    // Deploy tokens
    let newToken0 = await deployArgs('ERC20Basic', 'Token0', 'Token0');
    let newToken1 = await deployArgs('ERC20Basic', 'Token1', 'Token1');
    let rewardToken = await deployArgs('ERC20Basic', 'RewardToken', 'RewardToken');
    midPrice = await getPriceInX96(1);

    // Deploy Uniswap Pool
    await lmTerminal.deployUniswapPool(newToken0.address, newToken1.address, 3000, midPrice);
    poolAddress = await lmTerminal.getPool(newToken0.address, newToken1.address, 3000);
    console.log('deployed uni pool at address:', poolAddress);

    // approve terminal new tokens
    await newToken0.approve(lmTerminal.address, bnDecimal(1000000000));
    await newToken1.approve(lmTerminal.address, bnDecimal(1000000000));
    await rewardToken.approve(lmTerminal.address, bnDecimal(1000000000));

   totalRewardAmount = bnDecimal(100000000);

   await lmTerminal.deployIncentivizedPool(
    'newToken0-newToken1-CLR',
    { lowerTick: -600, upperTick: 600 }, 
    { rewardTokens: [rewardToken.address], vestingPeriod: 6048000 }, 
    { fee: 3000, token0: newToken0.address, token1: newToken1.address, 
      amount0: bnDecimal(100000), amount1: bnDecimal(100000) }, 
    user2.address,
    { value: lmTerminal.deploymentFee() });

   console.log('deployed clr instance and setup staking program');
   clrPoolAddress = await lmTerminal.deployedCLRPools(1);
   console.log('clr pool address:', clrPoolAddress);
   clr = await ethers.getContractAt('CLR', clrPoolAddress);
   stakedTokenAddress = await clr.stakedToken();
   stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);

   await lmTerminal.initiateRewardsProgram(clrPoolAddress, [totalRewardAmount], 10000);
   console.log('initiated rewards');
   let rewardAmountAtStart = (await clr.rewardInfo(rewardToken.address)).totalRewardAmount;
   console.log('reward amount at start:', rewardAmountAtStart.toString());

   await newToken0.approve(clrPoolAddress, bnDecimal(1e14));
   await newToken1.approve(clrPoolAddress, bnDecimal(1e14));
   await newToken0.connect(user1).approve(clrPoolAddress, bnDecimal(1e14));
   await newToken1.connect(user1).approve(clrPoolAddress, bnDecimal(1e14));
   await newToken0.connect(user2).approve(clrPoolAddress, bnDecimal(1e14));
   await newToken1.connect(user2).approve(clrPoolAddress, bnDecimal(1e14));

   await clr.deposit(0, bnDecimal(100000));
   await increaseTime(300);
   tokenBalanceBefore = await rewardToken.balanceOf(admin.address);
   await increaseTime(10000);
   let earnedPreClaim = await clr.earned(admin.address, rewardToken.address);
   await lmTerminal.claimReward(clrPoolAddress);
   tokenBalanceAfter = await rewardToken.balanceOf(admin.address);
   tokensGained = tokenBalanceAfter.sub(tokenBalanceBefore);
   console.log('tokens gained from claiming rewards after 10000 seconds:', gnnd(tokensGained));

   let rewardAmountAfter10kSec = (await clr.rewardInfo(rewardToken.address)).remainingRewardAmount;
   console.log('remaining reward amount after 10k sec have passed:', rewardAmountAfter10kSec.toString());
   let earnedPostClaim = await clr.earned(admin.address, rewardToken.address);

   console.log('earned reward pre-claim:', earnedPreClaim.toString());
   console.log('earned reward post-claim:', earnedPostClaim.toString());

   await increaseTime(6048000);

   tokenBalanceBefore = await rewardToken.balanceOf(admin.address);
   await rewardEscrow.vest(rewardToken.address);
   tokenBalanceAfter = await rewardToken.balanceOf(admin.address);
   tokensGained = tokenBalanceAfter.sub(tokenBalanceBefore);
   console.log('tokens gained from claiming rewards after vesting period is over:', gnnd(tokensGained));

   let rewardAmountAtEnd = (await clr.rewardInfo(rewardToken.address)).remainingRewardAmount;
   console.log('remaining reward amount after end:', rewardAmountAtEnd.toString());
}


deployTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });