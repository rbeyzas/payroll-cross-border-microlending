import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { MicroloanAppClient } from '../contracts/MicroloanApp'
import { apiClient, Loan, BorrowerProfile } from '../utils/api'

export default function LenderView() {
  const { activeAddress, transactionSigner } = useWallet()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loans, setLoans] = useState<Loan[]>([])
  const [contractInfo, setContractInfo] = useState<any>(null)
  const [borrowerProfiles, setBorrowerProfiles] = useState<Map<string, BorrowerProfile>>(new Map())

  // Contract configuration
  const APP_ID = BigInt(746230222)
  const CONTRACT_ADDRESS = 'JYSDGLSFX6IJEMV3QQK47H32AI7QL7FHOLNV6YXCXOQVDUPLVP6YLSF2FQ'

  // Check authentication status
  useEffect(() => {
    if (activeAddress) {
      setIsAuthenticated(true)
      loadLoans()
      loadContractInfo()
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

  const loadLoans = async () => {
    try {
      const loansData = await apiClient.getLoans()
      setLoans(loansData)

      // Load borrower profiles for each loan
      const profiles = new Map<string, BorrowerProfile>()
      for (const loan of loansData) {
        try {
          const profile = await apiClient.getBorrowerProfile(loan.borrower)
          profiles.set(loan.borrower, profile)
        } catch (error) {
          console.error(`Failed to load profile for ${loan.borrower}:`, error)
        }
      }
      setBorrowerProfiles(profiles)
    } catch (error) {
      console.error('Failed to load loans:', error)
    }
  }

  const handleFundLoan = async (loanId: string) => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Funding loan:', loanId)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      const microloanClient = new MicroloanAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: APP_ID,
      })

      // Call smart contract fund_loan method
      const result = await microloanClient.send.fundApp({
        args: [loanId],
        sender: activeAddress!,
      })

      console.log('Loan funding result:', result)

      const txId = result.txIds[0]
      setSuccess(`Loan funded successfully! TX: ${txId}`)

      // Update loan via API
      await apiClient.fundLoan(loanId, activeAddress)

      // Reload loans
      await loadLoans()
    } catch (err: any) {
      setError(`Failed to fund loan: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-blue-100 text-blue-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'repaid':
        return 'bg-gray-100 text-gray-800'
      case 'defaulted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
          <div className="text-6xl mb-4">💰</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Lender Portal</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to access the lender portal and fund loans.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You need to connect your wallet to fund loans and view borrower profiles.
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
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
          <h1 className="text-3xl font-bold">Lender Portal</h1>
          <p className="mt-2">Fund loans and manage your lending portfolio</p>

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

        {/* Loans Table */}
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">Available Loans</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrower</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trust Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loans.map((loan) => {
                  const borrowerProfile = borrowerProfiles.get(loan.borrower)
                  return (
                    <tr key={loan.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{loan.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.principal / 1000000} ALGO</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.termDays} days</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <p className="font-mono text-xs">
                            {loan.borrower.slice(0, 10)}...{loan.borrower.slice(-10)}
                          </p>
                          {borrowerProfile && (
                            <p className="text-xs text-blue-600 mt-1">DID: {borrowerProfile.did.split(':').pop()?.slice(0, 10)}...</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {borrowerProfile ? (
                          <div>
                            <p className={`font-bold ${getTrustScoreColor(borrowerProfile.trustScore)}`}>{borrowerProfile.trustScore}</p>
                            <p className="text-xs text-gray-500">{getTrustScoreLabel(borrowerProfile.trustScore)}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">Loading...</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {loan.status === 'requested' && (
                          <button
                            onClick={() => handleFundLoan(loan.id)}
                            disabled={loading}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            {loading ? 'Funding...' : 'Fund Loan'}
                          </button>
                        )}
                        {loan.status === 'active' && <span className="text-green-600 font-medium">Active</span>}
                        {loan.status === 'repaid' && <span className="text-gray-600 font-medium">Repaid</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Borrower Profiles Section */}
        {borrowerProfiles.size > 0 && (
          <div className="border-t p-6">
            <h3 className="text-lg font-semibold mb-4">Borrower Profiles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(borrowerProfiles.entries()).map(([address, profile]) => (
                <div key={address} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">{profile.did.split(':').pop()?.slice(0, 20)}...</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Trust Score:</span>
                      <span className={`font-bold ${getTrustScoreColor(profile.trustScore)}`}>{profile.trustScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Loans:</span>
                      <span className="text-sm font-medium">{profile.totalLoans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Repaid:</span>
                      <span className="text-sm font-medium text-green-600">{profile.repaidLoans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Defaulted:</span>
                      <span className="text-sm font-medium text-red-600">{profile.defaultedLoans}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
