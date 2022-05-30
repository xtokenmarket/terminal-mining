const { ethers, deployments } = require('hardhat');
const { deploy, deployArgs, deployAndLink, deployWithAbi, deployTokenManagerTest,
        bnDecimal, bnDecimals, getPriceInX96 } = require('../scripts/helpers');

const SwapRouter = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json')
const UniQuoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json')
const NFTPositionDescriptor =
 require('@uniswap/v3-periphery/artifacts/contracts/NonFungibleTokenPositionDescriptor.sol/NonFungibleTokenPositionDescriptor.json');
const NFTPositionManager = 
require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');

const UniFactory = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');

/**
 * Deployment fixture
 * Deploys minimum required for tests
 */
const deploymentFixture = deployments.createFixture(async () => {
    const [admin, user1, user2, user3] = await ethers.getSigners();
    let token0 = await deployArgs('ERC20Basic', 'wETH', 'wETH');
    let token1 = await deployArgs('ERC20Basic', 'XTK', 'XTK');
    let rewardToken = await deployArgs('ERC20Basic', 'DAI', 'DAI');
    // Tokens must be sorted by address
    if(token0.address > token1.address) {
      let tmp = token0;
      token0 = token1;
      token1 = tmp;
    }

    const uniFactory = await deployWithAbi(UniFactory, admin);
    const tokenDescriptor = await deployWithAbi(NFTPositionDescriptor, admin, token0.address);
    const positionManager = await deployWithAbi(NFTPositionManager, admin, 
                                                uniFactory.address, token0.address, tokenDescriptor.address);
    const swapRouter = await deployWithAbi(SwapRouter, admin, uniFactory.address, token0.address);
    const quoter = await deployWithAbi(UniQuoter, admin, uniFactory.address, token0.address);

    // Deploy Vesting contract
    const rewardEscrowImpl = await deploy('RewardEscrow');
    const rewardEscrowProxy = await deployArgs('RewardEscrowProxy', rewardEscrowImpl.address, user3.address);
    const rewardEscrow = await ethers.getContractAt('RewardEscrow', rewardEscrowProxy.address);
    // Deploy CLR and Staked Token Proxy Admin contract
    const proxyAdmin = await deploy('ProxyAdmin');
    
    // Deploy CLR instance
    let uniLib = await deploy('UniswapLibrary');
    let CLR = await deployAndLink('CLR', 'UniswapLibrary', uniLib.address);
    let StakedCLRToken = await deploy('StakedCLRToken');

    // Deploy CLR Proxy factory
    const CLRDeployer = await deployArgs('CLRDeployer', CLR.address, StakedCLRToken.address);

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
        rewardEscrow.address, proxyAdmin.address, CLRDeployer.address, uniFactory.address,
        { router: swapRouter.address, quoter: quoter.address, 
          positionManager: positionManager.address }, bnDecimal(1), 100, 1000);

    // transfer tokens to other users
    await token0.transfer(user1.address, bnDecimal(1000000));
    await token1.transfer(user1.address, bnDecimal(1000000));
    await token0.transfer(user2.address, bnDecimal(1000000));
    await token1.transfer(user2.address, bnDecimal(1000000));

    // approve terminal
    await token0.approve(lmTerminal.address, bnDecimal(1000000000));
    await token1.approve(lmTerminal.address, bnDecimal(1000000000));
    await rewardToken.approve(lmTerminal.address, bnDecimal(1000000000));
    await token0.connect(user1).approve(lmTerminal.address, bnDecimal(1000000000));
    await token1.connect(user1).approve(lmTerminal.address, bnDecimal(1000000000));
    await token0.connect(user2).approve(lmTerminal.address, bnDecimal(1000000000));
    await token1.connect(user2).approve(lmTerminal.address, bnDecimal(1000000000));

    return {
      token0, token1, rewardToken, lmTerminal, CLRDeployer, swapRouter, proxyAdmin
    }
});

module.exports = { deploymentFixture };