const { expect } = require('chai');
const { bnDecimal, bnDecimals, increaseTime, getPriceInX96 } = require('../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Time lock tests for LM Terminal and Staked Token
describe('Contract: LM Terminal', async () => {
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
          await token0.connect(user1).approve(clr.address, bnDecimal(100000000000));
          await token1.connect(user1).approve(clr.address, bnDecimal(100000000000));
          await token0.connect(user2).approve(clr.address, bnDecimal(100000000000));
          await token1.connect(user2).approve(clr.address, bnDecimal(100000000000));
          await clr.deposit(0, bnDecimals(100000, token0Decimals));
          await clr.connect(user1).deposit(0, bnDecimals(100000, token0Decimals));
          await clr.connect(user2).deposit(0, bnDecimals(100000, token0Decimals));
          await increaseTime(300);
    })

  describe('Mint, burn and transfer lock', async () => {
    it(`account shouldn\'t be able to call mint, burn and transfer 
            before 24 hours have passed`, async () => {
        await clr.deposit(0, bnDecimals(100000, token0Decimals));
        await expect(clr.withdraw(bnDecimal(1))).
            to.be.reverted;
        await expect(stakedToken.transfer(user1.address, bnDecimal(10000))).
            to.be.reverted;
    }),

    it(`account shouldn\'t be able to call burn, mint and transfer 
            before 24 hours have passed`, async () => {
        await clr.withdraw(bnDecimal(1));
        await expect(clr.deposit(0, bnDecimals(100000, token0Decimals))).
            to.be.reverted;
        await expect(stakedToken.transfer(user1.address, bnDecimal(10000))).
            to.be.reverted;
    }),

    it(`no account should be able to call transferFrom from sender address
         which has called mint before 24 hours have passed`, async () => {
        await stakedToken.approve(user1.address, bnDecimal(100000));
        await stakedToken.approve(user2.address, bnDecimal(100000));
        await clr.deposit(0, bnDecimals(100000, token0Decimals));
        await expect(stakedToken.connect(user1).transferFrom(admin.address, user1.address, bnDecimal(10000))).
            to.be.reverted;
        await expect(stakedToken.connect(user2).transferFrom(admin.address, user1.address, bnDecimal(10000))).
            to.be.reverted;
    }),

    it(`no account should be able to call transferFrom from sender address
         which has called burn before 24 hours have passed`, async () => {
        await stakedToken.approve(user1.address, bnDecimal(100000));
        await stakedToken.approve(user2.address, bnDecimal(100000));
        await clr.withdraw(bnDecimal(1));
        await expect(stakedToken.connect(user1).transferFrom(admin.address, user1.address, bnDecimal(10000))).
            to.be.reverted;
        await expect(stakedToken.connect(user2).transferFrom(admin.address, user1.address, bnDecimal(10000))).
            to.be.reverted;
    }),

    it(`account should be able to call mint, burn, transfer or transferFrom 
            if more than 24 hours have passed`, async () => {
        await clr.deposit(0, bnDecimals(100000, token0Decimals));
        await increaseTime(300);
        await clr.withdraw(bnDecimal(1));
    }),

    it('other accounts should be able to call mint even if one is locked', async () => {
        await clr.deposit(0, bnDecimals(100000, token0Decimals));
        await expect(clr.deposit(0, bnDecimals(100000, token0Decimals))).
            to.be.reverted;
        await clr.connect(user1).deposit(0, bnDecimals(100000, token0Decimals));
        await clr.connect(user2).deposit(0, bnDecimals(100000, token0Decimals));
    }),

    it('other accounts should be able to call burn even if one is locked', async () => {
        await clr.deposit(0, bnDecimals(100000, token0Decimals));
        await expect(clr.deposit(0, bnDecimals(100000, token0Decimals))).
            to.be.reverted;
        await clr.connect(user1).withdraw(bnDecimal(1));
        await clr.connect(user2).withdraw(bnDecimal(1));
    })
  })
})
