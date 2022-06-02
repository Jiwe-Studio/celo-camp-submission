const config = require('../config')
const knex = require('knex')(config.DB)
const fetch = require('node-fetch')
const { isEmpty } = require('lodash')

const { getPaymentTransactionById } = require('./transactions')
const { getBook } = require('./accounts')

const createWallet = async (walletName, metadata) => {
  try {
    // Check if wallet exists
    const walletExists = await knex('books')
      .select('name', 'id')
      .whereLike('name', `%[${metadata.userId}]`)
      .first()

    if (!isEmpty(walletExists)) {
      const testWallet = await knex('books')
        .select('name', 'id')
        .where('name', `TEST_${walletExists.name}`)
        .first()
      return {
        walletId: walletExists.id,
        testWalletId: testWallet.id,
      }
    }

    const [walletId] = await knex('books').returning('id').insert({
      name: walletName,
      metadata,
    })

    const [testWalletId] = await knex('books')
      .returning('id')
      .insert({
        name: `TEST_${walletName}`,
        metadata,
      })

    await fetch('http://localhost:10000/api/v1/profiles/add-wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...metadata, // userId, profileId
        walletId: walletId.id,
        walletName,
        testWalletId: testWalletId.id,
      }),
    })

    return {
      walletId: walletId.id,
      testWalletId: testWalletId.id,
    }
  } catch (error) {
    console.error(error)
    return false
  }
}

const getWallet = async (id, testMode = false) => getBook({ id, testMode })

const getTransactions = async (walletId, query, testMode = false) => {
  const wallet = await getWallet(walletId, testMode)
  return wallet.ledger(query)
}

const getBalance = async (walletId, testMode = false) => {
  const wallet = await getWallet(walletId, testMode)
  return wallet.balance()
}

const transferCowrie = async ({
  sendingWallet,
  receivingWallet,
  amount,
  memo,
  sendingMetadata,
  receivingMetadata,
  applyTransactionFeeOn,
  transactionFee,
  testMode,
  isOffRamp = false,
  isTopUp = false,
}) => {
  const jiweWallet = await getWallet(process.env.JIWE_WALLET_ID, testMode)
  const prefix = testMode ? 'Test:' : ''
  if (applyTransactionFeeOn) {
    await jiweWallet
      .entry(`${memo}[TRANSACTION_FEE]`)
      .debit(
        `${prefix}Income:${
          applyTransactionFeeOn === 'SENDER'
            ? sendingWallet.name
            : receivingWallet.name
        }`,
        parseFloat(transactionFee),
        sendingMetadata
      )
      .credit(
        `${prefix}Assets:Cowrie`,
        parseFloat(transactionFee),
        receivingMetadata
      )
      .commit()
    if (applyTransactionFeeOn === 'RECEIVER') {
      await receivingWallet
        .entry(`${memo}[TRANSACTION_FEE]`)
        .debit(`${prefix}Assets:Cowrie`, parseFloat(transactionFee), {
          ...receivingMetadata,
          transactionReason: 'Transaction Fee',
          transactionType: 'credit',
        })
        .credit(
          `${prefix}Liabilities:Jiwe:TransactionFee`,
          parseFloat(transactionFee),
          {
            ...receivingMetadata,
            transactionReason: 'Transaction Fee',
            transactionType: 'credit',
          }
        )
        .commit()
    }
    if (applyTransactionFeeOn === 'SENDER') {
      await receivingWallet
        .entry(`${memo}[TRANSACTION_FEE]`)
        .debit(`${prefix}Assets:Cowrie`, parseFloat(transactionFee), {
          ...sendingMetadata,
          transactionReason: 'Transaction Fee',
          transactionType: 'credit',
        })
        .credit(
          `${prefix}Liabilities:Jiwe:TransactionFee`,
          parseFloat(transactionFee),
          {
            ...sendingMetadata,
            transactionReason: 'Transaction Fee',
            transactionType: 'credit',
          }
        )
        .commit()
    }
  }

  if (isOffRamp) {
    return Promise.all([
      sendingWallet
        .entry(memo)
        .credit(`${prefix}Assets:Cowrie`, parseFloat(amount), sendingMetadata)
        .debit(
          `${prefix}Income:${receivingWallet.name}`,
          parseFloat(amount),
          sendingMetadata
        )
        .commit(),
      receivingWallet
        .entry(memo)
        .credit(`${prefix}Assets:Cowrie`, parseFloat(amount), receivingMetadata)
        .debit(
          `${prefix}Income:${sendingWallet.name}:Cowrie`,
          parseFloat(amount),
          receivingMetadata
        )
        .commit(),
      jiweWallet
        .entry(memo)
        .debit(
          `${prefix}Liabilities:Cowrie:${receivingWallet.name}`,
          parseFloat(amount),
          { sendingMetadata, receivingMetadata }
        )
        .credit(
          `${prefix}Liabilities:Cowrie:${sendingWallet.name}`,
          parseFloat(amount),
          { sendingMetadata, receivingMetadata }
        )
        .commit(),
    ])
  }

  if (isTopUp) {
    return Promise.all([
      receivingWalletEntry
        .entry(memo)
        .debit(`${prefix}Assets:Cowrie`, parseFloat(amount), receivingMetadata)
        .credit(
          `${prefix}Income:Cowrie:${jiweWallet.name}`,
          parseFloat(amount),
          receivingMetadata
        )
        .commit(),
      jiweWallet
        .entry(memo)
        .debit(
          `${prefix}Liabilities:Cowrie`,
          parseFloat(amount),
          sendingMetadata
        )
        .credit(`${prefix}Assets:Cowrie`, parseFloat(amount), sendingMetadata)
        .commit(),
    ])
  }

  return Promise.all([
    sendingWallet
      .entry(memo)
      .credit(`${prefix}Assets:Cowrie`, parseFloat(amount), sendingMetadata)
      .debit(
        `${prefix}Income:${receivingWallet.name}`,
        parseFloat(amount),
        sendingMetadata
      )
      .commit(),
    receivingWallet
      .entry(memo)
      .debit(`${prefix}Assets:Cowrie`, parseFloat(amount), receivingMetadata)
      .credit(
        `${prefix}Income:${sendingWallet.name}:Rewards`,
        parseFloat(amount),
        receivingMetadata
      )
      .commit(),
    jiweWallet
      .entry(memo)
      .debit(
        `${prefix}Liabilities:Cowrie:${sendingWallet.name}`,
        parseFloat(amount),
        { sendingMetadata, receivingMetadata }
      )
      .credit(
        `${prefix}Liabilities:Cowrie:${receivingWallet.name}`,
        parseFloat(amount),
        { sendingMetadata, receivingMetadata }
      )
      .commit(),
  ])
}

const getWalletTransaction = async paymentTransactionId =>
  getPaymentTransactionById(paymentTransactionId)

const topUpWallet = async ({
  walletId,
  celoTxnData,
  amount,
  description,
  testMode = true,
  applyTransactionFeeOn = 'SENDER',
}) => {
  const jiweWallet = await getWallet(process.env.JIWE_WALLET_ID, testMode)
  const receivingWallet = await getWallet(walletId, testMode)

  let transactionAmount = amount
  let transactionFee =
    transactionAmount *
    (parseFloat(process.env.COWRIE_TRANSACTION_COMMISSION) / 100)

  // Topup customer wallet
  const result = await transferCowrie({
    sendingWallet: jiweWallet,
    receivingWallet,
    amount,
    memo: description,
    sendingMetadata: {
      walletId,
      transactionReason: 'Wallet Top Up',
      transactionType: 'credit',
    },
    receivingMetadata: {
      walletId,
      transactionReason: 'Wallet Top Up',
      transactionType: 'debit',
    },
    applyTransactionFeeOn,
    transactionFee,
    testMode,
    isTopUp: true,
  })
  return {
    celoResponse: celoTxnData,
    ...result,
    entriesSuccess: result.length === 2,
  }
}

module.exports = {
  getWallet,
  createWallet,
  getBalance,
  getTransactions,
  getWalletTransaction,
  transferCowrie,
  topUpWallet,
}
