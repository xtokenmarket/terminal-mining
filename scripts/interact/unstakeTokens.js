const { ethers } = require('hardhat');
const { bnDecimal, upgradeCLR, impersonate } = require('../helpers');


async function unstakeTokens() {
    let deployment = require('../deployment.json');

    let newClrImpl = await upgradeCLR('mainnet');

    let clrAddress = '0x6148a1BD2BE586E981115F9C0b16a09bBc271e2c';

    let deployerAddress = '0xba991745dbd48F81214DD80e86B0F459547b574b';
    let deployer = await impersonate(deployerAddress);
    let clr = await ethers.getContractAt('CLR', clrAddress);
    let proxyAdmin = await ethers.getContractAt('ProxyAdmin', deployment.ProxyAdmin);
    await proxyAdmin.connect(deployer).upgrade(clrAddress, newClrImpl);

    let rewardToken = await ethers.getContractAt('ERC20Basic', '0x3541A5C1b04AdABA0B83F161747815cd7B1516bC');
    let bb = await rewardToken.balanceOf(deployerAddress);
    
    await clr.connect(deployer).unstakeTokens();
    let ba = await rewardToken.balanceOf(deployerAddress);
    let diff = ba.sub(bb);
    console.log('balance gain:', diff.toString());
}

unstakeTokens()