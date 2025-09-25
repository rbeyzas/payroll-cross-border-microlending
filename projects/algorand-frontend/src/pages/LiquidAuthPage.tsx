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
  const [loginHistory, setLoginHistory] = useState<string[]>([])

  const handleLogin = (userData: User) => {
    setUser(userData)
    const timestamp = new Date().toLocaleString()
    setLoginHistory((prev) => [...prev, `Logged in at ${timestamp} - DID: ${userData.did}`])
  }

  const handleLogout = () => {
    setUser(null)
    const timestamp = new Date().toLocaleString()
    setLoginHistory((prev) => [...prev, `Logged out at ${timestamp}`])
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Liquid Auth Integration Demo</h1>
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
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Login History</h2>
          {loginHistory.length > 0 ? (
            <div className="space-y-2">
              {loginHistory.map((entry, index) => (
                <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                  {entry}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">No login activity yet.</p>
          )}
        </div>

        {/* Features Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
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
        </div>

        {/* Technical Details */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Technical Implementation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Backend Stack</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Liquid Auth Server (Node.js)</li>
                <li>• MongoDB for user storage</li>
                <li>• Redis for session management</li>
                <li>• Docker containerization</li>
                <li>• Socket.IO for real-time communication</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Frontend Stack</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• React with TypeScript</li>
                <li>• Vite for development</li>
                <li>• TailwindCSS for styling</li>
                <li>• WebAuthn API integration</li>
                <li>• Algorand wallet integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiquidAuthPage
