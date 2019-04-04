const assert = require('assert')
const Web3Utils = require('web3-utils')
const env = require('../loadEnv')

const { deployContract, privateKeyToAddress, sendRawTxForeign } = require('../deploymentUtils')
const { web3Foreign, deploymentPrivateKey, FOREIGN_RPC_URL } = require('../web3')

const EternalStorageProxy = require('../../../build/contracts/EternalStorageProxy.json')
const BridgeValidators = require('../../../build/contracts/BridgeValidators.json')
const ForeignBridge = require('../../../build/contracts/ForeignBridgeErcToErc.json')

const BorderCitizenList = require('../../../build/contracts/BorderCitizenList.json')

const VALIDATORS = env.VALIDATORS.split(' ')

const INITIAL_CITIZEN_ACCOUNTS = env.INITIAL_CITIZEN_ACCOUNTS?env.INITIAL_CITIZEN_ACCOUNTS.split(' '):[];

const {
  DEPLOYMENT_ACCOUNT_PRIVATE_KEY,
  REQUIRED_NUMBER_OF_VALIDATORS,
  FOREIGN_BRIDGE_OWNER,
  FOREIGN_VALIDATORS_OWNER,
  FOREIGN_UPGRADEABLE_ADMIN,
  FOREIGN_REQUIRED_BLOCK_CONFIRMATIONS,
  ERC20_TOKEN_ADDRESS,
  FOREIGN_GAS_PRICE,
  FOREIGN_MAX_AMOUNT_PER_TX,
  HOME_DAILY_LIMIT,
  HOME_MAX_AMOUNT_PER_TX,
  BORDER_ACTIVE,
  BORDER_CONTRACT_OWNER
} = env

const DEPLOYMENT_ACCOUNT_ADDRESS = privateKeyToAddress(DEPLOYMENT_ACCOUNT_PRIVATE_KEY)

const isBorderActive = BORDER_ACTIVE === 'true'


async function deployForeign() {
  if (!Web3Utils.isAddress(ERC20_TOKEN_ADDRESS)) {
    throw new Error('ERC20_TOKEN_ADDRESS env var is not defined')
  }
  let foreignNonce = await web3Foreign.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('========================================')
  console.log('deploying ForeignBridge')
  console.log('========================================\n')

  console.log('deploying storage for foreign validators')
  const storageValidatorsForeign = await deployContract(EternalStorageProxy, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    network: 'foreign',
    nonce: foreignNonce
  })
  foreignNonce++
  console.log('[Foreign] BridgeValidators Storage: ', storageValidatorsForeign.options.address)

  console.log('\ndeploying implementation for foreign validators')
  const bridgeValidatorsForeign = await deployContract(BridgeValidators, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    network: 'foreign',
    nonce: foreignNonce
  })
  foreignNonce++
  console.log(
    '[Foreign] BridgeValidators Implementation: ',
    bridgeValidatorsForeign.options.address
  )

  console.log('\nhooking up eternal storage to BridgeValidators')
  const upgradeToBridgeVForeignData = await storageValidatorsForeign.methods
    .upgradeTo('1', bridgeValidatorsForeign.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txUpgradeToBridgeVForeign = await sendRawTxForeign({
    data: upgradeToBridgeVForeignData,
    nonce: foreignNonce,
    to: storageValidatorsForeign.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  })
  assert.strictEqual(
    Web3Utils.hexToNumber(txUpgradeToBridgeVForeign.status),
    1,
    'Transaction Failed'
  )
  foreignNonce++

  console.log('\ninitializing Foreign Bridge Validators with following parameters:\n')
  console.log(
    `REQUIRED_NUMBER_OF_VALIDATORS: ${REQUIRED_NUMBER_OF_VALIDATORS}, VALIDATORS: ${VALIDATORS}`
  )
  bridgeValidatorsForeign.options.address = storageValidatorsForeign.options.address
  const initializeForeignData = await bridgeValidatorsForeign.methods
    .initialize(REQUIRED_NUMBER_OF_VALIDATORS, VALIDATORS, FOREIGN_VALIDATORS_OWNER)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txInitializeForeign = await sendRawTxForeign({
    data: initializeForeignData,
    nonce: foreignNonce,
    to: bridgeValidatorsForeign.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txInitializeForeign.status), 1, 'Transaction Failed')
  foreignNonce++

  console.log('\nTransferring ownership of ValidatorsProxy\n')
  const validatorsForeignOwnershipData = await storageValidatorsForeign.methods
    .transferProxyOwnership(FOREIGN_UPGRADEABLE_ADMIN)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txValidatorsForeignOwnershipData = await sendRawTxForeign({
    data: validatorsForeignOwnershipData,
    nonce: foreignNonce,
    to: storageValidatorsForeign.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  })
  assert.strictEqual(
    Web3Utils.hexToNumber(txValidatorsForeignOwnershipData.status),
    1,
    'Transaction Failed'
  )
  foreignNonce++

  console.log('\ndeploying foreignBridge storage\n')
  const foreignBridgeStorage = await deployContract(EternalStorageProxy, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    network: 'foreign',
    nonce: foreignNonce
  })
  foreignNonce++
  console.log('[Foreign] ForeignBridge Storage: ', foreignBridgeStorage.options.address)

  console.log('\ndeploying foreignBridge implementation\n')
  const foreignBridgeImplementation = await deployContract(ForeignBridge, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    network: 'foreign',
    nonce: foreignNonce
  })
  foreignNonce++
  console.log(
    '[Foreign] ForeignBridge Implementation: ',
    foreignBridgeImplementation.options.address
  )

  console.log('\nhooking up ForeignBridge storage to ForeignBridge implementation')
  const upgradeToForeignBridgeData = await foreignBridgeStorage.methods
    .upgradeTo('1', foreignBridgeImplementation.options.address)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txUpgradeToForeignBridge = await sendRawTxForeign({
    data: upgradeToForeignBridgeData,
    nonce: foreignNonce,
    to: foreignBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  })
  assert.strictEqual(
    Web3Utils.hexToNumber(txUpgradeToForeignBridge.status),
    1,
    'Transaction Failed'
  )
  foreignNonce++

  console.log('\ninitializing Foreign Bridge with following parameters:\n')
  console.log(`Foreign Validators: ${storageValidatorsForeign.options.address},
  `)
  foreignBridgeImplementation.options.address = foreignBridgeStorage.options.address
  const initializeFBridgeData = await foreignBridgeImplementation.methods
    .initialize(
      storageValidatorsForeign.options.address,
      ERC20_TOKEN_ADDRESS,
      FOREIGN_REQUIRED_BLOCK_CONFIRMATIONS,
      FOREIGN_GAS_PRICE,
      FOREIGN_MAX_AMOUNT_PER_TX,
      HOME_DAILY_LIMIT,
      HOME_MAX_AMOUNT_PER_TX,
      FOREIGN_BRIDGE_OWNER
    )
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txInitializeBridge = await sendRawTxForeign({
    data: initializeFBridgeData,
    nonce: foreignNonce,
    to: foreignBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txInitializeBridge.status), 1, 'Transaction Failed')
  foreignNonce++

  let foreignBridgeImplementationOWNER=await foreignBridgeImplementation.methods.owner().call()
  console.log("foreignBridgeImplementationOWNER="+foreignBridgeImplementationOWNER);

  const bridgeOwnershipData = await foreignBridgeStorage.methods
    .transferProxyOwnership(FOREIGN_UPGRADEABLE_ADMIN)
    .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
  const txBridgeOwnershipData = await sendRawTxForeign({
    data: bridgeOwnershipData,
    nonce: foreignNonce,
    to: foreignBridgeStorage.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  })
  assert.strictEqual(Web3Utils.hexToNumber(txBridgeOwnershipData.status), 1, 'Transaction Failed')
  foreignNonce++

  if(isBorderActive && BORDER_CONTRACT_OWNER){
    console.log('\nBorder mode is Active deploy Border Contract:\n')

    console.log('deploying storage for border citizen list')
    const storageBorderCitizenList = await deployContract(EternalStorageProxy, [], {
      from: DEPLOYMENT_ACCOUNT_ADDRESS,
      network: 'foreign',
      nonce: foreignNonce
    })
    foreignNonce++
    console.log('[Foreign] BorderCitizenList Storage: ', storageBorderCitizenList.options.address)

    console.log('\ndeploying borderCitizenList implementation\n')
    const borderCitizenListImplementation = await deployContract(BorderCitizenList, [], {
      from: DEPLOYMENT_ACCOUNT_ADDRESS,
      network: 'foreign',
      nonce: foreignNonce
    })
    foreignNonce++
    console.log(
      '[Foreign] BorderCitizenList  Implementation: ',
      borderCitizenListImplementation.options.address
    )

    console.log('\nhooking up eternal storage to BorderCitizenList')
    const upgradeToBorderCitizenListData = await storageBorderCitizenList.methods
      .upgradeTo('1', borderCitizenListImplementation.options.address)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const txUpgradeToBorderCitizenList= await sendRawTxForeign({
      data: upgradeToBorderCitizenListData,
      nonce: foreignNonce,
      to: storageBorderCitizenList.options.address,
      privateKey: deploymentPrivateKey,
      url: FOREIGN_RPC_URL
    })
    assert.strictEqual(
      Web3Utils.hexToNumber(txUpgradeToBorderCitizenList.status),
      1,
      'Transaction Failed'
    )
    foreignNonce++

    console.log('\ninitializing BorderCitizenList with following parameters:\n')
    console.log(
      `INITIAL_CITIZEN_ACCOUNTS: ${INITIAL_CITIZEN_ACCOUNTS}, BORDER_CONTRACT_OWNER= ${BORDER_CONTRACT_OWNER}`
    )
    borderCitizenListImplementation.options.address = storageBorderCitizenList.options.address
    const initializeBorderCitizenListData = await borderCitizenListImplementation.methods
      .initialize(INITIAL_CITIZEN_ACCOUNTS, BORDER_CONTRACT_OWNER)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const txInitializeBorderCitizenList= await sendRawTxForeign({
      data: initializeBorderCitizenListData,
      nonce: foreignNonce,
      to: borderCitizenListImplementation.options.address,
      privateKey: deploymentPrivateKey,
      url: FOREIGN_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(txInitializeBorderCitizenList.status), 1, 'Transaction Failed')
    foreignNonce++

    console.log('\nTransferring ownership of BorderCitizenListProxy\n')
    const storageBorderCitizenListOwnershipData = await storageBorderCitizenList.methods
      .transferProxyOwnership(FOREIGN_UPGRADEABLE_ADMIN)
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const txBorderCitizenListOwnershipData = await sendRawTxForeign({
      data: storageBorderCitizenListOwnershipData,
      nonce: foreignNonce,
      to: storageBorderCitizenList.options.address,
      privateKey: deploymentPrivateKey,
      url: FOREIGN_RPC_URL
    })
    assert.strictEqual(
      Web3Utils.hexToNumber(txBorderCitizenListOwnershipData.status),
      1,
      'Transaction Failed'
    )
    foreignNonce++

    console.log('\hooking BorderCitizenListContract to foreignBridge:\n')
    const setBorderCitizenListContractData = await foreignBridgeImplementation.methods
        .setBorderCitizenListContract(storageBorderCitizenList.options.address) 
      .encodeABI({ from: DEPLOYMENT_ACCOUNT_ADDRESS })
    const txSetBorderCitizenListContractData= await sendRawTxForeign({
      data: setBorderCitizenListContractData,
      nonce: foreignNonce,
      to: foreignBridgeStorage.options.address,
      privateKey: deploymentPrivateKey,
      url: FOREIGN_RPC_URL
    })
    assert.strictEqual(Web3Utils.hexToNumber(txSetBorderCitizenListContractData.status), 1, 'Transaction Failed')
    foreignNonce++

  }
  else{
    console.log('\nBorder mode is NOT Active. Nothing to do.\n')
  }


  console.log('\nForeign Deployment Bridge completed\n')
  return {
    foreignBridge: {
      address: foreignBridgeStorage.options.address,
      deployedBlockNumber: Web3Utils.hexToNumber(foreignBridgeStorage.deployedBlockNumber)
    }
  }
}

module.exports = deployForeign
