const { ethers, web3 } = require('hardhat');
const addresses = require('./uniswapAddresses.json');


const swapRouter = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json')
const NFTPositionManager = 
require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json');
const UniFactory = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json');
const UniPool = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json');

async function getUniswapInstances() {
    let router = await ethers.getContractAt(swapRouter.abi, addresses.swapRouter);
    let positionManager = await ethers.getContractAt(NFTPositionManager.abi, addresses.nonfungibleTokenPositionManagerAddress);
    let factory = await ethers.getContractAt(UniFactory.abi, addresses.v3CoreFactoryAddress);
    let instances = 
    {
        router: router,
        positionManager: positionManager,
        factory: factory
    }
    return instances;
}

/**
 * Get uni v3 pool instance at address
 */
async function getPoolInstance(address) {
    return await ethers.getContractAt(UniPool.abi, address);
}

/**
 * Get pool from token addresses and fee
 * @param {string} token0 
 * @param {string} token1 
 * @param {string} fee
 */
async function getPool(token0, token1, fee) {
    let factory = (await getUniswapInstances()).factory;
    let poolAddress = await factory.getPool(token0, token1, fee);
    return getPoolInstance(poolAddress);
}

/**
 * Deploy a Uni V3 Pool
 * @param {string} token0 
 * @param {string} token1 
 * @param {string} fee 
 * @param {string} midPrice 
 * @returns 
 */
async function deployPool(token0, token1, fee, midPrice) {
    let positionManager = (await getUniswapInstances()).positionManager;
    let tx = await positionManager.createAndInitializePoolIfNecessary(token0, token1, fee, midPrice);
    await tx.wait();
    return await getPool(token0, token1, fee);
}

async function estimateGasForPoolOracleIncrease(token0, token1, slots) {
    let factory = (await getUniswapInstances()).factory;
    let poolAddress = await factory.getPool(token0, token1, 500);
    let pool = await new web3.eth.Contract(UniPool.abi, poolAddress);
    return await pool.methods.increaseObservationCardinalityNext(slots).estimateGas();
}

module.exports = { getUniswapInstances, getPool, getPoolInstance, deployPool, estimateGasForPoolOracleIncrease };