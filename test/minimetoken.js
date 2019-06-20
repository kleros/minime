/* eslint-disable no-undef */ // Avoid the linter considering truffle elements as undef.
const MiniMeToken = artifacts.require('MiniMeToken')
const MiniMeTokenFactory = artifacts.require('MiniMeTokenFactory')

const BN = web3.utils.BN

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('MiniMeToken', function(accounts) {
  let miniMeToken
  let miniMeTokenClone
  const b = []
  const controller = accounts[0]

  before('initialize the contract', async function() {
    factory = await MiniMeTokenFactory.new({ from: accounts[1] })
    miniMeToken = await MiniMeToken.new(
      factory.address,
      ZERO_ADDRESS,
      0,
      'MiniMe Test Token',
      18,
      'MMT',
      { from: controller }
    )
  })

  it('Should deploy all the contracts', async function() {
    assert(miniMeToken.address)
  })

  it('Should generate tokens for address 1', async function() {
    b[0] = await web3.eth.getBlockNumber()
    await miniMeToken.generateTokens(accounts[1], new BN('10'), {
      from: controller
    })
    b[1] = await web3.eth.getBlockNumber()
    assert(new BN('10').eq(await miniMeToken.totalSupply()))
  })

  it('Should transfer tokens from address 1 to address 2', async function() {
    await miniMeToken.transfer(accounts[2], 2, { from: accounts[1] })
    b[2] = await web3.eth.getBlockNumber()
    assert(new BN('10').eq(await miniMeToken.totalSupply()))
    assert(new BN('8').eq(await miniMeToken.balanceOf(accounts[1])))
    assert(new BN('2').eq(await miniMeToken.balanceOf(accounts[2])))
  })

  it('Should allow and transfer tokens from address 2 to address 1 allowed to 3', async function() {
    await miniMeToken.approve(accounts[3], 2, { from: accounts[2] })
    const allowed = await miniMeToken.allowance(accounts[2], accounts[3])
    assert.equal(allowed, 2)

    await miniMeToken.transferFrom(accounts[2], accounts[1], 1, {
      from: accounts[3]
    })

    const allowed2 = await miniMeToken.allowance(accounts[2], accounts[3])
    assert.equal(allowed2, 1)

    b[3] = await web3.eth.getBlockNumber()
    assert(new BN('10').eq(await miniMeToken.totalSupply()))
    assert(new BN('9').eq(await miniMeToken.balanceOf(accounts[1])))
    assert(new BN('1').eq(await miniMeToken.balanceOf(accounts[2])))

    let balance

    balance = await miniMeToken.balanceOfAt(accounts[1], b[2])
    assert(balance.eq(new BN('8')))
    balance = await miniMeToken.balanceOfAt(accounts[2], b[2])
    assert(balance.eq(new BN('2')))
    balance = await miniMeToken.balanceOfAt(accounts[1], b[1])
    assert(balance.eq(new BN('10')))
    balance = await miniMeToken.balanceOfAt(accounts[2], b[1])
    assert(balance.eq(new BN('0')))
    balance = await miniMeToken.balanceOfAt(accounts[1], b[0])
    assert(balance.eq(new BN('0')))
    balance = await miniMeToken.balanceOfAt(accounts[2], b[0])
    assert(balance.eq(new BN('0')))
    balance = await miniMeToken.balanceOfAt(accounts[1], 0)
    assert(balance.eq(new BN('0')))
    balance = await miniMeToken.balanceOfAt(accounts[2], 0)
    assert(balance.eq(new BN('0')))
  })

  it('Should destroy 3 tokens from 1 and 1 from 2', async function() {
    await miniMeToken.destroyTokens(accounts[1], 3, {
      from: accounts[0],
      gas: 200000
    })
    b[4] = await web3.eth.getBlockNumber()
    assert(new BN('7').eq(await miniMeToken.totalSupply()))
    assert(new BN('6').eq(await miniMeToken.balanceOf(accounts[1])))
  })

  it('Should create the clone token', async function() {
    const miniMeTokenCloneTx = await miniMeToken.createCloneToken(
      'Clone Token 1',
      18,
      'MMTc',
      0,
      true
    )

    const addr = miniMeTokenCloneTx.logs[0].address
    miniMeTokenClone = await MiniMeToken.at(addr)

    b[5] = await web3.eth.getBlockNumber()

    for (i = 0; i < 3; i++)
      await web3.currentProvider.send({ method: 'evm_mine' }, function(
        _err,
        _result
      ) {})

    // assert.equal(miniMeToken.address, await miniMeTokenClone.parentToken())
    assert(new BN(b[5]).eq(await miniMeTokenClone.parentSnapShotBlock()))
    assert(new BN('7').eq(await miniMeTokenClone.totalSupply()))
    assert(new BN('6').eq(await miniMeTokenClone.balanceOf(accounts[1])))
    assert(new BN('7').eq(await miniMeTokenClone.totalSupplyAt(b[4])))

    const balance = await miniMeTokenClone.balanceOfAt(accounts[2], b[4])
    assert(new BN('1').eq(balance))
  })

  it('Should mine one block to take effect clone', async function() {
    await miniMeToken.transfer(accounts[2], 1, { from: accounts[1] })
  })

  it('Should move tokens in the clone token from 2 to 3', async function() {
    await miniMeTokenClone.transfer(accounts[2], 4, { from: accounts[1] })
    b[6] = await web3.eth.getBlockNumber()

    assert(new BN('7').eq(await miniMeTokenClone.totalSupply()))
    assert(new BN('2').eq(await miniMeTokenClone.balanceOf(accounts[1])))
    assert(new BN('5').eq(await miniMeTokenClone.balanceOf(accounts[2])))

    let balance

    balance = await miniMeToken.balanceOfAt(accounts[1], b[5])
    assert.equal(balance, 6)
    balance = await miniMeToken.balanceOfAt(accounts[2], b[5])
    assert.equal(balance, 1)
    balance = await miniMeTokenClone.balanceOfAt(accounts[1], b[5])
    assert.equal(balance, 6)
    balance = await miniMeTokenClone.balanceOfAt(accounts[2], b[5])
    assert.equal(balance, 1)
    balance = await miniMeTokenClone.balanceOfAt(accounts[1], b[4])
    assert.equal(balance, 6)
    balance = await miniMeTokenClone.balanceOfAt(accounts[2], b[4])
    assert.equal(balance, 1)

    let totalSupply
    totalSupply = await miniMeTokenClone.totalSupplyAt(b[5])
    assert.equal(totalSupply, 7)
    totalSupply = await miniMeTokenClone.totalSupplyAt(b[4])
    assert.equal(totalSupply, 7)
  })

  it('Should create tokens in the child token', async function() {
    await miniMeTokenClone.generateTokens(accounts[1], 10, {
      from: accounts[0],
      gas: 300000
    })

    assert(new BN('17').eq(await miniMeTokenClone.totalSupply()))
    assert(new BN('12').eq(await miniMeTokenClone.balanceOf(accounts[1])))
    assert(new BN('5').eq(await miniMeTokenClone.balanceOf(accounts[2])))
  })
})
