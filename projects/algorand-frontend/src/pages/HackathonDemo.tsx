import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { didResolver, trustScoreCalculator, AlgorandDIDManager } from '../utils/didResolver'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface DIDDocument {
  did: string
  address: string
  publicKey?: string
  controller?: string
  trustScore?: number
  loanHistory?: LoanRecord[]
}

interface LoanRecord {
  id: string
  amount: number
  status: 'completed' | 'active' | 'defaulted'
  date: string
  counterparty: string
}

const HackathonDemo: React.FC = () => {
  const { activeAddress } = useWallet()
  const [liquidAuthUser, setLiquidAuthUser] = useState<any>(null)
  const [didDocument, setDidDocument] = useState<DIDDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoMode, setDemoMode] = useState<'borrower' | 'lender' | null>(null)
  const [didManager, setDidManager] = useState<AlgorandDIDManager | null>(null)

  // Initialize DID Manager
  useEffect(() => {
    try {
      const algodConfig = getAlgodConfigFromViteEnvironment()
      console.log('AlgodConfig:', algodConfig)
      const manager = new AlgorandDIDManager(algodConfig)
      setDidManager(manager)
    } catch (error) {
      console.error('Failed to initialize DID manager:', error)
    }
  }, [])

  // Load user from localStorage (for display only)
  useEffect(() => {
    const savedUser = localStorage.getItem('liquidAuthUser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setLiquidAuthUser(userData)
      } catch (error) {
        console.error('Error loading user:', error)
      }
    }
  }, [])

  // Create real DID ONLY for wallet address (skip liquid auth address)
  useEffect(() => {
    if (activeAddress && didManager) {
      console.log('Creating DID for wallet address:', activeAddress)
      createRealDID(activeAddress)
    }
  }, [activeAddress, didManager])

  // Create real DID for Algorand address
  const createRealDID = async (address: string) => {
    if (!didManager) return

    setLoading(true)
    setError('')

    try {
      // Create DID for the address
      const did = await didManager.createDIDForAddress(address)

      // Get real account info from Algorand
      const accountInfo = await didManager.getAccountInfo(address)

      // Get real loan history from blockchain (if available)
      const loanHistory = await getRealLoanHistory(address)

      // Calculate real trust score
      const trustScore = trustScoreCalculator.calculate(did, loanHistory)

      setDidDocument({
        did,
        address,
        publicKey: accountInfo.publicKey || 'unknown',
        controller: did,
        trustScore: trustScore.score,
        loanHistory,
      })

      console.log('Real DID created successfully:', {
        did,
        address,
        accountInfo,
        trustScore: trustScore.score,
        factors: trustScore.factors,
        recommendations: trustScore.recommendations,
      })
    } catch (err) {
      console.error('Failed to create real DID:', err)
      setError(`Failed to create DID: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Get real loan history from backend API
  const getRealLoanHistory = async (address: string): Promise<LoanRecord[]> => {
    try {
      // Only fetch for valid Algorand addresses
      if (!address || address.length < 50) {
        console.warn('Invalid address for loan history:', address)
        return []
      }

      const response = await fetch(`http://localhost:3001/api/borrower/${address}`)
      if (response.ok) {
        const data = await response.json()
        return data.loanHistory || []
      }
      return []
    } catch (error) {
      console.error('Failed to get loan history from backend:', error)
      return []
    }
  }

  // Resolve DID through GoPlausible
  const resolveDID = async (did: string) => {
    setLoading(true)
    setError('')

    try {
      // Use the DID resolver service
      const resolutionResult = await didResolver.resolve(did)
      const didDoc = resolutionResult.didDocument

      // Generate loan history for trust score calculation
      const loanHistory = generateLoanHistory(did)

      // Calculate trust score using the calculator
      const trustScore = trustScoreCalculator.calculate(did, loanHistory)

      setDidDocument({
        did,
        address: did.split(':')[3] || 'unknown',
        publicKey: didDoc.publicKey?.[0]?.publicKeyHex || 'unknown',
        controller: didDoc.controller,
        trustScore: trustScore.score,
        loanHistory,
      })

      console.log('DID Resolution successful:', {
        did,
        document: didDoc,
        trustScore: trustScore.score,
        factors: trustScore.factors,
        recommendations: trustScore.recommendations,
      })
    } catch (err) {
      console.error('DID resolution failed:', err)
      setError('DID resolution failed, using fallback data')

      // Fallback to mock data
      const loanHistory = generateLoanHistory(did)
      const trustScore = trustScoreCalculator.calculate(did, loanHistory)

      setDidDocument({
        did,
        address: did.split(':')[3] || 'unknown',
        publicKey: 'fallback-public-key',
        controller: did,
        trustScore: trustScore.score,
        loanHistory,
      })
    } finally {
      setLoading(false)
    }
  }

  const isAuthenticated = activeAddress || liquidAuthUser

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Hackathon Demo</h2>
          <p className="text-gray-600 mb-6">
            Please login with Liquid Auth or connect your wallet to see the cross-border microlending demo.
          </p>
          <div className="space-y-3">
            <a
              href="/liquid-auth"
              className="block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
            >
              Login with Liquid Auth
            </a>
            <a
              href="/connect-wallet"
              className="block bg-gradient-to-r from-blue-600 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-teal-700 transition-all duration-200"
            >
              Connect Wallet
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🏆 Hackathon Demo: Cross-Border Microlending</h1>
          <p className="text-xl text-gray-600 mb-8">Liquid Auth + GoPlausible DID Integration</p>

          {/* Demo Mode Selector */}
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => setDemoMode('borrower')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                demoMode === 'borrower' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              👤 Borrower View
            </button>
            <button
              onClick={() => setDemoMode('lender')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                demoMode === 'lender' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              🏦 Lender View
            </button>
          </div>
        </div>

        {/* Authentication Status */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🔐 Authentication Status</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {liquidAuthUser && (
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">Liquid Auth User</h3>
                <p className="text-sm text-purple-600">DID: {liquidAuthUser.did}</p>
                <p className="text-sm text-purple-600">Address: {liquidAuthUser.address}</p>
              </div>
            )}
            {activeAddress && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Wallet Connected</h3>
                <p className="text-sm text-blue-600">Address: {activeAddress}</p>
              </div>
            )}
          </div>
        </div>

        {/* DID Document */}
        {didDocument && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📄 DID Document (GoPlausible Resolved)</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Identity Information</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">DID:</span> {didDocument.did}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Address:</span> {didDocument.address}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Controller:</span> {didDocument.controller}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Public Key:</span> {didDocument.publicKey}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Trust Score</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${
                        didDocument.trustScore! >= 80 ? 'bg-green-500' : didDocument.trustScore! >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${didDocument.trustScore}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{didDocument.trustScore}/100</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {didDocument.trustScore! >= 80 ? 'Excellent' : didDocument.trustScore! >= 60 ? 'Good' : 'Needs Improvement'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loan History */}
        {didDocument?.loanHistory && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Loan History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Loan ID</th>
                    <th className="text-left py-2">Amount</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Counterparty</th>
                  </tr>
                </thead>
                <tbody>
                  {didDocument.loanHistory.map((loan, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 text-sm">{loan.id}</td>
                      <td className="py-2 text-sm">${loan.amount}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            loan.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : loan.status === 'active'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-2 text-sm">{loan.date}</td>
                      <td className="py-2 text-sm">{loan.counterparty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Demo Scenario */}
        {demoMode && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 {demoMode === 'borrower' ? 'Borrower' : 'Lender'} Scenario</h2>
            <div className="prose max-w-none">
              {demoMode === 'borrower' ? (
                <div>
                  <p className="text-gray-700 mb-4">
                    <strong>Borrower Use Case:</strong> You are a small business owner in Nigeria who needs a microloan to expand your
                    business. Your DID identity is verified through Liquid Auth (Passkey) and your trust score is calculated based on your
                    loan history.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>✅ Identity verified via Liquid Auth (WebAuthn)</li>
                    <li>✅ DID resolved through GoPlausible</li>
                    <li>✅ Trust score: {didDocument?.trustScore}/100</li>
                    <li>✅ Loan history: {didDocument?.loanHistory?.length || 0} previous loans</li>
                    <li>✅ Cross-border lending enabled</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 mb-4">
                    <strong>Lender Use Case:</strong> You are an investor who wants to provide microloans to verified borrowers. You can see
                    borrower trust scores and loan history through their DID documents resolved via GoPlausible.
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>✅ Borrower identity verified via Liquid Auth</li>
                    <li>✅ DID document accessible through GoPlausible</li>
                    <li>✅ Trust score analysis: {didDocument?.trustScore}/100</li>
                    <li>✅ Loan history verification: {didDocument?.loanHistory?.length || 0} loans</li>
                    <li>✅ Risk assessment completed</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-gray-600">Resolving DID through GoPlausible...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default HackathonDemo
