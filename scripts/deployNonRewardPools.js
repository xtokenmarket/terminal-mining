const { deployAndLink, deployArgs, verifyContractNoArgs, verifyContractWithArgs, deploy } = require('./helpers');


/**
 * Deploy non-reward pools implementation and non-reward pools deployer
 * Deploy a new terminal implementation
 * Post deployment to set up:
 * 1. Upgrade terminal proxy to new implementation
 * 2. Call `setNonRewardPoolDeployer` on Terminal
 */
async function deployNonRewardPools() {
    let deployment = require('./deployment.json');
    let nonRewardPoolImpl = await deployAndLink('NonRewardPool', 'UniswapLibrary', deployment.UniswapLibrary);
    await nonRewardPoolImpl.deployed();
    console.log('NonRewardPool Implementation:', nonRewardPoolImpl.address);

    let nonRewardPoolDeployer = await deployArgs('NonRewardPoolDeployer', nonRewardPoolImpl.address);
    await nonRewardPoolDeployer.deployed();
    console.log('deployed non reward pool deployer at:', nonRewardPoolDeployer.address);

    let terminalImpl = await deploy('LMTerminal');
    await terminalImpl.deployed();
    console.log('deployed terminal implementation at:', terminalImpl.address);

    // Verification
    try {
        await verifyContractNoArgs(nonRewardPoolImpl.address);
    } catch(err) {
        console.log(err);
    }
    try {
        await verifyContractNoArgs(terminalImpl.address);
    } catch(err) {
        console.log(err);
    }
    try {
        await verifyContractWithArgs(nonRewardPoolDeployer.address, nonRewardPoolImpl.address);
    } catch(err) {
        console.log(err);
    }
}

deployNonRewardPools();