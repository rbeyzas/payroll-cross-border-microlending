import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { PayrollAppFactory } from '../artifacts/payroll_app/PayrollAppClient'

export const deployConfig: DeployContractParams = {
  name: 'PayrollApp',
  version: '1.0.0',
  description: 'Blockchain-powered payroll system with employee management and automated disbursements',
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
    asa_id: 0, // 0 for ALGO, or specific ASA ID
    cycle_secs: 2592000, // 30 days in seconds
    admin: '', // Will be set during deployment
  },

  // Global state schema
  globalStateSchema: {
    numUint: 5, // asa_id, cycle_secs, total_employees, last_disbursement, admin
    numByteSlice: 1, // admin address
  },

  // Local state schema (for employees)
  localStateSchema: {
    numUint: 0,
    numByteSlice: 0,
  },

  // Box storage schema
  boxStorageSchema: {
    numUint: 2, // amount, paused status
    numByteSlice: 0,
  },
}

// Deploy function
export async function deploy() {
  console.log('=== Deploying PayrollApp ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(PayrollAppFactory, {
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

  console.log(`✅ PayrollApp deployed successfully!`)
  console.log(`📋 App ID: ${appClient.appClient.appId}`)
  console.log(`📍 App Address: ${appClient.appAddress}`)
  console.log(`🌐 AlgoExplorer: https://testnet.algoexplorer.io/application/${appClient.appClient.appId}`)

  // Save App ID to file for frontend
  const fs = require('fs')
  fs.writeFileSync('app_id.txt', appClient.appClient.appId.toString())
  console.log(`💾 App ID saved to app_id.txt`)
}
