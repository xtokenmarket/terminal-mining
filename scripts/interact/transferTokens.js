const { ethers } = require('hardhat');
const { bnDecimal } = require('../helpers');



async function transferTokens() {
    let deployment = require('../deployment_kovan.json');
    
    let t0 = await ethers.getContractAt('ERC20Basic', deployment.token0)
    let t1 = await ethers.getContractAt('ERC20Basic', deployment.token1)

    let addressToTransferTo = '0xC93e60b01EE0C47409b10246Ca13839147Cf5636';
    await (await t0.transfer(addressToTransferTo, bnDecimal(10000000))).wait();
    await (await t1.transfer(addressToTransferTo, bnDecimal(10000000))).wait();
}

transferTokens()