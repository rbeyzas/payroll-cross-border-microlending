import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { MicroloanAppFactory } from '../artifacts/microloan_app/MicroloanAppClient'

export const deployConfig: DeployContractParams = {
  name: 'MicroloanApp',
  version: '1.0.0',
  description: 'Cross-border microlending platform with AI-powered risk assessment',
  author: 'PayrollLend Team',
  license: 'MIT',

  // Deployment configuration
  deployer: {
    name: 'PayrollLend Deployer',
    email: 'deploy@payrolllend.com',
  },

  // Network configuration
  networks: {
    testnet: {
      algod: {
        server: 'https://testnet-api.algonode.cloud',
        port: 443,
        token: '',
      },
      indexer: {
        server: 'https://testnet-idx.algonode.cloud',
        port: 443,
        token: '',
      },
    },
    mainnet: {
      algod: {
        server: 'https://mainnet-api.algonode.cloud',
        port: 443,
        token: '',
      },
      indexer: {
        server: 'https://mainnet-idx.algonode.cloud',
        port: 443,
        token: '',
      },
    },
  },

  // Contract parameters
  params: {
    admin: '', // Will be set during deployment
  },

  // Global state schema
  globalStateSchema: {
    numUint: 3, // admin, total_loans, loan_id_counter
    numByteSlice: 1, // admin address
  },

  // Local state schema
  localStateSchema: {
    numUint: 0,
    numByteSlice: 0,
  },

  // Box storage schema (for loan data)
  boxStorageSchema: {
    numUint: 8, // loan data fields (principal, term, status, installment, remaining, etc.)
    numByteSlice: 0,
  },
}

// Deploy function
export async function deploy() {
  console.log('=== Deploying MicroloanApp ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(MicroloanAppFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({ onUpdate: 'append', onSchemaBreak: 'append' })

  // If app was just created fund the app account
  if (['create', 'replace'].includes(result.operationPerformed)) {
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  console.log(`✅ MicroloanApp deployed successfully!`)
  console.log(`📋 App ID: ${appClient.appClient.appId}`)
  console.log(`📍 App Address: ${appClient.appAddress}`)
  console.log(`🌐 AlgoExplorer: https://testnet.algoexplorer.io/application/${appClient.appClient.appId}`)

  // Save App ID to file for frontend
  const fs = require('fs')
  fs.writeFileSync('app_id.txt', appClient.appClient.appId.toString())
  console.log(`💾 App ID saved to app_id.txt`)
}
