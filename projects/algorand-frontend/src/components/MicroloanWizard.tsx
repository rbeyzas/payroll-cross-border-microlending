import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { MicroloanAppClient } from '../contracts/MicroloanApp'

interface Loan {
  id: string
  principal: number
  termDays: number
  status: 'requested' | 'approved' | 'active' | 'repaid' | 'defaulted'
  borrower: string
  installment: number
  remaining: number
  repaidTotal: number
  txIds: {
    request?: string
    approve?: string
    drawdown?: string
    repay?: string[]
  }
}

export default function MicroloanWizard() {
  const { activeAddress, transactionSigner } = useWallet()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [liquidAuthUser, setLiquidAuthUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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

  // Step 1: Loan Request
  const [loanRequest, setLoanRequest] = useState({
    principal: '',
    termDays: '',
    receiverAddress: '', // Borrower can specify different receiver
  })

  // Step 2: Admin Approval
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)
  const [installmentAmount, setInstallmentAmount] = useState('')

  // Step 3: Drawdown
  const [selectedLoanForDrawdown, setSelectedLoanForDrawdown] = useState<Loan | null>(null)

  // Step 4: Repay
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<Loan | null>(null)

  // Admin Fund
  const [fundAmount, setFundAmount] = useState('')

  // Real loans from blockchain
  const [loans, setLoans] = useState<Loan[]>([])
  const [contractBalance, setContractBalance] = useState(0)

  // App ID and Contract Address
  const APP_ID = BigInt(746230222)
  const CONTRACT_ADDRESS = 'JYSDGLSFX6IJEMV3QQK47H32AI7QL7FHOLNV6YXCXOQVDUPLVP6YLSF2FQ'

  // Load contract balance
  useEffect(() => {
    if (activeAddress && transactionSigner) {
      loadContractBalance()
    }
  }, [activeAddress, transactionSigner])

  const loadContractBalance = async () => {
    try {
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })

      const accountInfo = await algorand.account.getInformation(CONTRACT_ADDRESS)
      setContractBalance(Number(accountInfo.amount))
    } catch (err) {
      console.error('Failed to load contract balance:', err)
    }
  }

  const handleRequestLoan = async () => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet first')
      return
    }

    if (!loanRequest.principal || !loanRequest.termDays) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Requesting loan with:', loanRequest)

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
        args: [loanRequest.principal, loanRequest.termDays],
        sender: activeAddress!,
      })

      console.log('Loan request result:', result)

      const txId = result.txIds[0]
      setSuccess(`Loan request submitted! TX: ${txId}`)

      // Add to local state for immediate UI update
      const newLoan: Loan = {
        id: (loans.length + 1).toString(), // This will be updated with real ID from contract
        principal: parseInt(loanRequest.principal),
        termDays: parseInt(loanRequest.termDays),
        status: 'requested',
        borrower: loanRequest.receiverAddress || activeAddress,
        installment: 0,
        remaining: parseInt(loanRequest.principal),
        repaidTotal: 0,
        txIds: {
          request: txId,
        },
      }

      setLoans((prev) => [...prev, newLoan])
      setCurrentStep(2)

      // Reset form
      setLoanRequest({ principal: '', termDays: '', receiverAddress: '' })
    } catch (err: any) {
      setError(`Failed to request loan: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveLoan = async () => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet first')
      return
    }

    if (!selectedLoan || !installmentAmount) {
      setError('Please select a loan and enter installment amount')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Approving loan:', selectedLoan.id, 'with installment:', installmentAmount)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      const microloanClient = new MicroloanAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: APP_ID,
      })

      // Call smart contract approve_loan method
      const result = await microloanClient.send.approveLoan({
        args: [selectedLoan.id, installmentAmount],
        sender: activeAddress!,
      })

      console.log('Loan approval result:', result)

      const txId = result.txIds[0]
      setSuccess(`Loan approved! TX: ${txId}`)

      // Update local state
      setLoans((prev) =>
        prev.map((loan) =>
          loan.id === selectedLoan.id
            ? {
                ...loan,
                status: 'approved',
                installment: parseInt(installmentAmount),
                txIds: { ...loan.txIds, approve: txId },
              }
            : loan,
        ),
      )

      setCurrentStep(3)
    } catch (err: any) {
      setError(`Failed to approve loan: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDrawdown = async () => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet first')
      return
    }

    if (!selectedLoanForDrawdown) {
      setError('Please select a loan to drawdown')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Drawing down loan:', selectedLoanForDrawdown.id)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      const microloanClient = new MicroloanAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: APP_ID,
      })

      // Call smart contract drawdown method (this will send ALGO to borrower via inner transaction)
      const result = await microloanClient.send.drawdown({
        args: [selectedLoanForDrawdown.id],
        sender: activeAddress!,
      })

      console.log('Loan drawdown result:', result)

      const txId = result.txIds[0]
      setSuccess(`Loan drawdown successful! ${selectedLoanForDrawdown.principal / 1000000} ALGO sent to borrower. TX: ${txId}`)

      // Update local state
      setLoans((prev) =>
        prev.map((loan) =>
          loan.id === selectedLoanForDrawdown.id ? { ...loan, status: 'active', txIds: { ...loan.txIds, drawdown: txId } } : loan,
        ),
      )

      setCurrentStep(4)

      // Reload contract balance
      await loadContractBalance()
    } catch (err: any) {
      setError(`Failed to drawdown loan: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRepay = async () => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet first')
      return
    }

    if (!selectedLoanForRepay) {
      setError('Please select a loan to repay')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Repaying loan:', selectedLoanForRepay.id)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      // Send payment from borrower to contract
      console.log(`💸 Borrower ${activeAddress} repaying ${selectedLoanForRepay.installment / 1000000} ALGO to contract`)

      const paymentResult = await algorand.send.payment({
        signer: transactionSigner,
        sender: activeAddress,
        receiver: CONTRACT_ADDRESS,
        amount: algo(selectedLoanForRepay.installment / 1000000),
      })

      console.log('Repayment sent to contract:', paymentResult.txIds[0])

      // Now call the contract repay method
      const microloanClient = new MicroloanAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: APP_ID,
      })

      const result = await microloanClient.send.repay({
        args: [selectedLoanForRepay.id],
        sender: activeAddress!,
      })

      console.log('Loan repayment result:', result)

      const repayTxId = result.txIds[0]
      setSuccess(`Repayment successful! TX: ${repayTxId}`)

      // Update local state
      const newRemaining = selectedLoanForRepay.remaining - selectedLoanForRepay.installment
      const newRepaidTotal = selectedLoanForRepay.repaidTotal + selectedLoanForRepay.installment

      setLoans((prev) =>
        prev.map((loan) =>
          loan.id === selectedLoanForRepay.id
            ? {
                ...loan,
                remaining: newRemaining,
                repaidTotal: newRepaidTotal,
                status: newRemaining <= 0 ? 'repaid' : 'active',
                txIds: {
                  ...loan.txIds,
                  repay: [...(loan.txIds.repay || []), repayTxId],
                },
              }
            : loan,
        ),
      )

      // Reload contract balance
      await loadContractBalance()
    } catch (err: any) {
      setError(`Failed to repay loan: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFundContract = async () => {
    if (!activeAddress || !transactionSigner) {
      setError('Please connect your wallet first')
      return
    }

    if (!fundAmount) {
      setError('Please enter funding amount')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Funding contract with:', fundAmount)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig })
      algorand.setDefaultSigner(transactionSigner)

      // Send payment to contract
      const paymentResult = await algorand.send.payment({
        signer: transactionSigner,
        sender: activeAddress,
        receiver: CONTRACT_ADDRESS,
        amount: algo(parseInt(fundAmount) / 1000000),
      })

      console.log('Funding payment sent:', paymentResult.txIds[0])

      // Call contract fund_app method
      const microloanClient = new MicroloanAppClient({
        algorand,
        defaultSender: activeAddress!,
        appId: APP_ID,
      })

      const result = await microloanClient.send.fundApp({
        args: [fundAmount],
        sender: activeAddress!,
      })

      console.log('Contract funding result:', result)

      const txId = result.txIds[0]
      setSuccess(`Contract funded with ${parseInt(fundAmount) / 1000000} ALGO! TX: ${txId}`)

      // Reload contract balance
      await loadContractBalance()
      setFundAmount('')
    } catch (err: any) {
      setError(`Failed to fund contract: ${err.message}`)
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

  const getExplorerLink = (txId: string) => {
    return `https://testnet.algoexplorer.io/tx/${txId}`
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
          <h1 className="text-3xl font-bold">DeFi Microloan Platform</h1>
          <p className="mt-2">Real Blockchain-Powered Cross-Border Microlending</p>
          <div className="mt-4 bg-white/20 rounded-lg p-3">
            <p className="text-sm">
              <strong>Contract:</strong> {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-10)}
            </p>
            <p className="text-sm">
              <strong>Balance:</strong> {(contractBalance / 1000000).toFixed(2)} ALGO
            </p>
            <p className="text-sm">
              <strong>Explorer:</strong>{' '}
              <a
                href={`https://testnet.algoexplorer.io/application/${APP_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-200"
              >
                View Contract
              </a>
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex justify-center p-6 border-b">
          <div className="flex space-x-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    currentStep >= step ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  {step}
                </div>
                <div className="ml-3 text-sm">
                  <div className="font-medium">
                    {step === 1 && 'Request Loan'}
                    {step === 2 && 'Admin Approval'}
                    {step === 3 && 'Drawdown'}
                    {step === 4 && 'Repay'}
                  </div>
                </div>
                {step < 4 && <div className={`ml-8 w-16 h-0.5 ${currentStep > step ? 'bg-purple-600' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>
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

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Request Loan */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Request Loan</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount (microALGO)</label>
                  <input
                    type="number"
                    value={loanRequest.principal}
                    onChange={(e) => setLoanRequest((prev) => ({ ...prev, principal: e.target.value }))}
                    placeholder="1000000 (1 ALGO)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Term (Days)</label>
                  <input
                    type="number"
                    value={loanRequest.termDays}
                    onChange={(e) => setLoanRequest((prev) => ({ ...prev, termDays: e.target.value }))}
                    placeholder="30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receiver Address (optional - defaults to your address)
                  </label>
                  <input
                    type="text"
                    value={loanRequest.receiverAddress}
                    onChange={(e) => setLoanRequest((prev) => ({ ...prev, receiverAddress: e.target.value }))}
                    placeholder="Leave empty to use your address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={handleRequestLoan}
                  disabled={loading}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Requesting...' : 'Request Loan'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Admin Approval */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Admin Approval</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Loan to Approve</label>
                  <select
                    value={selectedLoan?.id || ''}
                    onChange={(e) => {
                      const loan = loans.find((l) => l.id === e.target.value)
                      setSelectedLoan(loan || null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a loan...</option>
                    {loans
                      .filter((loan) => loan.status === 'requested')
                      .map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          Loan #{loan.id} - {loan.principal / 1000000} ALGO - {loan.termDays} days
                        </option>
                      ))}
                  </select>
                </div>
                {selectedLoan && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium">Loan Details:</h3>
                    <p>Principal: {selectedLoan.principal / 1000000} ALGO</p>
                    <p>Term: {selectedLoan.termDays} days</p>
                    <p>Borrower: {selectedLoan.borrower.slice(0, 10)}...</p>
                    {selectedLoan.txIds.request && (
                      <p>
                        Request TX:{' '}
                        <a
                          href={getExplorerLink(selectedLoan.txIds.request)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </a>
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Installment (microALGO)</label>
                  <input
                    type="number"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    placeholder="500000 (0.5 ALGO)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={handleApproveLoan}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Approving...' : 'Approve Loan'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Drawdown */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Drawdown Loan</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Approved Loan</label>
                  <select
                    value={selectedLoanForDrawdown?.id || ''}
                    onChange={(e) => {
                      const loan = loans.find((l) => l.id === e.target.value)
                      setSelectedLoanForDrawdown(loan || null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a loan...</option>
                    {loans
                      .filter((loan) => loan.status === 'approved')
                      .map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          Loan #{loan.id} - {loan.principal / 1000000} ALGO
                        </option>
                      ))}
                  </select>
                </div>
                {selectedLoanForDrawdown && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium">Loan Details:</h3>
                    <p>Principal: {selectedLoanForDrawdown.principal / 1000000} ALGO</p>
                    <p>Installment: {selectedLoanForDrawdown.installment / 1000000} ALGO</p>
                    <p>Borrower: {selectedLoanForDrawdown.borrower}</p>
                    {selectedLoanForDrawdown.txIds.approve && (
                      <p>
                        Approval TX:{' '}
                        <a
                          href={getExplorerLink(selectedLoanForDrawdown.txIds.approve)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </a>
                      </p>
                    )}
                  </div>
                )}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This will send {selectedLoanForDrawdown?.principal / 1000000 || 0} ALGO from the contract to the
                    borrower via inner transaction.
                  </p>
                </div>
                <button
                  onClick={handleDrawdown}
                  disabled={loading || !selectedLoanForDrawdown}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Drawdown Loan'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Repay */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Repay Loan</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Active Loan</label>
                  <select
                    value={selectedLoanForRepay?.id || ''}
                    onChange={(e) => {
                      const loan = loans.find((l) => l.id === e.target.value)
                      setSelectedLoanForRepay(loan || null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a loan...</option>
                    {loans
                      .filter((loan) => loan.status === 'active')
                      .map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          Loan #{loan.id} - Remaining: {loan.remaining / 1000000} ALGO
                        </option>
                      ))}
                  </select>
                </div>
                {selectedLoanForRepay && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium">Loan Details:</h3>
                    <p>Remaining: {selectedLoanForRepay.remaining / 1000000} ALGO</p>
                    <p>Installment: {selectedLoanForRepay.installment / 1000000} ALGO</p>
                    <p>Repaid Total: {selectedLoanForRepay.repaidTotal / 1000000} ALGO</p>
                    {selectedLoanForRepay.txIds.drawdown && (
                      <p>
                        Drawdown TX:{' '}
                        <a
                          href={getExplorerLink(selectedLoanForRepay.txIds.drawdown)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View
                        </a>
                      </p>
                    )}
                  </div>
                )}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> This will send {selectedLoanForRepay?.installment / 1000000 || 0} ALGO from your wallet to the
                    contract.
                  </p>
                </div>
                <button
                  onClick={handleRepay}
                  disabled={loading || !selectedLoanForRepay}
                  className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Repay Installment'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Fund Contract */}
        <div className="border-t p-6">
          <h3 className="text-lg font-semibold mb-4">Admin: Fund Contract</h3>
          <div className="flex space-x-4">
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="Amount in microALGO"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={handleFundContract}
              disabled={loading || !fundAmount}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Funding...' : 'Fund Contract'}
            </button>
          </div>
        </div>

        {/* Loans Table */}
        <div className="border-t p-6">
          <h3 className="text-lg font-semibold mb-4">All Loans (Blockchain Data)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repaid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{loan.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.principal / 1000000} ALGO</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.repaidTotal / 1000000} ALGO</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loan.remaining / 1000000} ALGO</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        {loan.txIds.request && (
                          <div>
                            <a
                              href={getExplorerLink(loan.txIds.request)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Request
                            </a>
                          </div>
                        )}
                        {loan.txIds.approve && (
                          <div>
                            <a
                              href={getExplorerLink(loan.txIds.approve)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Approve
                            </a>
                          </div>
                        )}
                        {loan.txIds.drawdown && (
                          <div>
                            <a
                              href={getExplorerLink(loan.txIds.drawdown)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Drawdown
                            </a>
                          </div>
                        )}
                        {loan.txIds.repay?.map((txId, index) => (
                          <div key={index}>
                            <a
                              href={getExplorerLink(txId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Repay #{index + 1}
                            </a>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
