// DID Resolver for GoPlausible integration
// This implements the DID resolution standard for Algorand DIDs
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'

export interface DIDDocument {
  '@context': string[]
  id: string
  controller: string
  publicKey: Array<{
    id: string
    type: string
    controller: string
    publicKeyHex: string
  }>
  service?: Array<{
    id: string
    type: string
    serviceEndpoint: string
  }>
  authentication?: string[]
  assertionMethod?: string[]
}

export interface DIDResolutionResult {
  didDocument: DIDDocument
  didResolutionMetadata: {
    contentType: string
    error?: string
  }
  didDocumentMetadata: {
    created: string
    updated: string
    deactivated?: boolean
  }
}

// Mock DID resolver for demo purposes
// In production, this would call the actual GoPlausible resolver
export class DIDResolver {
  private baseUrl: string

  constructor(baseUrl: string = 'https://resolver.goplausible.xyz') {
    this.baseUrl = baseUrl
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    try {
      // Parse Algorand DID
      const didParts = did.split(':')
      if (didParts[0] !== 'did' || didParts[1] !== 'algo') {
        throw new Error('Invalid Algorand DID format')
      }

      const network = didParts[2]
      const address = didParts[3]

      if (network !== 'testnet' && network !== 'mainnet') {
        throw new Error('Unsupported Algorand network')
      }

      // Create DID document for Algorand address
      return this.createAlgorandDIDDocument(did, address, network)
    } catch (error) {
      console.error('DID resolution error:', error)
      throw new Error(`Failed to resolve DID ${did}: ${error.message}`)
    }
  }

  private createAlgorandDIDDocument(did: string, address: string, network: string): DIDResolutionResult {
    const networkName = network === 'testnet' ? 'testnet' : 'mainnet'

    return {
      didDocument: {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: did,
        controller: did,
        publicKey: [
          {
            id: `${did}#key-1`,
            type: 'Ed25519VerificationKey2018',
            controller: did,
            publicKeyBase58: address, // Algorand address as public key
          },
        ],
        service: [
          {
            id: `${did}#service-1`,
            type: 'AlgorandAccount',
            serviceEndpoint: `https://${networkName}.algoexplorer.io/address/${address}`,
          },
          {
            id: `${did}#service-2`,
            type: 'AlgorandNode',
            serviceEndpoint: `https://${networkName}-api.algonode.cloud`,
          },
        ],
        verificationMethod: [
          {
            id: `${did}#key-1`,
            type: 'Ed25519VerificationKey2018',
            controller: did,
            publicKeyBase58: address,
          },
        ],
        authentication: [`${did}#key-1`],
        assertionMethod: [`${did}#key-1`],
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
      didDocumentMetadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    }
  }

  private normalizeDIDDocument(result: any, did: string): DIDResolutionResult {
    return {
      didDocument: {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: did,
        controller: result.document?.controller || did,
        publicKey: result.document?.publicKey || [
          {
            id: `${did}#key-1`,
            type: 'Ed25519VerificationKey2018',
            controller: did,
            publicKeyHex: result.document?.publicKey?.[0]?.publicKeyHex || this.generateMockPublicKey(did),
          },
        ],
        service: result.document?.service || [],
        authentication: [`${did}#key-1`],
        assertionMethod: [`${did}#key-1`],
      },
      didResolutionMetadata: {
        contentType: 'application/did+json',
      },
      didDocumentMetadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      },
    }
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }
}

export class TrustScoreCalculator {
  calculate(did: string, loanHistory: any[] = []): TrustScore {
    const factors = {
      loanHistory: this.calculateLoanHistoryScore(loanHistory),
      repaymentRate: this.calculateRepaymentRate(loanHistory),
      timeActive: this.calculateTimeActive(did),
      verificationLevel: this.calculateVerificationLevel(did),
    }

    const score = Math.round(
      factors.loanHistory * 0.4 + factors.repaymentRate * 0.3 + factors.timeActive * 0.2 + factors.verificationLevel * 0.1,
    )

    const recommendations = this.generateRecommendations(score, factors)

    return {
      score: Math.max(0, Math.min(100, score)),
      factors,
      recommendations,
    }
  }

  private calculateLoanHistoryScore(loanHistory: any[]): number {
    if (loanHistory.length === 0) return 50 // Neutral for new users

    const completedLoans = loanHistory.filter((loan) => loan.status === 'completed').length
    const totalLoans = loanHistory.length
    const completionRate = totalLoans > 0 ? (completedLoans / totalLoans) * 100 : 50

    return Math.min(100, completionRate)
  }

  private calculateRepaymentRate(loanHistory: any[]): number {
    if (loanHistory.length === 0) return 50

    const onTimeRepayments = loanHistory.filter((loan) => loan.status === 'completed' && !loan.late).length
    const totalRepayments = loanHistory.filter((loan) => loan.status === 'completed').length

    return totalRepayments > 0 ? (onTimeRepayments / totalRepayments) * 100 : 50
  }

  private calculateTimeActive(did: string): number {
    // Mock calculation based on DID
    const hash = this.simpleHash(did)
    const daysActive = (hash.charCodeAt(0) % 365) + 1
    return Math.min(100, (daysActive / 365) * 100)
  }

  private calculateVerificationLevel(did: string): number {
    // Mock verification level based on DID format
    if (did.includes('mainnet')) return 90
    if (did.includes('testnet')) return 70
    return 50
  }

  private generateRecommendations(score: number, factors: any): string[] {
    const recommendations: string[] = []

    if (score < 60) {
      recommendations.push('Complete more successful loan repayments')
      recommendations.push('Maintain consistent payment schedule')
    }

    if (factors.repaymentRate < 80) {
      recommendations.push('Improve repayment timeliness')
    }

    if (factors.verificationLevel < 80) {
      recommendations.push('Complete additional identity verification')
    }

    if (score >= 80) {
      recommendations.push('Excellent credit profile - eligible for larger loans')
    }

    return recommendations
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }
}

// Real Algorand testnet DID creation
export class AlgorandDIDManager {
  private algodConfig: any

  constructor(algodConfig: any) {
    console.log('AlgorandDIDManager constructor - algodConfig:', algodConfig)
    this.algodConfig = algodConfig
  }

  async createDIDForAddress(address: string): Promise<string> {
    try {
      // Create DID for Algorand testnet address
      const did = `did:algo:testnet:${address}`

      // Register DID with GoPlausible (if available)
      await this.registerDIDWithGoPlausible(did, address)

      return did
    } catch (error) {
      console.error('Failed to create DID:', error)
      throw error
    }
  }

  private async registerDIDWithGoPlausible(did: string, address: string): Promise<void> {
    try {
      // Try to register DID with GoPlausible
      const response = await fetch('https://resolver.goplausible.xyz/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          did,
          address,
          network: 'testnet',
        }),
      })

      if (!response.ok) {
        console.warn('GoPlausible registration failed, using local DID')
      }
    } catch (error) {
      console.warn('GoPlausible registration error:', error)
    }
  }

  async getAccountInfo(address: string): Promise<any> {
    try {
      console.log('getAccountInfo - this.algodConfig:', this.algodConfig)
      console.log('getAccountInfo - address:', address)

      // Check if address is valid Algorand address
      if (!algosdk.isValidAddress(address)) {
        console.error('Invalid Algorand address:', address)
        throw new Error(`Invalid Algorand address format: ${address}`)
      }

      // Use algosdk directly instead of AlgorandClient
      const algodClient = new algosdk.Algodv2(this.algodConfig.token, this.algodConfig.server, parseInt(this.algodConfig.port.toString()))

      console.log('AlgodClient created successfully')
      const accountInfo = await algodClient.accountInformation(address).do()
      return accountInfo
    } catch (error) {
      console.error('Failed to get account info:', error)
      throw error
    }
  }
}

// Export singleton instance
export const didResolver = new DIDResolver()
