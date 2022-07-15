const { expect } = require('chai');
const { bnDecimals, bnDecimal, swapToken1ForToken0, swapToken0ForToken1 } = require('../../scripts/helpers');
const { deploymentFixture } = require('./fixture');

// Events tests for CLR
describe('Contract: CLR', async () => {
  let clr, router, token0, token1, admin, user1;

  beforeEach(async () => {
      ({ clr, token0, token1, token0Decimals, router } = await deploymentFixture());
      [admin, user1, ...addrs] = await ethers.getSigners();
  })

  describe('Events', async () => {
    it('should emit event on reinvest', async () => {
        await swapToken0ForToken1(router, token0, token1, admin.address, bnDecimal(10000));
        await swapToken1ForToken0(router, token0, token1, admin.address, bnDecimal(10000));
        await clr.collect();
        await expect(clr.reinvest())
              .to.emit(clr, 'Reinvest')
    }),

    it('should emit event on fee collection', async () => {
        await expect(clr.collect())
              .to.emit(clr, 'FeeCollected')
    }),

    it('should emit event on deposit', async () => {
        let amount0 = bnDecimals(1000, token0Decimals);
        let mint = await clr.calculateAmountsMintedSingleToken(0, amount0);
        await expect(clr.connect(user1).deposit(mint.amount0Minted, mint.amount1Minted)).to.emit(clr, 'Deposit');
    }),

    it('should emit event on withdraw', async () => {
        await expect(clr.withdraw(bnDecimal(1), 0, 0)).to.emit(clr, 'Withdraw');
    }),

    it('should emit event on withdraw and claim rewards', async () => {
        await expect(clr.withdrawAndClaimReward(bnDecimal(1), 0, 0)).to.emit(clr, 'Withdraw');
    })
  })
})
