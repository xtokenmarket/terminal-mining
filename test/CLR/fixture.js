const { ethers, deployments } = require('hardhat');
const { deploy, deployArgs, deployAndLink, deployWithAbi, deployTokenManagerTest,
        bnDecimal, bnDecimals, getPriceInX96, increaseTime } = require('../../scripts/helpers');

const swapRouter = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json')
const UniQuoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json')
const NFTPositionDescriptor =
 require('@uniswap/v3-periphery/artifacts/contracts/NonFungibleTokenPositionDescriptor.sol/NonFungibleTokenPositionDescriptor.json');
const NFTPositionManager = 
require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');

const UniFactory = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');
const { getPoolInstance } = require('../../scripts/uniswapHelpers');

/**
 * Deployment fixture
 * Deploys LM Terminal, along with Uniswap pool and an Incentivized pool
 */
const deploymentFixture = deployments.createFixture(async () => {
    let token0 = await deployArgs('ERC20Basic', 'wETH', 'wETH');
    let token1 = await deployArgs('ERC20Basic', 'XTK', 'XTK');
    // Tokens must be sorted by address
    if(token0.address.toLowerCase() > token1.address.toLowerCase()) {
      let tmp = token0;
      token0 = token1;
      token1 = tmp;
    }
    // 0.94 - 1.06 price
    const lowTick = -600;
    const highTick = 600;
    // Price = 1
    const price = getPriceInX96(1);
    return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
});

/**
 * Fixture for tokens with same decimals = 6
 * Token 0 decimals = 6 ; Token 1 Decimals = 6
 * Deploys LM Terminal, along with Uniswap and an Incentivized pool
 */
 const fixture_6_6_decimals = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  let token1 = await deployArgs('ERC20Decimals', 'USDT', 'USDT', 6);
  // Tokens must be sorted by address
  if(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    let tmp = token0;
    token0 = token1;
    token1 = tmp;
  }
  // 0.94 - 1.06 price
  const lowTick = -600;
  const highTick = 600;
  // Price = 1
  const price = '79228162514264337593543950336';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
});

/**
 * Fixture for tokens with same decimals = 8
 * Token 0 decimals = 8 ; Token 1 Decimals = 8
 * Deploys LM Terminal, along with Uniswap and an Incentivized pool
 */
 const fixture_8_8_decimals = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 8);
  let token1 = await deployArgs('ERC20Decimals', 'renBTC', 'renBTC', 8);
  // Tokens must be sorted by address
  if(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    let tmp = token0;
    token0 = token1;
    token1 = tmp;
  }
  // 0.94 - 1.06 price
  const lowTick = -600;
  const highTick = 600;
  // Price = 1
  const price = '79228162514264337593543950336';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
});

/**
 * Fixture for tokens with different decimals
 * Token 0 decimals = 6 ; Token 1 Decimals = 8
 * Deploys LM Terminal, along with Uniswap and an Incentivized pool
 */
 const fixture_6_8_decimals = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  let token1 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 8);
  // Tokens must be sorted by address
  // Make sure tokens are ordered correctly
  while(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    token1 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 8);
  }
  // 0.91 - 1.07 price
  const lowTick = 45120;
  const highTick = 46740;
  // Price = 1
  const price = '793312034679948183834879042901';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
});

/**
 * Fixture for tokens with different decimals
 * Token 0 decimals = 8 ; Token 1 Decimals = 6
 * Deploys LM Terminal, along with Uniswap and an Incentivized pool
 */
 const fixture_8_6_decimals = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 8);
  let token1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  // Tokens must be sorted by address
  // Make sure tokens are ordered correctly
  while(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    token1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  }
  // 0.91 - 1.07 price
  const lowTick = -46980;
  const highTick = -45360;
  // Price = 1
  const price = '7912525539738091750091588668';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
});

/**
 * Fixture for tokens with different decimals
 * Token 0 decimals = 6 ; Token 1 Decimals = 12
 * Deploys LM Terminal, along with Uniswap and an Incentivized pool
 */
const fixture_6_12_decimals = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  let token1 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 12);
  // Tokens must be sorted by address
  // Make sure tokens are ordered correctly
  while(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    token1 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 12);
  }
  // 0.91 - 1.07 price
  const lowTick = 137220;
  const highTick = 138840;
  // Price = 1
  const price = '79299443975792720780679863727831';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
});

/**
 * Fixture for tokens with different decimals
 * Token 0 decimals = 12 ; Token 1 Decimals = 6
 * Deploys LM Terminal, along with Uniswap and an Incentivized pool
 */
const fixture_12_6_decimals = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 12);
  let token1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  // Tokens must be sorted by address
  // Make sure tokens are ordered correctly
  while(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    token1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  }
  // 0.91 - 1.07 price
  const lowTick = -139080;
  const highTick = -137460;
  // Price = 1
  const price = '79156945126914824732836954';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
})

/**
 * Fixture for tokens with different decimals
 * Token 0 decimals = 6 ; Token 1 Decimals = 18
 * Deploys LM Terminal, along with Uniswap and an Incentivized pool
 */
const fixture_6_18_decimals = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 6);
  let token1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 18);
  // Tokens must be sorted by address
  // Make sure tokens are ordered correctly
  while(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    token1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 18);
  }
  // 300 - 25 000 price
  const lowTick = 333360
  const highTick = 377580
  // Price = 1400
  const price = '2965940236826234467985251982472555553';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
})

/**
 * Fixture for tokens with different decimals
 * Token 0 decimals = 18 ; Token 1 Decimals = 6
 * Deploys LM Terminal, along with Uniswap and an Incentivized pool
 */
const fixture_18_6_decimals = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Decimals', 'wBTC', 'wBTC', 18);
  let token1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  // Tokens must be sorted by address
  // Make sure tokens are ordered correctly
  while(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    token1 = await deployArgs('ERC20Decimals', 'USDC', 'USDC', 6);
  }
  // 300 - 25 000 price
  const lowTick = -219300
  const highTick = -175080
  // Price = 11 100
  const price = '8344019221856898877545009';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, true);
})

/**
 * Deployment fixture with liquidity only in the first token
 * Deploys LM Terminal, along with Uniswap pool and an Incentivized pool
 */
 const fixture_outside_range_left = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Basic', 'wETH', 'wETH');
  let token1 = await deployArgs('ERC20Basic', 'XTK', 'XTK');
  // Tokens must be sorted by address
  if(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    let tmp = token0;
    token0 = token1;
    token1 = tmp;
  }
  // 0.94 - 1.06 price
  const lowTick = -600;
  const highTick = 600;
  // Price = 0.5
  const price = '56027864467524418217578629389';
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, false);
})

/**
* Deployment fixture with liquidity only in the second token
* Deploys LM Terminal, along with Uniswap pool and an Incentivized pool
*/
const fixture_outside_range_right = deployments.createFixture(async () => {
 let token0 = await deployArgs('ERC20Basic', 'wETH', 'wETH');
 let token1 = await deployArgs('ERC20Basic', 'XTK', 'XTK');
 // Tokens must be sorted by address
 if(token0.address.toLowerCase() > token1.address.toLowerCase()) {
   let tmp = token0;
   token0 = token1;
   token1 = tmp;
 }
 // 0.94 - 1.06 price
 const lowTick = -600;
 const highTick = 600;
 // Price = 2
 const price = '112035355890194496464709709068';
 return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, false);
})


/**
 * Deployment fixture without increasing pool oracle cardinality
 * Deploys LM Terminal, along with Uniswap pool and an Incentivized pool
 */
const fixture_no_cardinality = deployments.createFixture(async () => {
  let token0 = await deployArgs('ERC20Basic', 'wETH', 'wETH');
  let token1 = await deployArgs('ERC20Basic', 'XTK', 'XTK');
  // Tokens must be sorted by address
  if(token0.address.toLowerCase() > token1.address.toLowerCase()) {
    let tmp = token0;
    token0 = token1;
    token1 = tmp;
  }
  // 0.94 - 1.06 price
  const lowTick = -600;
  const highTick = 600;
  // Price = 1
  const price = getPriceInX96(1);
  return await setupDeploymentAndInitializePool(token0, token1, lowTick, highTick, price, false);
})

async function setupDeploymentAndInitializePool (token0, token1, lowTick, highTick, price, increaseCardinality) {
  const [admin, user1, user2, user3] = await ethers.getSigners();

  let token0Decimals = await token0.decimals();
  let token1Decimals = await token1.decimals();

  const uniFactory = await deployWithAbi(UniFactory, admin);
  const tokenDescriptor = await deployWithAbi(NFTPositionDescriptor, admin, token0.address);
  const positionManager = await deployWithAbi(NFTPositionManager, admin, 
                                              uniFactory.address, token0.address, tokenDescriptor.address);
  const router = await deployWithAbi(swapRouter, admin, uniFactory.address, token0.address);
  const quoter = await deployWithAbi(UniQuoter, admin, uniFactory.address, token0.address);

  // Deploy Reward token
  let rewardToken = await deployArgs('ERC20Basic', 'DAI', 'DAI');

  // Deploy Vesting contract
  const rewardEscrowImpl = await deploy('RewardEscrow');
  const rewardEscrowProxy = await deployArgs('RewardEscrowProxy', rewardEscrowImpl.address, user3.address);
  const rewardEscrow = await ethers.getContractAt('RewardEscrow', rewardEscrowProxy.address);

  // Deploy CLR and Staked Token Proxy Admin contract
  const proxyAdmin = await deploy('ProxyAdmin');
  
  // Deploy CLR instance
  let uniswapLibrary = await deploy('UniswapLibrary');
  let CLRImplementation = await deployAndLink('CLR', 'UniswapLibrary', uniswapLibrary.address);
  let StakedCLRToken = await deploy('StakedCLRToken');

  // Deploy CLR Proxy factory
  const CLRDeployer = await deployArgs('CLRDeployer', CLRImplementation.address, StakedCLRToken.address);

  // Deploy Liquidity Mining Terminal
  const lmTerminalImpl = await deploy('LMTerminal');
  const lmTerminalProxy = await deployArgs('LMTerminalProxy', lmTerminalImpl.address, user3.address);
  const lmTerminal = await ethers.getContractAt('LMTerminal', lmTerminalProxy.address);

  let xTokenManager = await deployTokenManagerTest(lmTerminal.address);

  // Initialize Reward Escrow
  await rewardEscrow.initialize();

  await rewardEscrow.transferOwnership(lmTerminal.address);
  await proxyAdmin.transferOwnership(lmTerminal.address);

  // Initialize LM Terminal
  await lmTerminal.initialize(xTokenManager.address, 
      rewardEscrow.address, proxyAdmin.address, CLRDeployer.address, ethers.constants.AddressZero,
      ethers.constants.AddressZero,
       uniFactory.address, { router: router.address, quoter: quoter.address, 
        positionManager: positionManager.address }, bnDecimal(1), 100, 1000);

  // transfer tokens to other users
  await token0.transfer(user1.address, bnDecimals(1000000000, token0Decimals));
  await token1.transfer(user1.address, bnDecimals(1000000000, token1Decimals));
  await token0.transfer(user2.address, bnDecimals(1000000000, token0Decimals));
  await token1.transfer(user2.address, bnDecimals(1000000000, token1Decimals));

  // approve terminal
  await token0.approve(lmTerminal.address, bnDecimal(1000000000));
  await token1.approve(lmTerminal.address, bnDecimal(1000000000));
  await rewardToken.approve(lmTerminal.address, bnDecimal(1000000000));
  await token0.connect(user1).approve(lmTerminal.address, bnDecimal(1000000000));
  await token1.connect(user1).approve(lmTerminal.address, bnDecimal(1000000000));
  await token0.connect(user2).approve(lmTerminal.address, bnDecimal(1000000000));
  await token1.connect(user2).approve(lmTerminal.address, bnDecimal(1000000000));

  // approve router
  await token0.approve(router.address, bnDecimal(1000000000));
  await token1.approve(router.address, bnDecimal(1000000000));

  // Deploy Uniswap Pool
  await lmTerminal.deployUniswapPool(token0.address, token1.address, 3000, price);
  let poolAddress = await lmTerminal.getPool(token0.address, token1.address, 3000);
  let pool = await getPoolInstance(poolAddress);

  // Increase maximum pool oracle observations
  if(increaseCardinality) {
    await pool.increaseObservationCardinalityNext(100);
  }
        
  
  // Deploy Incentivized CLR pool
  await lmTerminal.deployIncentivizedPool(
      'token0-token1-CLR', 
      { lowerTick: lowTick, upperTick: highTick }, 
      { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
      { fee: 3000, token0: token0.address, token1: token1.address, 
        amount0: bnDecimals(10000000, token0Decimals), amount1: bnDecimals(10000000, token1Decimals)}, 
      { value: lmTerminal.deploymentFee() });

  let clrPoolAddress = await lmTerminal.deployedCLRPools(0);
  let clr = await ethers.getContractAt('CLR', clrPoolAddress);

  let stakedTokenAddress = await clr.stakedToken();
  let stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);

  await token0.approve(clr.address, bnDecimal(10000000000));
  await token1.approve(clr.address, bnDecimal(10000000000));
  await token0.connect(user1).approve(clr.address, bnDecimal(10000000000));
  await token1.connect(user1).approve(clr.address, bnDecimal(10000000000));
  await token0.connect(user2).approve(clr.address, bnDecimal(10000000000));
  await token1.connect(user2).approve(clr.address, bnDecimal(10000000000));
  await increaseTime(300);

  return {
    token0, token1, rewardToken, lmTerminal, clr, stakedToken, router,
    uniswapLibrary, xTokenManager, token0Decimals, token1Decimals
  }
}

module.exports = { deploymentFixture, fixture_6_6_decimals, fixture_8_8_decimals, fixture_6_8_decimals, 
                  fixture_8_6_decimals, fixture_6_12_decimals, fixture_12_6_decimals, 
                  fixture_18_6_decimals, fixture_6_18_decimals,
                  fixture_no_cardinality, fixture_outside_range_left, fixture_outside_range_right };