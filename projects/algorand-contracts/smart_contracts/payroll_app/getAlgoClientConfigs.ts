import { AlgoClientConfig } from '@algorandfoundation/algokit-utils/types/network-client'

export interface AlgoViteClientConfig extends AlgoClientConfig {
  server: string
  port: string | number
  token: string
  network: string
}

export function getAlgoClientConfigFromViteEnvironment(): AlgoViteClientConfig {
  return {
    server: process.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
    port: process.env.VITE_ALGOD_PORT || '443',
    token: process.env.VITE_ALGOD_TOKEN || '',
    network: process.env.VITE_ALGOD_NETWORK || 'testnet',
  }
}
