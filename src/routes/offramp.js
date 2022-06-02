const router = require('koa-router')()
const { isEmpty } = require('lodash')
const redis = require('../utils/redis')
const { offRampFunds } = require('../controllers/offramp')

router.post('/', async (ctx, _) => {
  const {
    walletId,
    celoWalletAddress,
    amount,
    description,
    idempotencyKey,
    metadata,
  } = ctx.request.body

  const testMode = clientSecret.includes('test_')

  // Check if this request has been saved
  if (!isEmpty(idempotencyKey)) {
    const response = await redis.get(idempotencyKey)
    if (!isEmpty(response)) {
      ctx.status = 200
      ctx.body = JSON.parse(response)
      return
    }
  }

  const result = await offRampFunds({
    walletId,
    celoWalletAddress,
    description,
    metadata,
    amount,
    testMode,
  })

  // Store response if result is successful
  if (result.code === 200 && !isEmpty(idempotencyKey)) {
    // Store response in redis
    await redis.set(idempotencyKey, JSON.stringify({ ...result }))
  }

  ctx.status = parseInt(result.code)
  ctx.body = { ...result }
})

module.exports = router
