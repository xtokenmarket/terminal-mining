const { ethers } = require('hardhat');
const { deployAndLink } = require('./helpers');

let uniswapAddresses = require('./uniswapAddresses.json')

async function deployCLR() {
    let deployment = require('./deployment.json');
    let CLRImplementation = await deployAndLink('CLR', 'UniswapLibrary', deployment.UniswapLibrary);
    await CLRImplementation.deployed();
    console.log('Uniswap Library:', deployment.UniswapLibrary);
    console.log('CLR Implementation:', CLRImplementation.address);
    await CLRImplementation.initialize('CLR', -1000, 1000, 500, 100, 
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    ethers.constants.AddressZero, deployment.Terminal, ethers.constants.AddressZero,
    {
        router: uniswapAddresses.swapRouter,
        quoter: uniswapAddresses.quoterAddress, 
        positionManager: uniswapAddresses.nonfungibleTokenPositionManagerAddress
    }, 
    {
        rewardTokens: ['0x6B175474E89094C44Da98b954EedeAC495271d0F'], 
        rewardEscrow: deployment.RewardEscrow,
        rewardsAreEscrowed: false
    }); 
}

deployCLR();