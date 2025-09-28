import { getAlgoClientConfigFromViteEnvironment } from '../getAlgoClientConfigs'

export const deployConfig = {
  // Network configuration
  network: getAlgoClientConfigFromViteEnvironment(),

  // Contract deployment settings
  contract: {
    name: 'FileSharingApp',
    description: 'Secure file sharing with escrow on Algorand',
    version: '1.0.0',

    // Box storage limits
    maxBoxSize: 32768, // 32KB per box
    maxBoxes: 100, // Maximum number of boxes

    // File size limits
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxWebRTCFileSize: 1024 * 1024, // 1MB for WebRTC

    // Fee structure
    minAccessFee: 1000, // 0.001 ALGO minimum
    maxAccessFee: 1000000, // 1 ALGO maximum
    platformFeePercent: 5, // 5% platform fee
  },

  // IPFS configuration
  ipfs: {
    gateway: 'https://ipfs.io/ipfs/',
    apiUrl: 'https://api.pinata.cloud',
    // Note: API keys should be set in environment variables
  },

  // WebRTC configuration
  webrtc: {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
    maxFileSize: 1024 * 1024, // 1MB
  },

  // Supported file types
  supportedFileTypes: [
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],

  // File type categories
  fileCategories: {
    payslip: 'Payslip',
    contract: 'Contract',
    document: 'Document',
    image: 'Image',
    other: 'Other',
  },
}

import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { FileSharingAppFactory } from '../artifacts/file_sharing_app/FileSharingAppClient'

export async function deploy() {
  console.log('=== Deploying FileSharingApp ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  const factory = algorand.client.getTypedAppFactory(FileSharingAppFactory, {
    defaultSender: deployer.addr,
  })

  const { appClient, result } = await factory.deploy({ onUpdate: 'append', onSchemaBreak: 'append' })

  // If app was just created, initialize it
  if (['create', 'replace'].includes(result.operationPerformed)) {
    // Initialize the application with deployer as admin
    await appClient.send.initialize({
      args: [deployer.addr],
    })

    // Fund the app account
    await algorand.send.payment({
      amount: (1).algo(),
      sender: deployer.addr,
      receiver: appClient.appAddress,
    })
  }

  console.log(`✅ FileSharingApp deployed successfully!`)
  console.log(`📋 App ID: ${appClient.appClient.appId}`)
  console.log(`📍 App Address: ${appClient.appAddress}`)
  console.log(`🌐 AlgoExplorer: https://testnet.algoexplorer.io/application/${appClient.appClient.appId}`)

  // Save App ID to file for frontend
  const fs = require('fs')
  fs.writeFileSync('app_id.txt', appClient.appClient.appId.toString())
  console.log('💾 App ID saved to app_id.txt')
}
