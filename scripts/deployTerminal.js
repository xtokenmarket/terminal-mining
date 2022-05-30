const { ethers } = require('hardhat');
const { deployAndLink, deploy } = require('./helpers');

let uniswapAddresses = require('./uniswapAddresses.json')

async function deployTerminal(network) {
    let deployment = require('./deployment.json');
    let mgmt = require('./managementAddresses.json');
    let terminal = await deploy('LMTerminal');
    await terminal.deployed();

    console.log('deployed terminal at:', terminal.address);

    // Initialize LM Terminal
    let deploymentFee = '200000000000000000'; // 0.2 ETH flat deployment fee (350 MATIC)
    let rewardFeeDivisor = 100; // 1% fee on reward tokens
    let tradeFeeDivisor = 20; // 5% fee on trade fees in pools
    tx = await terminal.initialize(mgmt[network].xTokenManager, deployment.RewardEscrow, 
      deployment.ProxyAdmin, deployment.CLRDeployer, uniswapAddresses.v3CoreFactoryAddress,
      { router: uniswapAddresses.swapRouter, quoter: uniswapAddresses.quoterAddress, 
        positionManager: uniswapAddresses.nonfungibleTokenPositionManagerAddress
    }, deploymentFee, rewardFeeDivisor, tradeFeeDivisor);
    await tx.wait();

    console.log('initialized terminal');
}

deployTerminal('mainnet');