import { AlgoViteClientConfig, AlgoViteKMDConfig } from '../../interfaces/network'

export function getAlgodConfigFromViteEnvironment(): AlgoViteClientConfig {
  // Default testnet configuration
  return {
    server: import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    port: import.meta.env.VITE_ALGOD_PORT || '443',
    token: import.meta.env.VITE_ALGOD_TOKEN || 'testnet-token',
    network: import.meta.env.VITE_ALGOD_NETWORK || 'testnet',
  }
}

export function getIndexerConfigFromViteEnvironment(): AlgoViteClientConfig {
  // Default testnet configuration
  return {
    server: import.meta.env.VITE_INDEXER_SERVER || 'https://testnet-idx.algonode.cloud',
    port: import.meta.env.VITE_INDEXER_PORT || '443',
    token: import.meta.env.VITE_INDEXER_TOKEN || 'testnet-token',
    network: import.meta.env.VITE_ALGOD_NETWORK || 'testnet',
  }
}

export function getKmdConfigFromViteEnvironment(): AlgoViteKMDConfig {
  if (!import.meta.env.VITE_KMD_SERVER) {
    throw new Error('Attempt to get default kmd configuration without specifying VITE_KMD_SERVER in the environment variables')
  }

  return {
    server: import.meta.env.VITE_KMD_SERVER,
    port: import.meta.env.VITE_KMD_PORT,
    token: import.meta.env.VITE_KMD_TOKEN,
    wallet: import.meta.env.VITE_KMD_WALLET,
    password: import.meta.env.VITE_KMD_PASSWORD,
  }
}
