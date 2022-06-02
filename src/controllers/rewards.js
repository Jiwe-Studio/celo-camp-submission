const jwt = require('jsonwebtoken')
const { isEmpty, isNumber } = require('lodash')
const { getWallet, transferCowrie } = require('./wallets')

const rewardGamer = async ({
  accessToken,
  amount,
  clientSecret,
  description,
  gameId,
  orderId,
  metadata = {},
  testMode,
}) => {
  // Check if keys are empty and return error
  if (
    [gameId, amount, orderId, description].some(dp => isEmpty(dp)) &&
    !isNumber(amount)
  ) {
    return {
      code: '400',
      type: 'ERROR',
      message: 'None of `gameId, amount, orderId, description` can be empty',
    }
  }

  // Check if dev wallet balance is sufficient
  const devWallet = await getWallet(clientSecret, testMode)
  const { balance } = await devWallet.balance()
  if (parseFloat(amount) > parseFloat(balance)) {
    return {
      code: '400',
      type: 'ERROR',
      message: 'Insufficient balance',
    }
  }

  // Get access token contents
  const { sub: userId } = jwt.decode(accessToken)
  const gamerWallet = await getWallet(userId, testMode)

  // Record transaction
  try {
    const [transactionId] = await transferCowrie({
      sendingWallet: devWallet,
      receivingWallet: gamerWallet,
      amount,
      memo: description,
      sendingMetadata: {
        ...metadata,
        gameId,
        orderId,
        transactionReason: 'Reward',
        transactionType: 'credit',
      },
      receivingMetadata: {
        ...metadata,
        gameId,
        orderId,
        transactionReason: 'Reward',
        transactionType: 'debit',
      },
    })
    return {
      code: '200',
      type: 'SUCCESS',
      message: 'Reward successfully deposited',
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
  rewardGamer,
}
