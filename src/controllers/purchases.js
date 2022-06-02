const jwt = require('jsonwebtoken')
const { isEmpty, isNumber } = require('lodash')
const { getWallet, transferCowrie } = require('./wallets')

const { COWRIE_TRANSACTION_COMMISSION = 2.5 } = process.env

const creditGamer = async ({
  accessToken,
  amount,
  applyTransactionFeeOn = 'RECEIVER',
  clientSecret,
  description,
  gameId,
  orderId,
  metadata = {},
  testMode,
}) => {
  // Check if keys are empty and return error
  if (
    [gameId, amount, orderId, description].some(dp => isEmpty(dp) &&
    !isNumber(amount))
  ) {
    return {
      code: '400',
      type: 'ERROR',
      message: 'None of `gameId, amount, orderId, description` can be empty',
    }
  }

  let transactionAmount = amount
  let transactionFee = 0
  if (applyTransactionFeeOn.toUpperCase() === 'SENDER') {
    transactionFee =
      transactionAmount * (parseFloat(COWRIE_TRANSACTION_COMMISSION) / 100)
    transactionAmount = amount - transactionFee
  }

  // Get access token contents
  const { sub: userId } = jwt.decode(accessToken)

  const gamerWallet = await getWallet(userId, testMode)
  const devWallet = await getWallet(clientSecret, testMode)

  // Check if wallet balance is sufficient
  const balance = await gamerWallet.balance()
  if (parseFloat(amount) > parseFloat(balance)) {
    return {
      code: '400',
      type: 'ERROR',
      message: 'Insufficient balance',
    }
  }
  // Record transaction
  try {
    const [transactionId] = await transferCowrie({
      applyTransactionFeeOn,
      sendingWallet: gamerWallet,
      receivingWallet: devWallet,
      amount: transactionAmount,
      memo: description,
      sendingMetadata: {
        ...metadata,
        gameId,
        orderId,
        transactionReason: 'In-Game-Purchase',
        transactionType: 'credit',
      },
      transactionFee,
      receivingMetadata: {
        ...metadata,
        gameId,
        orderId,
        transactionReason: 'In-Game-Purchase',
        transactionType: 'debit',
      },
    })
    return {
      code: '200',
      type: 'SUCCESS',
      message: 'Purchase successful',
      transactionId,
    }
  } catch (error) {
    console.error(error)
    return {
      code: '400',
      type: 'ERROR',
      message: error.message,
    }
  }
}

module.exports = {
  creditGamer,
}
