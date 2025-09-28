// Liquid Auth API utilities
export interface AttestationOptions {
  challenge: string
  rp: {
    name: string
    id: string
  }
  user: {
    id: string
    name: string
    displayName: string
  }
  pubKeyCredParams: Array<{
    type: 'public-key'
    alg: number
  }>
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform'
    userVerification?: 'required' | 'preferred' | 'discouraged'
  }
  timeout: number
  attestation: 'none' | 'indirect' | 'direct'
}

export interface AssertionOptions {
  challenge: string
  allowCredentials?: Array<{
    id: string
    type: 'public-key'
    transports?: string[]
  }>
  timeout: number
  userVerification: 'required' | 'preferred' | 'discouraged'
}

export interface Credential {
  id: string
  rawId: number[]
  response: {
    attestationObject?: number[]
    clientDataJSON: number[]
    authenticatorData?: number[]
    signature?: number[]
    userHandle?: number[] | null
  }
  type: 'public-key'
}

export interface AttestationResult {
  success: boolean
  did?: string
  address?: string
  error?: string
}

export interface AssertionResult {
  success: boolean
  did?: string
  address?: string
  error?: string
}

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
  authentication: string[]
  assertionMethod: string[]
  keyAgreement: string[]
  capabilityInvocation: string[]
  capabilityDelegation: string[]
}

export class LiquidAuthAPI {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Register a new user with Passkey
   */
  async register(username: string): Promise<AttestationOptions> {
    const response = await fetch(`${this.baseUrl}/attestation/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    })

    if (!response.ok) {
      throw new Error(`Registration failed: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Verify attestation credential
   */
  async verifyAttestation(credential: Credential): Promise<AttestationResult> {
    const response = await fetch(`${this.baseUrl}/attestation/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential }),
    })

    if (!response.ok) {
      throw new Error(`Attestation verification failed: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Get assertion options for login
   */
  async getAssertionOptions(username: string): Promise<AssertionOptions> {
    const response = await fetch(`${this.baseUrl}/assertion/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    })

    if (!response.ok) {
      throw new Error(`Failed to get assertion options: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Verify assertion credential
   */
  async verifyAssertion(credential: Credential): Promise<AssertionResult> {
    const response = await fetch(`${this.baseUrl}/assertion/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential }),
    })

    if (!response.ok) {
      throw new Error(`Assertion verification failed: ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Resolve a DID document
   */
  async resolveDID(did: string): Promise<DIDDocument | null> {
    try {
      const response = await fetch(`https://resolver.goplausible.xyz/resolve?did=${did}`)

      if (!response.ok) {
        return null
      }

      const result = await response.json()
      return result.document
    } catch (error) {
      console.error('Failed to resolve DID:', error)
      return null
    }
  }

  /**
   * Create DID from Algorand address
   */
  createDIDFromAddress(address: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
    return `did:algo:${network}:${address}`
  }

  /**
   * Extract address from DID
   */
  extractAddressFromDID(did: string): string | null {
    const match = did.match(/^did:algo:(testnet|mainnet):(.+)$/)
    return match ? match[2] : null
  }
}

// Export a default instance
export const liquidAuthAPI = new LiquidAuthAPI()

// WebAuthn utility functions
export class WebAuthnUtils {
  /**
   * Check if WebAuthn is supported
   */
  static isSupported(): boolean {
    return !!(navigator.credentials && window.PublicKeyCredential)
  }

  /**
   * Convert base64url to Uint8Array
   */
  static base64urlToUint8Array(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Convert Uint8Array to base64url
   */
  static uint8ArrayToBase64url(bytes: Uint8Array): string {
    const binary = String.fromCharCode(...bytes)
    const base64 = btoa(binary)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * Create credential from WebAuthn
   */
  static async createCredential(options: AttestationOptions): Promise<Credential> {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: this.base64urlToUint8Array(options.challenge),
        rp: options.rp,
        user: {
          id: this.base64urlToUint8Array(options.user.id),
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams,
        authenticatorSelection: options.authenticatorSelection,
        timeout: options.timeout,
        attestation: options.attestation,
      },
    })) as PublicKeyCredential

    return this.credentialToJSON(credential)
  }

  /**
   * Get credential from WebAuthn
   */
  static async getCredential(options: AssertionOptions): Promise<Credential> {
    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: this.base64urlToUint8Array(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred) => ({
          id: this.base64urlToUint8Array(cred.id),
          type: cred.type,
          transports: cred.transports as AuthenticatorTransport[],
        })),
        timeout: options.timeout,
        userVerification: options.userVerification,
      },
    })) as PublicKeyCredential

    return this.credentialToJSON(credential)
  }

  /**
   * Convert WebAuthn credential to JSON format
   */
  private static credentialToJSON(credential: PublicKeyCredential): Credential {
    const response = credential.response as AuthenticatorAttestationResponse | AuthenticatorAssertionResponse

    return {
      id: credential.id,
      rawId: Array.from(new Uint8Array(credential.rawId)),
      response: {
        attestationObject: 'attestationObject' in response ? Array.from(new Uint8Array(response.attestationObject)) : undefined,
        clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
        authenticatorData: 'authenticatorData' in response ? Array.from(new Uint8Array(response.authenticatorData)) : undefined,
        signature: 'signature' in response ? Array.from(new Uint8Array(response.signature)) : undefined,
        userHandle: 'userHandle' in response && response.userHandle ? Array.from(new Uint8Array(response.userHandle)) : null,
      },
      type: credential.type as 'public-key',
    }
  }
}
