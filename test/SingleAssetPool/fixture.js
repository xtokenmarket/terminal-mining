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

/**
 * Deployment fixture
 * Deploys LMTerminal, SingleAssetPool and Pool deployer
 */
const deploymentFixture = deployments.createFixture(async () => {
  const [admin, user1, user2, user3] = await ethers.getSigners();

  let stakingToken = await deployArgs('ERC20Basic', 'wETH', 'wETH');
  let rewardToken = await deployArgs('ERC20Basic', 'DAI', 'DAI');

  let tokenDecimals = await stakingToken.decimals();

  const uniFactory = await deployWithAbi(UniFactory, admin);
  const tokenDescriptor = await deployWithAbi(NFTPositionDescriptor, admin, stakingToken.address);
  const positionManager = await deployWithAbi(NFTPositionManager, admin, 
                                              uniFactory.address, stakingToken.address, tokenDescriptor.address);
  const router = await deployWithAbi(swapRouter, admin, uniFactory.address, stakingToken.address);
  const quoter = await deployWithAbi(UniQuoter, admin, uniFactory.address, stakingToken.address);

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

  // Deploy Non reward pool instance
  let nonRewardPoolImplementation = await deployAndLink('NonRewardPool', 'UniswapLibrary', uniswapLibrary.address);

  // Deploy Single asset pool instance
  let singleAssetPoolImplementation = await deploy('SingleAssetPool');

  // Deploy CLR Proxy factory
  const CLRDeployer = await deployArgs('CLRDeployer', CLRImplementation.address, StakedCLRToken.address);

  const nonRewardPoolDeployer = await deployArgs('NonRewardPoolDeployer', nonRewardPoolImplementation.address);

  const singleAssetPoolDeployer = await deployArgs('SingleAssetPoolDeployer', singleAssetPoolImplementation.address);

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
      rewardEscrow.address, proxyAdmin.address, CLRDeployer.address, nonRewardPoolDeployer.address,
      singleAssetPoolDeployer.address, uniFactory.address, 
      { router: router.address, quoter: quoter.address, positionManager: positionManager.address },
       bnDecimal(1), 100, 1000);

  // transfer tokens to other users
  await stakingToken.transfer(user1.address, bnDecimals(1000000000, tokenDecimals));
  await stakingToken.transfer(user2.address, bnDecimals(1000000000, tokenDecimals));

  // approve terminal
  await stakingToken.approve(lmTerminal.address, bnDecimal(1000000000));
  await stakingToken.connect(user1).approve(lmTerminal.address, bnDecimal(1000000000));
  await stakingToken.connect(user2).approve(lmTerminal.address, bnDecimal(1000000000));

  // approve router
  await stakingToken.approve(router.address, bnDecimal(1000000000));
  
  // Deploy single asset pool
  let tx = await lmTerminal.deploySingleAssetPool(
    stakingToken.address,
    { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
    { value: lmTerminal.deploymentFee() }
  );

  let receipt = await tx.wait();
  let poolDeployment = receipt.events.filter(e => e.event == 'DeployedSingleAssetPool');

  let singleAssetPoolAddress = poolDeployment[0].args.poolInstance;
  let singleAssetPool = await ethers.getContractAt('SingleAssetPool', singleAssetPoolAddress);

  await stakingToken.approve(singleAssetPool.address, bnDecimal(10000000000));
  await stakingToken.connect(user1).approve(singleAssetPool.address, bnDecimal(10000000000));
  await stakingToken.connect(user2).approve(singleAssetPool.address, bnDecimal(10000000000));
  await increaseTime(300);

  return {
    stakingToken, rewardToken, lmTerminal, singleAssetPool, xTokenManager, tokenDecimals
  }
});

module.exports = { deploymentFixture };