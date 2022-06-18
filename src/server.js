require('dotenv').config()
const Koa = require('koa')
const cors = require('@koa/cors')
const bodyParser = require('koa-bodyparser')
const helmet = require('koa-helmet')
const json = require('koa-json')

const app = new Koa()
const { clientErrorHandler } = require('./utils/extras')
const router = require('./router')

app.use(cors())

app.use(helmet())
app.use(bodyParser())
app.use(json())

app

  // Error Handler
  .use(clientErrorHandler)

  // API Routes
  .use(router.APIv1Router.routes())
  .use(router.APIv1Router.allowedMethods())

const port = process.env.PORT || 2021
app.listen(port, () => console.log(`Jiwe Wallet API running on port ${port}`))
