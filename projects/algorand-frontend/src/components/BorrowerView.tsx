import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { MicroloanAppClient } from '../contracts/MicroloanApp'
import { apiClient, BorrowerProfile } from '../utils/api'

interface LoanForm {
  principal: string
  termDays: string
}

export default function BorrowerView() {
  const { activeAddress, transactionSigner } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [liquidAuthUser, setLiquidAuthUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [borrowerProfile, setBorrowerProfile] = useState<BorrowerProfile | null>(null)
  const [contractInfo, setContractInfo] = useState<any>(null)

  // Loan form state
  const [loanForm, setLoanForm] = useState<LoanForm>({
    principal: '',
    termDays: '',
  })

  // Contract configuration
  const APP_ID = BigInt(746230222)
  const CONTRACT_ADDRESS = 'JYSDGLSFX6IJEMV3QQK47H32AI7QL7FHOLNV6YXCXOQVDUPLVP6YLSF2FQ'

  // Check authentication status
  useEffect(() => {
    // Check if user is authenticated via Liquid Auth
    const savedUser = localStorage.getItem('liquidAuthUser')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setLiquidAuthUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Error loading Liquid Auth user:', error)
      }
    }

    // Check if user is authenticated via wallet
    if (activeAddress) {
      setIsAuthenticated(true)
    }
  }, [activeAddress])

  // Load contract info and borrower profile
  useEffect(() => {
    if (activeAddress) {
      loadContractInfo()
      loadBorrowerProfile()
    }
  }, [activeAddress])

  const loadContractInfo = async () => {
    try {
      const info = await apiClient.getContractInfo()
      setContractInfo(info)
    } catch (error) {
      console.error('Failed to load contract info:', error)
    }
  }

  const loadBorrowerProfile = async () => {
    if (!activeAddress) return

    try {
      const profile = await apiClient.getBorrowerProfile(activeAddress)
      setBorrowerProfile(profile)
    } catch (error) {
      console.error('Failed to load borrower profile:', error)
    }
  }

  const handleCreateLoan = async () => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet first')
      return
    }

    if (!loanForm.principal || !loanForm.termDays) {
      setError('Please fill in all fields')
      return
    }

    if (!isAuthenticated) {
      setError('Please authenticate with Liquid Auth first')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Creating loan with:', loanForm)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      const microloanClient = new MicroloanAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: APP_ID,
      })

      // Call smart contract request_loan method
      const result = await microloanClient.send.requestLoan({
        args: [loanForm.principal, loanForm.termDays],
        sender: activeAddress!,
      })

      console.log('Loan creation result:', result)

      const txId = result.txIds[0]
      setSuccess(`Loan request submitted! TX: ${txId}`)

      // Create loan via API
      await apiClient.createLoan(parseInt(loanForm.principal), parseInt(loanForm.termDays), activeAddress)

      // Reset form
      setLoanForm({ principal: '', termDays: '' })

      // Reload borrower profile
      await loadBorrowerProfile()
    } catch (err: any) {
      setError(`Failed to create loan: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrustScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet and authenticate with Liquid Auth to access the borrower portal.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You need to be authenticated to create loan requests and access your profile.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-lg">
          <h1 className="text-3xl font-bold">Borrower Portal</h1>
          <p className="mt-2">Create loan requests and manage your borrowing</p>

          {contractInfo && (
            <div className="mt-4 bg-white/20 rounded-lg p-3">
              <p className="text-sm">
                <strong>Contract:</strong> {contractInfo.address.slice(0, 10)}...{contractInfo.address.slice(-10)}
              </p>
              <p className="text-sm">
                <strong>Network:</strong> {contractInfo.network}
              </p>
              <p className="text-sm">
                <strong>Explorer:</strong>{' '}
                <a href={contractInfo.explorerUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">
                  View Contract
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Borrower Profile */}
        {borrowerProfile && (
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">DID Identity</h3>
                <p className="text-sm text-gray-600 mt-1 break-all">{borrowerProfile.did}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">Trust Score</h3>
                <p className={`text-2xl font-bold ${getTrustScoreColor(borrowerProfile.trustScore)}`}>{borrowerProfile.trustScore}</p>
                <p className="text-sm text-gray-600">{getTrustScoreLabel(borrowerProfile.trustScore)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700">Loan History</h3>
                <p className="text-sm text-gray-600">
                  {borrowerProfile.totalLoans} total loans
                  <br />
                  {borrowerProfile.repaidLoans} repaid
                  <br />
                  {borrowerProfile.defaultedLoans} defaulted
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Display */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 m-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loan Creation Form */}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Create Loan Request</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount (microALGO)</label>
              <input
                type="number"
                value={loanForm.principal}
                onChange={(e) => setLoanForm((prev) => ({ ...prev, principal: e.target.value }))}
                placeholder="1000000 (1 ALGO)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Term (Days)</label>
              <input
                type="number"
                value={loanForm.termDays}
                onChange={(e) => setLoanForm((prev) => ({ ...prev, termDays: e.target.value }))}
                placeholder="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your loan request will be submitted to the Algorand blockchain. Once approved by an admin, you can
                drawdown the funds.
              </p>
            </div>
            <button
              onClick={handleCreateLoan}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Creating Loan...' : 'Create Loan Request'}
            </button>
          </div>
        </div>

        {/* Loan History */}
        {borrowerProfile && borrowerProfile.loanHistory.length > 0 && (
          <div className="border-t p-6">
            <h3 className="text-lg font-semibold mb-4">Your Loan History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repaid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {borrowerProfile.loanHistory.map((loan) => (
                    <tr key={loan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{loan.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.principal / 1000000} ALGO</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            loan.status === 'repaid'
                              ? 'bg-green-100 text-green-800'
                              : loan.status === 'defaulted'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.repaidTotal / 1000000} ALGO</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.remaining / 1000000} ALGO</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
