const Redis = require('ioredis')

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
})

const set = async (key, value, expiresIn) => {
  if (expiresIn) {
    return redis.set(key, value, 'EX', expiresIn)
  }
  return redis.set(key, value)
}

const get = async key => redis.get(key)

module.exports = {
  set,
  get,
}
