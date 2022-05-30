const { ethers } = require('hardhat');
const { bnDecimal } = require('../helpers');


async function depositInPool() {
    const [admin, user1] = await ethers.getSigners();
    let deployment = require('../deployment_kovan.json')
    //let clrAddress = '0x08740bBac01bc8FD033D2E98cA60f6E6a866776d';
    let clr = await ethers.getContractAt('CLR', deployment.CLR);
    let stakedToken = await ethers.getContractAt('StakedCLRToken', deployment.StakedToken);

    let t0 = await ethers.getContractAt('ERC20Basic', deployment.token0)
    let t1 = await ethers.getContractAt('ERC20Basic', deployment.token1)

    await (await t0.transfer(user1.address, bnDecimal(1000000))).wait();
    await (await t1.transfer(user1.address, bnDecimal(1000000))).wait();

    let balance = await stakedToken.balanceOf(user1.address);
    console.log('balance of staked token of user1', balance.toString());
    let tx = await clr.connect(user1).deposit(0, bnDecimal(100));
    await tx.wait();
    console.log('successfully deposited 100 token 0 in:', clrAddress);

    balance = await stakedToken.balanceOf(user1.address);
    console.log('balance of staked token of user1', balance.toString());
}

depositInPool()