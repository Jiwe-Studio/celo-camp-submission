const router = require('koa-router')()
const { getBook } = require('../controllers/accounts')
const { offRampFunds } = require('../controllers/offramp')
const {
  createWallet,
  getBalance,
  topUpWallet,
} = require('../controllers/wallets')
const { getCUSDBalance, getCeloBalance } = require('../utils/celo')

const startOfYear = `${new Date().getFullYear()}-01-01`
const endOfYear = `${new Date().getFullYear()}-12-31`

router.post('/', async (ctx, _) => {
  const { userId, profileId, name } = ctx.request.body

  const result = await createWallet(`${name}[${userId}]`, {
    userId,
    profileId,
    name,
  })

  let responseStatus = 200
  let type = 'SUCCESS'
  if (!result) {
    type = 'ERROR'
    responseStatus = 400
  }
  ctx.status = responseStatus
  ctx.body = {
    code: responseStatus,
    type,
    message:
      type === 'SUCCESS'
        ? 'Wallet created succesfully'
        : 'Failed creating wallet',
    ...(result || {}),
  }
})

router.post('/topup', async (ctx, _) => {
  // Get auth headers
  const {
    walletId,
    amount,
    celoTxnData,
    testMode = true,
    description,
  } = ctx.request.body.input.params

  const celoResponse = await topUpWallet({
    walletId,
    celoTxnData,
    amount,
    testMode,
    description,
  })

  let responseStatus = 200
  let type = 'SUCCESS'
  let walletBalance

  if (!celoResponse.entriesSuccess) {
    type = 'ERROR'
    responseStatus = 400
  } else {
    walletBalance = getBalance(walletId, true)
  }
  ctx.status = responseStatus
  ctx.body = {
    code: responseStatus.toString(),
    type,
    message: `${type} topping up ${walletId}`,
    walletBalance,
    celoResponse,
  }
})

router.post('/offramp', async (ctx, _) => {
  // Get auth headers
  const {
    walletId,
    amount,
    celloWalletAddress,
    testMode = true,
    currency,
    description,
  } = ctx.request.body.input.params
  // Topup jiwe account from test wallet?
  const celoResponse = await offRampFunds(
    walletId,
    celloWalletAddress,
    amount,
    testMode,
    description,
    currency
  )

  let responseStatus = 200
  let type = 'SUCCESS'
  let walletBalance
  if (celoResponse.type !== 'SUCCESS') {
    type = 'ERROR'
    responseStatus = parseInt(celoResponse.code, 10)
  } else {
    walletBalance = getBalance(walletId, true)
  }
  ctx.status = responseStatus
  ctx.body = {
    code: responseStatus.toString(),
    type,
    walletBalance,
    ...celoResponse,
  }
})

router.post('/get-jiwe-wallet-balance', async (ctx, _) => {
  const {
    walletId: bookId,
    startDate = startOfYear,
    endDate = endOfYear,
    testMode = true,
    account,
  } = ctx.request.body.input.params
  const book = await getBook({ bookId, testMode })
  const prefix = testMode ? 'Test' : ''
  const bookBalance = await book.balance({
    startDate,
    endDate,
    account: account || `${prefix}Assets:Cowrie`,
  })

  const responseStatus = 200
  const type = 'SUCCESS'
  const body = bookBalance
  ctx.status = responseStatus
  ctx.body = {
    code: responseStatus,
    type,
    ...body,
  }
})

router.post('/get-celo-wallet-balance', async (ctx, _) => {
  const { celoWalletAddress } = ctx.request.body.input.params

  const [cUSDBalance, celoBalance] = await Promise.all([
    getCUSDBalance(celoWalletAddress),
    getCeloBalance(celoWalletAddress),
  ])

  const responseStatus = 200
  const type = 'SUCCESS'
  ctx.status = responseStatus
  ctx.body = {
    code: responseStatus,
    type,
    celoWalletAddress,
    cUSDBalance,
    celoBalance,
  }
})

router.post('/transactions', async (ctx, _) => {
  const {
    walletId: bookId,
    startDate = startOfYear,
    endDate = endOfYear,
    account,
    populateTransactions = true,
    testMode = true,
  } = ctx.request.body.input.params
  const book = await getBook({ bookId, testMode })
  const ledger = await book.ledger(
    { startDate, endDate, account },
    populateTransactions
  )

  const responseStatus = 200
  const type = 'SUCCESS'
  ctx.status = responseStatus
  ctx.body = {
    code: responseStatus,
    type,
    transactions: ledger,
  }
})

module.exports = router
