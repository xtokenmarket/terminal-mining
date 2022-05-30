const { deploymentFixture, fixture_6_12_decimals, fixture_12_6_decimals, fixture_6_6_decimals, fixture_8_8_decimals, fixture_6_8_decimals, fixture_8_6_decimals, fixture_outside_range_left, fixture_outside_range_right } = require('./fixture');
const { getTokenBalance, bn, bnDecimal, bnDecimals, increaseTime } = require('../../scripts/helpers');
const { expect } = require('chai');

// Mint and burn tests for CLR
describe('Contract: CLR', async () => {
  let lmTerminal, clr, token0, token1, rewardToken, admin, user1, user2, user3, user4;
  let router, token0Decimals, token1Decimals

  describe('Mint and burn with same token decimals', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await deploymentFixture());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
        let amount = bnDecimals(10000000, token0Decimals);
        let t0bb = await token0.balanceOf(user1.address);
        let t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).deposit(0, amount);
        let t0ba = await token0.balanceOf(user1.address);
        let t1ba = await token1.balanceOf(user1.address);
        let t0sent = t0bb.sub(t0ba);
        let t1sent = t1bb.sub(t1ba);
        let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

        // deposit from user2
        amount = bnDecimals(777777, token0Decimals);
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).deposit(0, amount);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        let t0sent2 = t0bb.sub(t0ba);
        let t1sent2 = t1bb.sub(t1ba);
        let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

        await increaseTime(400);

        // withdraw from user1
        t0bb = await token0.balanceOf(user1.address);
        t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).withdraw(stakedBalanceUser1);
        t0ba = await token0.balanceOf(user1.address);
        t1ba = await token1.balanceOf(user1.address);
        let t0received = t0ba.sub(t0bb);
        let t1received = t1ba.sub(t1bb);

        // expect the received amount to be the same with delta of 1 token in native units
        expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
        expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

        // withdraw from user2
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).withdraw(stakedBalanceUser2);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        t0received = t0ba.sub(t0bb);
        t1received = t1ba.sub(t1bb);

        // expect the received amount to be the same with delta of 1 token in native units
        expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
        expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
  })

  it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
    }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })

   describe('Mint and burn with t0 decimals = 12, t1 decimals = 6', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await fixture_12_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
  })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
  })

  it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
    }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })

   describe('Mint and burn with t0 decimals = 6, t1 decimals = 12', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await fixture_6_12_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 tokens in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(3, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 tokens in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(3, token1Decimals));
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 tokens in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(3, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 tokens in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(3, token1Decimals));
  })

    it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
        // deposit from user1
        let amount = bnDecimals(1000000, token0Decimals);
        let t0bb = await token0.balanceOf(user1.address);
        let t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).deposit(0, amount);
        let t0ba = await token0.balanceOf(user1.address);
        let t1ba = await token1.balanceOf(user1.address);
        let t0sent = t0bb.sub(t0ba);
        let t1sent = t1bb.sub(t1ba);
        let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

        // deposit from user2
        amount = bnDecimals(777777, token0Decimals);
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).deposit(0, amount);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        let t0sent2 = t0bb.sub(t0ba);
        let t1sent2 = t1bb.sub(t1ba);
        let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

        await increaseTime(400);

        // withdraw from user1
        t0bb = await token0.balanceOf(user1.address);
        t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).withdraw(stakedBalanceUser1);
        t0ba = await token0.balanceOf(user1.address);
        t1ba = await token1.balanceOf(user1.address);
        let t0received = t0ba.sub(t0bb);
        let t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent);
        expect(t1received).not.to.be.gt(t1sent);

        // withdraw from user2
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).withdraw(stakedBalanceUser2);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        t0received = t0ba.sub(t0bb);
        t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent2);
        expect(t1received).not.to.be.gt(t1sent2);
     }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })

  describe('Mint and burn with t0 decimals = 6, t1 decimals = 8', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await fixture_6_8_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })


    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(3, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(3, token1Decimals));
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(3, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(3, token1Decimals));
  })

    it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
        // deposit from user1
        let amount = bnDecimals(1000000, token0Decimals);
        let t0bb = await token0.balanceOf(user1.address);
        let t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).deposit(0, amount);
        let t0ba = await token0.balanceOf(user1.address);
        let t1ba = await token1.balanceOf(user1.address);
        let t0sent = t0bb.sub(t0ba);
        let t1sent = t1bb.sub(t1ba);
        let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

        // deposit from user2
        amount = bnDecimals(777777, token0Decimals);
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).deposit(0, amount);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        let t0sent2 = t0bb.sub(t0ba);
        let t1sent2 = t1bb.sub(t1ba);
        let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

        await increaseTime(400);

        // withdraw from user1
        t0bb = await token0.balanceOf(user1.address);
        t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).withdraw(stakedBalanceUser1);
        t0ba = await token0.balanceOf(user1.address);
        t1ba = await token1.balanceOf(user1.address);
        let t0received = t0ba.sub(t0bb);
        let t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent);
        expect(t1received).not.to.be.gt(t1sent);

        // withdraw from user2
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).withdraw(stakedBalanceUser2);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        t0received = t0ba.sub(t0bb);
        t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent2);
        expect(t1received).not.to.be.gt(t1sent2);
     }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })

  describe('Mint and burn with t0 decimals = 8, t1 decimals = 6', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await fixture_8_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })


    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(3, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(3, token1Decimals));
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(3, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 3 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(3, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(3, token1Decimals));
  })

    it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
        // deposit from user1
        let amount = bnDecimals(1000000, token0Decimals);
        let t0bb = await token0.balanceOf(user1.address);
        let t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).deposit(0, amount);
        let t0ba = await token0.balanceOf(user1.address);
        let t1ba = await token1.balanceOf(user1.address);
        let t0sent = t0bb.sub(t0ba);
        let t1sent = t1bb.sub(t1ba);
        let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

        // deposit from user2
        amount = bnDecimals(777777, token0Decimals);
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).deposit(0, amount);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        let t0sent2 = t0bb.sub(t0ba);
        let t1sent2 = t1bb.sub(t1ba);
        let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

        await increaseTime(400);

        // withdraw from user1
        t0bb = await token0.balanceOf(user1.address);
        t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).withdraw(stakedBalanceUser1);
        t0ba = await token0.balanceOf(user1.address);
        t1ba = await token1.balanceOf(user1.address);
        let t0received = t0ba.sub(t0bb);
        let t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent);
        expect(t1received).not.to.be.gt(t1sent);

        // withdraw from user2
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).withdraw(stakedBalanceUser2);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        t0received = t0ba.sub(t0bb);
        t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent2);
        expect(t1received).not.to.be.gt(t1sent2);
      }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })

  describe('Mint and burn with t0 decimals = 6, t1 decimals = 6', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await fixture_6_6_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })
    
    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
  })

    it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
        // deposit from user1
        let amount = bnDecimals(1000000, token0Decimals);
        let t0bb = await token0.balanceOf(user1.address);
        let t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).deposit(0, amount);
        let t0ba = await token0.balanceOf(user1.address);
        let t1ba = await token1.balanceOf(user1.address);
        let t0sent = t0bb.sub(t0ba);
        let t1sent = t1bb.sub(t1ba);
        let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

        // deposit from user2
        amount = bnDecimals(777777, token0Decimals);
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).deposit(0, amount);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        let t0sent2 = t0bb.sub(t0ba);
        let t1sent2 = t1bb.sub(t1ba);
        let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

        await increaseTime(400);

        // withdraw from user1
        t0bb = await token0.balanceOf(user1.address);
        t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).withdraw(stakedBalanceUser1);
        t0ba = await token0.balanceOf(user1.address);
        t1ba = await token1.balanceOf(user1.address);
        let t0received = t0ba.sub(t0bb);
        let t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent);
        expect(t1received).not.to.be.gt(t1sent);

        // withdraw from user2
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).withdraw(stakedBalanceUser2);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        t0received = t0ba.sub(t0bb);
        t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent2);
        expect(t1received).not.to.be.gt(t1sent2);
     }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })
  
  describe('Mint and burn with t0 decimals = 8, t1 decimals = 8', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await fixture_8_8_decimals());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })


    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
  })

    it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
        // deposit from user1
        let amount = bnDecimals(1000000, token0Decimals);
        let t0bb = await token0.balanceOf(user1.address);
        let t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).deposit(0, amount);
        let t0ba = await token0.balanceOf(user1.address);
        let t1ba = await token1.balanceOf(user1.address);
        let t0sent = t0bb.sub(t0ba);
        let t1sent = t1bb.sub(t1ba);
        let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

        // deposit from user2
        amount = bnDecimals(777777, token0Decimals);
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).deposit(0, amount);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        let t0sent2 = t0bb.sub(t0ba);
        let t1sent2 = t1bb.sub(t1ba);
        let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

        await increaseTime(400);

        // withdraw from user1
        t0bb = await token0.balanceOf(user1.address);
        t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).withdraw(stakedBalanceUser1);
        t0ba = await token0.balanceOf(user1.address);
        t1ba = await token1.balanceOf(user1.address);
        let t0received = t0ba.sub(t0bb);
        let t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent);
        expect(t1received).not.to.be.gt(t1sent);

        // withdraw from user2
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).withdraw(stakedBalanceUser2);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        t0received = t0ba.sub(t0bb);
        t1received = t1ba.sub(t1bb);

        expect(t0received).not.to.be.gt(t0sent2);
        expect(t1received).not.to.be.gt(t1sent2);
     }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })

  describe('Mint and burn when out of range with liquidity only in token 0', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await fixture_outside_range_left());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount1).to.be.eq(0);
        let amount = bnDecimals(10000000, token0Decimals);
        let t0bb = await token0.balanceOf(user1.address);
        let t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).deposit(0, amount);
        let t0ba = await token0.balanceOf(user1.address);
        let t1ba = await token1.balanceOf(user1.address);
        let t0sent = t0bb.sub(t0ba);
        let t1sent = t1bb.sub(t1ba);
        let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);
        expect(t1sent).to.be.eq(0);

        // deposit from user2
        amount = bnDecimals(777777, token0Decimals);
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).deposit(0, amount);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        let t0sent2 = t0bb.sub(t0ba);
        let t1sent2 = t1bb.sub(t1ba);
        expect(t1sent2).to.be.eq(0);
        let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

        await increaseTime(400);

        // withdraw from user1
        t0bb = await token0.balanceOf(user1.address);
        t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).withdraw(stakedBalanceUser1);
        t0ba = await token0.balanceOf(user1.address);
        t1ba = await token1.balanceOf(user1.address);
        let t0received = t0ba.sub(t0bb);
        let t1received = t1ba.sub(t1bb);

        // expect the received amount to be the same with delta of 1 token in native units
        expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
        expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

        // withdraw from user2
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).withdraw(stakedBalanceUser2);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        t0received = t0ba.sub(t0bb);
        t1received = t1ba.sub(t1bb);

        // expect the received amount to be the same with delta of 1 token in native units
        expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
        expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(stakedBalance.amount1).to.be.eq(0);
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);
      expect(t1sent).to.be.eq(0);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);
      expect(t1sent2).to.be.eq(0);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
  })

  it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(stakedBalance.amount1).to.be.eq(0);
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      expect(t1sent).to.be.eq(0);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      expect(t1sent2).to.be.eq(0);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
    }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(stakedBalance.amount1).to.be.eq(0);
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      expect(t1sent).to.be.eq(0);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      expect(t1sent2).to.be.eq(0);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })

  describe('Mint and burn when out of range with liquidity only in token 1', async () => {
    beforeEach(async () => {
        ({ lmTerminal, token0, token1, rewardToken, clr, stakedToken, router,
            token0Decimals, token1Decimals } = 
            await fixture_outside_range_right());
        [admin, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 0', async () => {
        let stakedBalance = await clr.getStakedTokenBalance();
        expect(stakedBalance.amount0).to.be.eq(0);
        let amount = bnDecimals(10000000, token0Decimals);
        let t0bb = await token0.balanceOf(user1.address);
        let t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).deposit(0, amount);
        let t0ba = await token0.balanceOf(user1.address);
        let t1ba = await token1.balanceOf(user1.address);
        let t0sent = t0bb.sub(t0ba);
        let t1sent = t1bb.sub(t1ba);
        expect(t0sent).to.be.eq(0);
        let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

        // deposit from user2
        amount = bnDecimals(777777, token0Decimals);
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).deposit(0, amount);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        let t0sent2 = t0bb.sub(t0ba);
        let t1sent2 = t1bb.sub(t1ba);
        expect(t0sent2).to.be.eq(0);
        let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

        await increaseTime(400);

        // withdraw from user1
        t0bb = await token0.balanceOf(user1.address);
        t1bb = await token1.balanceOf(user1.address);
        await clr.connect(user1).withdraw(stakedBalanceUser1);
        t0ba = await token0.balanceOf(user1.address);
        t1ba = await token1.balanceOf(user1.address);
        let t0received = t0ba.sub(t0bb);
        let t1received = t1ba.sub(t1bb);

        // expect the received amount to be the same with delta of 1 token in native units
        expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
        expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

        // withdraw from user2
        t0bb = await token0.balanceOf(user2.address);
        t1bb = await token1.balanceOf(user2.address);
        await clr.connect(user2).withdraw(stakedBalanceUser2);
        t0ba = await token0.balanceOf(user2.address);
        t1ba = await token1.balanceOf(user2.address);
        t0received = t0ba.sub(t0bb);
        t1received = t1ba.sub(t1bb);

        // expect the received amount to be the same with delta of 1 token in native units
        expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
        expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
    })

    it('user should be able to receive all of his deposited tokens on withdraw when depositing with asset 1', async () => {
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(stakedBalance.amount0).to.be.eq(0);
      let amount = bnDecimals(10000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      expect(t0sent).to.be.eq(0);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      expect(t0sent2).to.be.eq(0);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent, bnDecimals(1, token1Decimals));

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      // expect the received amount to be the same with delta of 1 token in native units
      expect(t0received).to.be.closeTo(t0sent2, bnDecimals(1, token0Decimals));
      expect(t1received).to.be.closeTo(t1sent2, bnDecimals(1, token1Decimals));
  })

  it('shouldn\'t be able to withdraw more than sent tokens with asset 0', async () => {
    let stakedBalance = await clr.getStakedTokenBalance();
    expect(stakedBalance.amount0).to.be.eq(0);
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(0, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      expect(t0sent).to.be.eq(0);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(0, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      expect(t0sent2).to.be.eq(0);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
    }),

     it('shouldn\'t be able to withdraw more than sent tokens with asset 1', async () => {
      let stakedBalance = await clr.getStakedTokenBalance();
      expect(stakedBalance.amount0).to.be.eq(0);
      // deposit from user1
      let amount = bnDecimals(1000000, token0Decimals);
      let t0bb = await token0.balanceOf(user1.address);
      let t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).deposit(1, amount);
      let t0ba = await token0.balanceOf(user1.address);
      let t1ba = await token1.balanceOf(user1.address);
      let t0sent = t0bb.sub(t0ba);
      let t1sent = t1bb.sub(t1ba);
      expect(t0sent).to.be.eq(0);
      let stakedBalanceUser1 = await stakedToken.balanceOf(user1.address);

      // deposit from user2
      amount = bnDecimals(777777, token0Decimals);
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).deposit(1, amount);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      let t0sent2 = t0bb.sub(t0ba);
      let t1sent2 = t1bb.sub(t1ba);
      expect(t0sent2).to.be.eq(0);
      let stakedBalanceUser2 = await stakedToken.balanceOf(user2.address);

      await increaseTime(400);

      // withdraw from user1
      t0bb = await token0.balanceOf(user1.address);
      t1bb = await token1.balanceOf(user1.address);
      await clr.connect(user1).withdraw(stakedBalanceUser1);
      t0ba = await token0.balanceOf(user1.address);
      t1ba = await token1.balanceOf(user1.address);
      let t0received = t0ba.sub(t0bb);
      let t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent);
      expect(t1received).not.to.be.gt(t1sent);

      // withdraw from user2
      t0bb = await token0.balanceOf(user2.address);
      t1bb = await token1.balanceOf(user2.address);
      await clr.connect(user2).withdraw(stakedBalanceUser2);
      t0ba = await token0.balanceOf(user2.address);
      t1ba = await token1.balanceOf(user2.address);
      t0received = t0ba.sub(t0bb);
      t1received = t1ba.sub(t1bb);

      expect(t0received).not.to.be.gt(t0sent2);
      expect(t1received).not.to.be.gt(t1sent2);
   })
  })
})