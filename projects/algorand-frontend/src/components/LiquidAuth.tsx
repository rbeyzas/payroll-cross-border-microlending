import React, { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

interface User {
  did: string
  address: string
  publicKey?: string
  controller?: string
}

interface LiquidAuthProps {
  onLogin?: (user: User) => void
  onLogout?: () => void
}

const LiquidAuth: React.FC<LiquidAuthProps> = ({ onLogin, onLogout }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3000')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to Liquid Auth server')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from Liquid Auth server')
    })

    newSocket.on('attestation_success', (data: any) => {
      console.log('Attestation successful:', data)
      setLoading(false)
    })

    newSocket.on('attestation_error', (error: any) => {
      console.error('Attestation error:', error)
      setError(error.message || 'Attestation failed')
      setLoading(false)
    })

    newSocket.on('assertion_success', (data: any) => {
      console.log('Assertion successful:', data)
      setLoading(false)
    })

    newSocket.on('assertion_error', (error: any) => {
      console.error('Assertion error:', error)
      setError(error.message || 'Assertion failed')
      setLoading(false)
    })

    return () => {
      newSocket.close()
    }
  }, [])

  // Check if WebAuthn is supported
  const isWebAuthnSupported = () => {
    return !!(navigator.credentials && window.PublicKeyCredential)
  }

  // Register with Passkey (WebAuthn)
  const registerWithPasskey = async () => {
    if (!isWebAuthnSupported()) {
      setError('WebAuthn is not supported in this browser')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get registration options from Liquid Auth
      const response = await fetch('/attestation/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'user@example.com', // You can make this dynamic
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get registration options')
      }

      const options = await response.json()

      // Create credential using WebAuthn
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(options.challenge),
          rp: {
            name: options.rp.name,
            id: options.rp.id,
          },
          user: {
            id: new Uint8Array(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName,
          },
          pubKeyCredParams: options.pubKeyCredParams,
          authenticatorSelection: options.authenticatorSelection,
          timeout: options.timeout,
          attestation: options.attestation,
        },
      })) as PublicKeyCredential

      // Send credential to server for verification
      const verifyResponse = await fetch('/attestation/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: Array.from(new Uint8Array(credential.rawId)),
            response: {
              attestationObject: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject)),
              clientDataJSON: Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).clientDataJSON)),
            },
            type: credential.type,
          },
        }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify credential')
      }

      const result = await verifyResponse.json()
      console.log('Registration successful:', result)

      // You might want to store the user info or trigger a callback
      if (onLogin) {
        onLogin({
          did: result.did || 'did:algo:testnet:user',
          address: result.address || 'user-address',
        })
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // Login with Passkey (WebAuthn)
  const loginWithPasskey = async () => {
    if (!isWebAuthnSupported()) {
      setError('WebAuthn is not supported in this browser')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get assertion options from Liquid Auth
      const response = await fetch('/assertion/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'user@example.com', // You can make this dynamic
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get assertion options')
      }

      const options = await response.json()

      // Get credential using WebAuthn
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(options.challenge),
          allowCredentials: options.allowCredentials?.map((cred: any) => ({
            id: new Uint8Array(cred.id),
            type: cred.type,
            transports: cred.transports,
          })),
          timeout: options.timeout,
          userVerification: options.userVerification,
        },
      })) as PublicKeyCredential

      // Send credential to server for verification
      const verifyResponse = await fetch('/assertion/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: Array.from(new Uint8Array(credential.rawId)),
            response: {
              authenticatorData: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).authenticatorData)),
              clientDataJSON: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).clientDataJSON)),
              signature: Array.from(new Uint8Array((credential.response as AuthenticatorAssertionResponse).signature)),
              userHandle:
                'userHandle' in credential.response && credential.response.userHandle
                  ? Array.from(new Uint8Array(credential.response.userHandle as ArrayBuffer))
                  : null,
            },
            type: credential.type,
          },
        }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify credential')
      }

      const result = await verifyResponse.json()
      console.log('Login successful:', result)

      // You might want to store the user info or trigger a callback
      if (onLogin) {
        onLogin({
          did: result.did || 'did:algo:testnet:user',
          address: result.address || 'user-address',
        })
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Login with Algorand Wallet
  const loginWithWallet = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check if Pera Wallet is available
      if (typeof window !== 'undefined' && (window as any).algorand) {
        const accounts = await (window as any).algorand.enable()
        const address = accounts[0]

        // Resolve DID for the address
        const did = `did:algo:testnet:${address}`
        const didResponse = await fetch(`https://resolver.goplausible.xyz/resolve?did=${did}`)

        if (didResponse.ok) {
          const didDoc = await didResponse.json()

          const userData: User = {
            did,
            address,
            publicKey: didDoc.document?.publicKey?.[0]?.publicKeyHex,
            controller: didDoc.document?.controller,
          }

          setUser(userData)
          if (onLogin) {
            onLogin(userData)
          }
        } else {
          // If DID doesn't exist, create a basic user object
          const userData: User = {
            did,
            address,
          }

          setUser(userData)
          if (onLogin) {
            onLogin(userData)
          }
        }
      } else {
        throw new Error('Algorand wallet not found. Please install Pera Wallet or another Algorand wallet.')
      }
    } catch (err) {
      console.error('Wallet login error:', err)
      setError(err instanceof Error ? err.message : 'Wallet login failed')
    } finally {
      setLoading(false)
    }
  }

  // Logout
  const logout = () => {
    setUser(null)
    if (onLogout) {
      onLogout()
    }
  }

  // Resolve DID Document
  const resolveDID = async (did: string) => {
    try {
      const response = await fetch(`https://resolver.goplausible.xyz/resolve?did=${did}`)
      if (response.ok) {
        const didDoc = await response.json()
        return didDoc
      }
    } catch (err) {
      console.error('Failed to resolve DID:', err)
    }
    return null
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Liquid Auth Login</h2>
        <p className="text-gray-600">Choose your preferred login method</p>
      </div>

      {/* Connection Status */}
      <div className="mb-4">
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {isConnected ? 'Connected to Liquid Auth' : 'Disconnected from Liquid Auth'}
        </div>
      </div>

      {/* Error Display */}
      {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      {/* User Info */}
      {user && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-semibold text-green-800 mb-2">Logged in as:</h3>
          <div className="text-sm text-green-700">
            <p>
              <strong>DID:</strong> {user.did}
            </p>
            <p>
              <strong>Address:</strong> {user.address}
            </p>
            {user.publicKey && (
              <p>
                <strong>Public Key:</strong> {user.publicKey}
              </p>
            )}
            {user.controller && (
              <p>
                <strong>Controller:</strong> {user.controller}
              </p>
            )}
          </div>
          <button onClick={logout} className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
            Logout
          </button>
        </div>
      )}

      {/* Login Buttons */}
      {!user && (
        <div className="space-y-3">
          <button
            onClick={loginWithWallet}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Login with Algorand Wallet'}
          </button>

          <button
            onClick={registerWithPasskey}
            disabled={loading || !isWebAuthnSupported()}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registering...' : 'Register with Passkey'}
          </button>

          <button
            onClick={loginWithPasskey}
            disabled={loading || !isWebAuthnSupported()}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login with Passkey'}
          </button>

          {!isWebAuthnSupported() && <p className="text-sm text-gray-500 text-center">WebAuthn is not supported in this browser</p>}
        </div>
      )}
    </div>
  )
}

export default LiquidAuth
