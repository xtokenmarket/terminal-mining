# Liquidity Mining Terminal

# Description
## Interface for creating and managing liquidity mining programs in Uniswap V3

LM Terminal can deploy a pool incentivized by reward tokens on Uniswap V3.   
Projects which want to incentivize their liquidity can deploy their pool and select any number of tokens as reward.  
Liquidity providers can deposit their tokens in the pool and immediately start accumulating rewards.  
The reward program period is customizable, and the rewards can either be sent directly to the liquidity providers or vested for a given duration of time before being sent to the LPs. 

# External project usage instructions

LM Terminal:
1. Select a pair of tokens to be incentivized on Uniswap V3 and any number of reward tokens.    
2. Deploy Uni V3 pool if there isn't one for that pair using deployUniswapPool()  
3. Deploy Incentivized pool for that pair using deployIncentivizedPool():
* symbol - Pool contract token symbol  
* lowerTick - lower tick for the position range  
* upperTick - upper tick for the position range  
* rewardTokens - array of reward tokens which will be distributed to LPs  
* vestingPeriod - length of time for which tokens will be escrowed on user claim
* poolFee - pool fee
* token0 - token 0 address
* token1 - token 1 address
* amount0 - token 0 amount for initial pool liquidity (used to initialize pool position)  
* amount1 - token 1 amount for initial pool liquidity (used to initialize pool position)  
4. Initialize reward program using initiateRewardsProgram:
* clrPool - address of the pool for that program  
* totalRewardAmounts - array of reward token amounts, in same order of the pool deployment.  
* rewardsDuration - reward program duration  
5. After end of the rewards program, a new program can be initialized using initiateNewRewardsProgram.  

# Management functions of CLR pool

CLR Pool:  
1. Collecting rewards - using collect()  
2. Staking all buffer balance in contract: rebalance()
3. Swapping tokens in buffer in contract: adminSwap()
4. Staking tokens from buffer in position: adminStake()
5. Pausing contract: pauseContract()
6. Unpausing contract: unpauseContract()

# Liquidity provider usage

CLR Pool:
1. Providing liquidity for a CLR Pool is done by calling deposit() with token 0 or 1 and amount of that token. LPs provide token amounts which are auto-calculated.  
2. Removing liquidity for a CLR Pool is done by calling withdraw() with the amount of staked token to be withdrawn.  
3. Claiming accumulated rewards is done by calling claimReward().  
4. Removing liquidity and claiming rewards for a CLR Pool is done by calling withdrawAndClaimReward().  

# Development instructions
--- Run **npm i** beforehand ---  
--- Set .env as in env.example ---  

To compile:  
**npx hardhat compile**  
To run tests:  
**npx hardhat test**  

# Licensing
The primary license for xAssetCLR is the Business Source License 1.1 (BUSL-1.1), see LICENSE.