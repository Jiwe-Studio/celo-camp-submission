const wallet = require('./routes/wallet')
const cowrieRewards = require('./routes/reward')
const cowriePurchases = require('./routes/purchase')
const cowrieOffRamp = require('./routes/offramp')

const routerInstance = () => {
  const APIv1Router = require('koa-router')({ prefix: '/api/v1' })

  APIv1Router.use('/wallets', wallet.routes())
  APIv1Router.use('/purchases', cowriePurchases.routes())
  APIv1Router.use('/rewards', cowrieRewards.routes())
  APIv1Router.use('/offramp', cowrieOffRamp.routes())

  return {
    APIv1Router,
  }
}

module.exports = routerInstance()
