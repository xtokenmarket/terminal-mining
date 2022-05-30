const { ethers } = require('hardhat');
const { bnDecimal } = require('../helpers');



async function initializeRewards() {
    let deployment = require('../deployment_kovan.json');

    const terminal = await ethers.getContractAt('LMTerminal', deployment.Terminal);

    let clrAddress = '0x1e2D952d3e76C1094F6B2D876d88838670E3d2De';
    let amount = '10000000000000000000000'
    let duration = '604800'

    

    // Initialize rewards program with 100k of t0 and duration of 100 seconds
    let tx = await terminal.initiateRewardsProgram(clrAddress, [amount, amount], duration);
    await tx.wait();
    console.log('successfully initialized rewards program for', clrAddress);
}

initializeRewards()