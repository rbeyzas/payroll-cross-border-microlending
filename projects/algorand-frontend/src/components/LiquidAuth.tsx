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

  // Initialize socket connection and load user from localStorage
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

    // Load user from localStorage on component mount
    const savedUser = localStorage.getItem('liquidAuthUser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        console.log('Loaded user from localStorage:', userData)
      } catch (error) {
        console.error('Error loading user from localStorage:', error)
        localStorage.removeItem('liquidAuthUser')
      }
    }

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
      // Since Liquid Auth API is not working properly, use direct WebAuthn
      await registerWithDirectWebAuthn()
      return
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  // Fallback direct WebAuthn registration
  const registerWithDirectWebAuthn = async () => {
    try {
      const options = {
        challenge: new Uint8Array(32).fill(1),
        rp: {
          name: 'My Algorand dApp',
          id: 'localhost',
        },
        user: {
          id: new Uint8Array(16).fill(2),
          name: 'user@example.com',
          displayName: 'Demo User',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
        },
        timeout: 60000,
        attestation: 'none' as AttestationConveyancePreference,
      }

      const credential = (await navigator.credentials.create({
        publicKey: options,
      })) as PublicKeyCredential

      console.log('Direct WebAuthn registration successful:', credential.id)

      // Create user data from WebAuthn credential
      const credentialId = credential.id
      const publicKey = Array.from(new Uint8Array(credential.rawId)).map(b => b.toString(16).padStart(2, '0')).join('')
      const did = `did:algo:testnet:${publicKey.slice(0, 32)}`
      
      const userData: User = {
        did,
        address: publicKey.slice(0, 32),
        publicKey: publicKey,
        controller: did,
      }

      setUser(userData)

      // Save user data to localStorage for persistence
      localStorage.setItem('liquidAuthUser', JSON.stringify(userData))

      if (onLogin) {
        onLogin(userData)
      }
    } catch (err) {
      console.error('Direct WebAuthn registration error:', err)
      setError(err instanceof Error ? err.message : 'Direct WebAuthn registration failed')
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
      // First check if user is already logged in from localStorage
      const savedUser = localStorage.getItem('liquidAuthUser')
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          if (onLogin) {
            onLogin(userData)
          }
          setLoading(false)
          return
        } catch (error) {
          console.error('Error loading saved user:', error)
          localStorage.removeItem('liquidAuthUser')
        }
      }

      // Since Liquid Auth API is not working properly, use direct WebAuthn
      await loginWithDirectWebAuthn()
      return
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Fallback direct WebAuthn login
  const loginWithDirectWebAuthn = async () => {
    try {
      const options = {
        challenge: new Uint8Array(32).fill(3),
        allowCredentials: [],
        timeout: 60000,
        userVerification: 'preferred' as UserVerificationRequirement,
      }

      const credential = (await navigator.credentials.get({
        publicKey: options,
      })) as PublicKeyCredential

      console.log('Direct WebAuthn login successful:', credential.id)

      // Create user data from WebAuthn credential
      const credentialId = credential.id
      const publicKey = Array.from(new Uint8Array(credential.rawId)).map(b => b.toString(16).padStart(2, '0')).join('')
      const did = `did:algo:testnet:${publicKey.slice(0, 32)}`
      
      const userData: User = {
        did,
        address: publicKey.slice(0, 32),
        publicKey: publicKey,
        controller: did,
      }

      setUser(userData)

      // Save user data to localStorage for persistence
      localStorage.setItem('liquidAuthUser', JSON.stringify(userData))

      if (onLogin) {
        onLogin(userData)
      }
    } catch (err) {
      console.error('Direct WebAuthn login error:', err)
      setError(err instanceof Error ? err.message : 'Direct WebAuthn login failed')
    }
  }

  // Login with Algorand Wallet
  const loginWithWallet = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check for various Algorand wallet providers
      let walletProvider = null
      let walletName = ''

      if (typeof window !== 'undefined') {
        // Check for Pera Wallet (most common)
        if ((window as any).algorand) {
          walletProvider = (window as any).algorand
          walletName = 'Pera Wallet'
        }
        // Check for Pera Wallet alternative
        else if ((window as any).pera) {
          walletProvider = (window as any).pera
          walletName = 'Pera Wallet'
        }
        // Check for Defly Wallet
        else if ((window as any).defly) {
          walletProvider = (window as any).defly
          walletName = 'Defly Wallet'
        }
        // Check for other common wallets
        else if ((window as any).myAlgoWallet) {
          walletProvider = (window as any).myAlgoWallet
          walletName = 'MyAlgo Wallet'
        }
        // Check for WalletConnect
        else if ((window as any).WalletConnect) {
          walletProvider = (window as any).WalletConnect
          walletName = 'WalletConnect'
        }
      }

      if (!walletProvider) {
        // Provide more helpful error message
        throw new Error(
          'Algorand wallet not found. Please install one of the following wallets:\n' +
            '• Pera Wallet (https://perawallet.app/)\n' +
            '• Defly Wallet (https://defly.app/)\n' +
            '• MyAlgo Wallet (https://wallet.myalgo.com/)\n\n' +
            'Make sure the wallet extension is installed and enabled.',
        )
      }

      console.log(`Connecting to ${walletName}...`)

      const accounts = await walletProvider.enable()
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.')
      }

      const address = accounts[0]

      // Resolve DID for the address
      const did = `did:algo:testnet:${address}`

      try {
        const didResponse = await fetch(`https://resolver.goplausible.xyz/resolve?did=${did}`)

        if (didResponse.ok) {
          const didDoc = await didResponse.json()

          const userData: User = {
            did,
            address,
            publicKey: didDoc.document?.publicKey?.[0]?.publicKeyHex || address,
            controller: didDoc.document?.controller || did,
          }

          setUser(userData)
          if (onLogin) {
            onLogin(userData)
          }
        } else {
          // If DID doesn't exist, create a basic user object with real data
          const userData: User = {
            did,
            address,
            publicKey: address,
            controller: did,
          }

          setUser(userData)
          if (onLogin) {
            onLogin(userData)
          }
        }
      } catch (didError) {
        // If DID resolution fails, still create user with basic info
        const userData: User = {
          did,
          address,
          publicKey: address,
          controller: did,
        }

        setUser(userData)
        if (onLogin) {
          onLogin(userData)
        }
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

    // Clear user data from localStorage
    localStorage.removeItem('liquidAuthUser')

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
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Liquid Auth Integration:</strong> This component uses direct WebAuthn implementation 
            for demonstration purposes. In production, it would integrate with Liquid Auth API.
          </p>
        </div>
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
