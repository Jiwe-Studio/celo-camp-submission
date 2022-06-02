const router = require('koa-router')()
const { isEmpty } = require('lodash')
const redis = require('../utils/redis')
const { creditGamer } = require('../controllers/purchases')

router.post('/', async (ctx, _) => {
  // Get auth headers
  const clientSecret = ctx.headers.api_key
  let accessToken = ctx.headers['Authorization'] || ctx.headers['authorization']
  accessToken = accessToken.split('Bearer ')[1]

  if (isEmpty(clientSecret)) {
    ctx.status = 400
    ctx.body = {
      type: 'ERROR',
      message: 'Client API Key must be present in api_key header',
    }
  }

  if (isEmpty(accessToken)) {
    ctx.status = 400
    ctx.body = {
      type: 'ERROR',
      message: 'Bearer token must be present in Authorization header',
    }
  }

  const {
    gameId,
    amount,
    orderId,
    description,
    applyTransactionFeeOn,
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

  const result = await creditGamer({
    accessToken,
    amount,
    applyTransactionFeeOn,
    clientSecret,
    description,
    gameId,
    orderId,
    metadata,
    testMode,
  })

  // Store response if result is successful
  if (result.code === '200' && !isEmpty(idempotencyKey)) {
    // Store response in redis
    await redis.set(idempotencyKey, JSON.stringify({ ...result }))
  }

  ctx.status = parseInt(result.code)
  ctx.body = { ...result }
})

module.exports = router
