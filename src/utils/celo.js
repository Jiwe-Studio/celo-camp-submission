// https://docs.celo.org/blog/developer-guide/start/hellocelo
require('dotenv').config()
const Web3 = require('web3')
const fs = require('fs')
const path = require('path')
const { newKitFromWeb3, CeloContract } = require('@celo/contractkit')
const { BigNumber } = require('@ethersproject/bignumber')

const web3 = new Web3(process.env.CELO_KIT_URL)
const kit = newKitFromWeb3(web3)

const BIG_NUMBER_CONST = 1e18

const filePath = path.join(__dirname, '..', process.env.CELO_ACCOUNT_SECRET_FILE)

function getAccount() {
  return new Promise(resolve => {
    if (fs.existsSync(filePath)) {
      fs.readFile(filePath, { encoding: 'utf-8' }, (_err, data) => {
        resolve(web3.eth.accounts.privateKeyToAccount(data.trim()))
      })
    } else {
      let randomAccount = web3.eth.accounts.create()

      fs.writeFile(filePath, randomAccount.privateKey, err => {
        if (err) {
          return console.log(err)
        }
      })

      resolve(randomAccount)
    }
  })
}

const getContractWrappers = async () => {
  const celoToken = await kit.contracts.getGoldToken()
  const cUSDToken = await kit.contracts.getStableToken()
  return {
    celoToken,
    cUSDToken,
  }
}

const getBalance = async walletAddress => kit.getTotalBalance(walletAddress)

const getCUSDBalance = async walletAddress => {
  const cUSDToken = await kit.contracts.getStableToken()
  return (await cUSDToken.balanceOf(walletAddress)).toString()
}

const getCeloBalance = async walletAddress => {
  const celoToken = await kit.contracts.getGoldToken()
  return (await celoToken.balanceOf(walletAddress)).toString()
}

const sendFunds = async ({ toWalletAddress, amount, currency = 'cUSD' }) => {
  const account = await getAccount()
  kit.connection.addAccount(account.privateKey)
  await kit.setFeeCurrency(CeloContract.StableToken)

  const { cUSDToken, celoToken } = await getContractWrappers()

  let transaction
  const transactionAmount = BigNumber.from(`${amount * BIG_NUMBER_CONST}`)
  try {
    if (currency === 'cUSD') {
      transaction = await cUSDToken
        .transfer(toWalletAddress, transactionAmount)
        .send({ from: account.address, feeCurrency: cUSDToken.address })
    } else if (currency === 'celo') {
      transaction = await celoToken
        .transfer(toWalletAddress, transactionAmount)
        .send({ from: account.address })
    }
  } catch (error) {
    return {
      code: '424',
      message: error.message,
    }
  }

  // Wait for the transactions to be processed
  const receipt = await transaction.waitReceipt()

  // Get new balances
  let balance
  if (currency === 'cUSD') {
    balance = await cUSDToken.balanceOf(account.address)
  } else if (currency === 'celo') {
    balance = await celoToken.balanceOf(account.address)
  }

  return {
    code: '200',
    message: `${currency} ${amount} successfully sent`,
    receipt,
    gasFees: Number(receipt.gasUsed) / Number(BIG_NUMBER_CONST),
    rawBalance: balance.toString(),
    balance: balance.toNumber() / Number(BIG_NUMBER_CONST),
  }
}

module.exports = {
  getBalance,
  getCeloBalance,
  getCUSDBalance,
  sendFunds,
}
