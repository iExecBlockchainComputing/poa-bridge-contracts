const assert = require('assert')
const Web3Utils = require('web3-utils')
const env = require('../loadEnv')

const {
  deployContract,
  privateKeyToAddress,
  sendRawTxForeign,
  upgradeProxy,
  initializeValidators,
  transferProxyOwnership,
  assertStateWithRetry
} = require('../deploymentUtils')
const { web3Foreign, deploymentPrivateKey, FOREIGN_RPC_URL } = require('../web3')
const {
  foreignContracts: {
    EternalStorageProxy,
    BridgeValidators,
    ForeignBridgeErcToErc: ForeignBridge,
    ForeignBridgeErc677ToErc677,
    BorderCitizenList
  }
} = require('../loadContracts')

const VALIDATORS = env.VALIDATORS.split(' ')

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
  FOREIGN_MIN_AMOUNT_PER_TX,
  FOREIGN_DAILY_LIMIT,
  ERC20_EXTENDED_BY_ERC677,
  BORDER_ACTIVE,
  BORDER_CONTRACT_OWNER
} = env

const DEPLOYMENT_ACCOUNT_ADDRESS = privateKeyToAddress(DEPLOYMENT_ACCOUNT_PRIVATE_KEY)

async function initializeBridge({ validatorsBridge, bridge, nonce }) {
  console.log(`Foreign Validators: ${validatorsBridge.options.address},
  ERC20_TOKEN_ADDRESS: ${ERC20_TOKEN_ADDRESS},
  FOREIGN_MAX_AMOUNT_PER_TX: ${FOREIGN_MAX_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(
    FOREIGN_MAX_AMOUNT_PER_TX
  )} in eth,
  FOREIGN_GAS_PRICE: ${FOREIGN_GAS_PRICE}, FOREIGN_REQUIRED_BLOCK_CONFIRMATIONS : ${FOREIGN_REQUIRED_BLOCK_CONFIRMATIONS},
    HOME_DAILY_LIMIT: ${HOME_DAILY_LIMIT} which is ${Web3Utils.fromWei(HOME_DAILY_LIMIT)} in eth,
  HOME_MAX_AMOUNT_PER_TX: ${HOME_MAX_AMOUNT_PER_TX} which is ${Web3Utils.fromWei(
    HOME_MAX_AMOUNT_PER_TX
  )} in eth,
  FOREIGN_BRIDGE_OWNER: ${FOREIGN_BRIDGE_OWNER}
  `)
  let initializeFBridgeData

  if (ERC20_EXTENDED_BY_ERC677) {
    initializeFBridgeData = await bridge.methods
      .initialize(
        validatorsBridge.options.address,
        ERC20_TOKEN_ADDRESS,
        FOREIGN_REQUIRED_BLOCK_CONFIRMATIONS,
        FOREIGN_GAS_PRICE,
        FOREIGN_DAILY_LIMIT,
        FOREIGN_MAX_AMOUNT_PER_TX,
        FOREIGN_MIN_AMOUNT_PER_TX,
        HOME_DAILY_LIMIT,
        HOME_MAX_AMOUNT_PER_TX,
        FOREIGN_BRIDGE_OWNER
      )
      .encodeABI()
  } else {
    initializeFBridgeData = await bridge.methods
      .initialize(
        validatorsBridge.options.address,
        ERC20_TOKEN_ADDRESS,
        FOREIGN_REQUIRED_BLOCK_CONFIRMATIONS,
        FOREIGN_GAS_PRICE,
        FOREIGN_MAX_AMOUNT_PER_TX,
        HOME_DAILY_LIMIT,
        HOME_MAX_AMOUNT_PER_TX,
        FOREIGN_BRIDGE_OWNER
      )
      .encodeABI()
  }
  const txInitializeBridge = await sendRawTxForeign({
    data: initializeFBridgeData,
    nonce,
    to: bridge.options.address,
    privateKey: deploymentPrivateKey,
    url: FOREIGN_RPC_URL
  })
  if (txInitializeBridge.status) {
    assert.strictEqual(Web3Utils.hexToNumber(txInitializeBridge.status), 1, 'Transaction Failed')
  } else {
    await assertStateWithRetry(bridge.methods.isInitialized().call, true)
  }
}

async function deployForeign() {
  if (!Web3Utils.isAddress(ERC20_TOKEN_ADDRESS)) {
    throw new Error('ERC20_TOKEN_ADDRESS env var is not defined')
  }
  let nonce = await web3Foreign.eth.getTransactionCount(DEPLOYMENT_ACCOUNT_ADDRESS)
  console.log('========================================')
  console.log('deploying ForeignBridge')
  console.log('========================================\n')

  console.log('deploying storage for foreign validators')
  const storageValidatorsForeign = await deployContract(EternalStorageProxy, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    network: 'foreign',
    nonce
  })
  nonce++
  console.log('[Foreign] BridgeValidators Storage: ', storageValidatorsForeign.options.address)

  console.log('\ndeploying implementation for foreign validators')
  const bridgeValidatorsForeign = await deployContract(BridgeValidators, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    network: 'foreign',
    nonce
  })
  nonce++
  console.log(
    '[Foreign] BridgeValidators Implementation: ',
    bridgeValidatorsForeign.options.address
  )

  console.log('\nhooking up eternal storage to BridgeValidators')
  await upgradeProxy({
    proxy: storageValidatorsForeign,
    implementationAddress: bridgeValidatorsForeign.options.address,
    version: '1',
    nonce,
    url: FOREIGN_RPC_URL
  })
  nonce++

  console.log('\ninitializing Foreign Bridge Validators with following parameters:\n')
  bridgeValidatorsForeign.options.address = storageValidatorsForeign.options.address
  await initializeValidators({
    contract: bridgeValidatorsForeign,
    isRewardableBridge: false,
    requiredNumber: REQUIRED_NUMBER_OF_VALIDATORS,
    validators: VALIDATORS,
    rewardAccounts: [],
    owner: FOREIGN_VALIDATORS_OWNER,
    nonce,
    url: FOREIGN_RPC_URL
  })
  nonce++

  console.log('\nTransferring ownership of ValidatorsProxy\n')
  await transferProxyOwnership({
    proxy: storageValidatorsForeign,
    newOwner: FOREIGN_UPGRADEABLE_ADMIN,
    nonce,
    url: FOREIGN_RPC_URL
  })
  nonce++

  console.log('\ndeploying foreignBridge storage\n')
  const foreignBridgeStorage = await deployContract(EternalStorageProxy, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    network: 'foreign',
    nonce
  })
  nonce++
  console.log('[Foreign] ForeignBridge Storage: ', foreignBridgeStorage.options.address)

  console.log('\ndeploying foreignBridge implementation\n')
  const bridgeContract = ERC20_EXTENDED_BY_ERC677 ? ForeignBridgeErc677ToErc677 : ForeignBridge
  const foreignBridgeImplementation = await deployContract(bridgeContract, [], {
    from: DEPLOYMENT_ACCOUNT_ADDRESS,
    network: 'foreign',
    nonce
  })
  nonce++
  console.log(
    '[Foreign] ForeignBridge Implementation: ',
    foreignBridgeImplementation.options.address
  )

  console.log('\nhooking up ForeignBridge storage to ForeignBridge implementation')
  await upgradeProxy({
    proxy: foreignBridgeStorage,
    implementationAddress: foreignBridgeImplementation.options.address,
    version: '1',
    nonce,
    url: FOREIGN_RPC_URL
  })
  nonce++

  console.log('\ninitializing Foreign Bridge with following parameters:\n')
  foreignBridgeImplementation.options.address = foreignBridgeStorage.options.address
  await initializeBridge({
    validatorsBridge: storageValidatorsForeign,
    bridge: foreignBridgeImplementation,
    nonce
  })
  nonce++

  console.log('transferring proxy ownership to multisig for foreign bridge Proxy contract')
  await transferProxyOwnership({
    proxy: foreignBridgeStorage,
    newOwner: FOREIGN_UPGRADEABLE_ADMIN,
    nonce,
    url: FOREIGN_RPC_URL
  })


  if(isBorderActive && BORDER_CONTRACT_OWNER){
    console.log('\nBorder mode is Active deploy Border Contract:\n')
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
