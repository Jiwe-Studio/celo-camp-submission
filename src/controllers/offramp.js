const { sendFunds } = require('../utils/celo')
const { getWallet, transferCowrie } = require('./wallets')
const { isEmpty, isNumber } = require('lodash')

const offRampFunds = async ({
  walletId,
  celoWalletAddress,
  description,
  metadata = {},
  amount,
  testMode,
  deductTransactionFee = false,
}) => {
  if (
    [walletId, celoWalletAddress, amount, description].some(dp => isEmpty(dp) && !isNumber(dp))
  ) {
    return {
      code: '400',
      type: 'ERROR',
      message:
        'None of `walletId, celoWalletAddress, amount, description` can be empty',
    }
  }

  let transactionAmount = amount
  let transactionFee = 0
  transactionFee =
    transactionAmount *
    (parseFloat(process.env.COWRIE_TRANSACTION_COMMISSION) / 100)
  if (deductTransactionFee) {
    transactionAmount = amount - transactionFee
  }

  const receivingWallet = await getWallet(walletId, testMode)
  const jiweWallet = await getWallet(process.env.JIWE_WALLET_ID, testMode)

  // Check if wallet balance is sufficient
  const balance = await receivingWallet.balance()
  if (parseFloat(amount) > parseFloat(balance)) {
    return {
      code: '400',
      type: 'ERROR',
      message: 'Insufficient balance',
    }
  }

  try {
    const celoTxn = await sendFunds({
      amount: transactionAmount,
      toWalletAddress: celoWalletAddress,
    })

    if (celoTxn.code !== 200) {
      return celoTxn
    }

    const [transactionId] = await transferCowrie({
      applyTransactionFeeOn: deductTransactionFee ? 'RECEIVER' : 'SENDER',
      sendingWallet: jiweWallet,
      receivingWallet,
      amount: transactionAmount,
      memo: description,
      sendingMetadata: {
        ...metadata,
        celoReceipt: celoTxn.receipt,
        transactionReason: 'Off-Ramp-To-Celo',
        transactionType: 'debit',
      },
      transactionFee,
      receivingMetadata: {
        ...metadata,
        fromCeloWalletAddress: celoTxn.receipt.from,
        transactionHash: celoTxn.receipt.transactionHash,
        transactionReason: 'Off-Ramp-To-Celo',
        transactionType: 'credit',
      },
      isOffRamp: true,
    })

    return {
      code: '200',
      type: 'SUCCESS',
      message: 'Transfer successful',
      transactionId,
      transactionHash: celoTxn.receipt.transactionHash,
    }
  } catch (error) {
    console.log(error)
    return {
      code: '422',
      type: 'ERROR',
      message: error.message,
    }
  }
}

module.exports = {
  offRampFunds,
}
