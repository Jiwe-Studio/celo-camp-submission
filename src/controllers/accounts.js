const { Book } = require('medici')

const getBook = async ({ id, testMode }) => {
  const prefix = testMode ? 'test_' : ''
  return new Book(`${prefix}${id}`)
}

module.exports = {
  getBook,
}
