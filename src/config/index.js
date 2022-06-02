const DB = {
  client: 'pg',
  debug: process.env.DEBUG_MODE === 'true',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
}

module.exports = { DB }
