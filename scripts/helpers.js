const { ethers, network } = require("hardhat");
const { getPool, getUniswapInstances } = require("./uniswapHelpers");
const { BigNumber } = require("ethers");
const { default: axios } = require("axios");


/**
 * Deploy a contract by name without constructor arguments
 */
async function deploy(contractName) {
    let Contract = await ethers.getContractFactory(contractName);
    return await Contract.deploy({gasLimit: 8888888});
}

/**
 * Deploy a contract by name with constructor arguments
 */
async function deployArgs(contractName, ...args) {
    let Contract = await ethers.getContractFactory(contractName);
    return await Contract.deploy(...args, {gasLimit: 8888888});
}

/**
 * Deploy a contract with abi
 */
 async function deployWithAbi(contract, deployer, ...args) {
    let Factory = new ethers.ContractFactory(contract.abi, contract.bytecode, deployer);
    return await Factory.deploy(...args, {gasLimit: 8888888});
}

/**
 * Deploy a contract by name without constructor arguments
 * Link contract to a library address
 */
 async function deployAndLink(contractName, libraryName, libraryAddress) {
    const params = {
        libraries: {
            [libraryName]: libraryAddress
        }
    }
    let Contract = await ethers.getContractFactory(contractName, params);
    return await Contract.deploy({gasLimit: 8888888});
}

/**
 * Upgrade Terminal instance to a new deployment
 * @param {*} network which network to perform upgrade on
 */
async function upgradeTerminal(network) {
    let deployment = require(`./deployment.json`);
    let management = require('./managementAddresses.json');
    let proxyAdminAddress = management[network].ProxyAdmin;
    let msigAddress = management[network].Multisig;

    let proxyAdmin = await ethers.getContractAt('IxProxyAdmin', proxyAdminAddress);

    let msig = await impersonate(msigAddress);

    let terminalNewImpl = await deploy('LMTerminal');
    await proxyAdmin.connect(msig).upgrade(deployment.Terminal, terminalNewImpl.address)
}

/**
 * Upgrade Terminal instance to a new deployment
 * @param {*} network which network to perform upgrade on
 */
async function upgradeRewardEscrow(network) {
    let deployment = require(`./deployment_${network}.json`);
    let management = require('./managementAddresses.json');
    let proxyAdminAddress = management[network].ProxyAdmin;
    let msigAddress = management[network].Multisig;

    console.log('proxy admin addr:', proxyAdminAddress)
    console.log('msig addr:', msigAddress)

    let proxyAdmin = await ethers.getContractAt('IxProxyAdmin', proxyAdminAddress);

    let msig = await impersonate(msigAddress);

    let rewardEscrowNewImpl = await deploy('RewardEscrow');
    await proxyAdmin.connect(msig).upgrade(deployment.RewardEscrow, rewardEscrowNewImpl.address)
}

async function upgradeCLR(network) {
    let deployment = require(`./deployment.json`);

    let clrNewImpl = await deployAndLink('CLR', 'UniswapLibrary', deployment.UniswapLibrary);

    let clrDeployer = await ethers.getContractAt('CLRDeployer', deployment.CLRDeployer);
    let owner = await clrDeployer.owner();
    let signer = await impersonate(owner);

    await clrDeployer.connect(signer).setCLRImplementation(clrNewImpl.address);
    return clrNewImpl.address;
}

/**
 * Deposit external liquidity in a given pool
 * @param {String} pool pool address
 */
async function depositLiquidityInPool(amount0, amount1, token0, token1, fee, receiverAddress) {
    let positionManager = (await (getUniswapInstances())).positionManager;

    let approveAmount = bnDecimal(1000000000);
    tx = await token0.approve(positionManager.address, approveAmount);
    tx = await token1.approve(positionManager.address, approveAmount);

    // widest possible range
    let lowTick = -887220;
    let highTick = 887220;
    const pendingBlock = await network.provider.send("eth_getBlockByNumber", ["pending", false])
    await positionManager.mint({
        token0: token0.address,
        token1: token1.address,
        fee: fee,
        tickLower: lowTick,
        tickUpper: highTick,
        amount0Desired: amount0,
        amount1Desired: amount1,
        amount0Min: 0,
        amount1Min: 0,
        recipient: receiverAddress,
        deadline: pendingBlock.timestamp
    })
}

/**
 * @dev Deploys xTokenManager and sets admin as manager for hardhat testing
 * @param instanceAddress - address of CLR instance to add manager to
 * @return xTokenManager contract instance
 */
 async function deployTokenManager(instanceAddress) {
    let [admin, user1, user2, user3] = await ethers.getSigners();
    let ownerAddress = '0x90FAE990eF82699b73596a7D74167372334F2dAC'
    const xTokenManagerImpl = await deploy('xTokenManager');
    await xTokenManagerImpl.deployed();
    const proxy = await deployArgs('xTokenManagerProxy', xTokenManagerImpl.address, ownerAddress);
    await proxy.deployed();

    const xTokenManager = await ethers.getContractAt('xTokenManager', proxy.address);
    let tx = await xTokenManager.initialize();
    await tx.wait();
    tx = await xTokenManager.addManager(admin.address, instanceAddress);
    await tx.wait();
    tx = await xTokenManager.setRevenueController(admin.address);
    await tx.wait();
    return xTokenManager;
}

/**
 * @dev Deploys xTokenManager and sets admin as manager for hardhat testing
 * @param instanceAddress - address of CLR instance to add manager to
 * @return xTokenManager contract instance
 */
 async function deployTokenManagerTest(instanceAddress) {
    let [admin, user1, user2, user3] = await ethers.getSigners();
    let ownerAddress = '0x90FAE990eF82699b73596a7D74167372334F2dAC'
    const xTokenManagerImpl = await deploy('xTokenManager');
    await xTokenManagerImpl.deployed();
    const proxy = await deployArgs('xTokenManagerProxy', xTokenManagerImpl.address, user3.address);
    await proxy.deployed();

    const xTokenManager = await ethers.getContractAt('xTokenManager', proxy.address);
    let tx = await xTokenManager.initialize();
    await tx.wait();
    tx = await xTokenManager.addManager(admin.address, instanceAddress);
    await tx.wait();
    tx = await xTokenManager.setRevenueController(admin.address);
    await tx.wait();
    return xTokenManager;
}

/**
 * Get mainnet xToken Manager contract instance
 */
async function getMainnetxTokenManager() {
    const xTokenManagerAddress = '0xfA3CaAb19E6913b6aAbdda4E27ac413e96EaB0Ca';
    const xTokenManager = await ethers.getContractAt('IxTokenManager', xTokenManagerAddress);
    return xTokenManager;
}

/**
 * Get CLR amount when minting and returned values when burning
 * @param {Contract} CLR 
 * @param {Signer} admin 
 * @param {Contract} token0 pool token 0 instance
 * @param {Contract} token1 pool token 1 instance
 * @param {Number} inputAsset 
 * @param {BigNumber} amount 
 */
async function testMintAndBurnAmounts(CLR, admin, token0, token1, inputAsset, amount) {
    let amounts = await getSingleTokenMintedAmounts(CLR, inputAsset, amount);
    console.log('amounts minted:', getNumberNoDecimals(amounts[0]), getNumberNoDecimals(amounts[1]));

    let clrBalanceBefore = await CLR.balanceOf(admin.address);

    console.log(`attempting to mint w/ ${getNumberNoDecimals(amount)} token ${inputAsset}`);
    await clr.deposit(inputAsset, amount);
    await increaseTime(300);

    let clrBalanceAfter = await CLR.balanceOf(admin.address);

    let balanceGainedByMint = clrBalanceAfter.sub(clrBalanceBefore);
    console.log('CLR balance minted:', getNumberNoDecimals(balanceGainedByMint));

    let token0BB = await token0.balanceOf(admin.address);
    let token1BB = await token1.balanceOf(admin.address);

    console.log('burning the balance just gained:');
    await clr.withdraw(balanceGainedByMint);

    let token0BA = await token0.balanceOf(admin.address);
    let token1BA = await token1.balanceOf(admin.address);

    let token0Gained = token0BA.sub(token0BB);
    let token1Gained = token1BA.sub(token1BB);

    console.log('token 0 balance gained on burn:', getNumberNoDecimals(token0Gained));
    console.log('token 1 balance gained on burn:', getNumberNoDecimals(token1Gained));
}

/**
 * Calculate amount to swap when rebalancing
 * @param {Contract} CLR CLR instance
 * @param {Contract} uniswapLibrary Uniswap Library instance
 * @param {BigNumber} amount0 token 0 amount for staking
 * @param {BigNumber} amount1 token 1 amount for staking
 * @returns [BigNumber, bool] swapAmount and swap 0 -> 1 if true, 1 -> 0 if false
 */
async function getSwapAmountWhenMinting(CLR, uniswapLibrary, amount0, amount1) {
    let minted = await getMintedAmounts(CLR, amount0, amount1);
    let poolAddress = (await CLR.uniContracts()).pool;
    let liquidity = await CLR.getLiquidityForAmounts(minted[0], minted[1]);
    let poolLiquidity = await uniswapLibrary.getPoolLiquidity(poolAddress);
    let liquidityRatio = liquidity.mul(bn(10).pow(18)).div(poolLiquidity);
    let midPrice = (await uniswapLibrary.getPoolPriceWithDecimals(poolAddress));

    // n - swap amt, x - amount 0 to mint, y - amount 1 to mint,
    // z - amount 0 minted, t - amount 1 minted, p0 - pool mid price
    // l - liquidity ratio (current mint liquidity vs total pool liq)
    // (X - n) / (Y + n * p0) = (Z + l * n) / (T - l * n * p0) ->
    // n = (X * T - Y * Z) / (p0 * l * X + p0 * Z + l * Y + T)
    let numerator = amount0.mul(minted[1]).sub(amount1.mul(minted[0]));
    let denominator = amount0.mul(liquidityRatio).mul(midPrice).div(bn(10).pow(18)).div(1e12).
                        add(midPrice.mul(minted[0]).div(1e12)).
                        add(liquidityRatio.mul(amount1).div(bn(10).pow(18))).
                        add(minted[1]);
    let result = numerator.div(denominator);
    if(numerator.gt(0)) {
        return [result, true];
    } else {
        return [result, false];
    }
}


/**
 * Function which replicates rebalance function
 * Stakes all available buffer balance in position
 * Can choose whether to use 1inch or Uni V3 only
 * @param {Contract} CLR 
 * @param {Contract} uniswapLibrary  
 * @param {Contract} token0 
 * @param {Contract} token1 
 * @param {Boolean} oneInch route through 1inch if true, Uni V3 if not 
 */
async function swapAndStake(CLR, uniswapLibrary, token0, token1, oneInch) {
    let buffer = await getBufferBalance(CLR, token0, token1);
    let [swapAmt, side] = await getSwapAmountWhenMinting(CLR, uniswapLibrary, buffer[0], buffer[1]);
    if(side) {
        console.log('swappping', gnnd(swapAmt).toString(), 'of token 0 for token 1');
    } else {
        console.log('swappping', gnnd(swapAmt).toString(), 'of token 1 for token 0');
    }
    if(oneInch) {
        await oneInchSwapCLR(CLR, swapAmt, token0, token1, side);
    } else {
        await CLR.adminSwap(swapAmt, side);
    }

    buffer = await getBufferBalance(CLR);
    let minted = await getMintedAmounts(CLR, buffer[0], buffer[1]);
    await CLR.adminStake(minted[0], minted[1]);
}

/**
 * Set an address ETH balance to 10
 * @param {*} address 
 */
 async function setBalance(address) {
    await network.provider.send("hardhat_setBalance", [
      address,
      bnDecimal(10).toHexString(),
    ]);
  }

async function oneInchSwapCLR(CLR, swapAmount, token0, token1, _0for1) {
    await setBalance(CLR.address);
    if(_0for1) {
        let apiUrl = `https://api.1inch.exchange/v3.0/1/swap?fromTokenAddress=${token0.address}&toTokenAddress=${token1.address}&amount=${swapAmount}&fromAddress=${CLR.address}&slippage=50&disableEstimate=true`;
        let response = await axios.get(apiUrl);
        let oneInchData = response.data.tx.data;
        console.log('one inch response:', response.data);
        await CLR.adminSwapOneInch(1, true, oneInchData);
    } else {
        let apiUrl = `https://api.1inch.exchange/v3.0/1/swap?fromTokenAddress=${token1.address}&toTokenAddress=${token0.address}&amount=${swapAmount}&fromAddress=${CLR.address}&slippage=50&disableEstimate=true`;
        let response = await axios.get(apiUrl);
        let oneInchData = response.data.tx.data;
        await CLR.adminSwapOneInch(1, false, oneInchData);
    }
}

/**
 * Swap using one inch exchange
 * @param {*} account Account to swap with
 * @param {*} token0 Token 0 for swapping
 * @param {*} token1 Token 1 for swapping
 * @param {*} amount Amount to swap
 * @param {*} _0for1 Swap token 0 for token 1 if true
 */
async function oneInchSwap(account, amount, token0, token1, _0for1) {
    let oneInchAddress = '0x11111112542D85B3EF69AE05771c2dCCff4fAa26';
    if(_0for1) {
        await token0.approve(oneInchAddress, bnDecimal(100000000));
        let token0Decimals = await token0.decimals();
        let swapAmount = bnDecimals(amount, token0Decimals);
        let apiUrl = `https://api.1inch.exchange/v3.0/1/swap?fromTokenAddress=${token0.address}&toTokenAddress=${token1.address}&amount=${swapAmount}&fromAddress=${account.address}&slippage=50&disableEstimate=true`;
        let response = await axios.get(apiUrl);
        let oneInchData = response.data.tx.data;
        let tx = {
            from: account.address,
            to: oneInchAddress,
            data: oneInchData
        }
        await account.sendTransaction(tx);
    } else {
        await token1.approve(oneInchAddress, bnDecimal(100000000));
        let token1Decimals = await token1.decimals();
        let swapAmount = bnDecimals(amount, token1Decimals);
        let apiUrl = `https://api.1inch.exchange/v3.0/1/swap?fromTokenAddress=${token1.address}&toTokenAddress=${token0.address}&amount=${swapAmount}&fromAddress=${account.address}&slippage=50&disableEstimate=true`;
        let response = await axios.get(apiUrl);
        let oneInchData = response.data.tx.data;
        let tx = {
            from: account.address,
            to: oneInchAddress,
            data: oneInchData
        }
        await account.sendTransaction(tx);
    }
}

async function receiveXTK(receiverAccount) {
    let xtkAddress = '0x7f3edcdd180dbe4819bd98fee8929b5cedb3adeb';
    let accountWithXTK = '0x38138586aedb29b436eab16105b09c317f5a79dd';
    await receiveToken(receiverAccount, accountWithXTK, xtkAddress, bnDecimal(2000000));

    // get balance by unstaking xtk from staking module with biggest whale there
    const anotherAccountWithXTK = '0xa0f75491720835b36edc92d06ddc468d201e9b73';
    const stakingModule = '0x314022e24ced941781dc295682634b37bd0d9cfc'
    let staking = await ethers.getContractAt('IxStaking', stakingModule);
    const signer = await impersonate(anotherAccountWithXTK);
    const xxtkaAmount = bnDecimal(50000000);
    await staking.connect(signer).unstake(xxtkaAmount);
    const token = await ethers.getContractAt('BasicERC20', xtkAddress);
    let newAccountBalance = await token.balanceOf(anotherAccountWithXTK);

    // 6M xtoken
    await token.connect(signer).transfer(receiverAccount.address, newAccountBalance);
}

async function receiveWeth(receiverAccount) {
    let wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    let accountWithWeth = '0xe78388b4ce79068e89bf8aa7f218ef6b9ab0e9d0'
    await receiveToken(receiverAccount, accountWithWeth, wethAddress, bnDecimal(50000));
}

/**
 * Receive a token using an impersonated account
 * @param {hre.ethers.signer} receiverAccount - Signer of account to receive tokens
 * @param {String} accountToImpersonate - address
 * @param {String} token - token address
 * @param {String} amount - amount to send
 */
async function receiveToken(receiverAccount, accountToImpersonate, tokenAddress, amount) {
    // Impersonate account
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountToImpersonate]}
    )
    const signer = await ethers.getSigner(accountToImpersonate)
    // Send tokens to account
    let ethSendTx = {
        to: accountToImpersonate,
        value: bnDecimal(6)
    }
    await receiverAccount.sendTransaction(ethSendTx);
    const token = await ethers.getContractAt('BasicERC20', tokenAddress);
    await token.connect(signer).transfer(receiverAccount.address, amount);
}

/**
 * Receive tokens using an impersonated account
 * @param {hre.ethers.signer} receiverAccount - Signer of account to receive tokens
 * @param {String} accountToImpersonate - address
 * @param {Map} tokens - map of token address to amount to receive of that token
 */
async function receiveTokens(receiverAccount, accountToImpersonate, tokens) {
    // Impersonate account
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountToImpersonate]}
    )
    const signer = await ethers.getSigner(accountToImpersonate)
    // Send tokens to account
    let ethSendTx = {
        to: accountToImpersonate,
        value: bnDecimal(1)
    }
    // console.log('sending eth to account:', accountToImpersonate)
    await receiverAccount.sendTransaction(ethSendTx);
    for(let [address, amount] of Object.entries(tokens)) {
        const token = await ethers.getContractAt('BasicERC20', address);
        await token.connect(signer).transfer(receiverAccount.address, amount)
    }
}

async function makeAddressManager(address, clrInstanceAddress) {
    const xTokenManager = await getMainnetxTokenManager();
    const xTokenOwnerAddress = '0x38138586AedB29B436eAB16105b09c317F5a79dd';
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [xTokenOwnerAddress]}
    )
    const xTokenOwnerSigner = await ethers.getSigner(xTokenOwnerAddress);
    let ethSendTx = {
        to: xTokenOwnerAddress,
        value: bnDecimal(10)
    }
    let signers = await ethers.getSigners();
    await signers[11].sendTransaction(ethSendTx);
    await xTokenManager.connect(xTokenOwnerSigner).addManager(address, clrInstanceAddress);
}

async function impersonate(address) {
    await setBalance(address);
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address]}
    )
    return await ethers.getSigner(address)
}

/**
 * Check fees collected on collect call for a given CLR instance
 * @param {Contract} CLR CLR contract
 */
async function checkClaimableFees(CLR) {
    let nb = await CLR.getNav();
    await CLR.collect();
    let na = await CLR.getNav();
    let fees = na.sub(nb);
    return fees;
}

/**
 * Get token 0 ratio in position in %
 * @param {Contract} uniswapLibrary 
 * @param {Contract} CLR 
 * @param {String} poolAddress 
 * @returns 
 */
 async function getPositionTokenRatio(uniswapLibrary, CLR, poolAddress) {
    let position = await CLR.getStakedTokenBalance();
    let midPrice = await getMidPrice(uniswapLibrary, poolAddress);
    let token0AmountProper = position.amount0.mul(midPrice).div(1e12);
    let ratio = (token0AmountProper.mul(1e4).div(position.amount1).toNumber() / 1e4) * 100;
    ratio = ratio.toFixed(2);
    let ratioSum = new Number(ratio) + 100;
    let actualRatio = new Number(((ratio / ratioSum) * 100).toFixed(2));
    return actualRatio;
}

/**
 * Print token ratios in position
 * @param {Contract} uniswapLibrary 
 * @param {Contract} CLR 
 * @param {String} poolAddress 
 */
async function printPositionTokenRatios(uniswapLibrary, CLR, poolAddress) {
    let position = await CLR.getStakedTokenBalance();
    let midPrice = await getMidPrice(uniswapLibrary, poolAddress);
    let token0AmountProper = position.amount0.mul(midPrice).div(1e12);
    let ratio = (token0AmountProper.mul(1e4).div(position.amount1).toNumber() / 1e4) * 100;
    ratio = ratio.toFixed(2);
    let ratioSum = new Number(ratio) + 100;
    let actualRatio = new Number(((ratio / ratioSum) * 100).toFixed(2));
    console.log('token 0 : token 1 amount ratio:', actualRatio.toString(), ':', 100 - actualRatio);
}

/**
 * Get pool mid price using uniswap library
 * @param {Contract} uniswapLibrary 
 * @param {String} poolAddress 
 * @returns {BigNumber}
 */
async function getMidPrice(uniswapLibrary, poolAddress) {
    let midPrice = await uniswapLibrary.getPoolPriceWithDecimals(poolAddress);
    return midPrice;
}

/**
 * Calculate amount to swap when rebalancing
 * @param {Contract} CLR CLR instance
 * @param {Contract} uniswapLibrary Uniswap Library instance
 * @param {BigNumber} amount0 token 0 amount for staking
 * @param {BigNumber} amount1 token 1 amount for staking
 * @returns [BigNumber, bool] swapAmount and swap 0 -> 1 if true, 1 -> 0 if false
 */
 async function getSwapAmountWhenMinting(CLR, uniswapLibrary, amount0, amount1) {
    let minted = await getMintedAmounts(CLR, amount0, amount1);
    let poolAddress = (await CLR.uniContracts()).pool;
    let liquidity = await CLR.getLiquidityForAmounts(minted[0], minted[1]);
    let poolLiquidity = await uniswapLibrary.getPoolLiquidity(poolAddress);
    let liquidityRatio = liquidity.mul(bn(10).pow(18)).div(poolLiquidity);
    let midPrice = (await uniswapLibrary.getPoolPriceWithDecimals(poolAddress));

    // n - swap amt, x - amount 0 to mint, y - amount 1 to mint,
    // z - amount 0 minted, t - amount 1 minted, p0 - pool mid price
    // l - liquidity ratio (current mint liquidity vs total pool liq)
    // (X - n) / (Y + n * p0) = (Z + l * n) / (T - l * n * p0) ->
    // n = (X * T - Y * Z) / (p0 * l * X + p0 * Z + l * Y + T)
    let numerator = amount0.mul(minted[1]).sub(amount1.mul(minted[0]));
    let denominator = amount0.mul(liquidityRatio).mul(midPrice).div(bn(10).pow(18)).div(1e12).
                        add(midPrice.mul(minted[0]).div(1e12)).
                        add(liquidityRatio.mul(amount1).div(bn(10).pow(18))).
                        add(minted[1]);
    let result = numerator.div(denominator);
    if(numerator.gt(0)) {
        return [result, true];
    } else {
        return [result, false];
    }
}

/**
 * Get upper and lower price bounds for xAAVEa
 * upper price bound = mid price * 104%
 * Used for AAVE-xAAVEa CLR instance
 * @param {Contract} uniswapLibrary 
 * @param {String} poolAddress 
 * @returns 
 */
async function getPriceBounds(uniswapLibrary, poolAddress) {
    let midPrice = await getMidPrice(uniswapLibrary, poolAddress);
    midPrice = midPrice.div(1e8).toNumber() / 1e4;
    let sqrtMidPrice = Math.sqrt(midPrice);
    let c = Math.sqrt(1.04); // upper bound / mid price
    // goal is to have 40:60 token ratio for AAVE:xAAVEa
    // amount 1 = amount 0 * mid_price * 3/2
    let y = midPrice * (3/2);
    // a = (c p^2 x - c y + y)/(c p x), solve for a^2
    // a - lower price bound, c - sqrt(upper bound / mid price), p = sqrt(mid price)
    // x - amount 0, y = amount 1
    let lowerBound = (c * (Math.pow(sqrtMidPrice, 2)) - c * y + y) / (c * sqrtMidPrice);
    return [(Math.pow(lowerBound, 2)).toFixed(4), midPrice + midPrice * (4 / 100)];
}

/**
 * Print pool mid price using uniswap library
 * @param {Contract} uniswapLibrary 
 * @param {String} poolAddress 
 */
async function printMidPrice(uniswapLibrary, poolAddress) {
    let midPrice = await uniswapLibrary.getPoolPriceWithDecimals(poolAddress);
    console.log('MID PRICE:', (midPrice.toNumber() / 1e12).toFixed(8));
}

/**
 * Stake buffer token amounts from CLR
 * @param {Contract} CLR 
 */
 async function stakeBuffer(CLR) {
    let token0Address = await CLR.token0();
    let token1Address = await CLR.token1();
    let token0 = await ethers.getContractAt('ERC20Basic', token0Address);
    let token1 = await ethers.getContractAt('ERC20Basic', token1Address);
    let t0Balance = await token0.balanceOf(CLR.address)
    let t1Balance = await token1.balanceOf(CLR.address)
    let amounts = await getMintedAmounts(CLR, t0Balance, t1Balance);
    await CLR.adminStake(amounts[0], amounts[1]);
}

/**
 * Get buffer token balances in CLR in native decimals
 * @param {*} CLRAddress address of CLR
 * @param {*} token0 token 0 contract
 * @param {*} token1 token 1 contract
 * @returns 
 */
async function getBufferBalance(CLRAddress, token0, token1) {
    let t0Balance = await token0.balanceOf(CLRAddress)
    let t1Balance = await token1.balanceOf(CLRAddress)
    return {
        amount0: t0Balance,
        amount1: t1Balance
    }
}

/**
 * Get buffer token balances in CLR in wei
 * @param {*} CLRAddress address of CLR
 * @param {*} token0 token 0 contract
 * @param {*} token1 token 1 contract
 * @returns 
 */
async function getBufferBalanceInWei(CLRAddress, token0, token1) {
    let t0Balance = await token0.balanceOf(CLRAddress)
    let t1Balance = await token1.balanceOf(CLRAddress)
    let t0Decimals = await token0.decimals();
    let t1Decimals = await token1.decimals();
    
    let t0DecimalMultiplier = bn(10).pow(18 - t0Decimals);
    let t1DecimalMultiplier = bn(10).pow(18 - t1Decimals);

    if(t0Decimals < 18) {
        t0Balance = t0Balance.mul(t0DecimalMultiplier);
    }
    if(t1Decimals < 18) {
        t1Balance = t1Balance.mul(t1DecimalMultiplier);
    }
    
    return {
        amount0: t0Balance,
        amount1: t1Balance
    }
} 


/**
 * Get amounts minted with both tokens
 * @param {Contract} CLR Contract instance
 * @param {BigNumber} amount0 token 0 amount
 * @param {BigNumber} amount1 token 1 amount
 * @returns 
 */
async function getMintedAmounts(CLR, amount0, amount1) {
    let amountsMinted = await CLR.calculatePoolMintedAmounts(amount0, amount1);
    return [amountsMinted.amount0Minted.toString(), amountsMinted.amount1Minted.toString()];
}

/**
 * Get amounts minted with one token
 * @param {Contract} CLR Contract instance
 * @param {Number} inputAsset 0 for token 0, 1 for token 1
 * @param {BigNumber} amount minimum amount of token *inputAsset* to mint with
 * @returns 
 */
async function getSingleTokenMintedAmounts(CLR, inputAsset, amount) {
    let amountsMinted = await CLR.calculateAmountsMintedSingleToken(inputAsset, amount);
    return [amountsMinted.amount0Minted, amountsMinted.amount1Minted];
}

/**
 * Get token balance of an address
 */
async function getTokenBalance(token, address) {
    let balance = await token.balanceOf(address);
    return balance;
}

/**
 * Get position balance
 * @param CLR CLR contract
 * @returns 
 */
async function getPositionBalance(CLR) {
    let tokenBalance = await CLR.getStakedTokenBalance();
    return [getNumberNoDecimals(tokenBalance.amount0),
            getNumberNoDecimals(tokenBalance.amount1)];
}

/**
 * Print the current pool position and CLR (buffer) token balances
 * @param CLR CLR contract
 */
async function printPositionAndBufferBalance(CLR) {
    let token0Address = await CLR.token0();
    let token1Address = await CLR.token1();
    let token0 = await ethers.getContractAt('ERC20Basic', token0Address);
    let token1 = await ethers.getContractAt('ERC20Basic', token1Address);
    let bufferBalance = await getBufferBalance(CLR.address, token0, token1);
    let positionBalance = await getPositionBalance(CLR);
    console.log('CLR balance:\n' + 'token0:', getNumberNoDecimals(bufferBalance[0]), 'token1:', getNumberNoDecimals(bufferBalance[1]));
    console.log('position balance:\n' + 'token0:', positionBalance[0], 'token1:', positionBalance[1]);
}

/**
 * Print the buffer:pool token ratio
 * @param CLR CLR contract
 */
async function getRatio(CLR) {
    let token0Address = await CLR.token0();
    let token1Address = await CLR.token1();
    let token0 = await ethers.getContractAt('ERC20Basic', token0Address);
    let token1 = await ethers.getContractAt('ERC20Basic', token1Address);
    let bufferBalance = await CLR.getBufferBalance(CLR.address, token0, token1);
    let poolBalance = await CLR.getStakedBalance();
    console.log('buffer balance:', getNumberNoDecimals(bufferBalance));
    console.log('position balance:', getNumberNoDecimals(poolBalance));

    let contractPoolTokenRatio = (getNumberNoDecimals(bufferBalance) + getNumberNoDecimals(poolBalance)) / 
                                  getNumberNoDecimals(bufferBalance);
    
    console.log('CLR : pool token ratio:', (100 / contractPoolTokenRatio.toFixed(2)).toFixed(2) + '%');
}

/**
 * Get the buffer:staked token ratio
 * @param CLR CLR contract
 */
 async function getBufferPositionRatio(CLR) {
    let token0Address = await CLR.token0();
    let token1Address = await CLR.token1();
    let token0 = await ethers.getContractAt('ERC20Basic', token0Address);
    let token1 = await ethers.getContractAt('ERC20Basic', token1Address);
    let bufferBalance = await CLR.getBufferBalance(CLR.address, token0, token1);
    let poolBalance = await CLR.getStakedBalance();

    let contractPoolTokenRatio = (getNumberNoDecimals(bufferBalance) + getNumberNoDecimals(poolBalance)) / 
                                  getNumberNoDecimals(bufferBalance);
    
    return (100 / contractPoolTokenRatio).toFixed(1);
}

/**
 * Get calculated twaps of token0 and token1
 * @param CLR CLR contract
 */
async function getTokenPrices(CLR) {
    // Increase time by 1 hour = 3600 seconds to get previous price
    await network.provider.send("evm_increaseTime", [300]);
    await network.provider.send("evm_mine");
    // Get asset 0 price
    let asset0Price = await CLR.getAsset0Price();
    let twap0 = getTWAP(asset0Price);
    console.log('twap token0:', twap0);
    // Get Asset 1 Price
    let asset1Price = await CLR.getAsset1Price();
    let twap1 = getTWAP(asset1Price);
    console.log('twap token1:', twap1);
    return {
        asset0: twap0,
        asset1: twap1
    }
}

function getMinPrice() {
    return '4295128740'
}

function getMaxPrice() {
    return '1461446703485210103287273052203988822378723970341';
}

function getMinTick() {
    return -887273;
}

function getMaxTick() {
    return 887271;
}

async function swapToken0ForToken1Mainnet(token0, token1, swapperAddress, amount) {
    const router = (await getUniswapInstances()).router;
    await swapToken0ForToken1(router, token0, token1, swapperAddress, amount);
}

async function swapToken1ForToken0Mainnet(token0, token1, swapperAddress, amount) {
    const router = (await getUniswapInstances()).router;
    await swapToken1ForToken0(router, token0, token1, swapperAddress, amount);
}

async function swapToken0ForToken1(router, token0, token1, swapperAddress, amount) {
    const pendingBlock = await network.provider.send("eth_getBlockByNumber", ["pending", false])
    const timestamp = pendingBlock.timestamp + 10000;

    await router.exactInputSingle({
        tokenIn: token0.address,
        tokenOut: token1.address,
        fee: 3000,
        recipient: swapperAddress,
        deadline: timestamp,
        amountIn: amount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      });
}

async function swapToken1ForToken0(router, token0, token1, swapperAddress, amount) {
    const pendingBlock = await network.provider.send("eth_getBlockByNumber", ["pending", false])
    const timestamp = pendingBlock.timestamp + 10000;

    await router.exactInputSingle({
        tokenIn: token1.address,
        tokenOut: token0.address,
        fee: 3000,
        recipient: swapperAddress,
        deadline: timestamp,
        amountIn: amount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
    });
}

/**
 * Swap token 0 for token 1 using Uniswap Router, considering token decimals when swapping
 */
async function swapToken0ForToken1Decimals(router, token0, token1, swapperAddress, amount) {
    let token0Decimals = await token0.decimals();
    let lowPrice = getMinPrice();
    const pendingBlock = await network.provider.send("eth_getBlockByNumber", ["pending", false])
    const timestamp = pendingBlock.timestamp + 10000;
    // tokens should be in precise decimal representation before swapping
    let amountIn = amount.div(bn(10).pow(18 - token0Decimals));

    await router.exactInputSingle({
        tokenIn: token0.address,
        tokenOut: token1.address,
        fee: 3000,
        recipient: swapperAddress,
        deadline: timestamp,
        amountIn: amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: lowPrice
      });
}

/**
 * Swap token 1 for token 0 using Uniswap Router, considering token decimals when swapping
 */
async function swapToken1ForToken0Decimals(router, token0, token1, swapperAddress, amount) {
    let token1Decimals = await token1.decimals();
    let highPrice = getMaxPrice();
    const pendingBlock = await network.provider.send("eth_getBlockByNumber", ["pending", false])
    const timestamp = pendingBlock.timestamp + 10000;

    // tokens should be in precise decimal representation before swapping
    let amountIn = amount.div(bn(10).pow(18 - token1Decimals));

    await router.exactInputSingle({
        tokenIn: token1.address,
        tokenOut: token0.address,
        fee: 3000,
        recipient: swapperAddress,
        deadline: timestamp,
        amountIn: amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: highPrice
    });
}

/**
 * Get ETH Balance of contract
 * @param {ethers.Contract} contract 
 */
async function getBalance(contract) {
    return await contract.provider.getBalance(contract.address);
}

/**
 * Get latest block timestamp
 * @returns current block timestamp
 */
async function getBlockTimestamp() {
    const latestBlock = await network.provider.send("eth_getBlockByNumber", ["latest", false]);
    return web3.utils.hexToNumber(latestBlock.timestamp);
}

/**
 * Increase time in Hardhat Network
 */
async function increaseTime(time) {
    await network.provider.send("evm_increaseTime", [time]);
    await network.provider.send("evm_mine");
}

/**
 * Decrease time in Hardhat Network
 */
async function decreaseTime(seconds) {
    await network.provider.send("evm_increaseTime", [-seconds]);
    await network.provider.send("evm_mine");
}

/**
 * Mine several blocks in network
 * @param {Number} blockCount how many blocks to mine
 */
async function mineBlocks(blockCount) {
    for(let i = 0 ; i < blockCount ; ++i) {
        await network.provider.send("evm_mine");
    }
}

/**
 * Activate or disactivate automine in hardhat network
 * @param {Boolean} active 
 */
async function setAutomine(active) {
    await network.provider.send("evm_setAutomine", [active]);
}

async function getLastBlock() {
    return await network.provider.send("eth_getBlockByNumber", ["latest", false]);
}

async function getLastBlockTimestamp() {
    let block = await getLastBlock();
    return block.timestamp;
}

async function verifyContractNoArgs(address) {
    try {
        await hre.run("verify:verify", {
            address: address,
            constructorArguments: [],
        });
    } catch (err) {
        console.log('error while verifying contract:', err);
    }
}

async function verifyContractWithArgs(address, ...args) {
    try {
        await hre.run("verify:verify", {
            address: address,
            constructorArguments: [...args],
        });
    } catch (err) {
        console.log('error while verifying contract:', err);
    }
}

async function verifyContractWithArgsAndName(address, contractName, ...args) {
    try {
        await hre.run("verify:verify", {
            address: address,
            contract: contractName,
            constructorArguments: [...args],
        });
    } catch (err) {
        console.log('error while verifying contract:', err);
    }
}

/**
 * Return actual twap from ABDK 64.64 representation
 * Used with getAsset0Price()
 */
function getTWAP(twap) {
    twap = twap.mul(1e8).div(bn(2).pow(bn(64)));
    return twap.toNumber() / 1e8;
}

/**
 * Return actual twap from ABDK 64.64 representation
 * With 18 decimals
 */
 function getTWAPDecimals(twap) {
    twap = twap.mul(bn(10).pow(18)).div(bn(2).pow(bn(64)));
    return twap;
}

/**
 * Get pool mid price in normal terms for readability
 * @param {Contract} uniswapLibrary UniswapLibrary instance
 * @param {String} poolAddress Address of pool for price reading
 * @returns 
 */
async function getPoolMidPrice(uniswapLibrary, poolAddress) {
    let poolPrice = await uniswapLibrary.getPoolPriceWithDecimals(poolAddress);
    return poolPrice.div(1e8).toNumber() / 1e4;
}

/**
 * Get pool price in normal terms for readability
 * @param {BigNumber} poolPrice price in X64.96 format
 * @returns 
 */
function getPoolPriceInNumberFormat(poolPrice) {
    return poolPrice.pow(2).mul(1e8).shr(96 * 2).toNumber() / 1e8
}

/**
 * Get pool price in x64.96 format for use with Uni V3
 * @param {Number} price 
 * @returns 
 */
function getPriceInX96(price) {
    return sqrt(bn(price.toFixed(0)).shl(96 * 2));
}

/**
 * Get sqrt of a BigNumber
 * @param {BigNumber} value 
 * @returns 
 */
function sqrt(value) {
    const ONE = bn(1);
    const TWO = bn(2);
    x = bn(value);
    let z = x.add(ONE).div(TWO);
    let y = x;
    while (z.sub(y).isNegative()) {
        y = z;
        z = x.div(z).add(z).div(TWO);
    }
    return y;
}

/**
 * Return BigNumber
 */
function bn(amount) {
    return ethers.BigNumber.from(amount);
}

/**
 * Returns bignumber scaled to 18 decimals
 */
function bnDecimal(amount) {
    let decimal = Math.pow(10, 18);
    let decimals = bn(decimal.toString());
    return bn(amount).mul(decimals);
}

/**
 * Returns bignumber scaled to custom amount of decimals
 */
 function bnDecimals(amount, _decimals) {
    let decimal = Math.pow(10, _decimals);
    let decimals = bn(decimal.toString());
    return bn(amount).mul(decimals);
}

/**
 * Returns number representing BigNumber without decimal precision
 */
function getNumberNoDecimals(amount) {
    let decimal = Math.pow(10, 18);
    let decimals = bn(decimal.toString());
    return amount.div(decimals).toNumber();
}

function gnnd(amount) {
    return getNumberNoDecimals(bn(amount));
}

function gnn8d(amount) {
    return amount.div(1e10).toNumber() / 1e8;
}

/**
 * Returns number representing BigNumber without decimal precision (custom)
 */
 function getNumberDivDecimals(amount, _decimals) {
    let decimal = Math.pow(10, _decimals);
    let decimals = bn(decimal.toString());
    return amount.div(decimals).toNumber();
}

module.exports = {
    deploy, deployArgs, deployWithAbi, deployAndLink, getTWAP,
    getRatio, getTokenPrices, getMinPrice, getMaxPrice, getMinTick, getMaxTick,
    getTokenBalance, getPositionBalance, printPositionAndBufferBalance,
    bn, bnDecimal, bnDecimals, getNumberNoDecimals, getNumberDivDecimals, 
    getBlockTimestamp, swapToken0ForToken1, swapToken1ForToken0, getPriceInX96,
    swapToken0ForToken1Decimals, swapToken1ForToken0Decimals, getPoolPriceInNumberFormat,
    increaseTime, mineBlocks, getBufferPositionRatio, getMintedAmounts,
    getSingleTokenMintedAmounts, testMintAndBurnAmounts, gnnd, gnn8d, getPoolMidPrice,
    getTWAPDecimals, getSwapAmountWhenMinting, checkClaimableFees, getMidPrice, printMidPrice,
    getPositionTokenRatio, printPositionTokenRatios, getPriceBounds,
    stakeBuffer, getBalance, setAutomine, getLastBlock, getBufferBalance,
    getLastBlockTimestamp, decreaseTime, deployTokenManagerTest,
    getMinTick, getMaxTick, getBufferBalanceInWei,
    // mainnet fork functions
    deployTokenManager, getMainnetxTokenManager, impersonate,
    swapToken0ForToken1Mainnet, swapToken1ForToken0Mainnet,
    receiveXTK, receiveWeth, swapAndStake,
    depositLiquidityInPool, makeAddressManager, oneInchSwap, oneInchSwapCLR,
    verifyContractNoArgs, verifyContractWithArgs, verifyContractWithArgsAndName,
    upgradeTerminal, upgradeRewardEscrow, upgradeCLR
}