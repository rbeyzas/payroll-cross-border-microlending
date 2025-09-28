import React, { useState } from 'react'
import LiquidAuth from '../components/LiquidAuth'

interface User {
  did: string
  address: string
  publicKey?: string
  controller?: string
}

const LiquidAuthPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch login history from backend
  const fetchLoginHistory = async (did: string) => {
    if (!did) return

    setLoadingHistory(true)
    try {
      const response = await fetch(`http://localhost:3001/api/login-history/${encodeURIComponent(did)}`)
      if (response.ok) {
        const data = await response.json()
        setLoginHistory(data.loginHistory || [])
      } else {
        console.error('Failed to fetch login history')
        setLoginHistory([])
      }
    } catch (error) {
      console.error('Error fetching login history:', error)
      setLoginHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleLogin = (userData: User) => {
    setUser(userData)
    // Fetch login history from backend
    fetchLoginHistory(userData.did)
  }

  const handleLogout = async () => {
    setUser(null)
    setLoginHistory([])

    // Store logout event in backend
    try {
      await fetch('http://localhost:3001/api/login-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: user?.did || 'unknown',
          event: 'Liquid Auth logout successful',
          timestamp: new Date().toISOString(),
          ipAddress: 'unknown',
          userAgent: navigator.userAgent,
        }),
      })
    } catch (error) {
      console.error('Failed to store logout history:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Liquid Auth Integration</h1>
          <p className="text-lg text-gray-600">Experience secure authentication with Algorand wallets and Passkeys</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Liquid Auth Component */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Authentication</h2>
            <LiquidAuth onLogin={handleLogin} onLogout={handleLogout} />
          </div>

          {/* User Information */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">User Information</h2>

            {user ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Authenticated</h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>
                      <strong>DID:</strong> <code className="bg-green-100 px-1 rounded">{user.did}</code>
                    </p>
                    <p>
                      <strong>Address:</strong> <code className="bg-green-100 px-1 rounded">{user.address}</code>
                    </p>
                    {user.publicKey && (
                      <p>
                        <strong>Public Key:</strong> <code className="bg-green-100 px-1 rounded text-xs">{user.publicKey}</code>
                      </p>
                    )}
                    {user.controller && (
                      <p>
                        <strong>Controller:</strong> <code className="bg-green-100 px-1 rounded">{user.controller}</code>
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">DID Document</h4>
                  <p className="text-sm text-blue-700">
                    Your DID is now resolvable and can be used for decentralized identity across the Algorand ecosystem.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-600 text-center">Please authenticate using one of the methods on the left.</p>
              </div>
            )}
          </div>
        </div>

        {/* Login History */}
        {/* <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Login History</h2>
          {loadingHistory ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Loading login history...</span>
              </div>
            </div>
          ) : loginHistory.length > 0 ? (
            <div className="space-y-3">
              {loginHistory.map((entry, index) => (
                <div key={entry.id || index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{entry.event}</p>
                      <p className="text-sm text-gray-600 mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
                      {entry.ipAddress && <p className="text-xs text-gray-500 mt-1">IP: {entry.ipAddress}</p>}
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          entry.event.includes('successful')
                            ? 'bg-green-100 text-green-800'
                            : entry.event.includes('failed')
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {entry.event.includes('successful') ? '✅' : entry.event.includes('failed') ? '❌' : '📝'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No login activity yet.</p>
          )}
        </div> */}

        {/* Features Overview */}
        {/* <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🔐 Passkey Authentication</h3>
              <p className="text-sm text-gray-600">Secure biometric authentication using WebAuthn standards</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">👛 Wallet Integration</h3>
              <p className="text-sm text-gray-600">Connect with Algorand wallets like Pera Wallet</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🆔 DID Resolution</h3>
              <p className="text-sm text-gray-600">Resolve and display decentralized identity documents</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">⚡ Real-time Updates</h3>
              <p className="text-sm text-gray-600">Live connection status and authentication events</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🔒 Secure Storage</h3>
              <p className="text-sm text-gray-600">MongoDB and Redis for secure credential storage</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">🌐 Cross-platform</h3>
              <p className="text-sm text-gray-600">Works across desktop and mobile browsers</p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  )
}

export default LiquidAuthPage
