const { expect } = require('chai');
const { ethers } = require('hardhat');
const { bnDecimal, bnDecimals, increaseTime, getPriceInX96, deploy, deployArgs } = require('../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Tests for Staked Token
describe('Contract: StakedCLRToken', async () => {
    let lmTerminal, token0, token1, rewardToken, admin, user1, user2, user3;
    let rewardProgramDuration, clr, stakedToken, token0Decimals
  
    beforeEach(async () => {
          ({ lmTerminal, token0, token1, rewardToken } = await deploymentFixture());
          [admin, user1, user2, user3, ...addrs] = await ethers.getSigners();
          token0Decimals = await token0.decimals();
          const poolPrice = await getPriceInX96(1);
          await lmTerminal.deployUniswapPool(token0.address, token1.address, 3000, poolPrice)
  
          rewardProgramDuration = '7257600'; // 12 week program duration
          // Deploy Pool with 1 reward token and no vesting
          await lmTerminal.deployIncentivizedPool(
              'wETH-XTK-CLR',
              { lowerTick: -600, upperTick: 600 }, 
              { rewardTokens: [rewardToken.address], vestingPeriod: 0 }, 
              { fee: 3000, token0: token0.address, token1: token1.address,
                  amount0: bnDecimal(100000), amount1: bnDecimal(100000)}, 
              { value: lmTerminal.deploymentFee() });
         await increaseTime(300);
  
          const clrPoolAddress = await lmTerminal.deployedCLRPools(0);
          clr = await ethers.getContractAt('CLR', clrPoolAddress);
          const stakedTokenAddress = await clr.stakedToken();
          stakedToken = await ethers.getContractAt('StakedCLRToken', stakedTokenAddress);
  
          await token0.approve(clr.address, bnDecimal(100000000000));
          await token1.approve(clr.address, bnDecimal(100000000000));
          let amts = await clr.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
          await clr.deposit(amts.amount0Minted, amts.amount1Minted);
          await increaseTime(300);
    })

  describe('Staked token', async () => {
    it(`account should receive staked token on liquidity provision`, async () => {
        let stakedTokenBalanceBefore = await stakedToken.balanceOf(admin.address);
        let amts = await clr.calculateAmountsMintedSingleToken(0, bnDecimals(100000, token0Decimals));
        await clr.deposit(amts.amount0Minted, amts.amount1Minted);
        let stakedTokenBalanceAfter = await stakedToken.balanceOf(admin.address);
        expect(stakedTokenBalanceAfter).to.be.gt(stakedTokenBalanceBefore);
    }),

    it(`account should burn staked token on liquidity removal`, async () => {
        let stakedTokenBalanceBefore = await stakedToken.balanceOf(admin.address);
        await clr.withdraw(bnDecimals(1, token0Decimals), 0, 0);
        let stakedTokenBalanceAfter = await stakedToken.balanceOf(admin.address);
        expect(stakedTokenBalanceBefore).to.be.gt(stakedTokenBalanceAfter);
    }),

    it(`account shouldn't be able to transfer staked token`, async () => {
        await expect(stakedToken.transfer(user1.address, bnDecimal(10000000))).
            to.be.revertedWith('Staked Tokens are non-transferable')
    }),

    it(`account shouldn't be able to transferFrom staked token`, async () => {
        await expect(stakedToken.
            transferFrom(admin.address, user1.address, bnDecimal(10000000))).
                to.be.revertedWith('Staked Tokens are non-transferable')
    }),

    it(`account shouldn't be able to call mint on staked token`, async () => {
        await expect(stakedToken.mint(admin.address, bnDecimal(10000000))).
            to.be.revertedWith('Only CLR Pool instance may perform this action')
    }),

    it(`account shouldn't be able to call burn on staked token`, async () => {
        await expect(stakedToken.burnFrom(admin.address, bnDecimal(10000000))).
            to.be.revertedWith('Only CLR Pool instance may perform this action')
    }),

    it(`shouldn't be able to initialize staked token with clr address 0`, async () => {
        let stakedToken2 = await deploy('StakedCLRToken');
        await expect(stakedToken2.initialize('StakedToken', 'SCLR', ethers.constants.AddressZero, false)).
            to.be.reverted;
    }),

    it(`should be able to transfer staked token if it's initialized as transferable`, async() => {
        const stakedToken2Impl = await deploy('StakedCLRToken');
        const stakedToken2Proxy = await deployArgs('StakedCLRTokenProxy', stakedToken2Impl.address, user3.address, user3.address);
        const stakedToken2 = await ethers.getContractAt('StakedCLRToken', stakedToken2Proxy.address);
        await stakedToken2.initialize('StakedToken', 'SCLRToken', admin.address, true);
        await stakedToken2.mint(admin.address, bnDecimal(1000));
        await increaseTime(300);
        await expect(stakedToken2.transfer(user1.address, bnDecimal(1))).not.to.be.reverted;
        await increaseTime(300);
        await stakedToken2.approve(user1.address, bnDecimal(1));
        await expect(stakedToken2.connect(user1).transferFrom(admin.address, user1.address, bnDecimal(1))).
                not.to.be.reverted;
    })
  })
})
