const fs = require('fs');
const { ethers } = require('hardhat');
const { deploy, deployArgs, deployAndLink, getPriceInX96, bnDecimal, 
  getNumberNoDecimals, mineBlocks, gnnd, increaseTime, deployTokenManager, verifyContractNoArgs, verifyContractWithArgs, verifyContractWithArgsAndName } = require('./helpers');

const uniswapAddresses = require('./uniswapAddresses.json');

/**
 * Testnet deployment of Liquidity Mining Terminal
 */
async function deployTest() {
    const [admin, user1, user2] = await ethers.getSigners();

    // Deploy reward escrow
    let proxyOwnerAddress = user1.address;
    let rewardEscrowImpl = await deploy('RewardEscrow');
    await rewardEscrowImpl.deployed();
    let rewardEscrowProxy = await deployArgs('RewardEscrowProxy', rewardEscrowImpl.address, proxyOwnerAddress);
    await rewardEscrowProxy.deployed();
    let rewardEscrow = await ethers.getContractAt('RewardEscrow', rewardEscrowProxy.address);
    // Deploy CLR proxy admin
    let proxyAdmin = await deploy('ProxyAdmin');
    await proxyAdmin.deployed();

    console.log('Reward Escrow:', rewardEscrowImpl.address);
    console.log('Proxy Admin:', proxyAdmin.address);

    // Deploy CLR instance
    let uniLib = await deploy('UniswapLibrary');
    await uniLib.deployed();
    let CLRImplementation = await deployAndLink('CLR', 'UniswapLibrary', uniLib.address);
    await CLRImplementation.deployed();
    console.log('Uniswap Library:', uniLib.address);
    console.log('CLR Implementation:', CLRImplementation.address);
    let stakedCLRToken = await deploy('StakedCLRToken');
    await stakedCLRToken.deployed();
    console.log('Staked CLR Token implementation:', stakedCLRToken.address);

    // Deploy CLR Proxy factory
    const CLRDeployer = await deployArgs('CLRDeployer', CLRImplementation.address, stakedCLRToken.address);
    await CLRDeployer.deployed();
    console.log('CLR Proxy Factory:', CLRDeployer.address);

    // Deploy Liquidity Mining Terminal
    let lmTerminalImpl = await deploy('LMTerminal');
    await lmTerminalImpl.deployed();
    console.log('LM Terminal implementation:', lmTerminalImpl.address);
    let lmTerminalProxy = await deployArgs('LMTerminalProxy', lmTerminalImpl.address, proxyOwnerAddress);
    await lmTerminalProxy.deployed();
    console.log('LM Terminal proxy verification:\n', lmTerminalProxy.address, lmTerminalImpl.address, proxyOwnerAddress);
    let lmTerminal = await ethers.getContractAt('LMTerminal', lmTerminalProxy.address);

    console.log('LM Terminal:', lmTerminal.address);

    let deployment = {
      "Terminal": lmTerminal.address,
      "RewardEscrow": rewardEscrow.address,
      "ProxyAdmin": proxyAdmin.address,
      "CLRDeployer": CLRDeployer.address,
      "CLRImplementation": CLRImplementation.address,
      "StakedCLRTokenImplementation": stakedCLRToken.address,
      "LMTerminalImplementation": lmTerminalImpl.address,
      "UniswapLibrary": uniLib.address
    }

    fs.writeFileSync('./scripts/deployment_kovan.json', JSON.stringify(deployment));

    console.log('deployment finished')

    // Initialize Reward Escrow
    let tx = await rewardEscrow.initialize();
    await tx.wait();

    tx = await rewardEscrow.transferOwnership(lmTerminal.address);
    await tx.wait();
    tx = await proxyAdmin.transferOwnership(lmTerminal.address);
    await tx.wait();

    // Deploy tokens
    
    let xTokenManager = await deployTokenManager(lmTerminal.address);
    console.log('deployed token manager:', xTokenManager.address);
    
    // Initialize LM Terminal
    tx = await lmTerminal.initialize(xTokenManager.address, rewardEscrow.address, 
      proxyAdmin.address, CLRDeployer.address, uniswapAddresses.v3CoreFactoryAddress,
      { router: uniswapAddresses.swapRouter, quoter: uniswapAddresses.quoterAddress, 
        positionManager: uniswapAddresses.nonfungibleTokenPositionManagerAddress
    }, 1, 100, 1000);
    await tx.wait();
    console.log('initialized lm terminal');

   // Verify
   try {
    await verifyContractNoArgs(rewardEscrowImpl.address);
   } catch(err) {
     console.log(err);
   }
   try {
    await verifyContractNoArgs(proxyAdmin.address);
   } catch(err) {
     console.log(err);
   }
   try {
    await verifyContractNoArgs(uniLib.address);
   } catch(err) {
     console.log(err);
   }
   try {
    await verifyContractNoArgs(CLRImplementation.address);
   } catch(err) {
     console.log(err);
   }
   try {
    await verifyContractNoArgs(stakedCLRToken.address);
   } catch(err) {
     console.log(err);
   }
   try {
    await verifyContractNoArgs(lmTerminalImpl.address);
   } catch(err) {
     console.log(err);
   }
   try {
    await verifyContractWithArgs(CLRDeployer.address, CLRImplementation.address, stakedCLRToken.address);
   } catch(err) {
     console.log(err);
   }

   let lmTerminalProxyName = 'contracts/proxies/LMTerminalProxy.sol:LMTerminalProxy';
   let rewardEscrowProxyName = 'contracts/proxies/RewardEscrowProxy.sol:RewardEscrowProxy';
   try {
    await verifyContractWithArgsAndName(lmTerminalProxy.address, lmTerminalProxyName, lmTerminalImpl.address, proxyOwnerAddress);
   } catch(err) {
     console.log(err);
   }
   try {
    await verifyContractWithArgsAndName(rewardEscrowProxy.address, rewardEscrowProxyName, rewardEscrowImpl.address, proxyOwnerAddress);
   } catch(err) {
     console.log(err);
   }
}


deployTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });